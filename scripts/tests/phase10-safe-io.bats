#!/usr/bin/env bats
setup() {
  WORK="$BATS_TEST_TMPDIR/p10-io-$BATS_TEST_NUMBER"
  mkdir -p "$WORK"
}
@test "strict object contracts reject unknown fields" {
  run node --input-type=module -e 'import {assertExactKeys} from "./scripts/lib/phase10-safe-io.mjs";try{assertExactKeys({known:1,extra:2},{required:["known"]});process.exit(1)}catch(e){if(!e.message.includes("unknown field"))process.exit(2)}'
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
@test "release index rejects duplicate receipt types and unsafe component files" {
  H=$(printf 'a%.0s' {1..64})
  C=$(printf 'b%.0s' {1..40})
  node --input-type=module -e 'import fs from "node:fs";import {createReleaseIdentity} from "./scripts/lib/release-identity.mjs";const [o,h,c]=process.argv.slice(1);fs.writeFileSync(o,JSON.stringify(createReleaseIdentity({releaseVersion:"1.0.0",commitSha:c,trustedManifestId:"x",trustedManifestSha256:h,bundleManifestSha256:h,environmentSchemaSha256:h,migrationMetadataSha256:h})))' "$WORK/id" "$H" "$C"
  echo '{"schemaVersion":1,"receiptType":"x","status":"success","scope":"fixture","release":{"version":"1.0.0"}}' >"$WORK/r"
  ln -s "$WORK/r" "$WORK/link"
  printf '{"schemaVersion":1,"components":[{"receiptType":"x","path":"%s"},{"receiptType":"x","path":"%s"}]}' "$WORK/r" "$WORK/link" >"$WORK/components"
  run node scripts/release-evidence.mjs create --identity "$WORK/id" --components "$WORK/components" --output "$WORK/index"
  [ "$status" -ne 0 ]
}
