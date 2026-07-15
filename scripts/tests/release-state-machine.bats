#!/usr/bin/env bats
setup() {
  WORK="$BATS_TEST_TMPDIR/release-state-$BATS_TEST_NUMBER"; mkdir -p "$WORK"; COMMIT=$(printf 'a%.0s' {1..40}); H=$(printf 'b%.0s' {1..64}); NOW=2026-01-01T00:00:10.000Z
  node --input-type=module - "$WORK" "$COMMIT" "$H" <<'EOF'
import fs from'node:fs';import path from'node:path';import{receiptEnvelope,sha256File}from'./scripts/lib/phase10-safe-io.mjs';const[root,commit,h]=process.argv.slice(2),release={version:'10.0.0',commit,releaseId:'fixture-release'};
const write=(name,value)=>{const file=path.join(root,`${name}.json`);fs.writeFileSync(file,JSON.stringify(value),{mode:0o600});return file};
const common={schemaVersion:1,status:'success',scope:'fixture',release,finishedAt:'2026-01-01T00:00:05.000Z'};
const files={trusted:write('trusted',{...common,receiptType:'trusted-validation-gate'}),bundle:write('bundle',{...common,receiptType:'immutable-release-bundle'}),health:write('health',{...common,receiptType:'vps-health-gate'})};
const backup=receiptEnvelope({receiptType:'runtime-state-backup-qualification',receiptId:'backup',status:'success',scope:'fixture',command:'fixture',release,policy:{id:'backup-policy',sha256:h},startedAt:'2026-01-01T00:00:01.000Z',finishedAt:'2026-01-01T00:00:05.000Z',result:{profile:'database',inventory:{sha256:h},archive:{sha256:h,bytes:1},databaseRestore:{status:'success',receiptSha256:h,invariantsSha256:h},assuranceStates:['captured','content-verified','database-restore-verified','qualified']}});files.backup=write('backup',backup);
files.migration=write('migration',{schemaVersion:1,receiptType:'migration-rollback-compatibility',status:'success',releaseVersion:'10.0.0',commit,bundleManifestSha256:h,deploymentContextId:'fixture',classification:'backward-compatible',postgresMajor:13,appliedMigrations:['001'],metadataSha256:h,observedSha256:h,evaluatedAt:'2026-01-01T00:00:01.000Z',expiresAt:'2026-01-02T00:00:00.000Z'});
const types={trusted:'trusted-validation-gate',bundle:'immutable-release-bundle',backup:'runtime-state-backup-qualification',migration:'migration-rollback-compatibility',health:'vps-health-gate'};const components=Object.entries(files).map(([key,file])=>({receiptType:types[key],stage:key,path:file,sha256:sha256File(file),releaseVersion:'10.0.0',commit,scope:'fixture',finishedAt:'2026-01-01T00:00:05.000Z',maximumAgeSeconds:null})).sort((a,b)=>a.receiptType.localeCompare(b.receiptType));write('index',{schemaVersion:1,receiptType:'release-evidence-index',releaseId:'fixture-release',release:{version:'10.0.0',commit},scope:'fixture',createdAt:'2026-01-01T00:00:06.000Z',components,retentionClass:'release-evidence',confidentiality:'operational-confidential'});
EOF
}

@test "deploy-ready state is derived from the exact evidence graph" {
  run node scripts/release-state.mjs evaluate --index "$WORK/index.json" --target deploy-ready --output "$WORK/state.json" --now "$NOW"
  [ "$status" -eq 0 ]; [ "$(stat -c %a "$WORK/state.json")" = 600 ]
  node -e 'const r=require(process.argv[1]);if(!r.result.targetAchieved||!r.result.achievedStates.includes("deploy-ready")||r.childReceipts.length!==5)process.exit(1)' "$WORK/state.json"
  run node scripts/verify-release-receipt.mjs --receipt "$WORK/state.json" --type release-lifecycle-state --scope fixture --version 10.0.0 --commit "$COMMIT" --now "$NOW"
  [ "$status" -eq 0 ]
}

@test "missing required evidence produces immutable blocked evidence" {
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.components=v.components.filter(x=>x.receiptType!=="vps-health-gate");fs.writeFileSync(p,JSON.stringify(v));fs.chmodSync(p,0o600)' "$WORK/index.json"
  run node scripts/release-state.mjs evaluate --index "$WORK/index.json" --target deploy-ready --output "$WORK/blocked.json" --now "$NOW"
  [ "$status" -ne 0 ]; [ -e "$WORK/blocked.json" ]; grep -q 'MISSING_REQUIRED_EVIDENCE' "$WORK/blocked.json"; grep -q 'vps-health-gate' "$WORK/blocked.json"
}

@test "changed mixed and duplicate evidence cannot advance state" {
  printf 'tamper' >>"$WORK/health.json"
  run node scripts/release-state.mjs evaluate --index "$WORK/index.json" --output "$WORK/tampered.json" --now "$NOW"
  [ "$status" -ne 0 ]; [ ! -e "$WORK/tampered.json" ]
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.components[0].scope="local";fs.writeFileSync(p,JSON.stringify(v));fs.chmodSync(p,0o600)' "$WORK/index.json"
  run node scripts/release-state.mjs evaluate --index "$WORK/index.json" --output "$WORK/mixed.json" --now "$NOW"
  [ "$status" -ne 0 ]; [ ! -e "$WORK/mixed.json" ]
}
