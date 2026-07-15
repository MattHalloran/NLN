#!/usr/bin/env bats
setup() {
  WORK="$BATS_TEST_TMPDIR/p10-observe-$BATS_TEST_NUMBER"; mkdir -p "$WORK/in"; NOW=2026-01-10T00:00:00.000Z; H=$(printf 'a%.0s' {1..64}); C=$(printf 'b%.0s' {1..40})
  node --input-type=module - "$WORK/in" "$H" "$C" <<'EOF'
import fs from'node:fs';import path from'node:path';import crypto from'node:crypto';import{receiptEnvelope}from'./scripts/lib/phase10-safe-io.mjs';const[root,h,commit]=process.argv.slice(2),release={version:'10.0.0',commit,releaseId:'fixture'},registryHash=crypto.createHash('sha256').update(fs.readFileSync('config/command-registry.json')).digest('hex');const write=(name,value)=>fs.writeFileSync(path.join(root,name),JSON.stringify(value),{mode:0o600});
write('backup.json',receiptEnvelope({receiptType:'runtime-state-backup-qualification',receiptId:'backup',status:'success',scope:'fixture',command:'fixture',release,policy:{id:'backup',sha256:h},startedAt:'2026-01-09T11:59:00.000Z',finishedAt:'2026-01-09T12:00:00.000Z',result:{profile:'database',inventory:{sha256:h},archive:{sha256:h,bytes:100},databaseRestore:{status:'success',receiptSha256:h,invariantsSha256:h},assuranceStates:['captured','content-verified','database-restore-verified','qualified']}}));
const deploy=receiptEnvelope({receiptType:'release-deploy',receiptId:'deploy',status:'success',scope:'fixture',command:'release deploy',release,policy:{id:'nln-release-commands-v1',sha256:registryHash},startedAt:'2026-01-09T11:58:30.000Z',finishedAt:'2026-01-09T12:00:00.000Z',checks:[{id:'health-smoke',status:'passed'}]});Object.assign(deploy,{productionMutation:false,userVisibleDowntimeBegan:true,databaseMutationOccurred:false,measuredDowntimeMilliseconds:70000,safestNextAction:'review'});write('deploy.json',deploy);
EOF
}

@test "summary verifies evidence separates scopes and emits policy-bound alerts" {
  run node scripts/release-observability.mjs summarize --directory "$WORK/in" --output "$WORK/summary.json" --alerts "$WORK/alerts.json" --now "$NOW"
  [ "$status" -eq 0 ]; [ "$(stat -c %a "$WORK/summary.json")" = 600 ]
  node -e 'const s=require(process.argv[1]);if(s.scopeCounts.fixture!==2||s.metrics.measuredDowntimeMilliseconds.samples!==1||s.alerts.total<3||!s.policy.sha256)process.exit(1)' "$WORK/summary.json"
  grep -q 'downtime-slo' "$WORK/alerts.json"; grep -q 'missing-resilience-evidence' "$WORK/alerts.json"
}

@test "failed and recovered operations remain failed attempts" {
  node --input-type=module - "$WORK/in" "$H" "$C" <<'EOF'
import fs from'node:fs';import path from'node:path';import crypto from'node:crypto';import{receiptEnvelope}from'./scripts/lib/phase10-safe-io.mjs';const[root,h,commit]=process.argv.slice(2),release={version:'10.0.0',commit,releaseId:'fixture'},registryHash=crypto.createHash('sha256').update(fs.readFileSync('config/command-registry.json')).digest('hex');for(const [index,status]of['failed','blocked','recovered'].entries()){const r=receiptEnvelope({receiptType:'release-deploy',receiptId:`failure-${index}`,status,scope:'fixture',command:'release deploy',release,policy:{id:'nln-release-commands-v1',sha256:registryHash},startedAt:`2026-01-09T12:0${index}:00.000Z`,finishedAt:`2026-01-09T12:0${index}:01.000Z`,failure:{code:'FIXTURE_FAILURE',summary:'fixture failure'}});Object.assign(r,{productionMutation:false,userVisibleDowntimeBegan:false,databaseMutationOccurred:false,measuredDowntimeMilliseconds:0,safestNextAction:'investigate'});fs.writeFileSync(path.join(root,`failure-${index}.json`),JSON.stringify(r),{mode:0o600})}
EOF
  run node scripts/release-observability.mjs summarize --directory "$WORK/in" --output "$WORK/summary.json" --alerts "$WORK/alerts.json" --now "$NOW"
  [ "$status" -eq 0 ]; grep -q 'repeated-failure' "$WORK/alerts.json"; node -e 'const s=require(process.argv[1]);if(s.outcomes.recoveredFailures!==1||s.outcomes.failedOrBlocked<3)process.exit(1)' "$WORK/summary.json"
}

@test "malformed unregistered and sensitive histories are rejected" {
  printf '{"schemaVersion":1,"receiptType":"unknown","status":"success"}' >"$WORK/in/unknown.json"; chmod 600 "$WORK/in/unknown.json"
  run node scripts/release-observability.mjs summarize --directory "$WORK/in" --output "$WORK/no.json" --now "$NOW"
  [ "$status" -ne 0 ]; [ ! -e "$WORK/no.json" ]
  rm "$WORK/in/unknown.json"; printf '{"schemaVersion":1,"receiptType":"release-deploy","status":"success","status":"failed"}' >"$WORK/in/duplicate.json"; chmod 600 "$WORK/in/duplicate.json"
  run node scripts/release-observability.mjs summarize --directory "$WORK/in" --output "$WORK/no.json" --now "$NOW"
  [ "$status" -ne 0 ]; [ ! -e "$WORK/no.json" ]
  rm "$WORK/in/duplicate.json"; node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.result={email:"person@example.test"};fs.writeFileSync(p,JSON.stringify(v));fs.chmodSync(p,0o600)' "$WORK/in/deploy.json"
  run node scripts/release-observability.mjs summarize --directory "$WORK/in" --output "$WORK/no.json" --now "$NOW"
  [ "$status" -ne 0 ]; [ ! -e "$WORK/no.json" ]; [[ "$output" != *"person@example.test"* ]]
}
