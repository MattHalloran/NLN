#!/usr/bin/env bats
setup() {
  WORK="$BATS_TEST_TMPDIR/p10-io-$BATS_TEST_NUMBER"
  mkdir -p "$WORK"
}
@test "strict object contracts reject unknown fields" {
  run node --input-type=module -e 'import {assertExactKeys} from "./scripts/lib/phase10-safe-io.mjs";try{assertExactKeys({known:1,extra:2},{required:["known"]});process.exit(1)}catch(e){if(!e.message.includes("unknown field"))process.exit(2)}'
  [ "$status" -eq 0 ]
}
@test "strict JSON rejects duplicate keys at every nesting depth" {
  run node --input-type=module - <<'EOF'
import {parseJsonStrict} from './scripts/lib/phase10-safe-io.mjs';
for(const text of ['{"scope":"fixture","scope":"production"}','{"nested":{"status":"success","status":"failed"}}','[{"hash":"a","hash":"b"}]']){try{parseJsonStrict(text);process.exit(1)}catch(error){if(!error.message.includes('duplicate object key'))process.exit(2)}}
const valid=parseJsonStrict('{"emoji":"\\ud83d\\ude00","number":-1.25e2,"values":[true,false,null]}');if(valid.emoji!=="😀"||valid.number!==-125)process.exit(3);
EOF
  [ "$status" -eq 0 ]
}
@test "option parsing rejects duplicates positionals and missing values" {
  run node --input-type=module -e 'import {parseOptions} from "./scripts/lib/phase10-safe-io.mjs";for(const args of [["--x","1","--x","2"],["unexpected"],["--x"]]){try{parseOptions(args);process.exit(1)}catch(e){if(e.exitCode!==2)process.exit(2)}}'
  [ "$status" -eq 0 ]
}
@test "canonical timestamps reject malformed and noncanonical times" {
  run node --input-type=module -e 'import {isoTimestamp} from "./scripts/lib/phase10-safe-io.mjs";for(const value of ["2026-01-01T00:00:00Z","nonsense","2026-13-01T00:00:00.000Z"]){try{isoTimestamp(value);process.exit(1)}catch{}}isoTimestamp("2026-01-01T00:00:00.000Z")'
  [ "$status" -eq 0 ]
}
@test "regular input rejects symlinks hardlinks and non-owner-only evidence" {
  echo '{}' >"$WORK/a"
  ln -s "$WORK/a" "$WORK/link"
  ln "$WORK/a" "$WORK/hard"
  chmod 644 "$WORK/a"
  run node --input-type=module -e 'import {regularFile} from "./scripts/lib/phase10-safe-io.mjs";const root=process.argv[1];for(const file of ["link","hard"]){try{regularFile(`${root}/${file}`);process.exit(1)}catch{}}try{regularFile(`${root}/a`,"a",{ownerOnly:true});process.exit(1)}catch{}' "$WORK"
  [ "$status" -eq 0 ]
}
@test "atomic publication is owner-only canonical and never overwrites" {
  run node --input-type=module -e 'import fs from "node:fs";import {publishJsonNoOverwrite} from "./scripts/lib/phase10-safe-io.mjs";const out=process.argv[1];publishJsonNoOverwrite(out,{z:1,a:2});if((fs.statSync(out).mode&511)!==384||!fs.readFileSync(out,"utf8").startsWith("{\n  \"a\""))process.exit(1);try{publishJsonNoOverwrite(out,{changed:true});process.exit(2)}catch{}' "$WORK/out.json"
  [ "$status" -eq 0 ]
  grep -q '"z": 1' "$WORK/out.json"
}
@test "atomic replace publishes owner-only pointers without temporary residue" {
  run node --input-type=module -e 'import fs from "node:fs";import path from "node:path";import {publishJsonReplaceAtomic} from "./scripts/lib/phase10-safe-io.mjs";const out=process.argv[1];publishJsonReplaceAtomic(out,{generation:1});publishJsonReplaceAtomic(out,{generation:2});if(JSON.parse(fs.readFileSync(out)).generation!==2||(fs.statSync(out).mode&511)!==384||fs.readdirSync(path.dirname(out)).some(x=>x.includes(".tmp-")))process.exit(1)' "$WORK/current.json"
  [ "$status" -eq 0 ]
}
@test "release index rejects duplicate receipt types and unsafe component files" {
  H=$(printf 'a%.0s' {1..64})
  C=$(printf 'b%.0s' {1..40})
  node --input-type=module -e 'import fs from "node:fs";import {createReleaseIdentity} from "./scripts/lib/release-identity.mjs";const [o,h,c]=process.argv.slice(1);fs.writeFileSync(o,JSON.stringify(createReleaseIdentity({releaseVersion:"1.0.0",commitSha:c,repositoryId:"nln/fixture",trustedManifestId:"trusted-v1",trustedManifestSha256:h,immutablePolicyId:"immutable-v1",immutablePolicySha256:h,bundleManifestSha256:h,environmentSchemaSha256:h,migrationMetadataSha256:h,createdAt:"2026-01-01T00:00:00.000Z",scope:"fixture"})))' "$WORK/id" "$H" "$C"
  echo "{\"schemaVersion\":1,\"receiptType\":\"x\",\"status\":\"success\",\"scope\":\"fixture\",\"release\":{\"version\":\"1.0.0\",\"commit\":\"$C\"}}" >"$WORK/r"
  ln -s "$WORK/r" "$WORK/link"
  printf '{"schemaVersion":1,"components":[{"receiptType":"x","path":"%s"},{"receiptType":"x","path":"%s"}]}' "$WORK/r" "$WORK/link" >"$WORK/components"
  run node scripts/release-evidence.mjs create --identity "$WORK/id" --components "$WORK/components" --output "$WORK/index"
  [ "$status" -ne 0 ]
}
@test "canonical receipts bind duration policy identity and release context" {
  H=$(printf 'a%.0s' {1..64})
  C=$(printf 'b%.0s' {1..40})
  node --input-type=module - "$WORK/receipt.json" "$H" "$C" <<'EOF'
import {publishJsonNoOverwrite,receiptEnvelope} from './scripts/lib/phase10-safe-io.mjs';
const [file,hash,commit]=process.argv.slice(2);
const value=receiptEnvelope({receiptType:'release-local-verification',receiptId:'r1',status:'planned',scope:'fixture',command:'release verify-local',release:{version:'1.0.0',commit,releaseId:'id'},policy:{id:'policy',sha256:hash},startedAt:'2026-01-01T00:00:00.000Z',finishedAt:'2026-01-01T00:00:01.250Z',result:{assuranceProfile:'database',executed:false,application:null}});
publishJsonNoOverwrite(file,value);
EOF
  run node scripts/verify-release-receipt.mjs --receipt "$WORK/receipt.json" --type release-local-verification --scope fixture --version 1.0.0 --commit "$C" --policy-sha256 "$H" --now 2026-01-01T00:00:02.000Z --max-age-seconds 5
  [ "$status" -eq 0 ]
  node -e 'const r=require(process.argv[1]);if(r.durationMilliseconds!==1250||r.producer.name!=="release verify-local"||!Array.isArray(r.childReceipts))process.exit(1)' "$WORK/receipt.json"
  chmod 644 "$WORK/receipt.json"
  run node scripts/verify-release-receipt.mjs --receipt "$WORK/receipt.json"
  [ "$status" -ne 0 ]
}
@test "receipt schemas reject unknown nested producer fields" {
  H=$(printf 'a%.0s' {1..64}); C=$(printf 'b%.0s' {1..40})
  node --input-type=module - "$WORK/receipt.json" "$H" "$C" <<'EOF'
import{publishJsonNoOverwrite,receiptEnvelope}from'./scripts/lib/phase10-safe-io.mjs';const[file,h,commit]=process.argv.slice(2),r=receiptEnvelope({receiptType:'release-prepare',receiptId:'nested',status:'planned',scope:'fixture',command:'release prepare',release:{version:'1.0.0',commit,releaseId:'id'},policy:{id:'policy',sha256:h},startedAt:'2026-01-01T00:00:00.000Z',finishedAt:'2026-01-01T00:00:00.000Z'});r.producer.unsafe='unexpected';Object.assign(r,{evidenceIndexSha256:h,migrationClassification:'none',productionMutation:false});publishJsonNoOverwrite(file,r);
EOF
  run node scripts/verify-release-receipt.mjs --receipt "$WORK/receipt.json"
  [ "$status" -ne 0 ]; [[ "$output" == *"producer has unknown field"* ]]
}
@test "receipt verification rejects stale wrong-release and malformed envelopes" {
  H=$(printf 'a%.0s' {1..64})
  C=$(printf 'b%.0s' {1..40})
  node --input-type=module - "$WORK/receipt.json" "$H" "$C" <<'EOF'
import {publishJsonNoOverwrite,receiptEnvelope} from './scripts/lib/phase10-safe-io.mjs';
const [file,hash,commit]=process.argv.slice(2);const value=receiptEnvelope({receiptType:'release-deploy',receiptId:'r2',status:'planned',scope:'fixture',command:'release deploy',release:{version:'1.0.0',commit,releaseId:'id'},policy:{id:'policy',sha256:hash},startedAt:'2026-01-01T00:00:00.000Z',finishedAt:'2026-01-01T00:00:01.000Z'});Object.assign(value,{productionMutation:false,userVisibleDowntimeBegan:false,databaseMutationOccurred:false,measuredDowntimeMilliseconds:0,safestNextAction:'review'});publishJsonNoOverwrite(file,value);
EOF
  run node scripts/verify-release-receipt.mjs --receipt "$WORK/receipt.json" --version 2.0.0 --commit "$C"
  [ "$status" -ne 0 ]
  run node scripts/verify-release-receipt.mjs --receipt "$WORK/receipt.json" --now 2026-01-01T00:01:00.000Z --max-age-seconds 5
  [ "$status" -ne 0 ]
  chmod 600 "$WORK/receipt.json"
  node -e 'const fs=require("fs"),p=process.argv[1],r=require(p);r.durationMilliseconds=7;fs.writeFileSync(p,JSON.stringify(r))' "$WORK/receipt.json"
  run node scripts/verify-release-receipt.mjs --receipt "$WORK/receipt.json"
  [ "$status" -ne 0 ]
}
@test "release identity binds repository policy timestamp and scope" {
  H=$(printf 'a%.0s' {1..64}); C=$(printf 'b%.0s' {1..40})
  run node --input-type=module - "$H" "$C" <<'EOF'
import {createReleaseIdentity,verifyReleaseIdentity} from './scripts/lib/release-identity.mjs';
const [h,c]=process.argv.slice(2),basis={releaseVersion:'1.2.3',commitSha:c,repositoryId:'nln/fixture',trustedManifestId:'trusted-v1',trustedManifestSha256:h,immutablePolicyId:'immutable-v1',immutablePolicySha256:h,bundleManifestSha256:h,environmentSchemaSha256:h,migrationMetadataSha256:h,createdAt:'2026-01-01T00:00:00.000Z',scope:'fixture'};
const valid=createReleaseIdentity(basis);verifyReleaseIdentity(valid);
for(const change of [{scope:'production'},{repositoryId:'other/repository'},{immutablePolicySha256:'c'.repeat(64)}]){try{verifyReleaseIdentity({...valid,...change});process.exit(1)}catch{}}
for(const missing of ['repositoryId','immutablePolicyId','createdAt','scope']){const copy={...valid};delete copy[missing];try{verifyReleaseIdentity(copy);process.exit(2)}catch{}}
EOF
  [ "$status" -eq 0 ]
}
@test "fixture guards and bounded child execution fail safely and redact output" {
  run node --input-type=module - <<'EOF'
import fs from'node:fs';import{assertFixtureScope,runChild,withTemporaryDirectory}from'./scripts/lib/phase10-safe-io.mjs';
assertFixtureScope({fixture:true,production:false});for(const scope of [{fixture:true,production:true},{fixture:false,production:false},null]){try{assertFixtureScope(scope);process.exit(1)}catch{}}
const secret='fixture-secret-value',failed=runChild(process.execPath,['-e',`console.error('${secret}');process.exit(7)`],{redactions:[secret],timeoutMilliseconds:1000});if(failed.status!==7||failed.stderr.includes(secret)||!failed.stderr.includes('[REDACTED]'))process.exit(2);
const timed=runChild(process.execPath,['-e','setTimeout(()=>{},10000)'],{timeoutMilliseconds:25});if(!timed.timedOut)process.exit(3);
let temporary;try{withTemporaryDirectory('phase10-test',(directory)=>{temporary=directory;fs.writeFileSync(`${directory}/evidence`,'x');throw new Error('injected')})}catch{}if(!temporary||fs.existsSync(temporary))process.exit(4);
EOF
  [ "$status" -eq 0 ]
}
