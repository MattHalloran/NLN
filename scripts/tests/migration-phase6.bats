#!/usr/bin/env bats
setup() {
  WORK="$BATS_TEST_TMPDIR/phase6-$BATS_TEST_NUMBER"; mkdir -p "$WORK/migrations/20260101000000_expand" "$WORK/out"
  echo 'ALTER TABLE example ADD COLUMN note text;' > "$WORK/migrations/20260101000000_expand/migration.sql"
  echo '{"schemaVersion":1,"policyId":"nln-controlled-migrations-v1","productionIntegrationEnabled":false,"supportedPostgresMajors":[13],"minimumFreeBytes":100,"lockTimeoutMs":1000,"statementTimeoutMs":5000,"advisoryLockId":123,"allowedClassifications":["none","backward-compatible","bounded-window","incompatible"],"allowedLockRisks":["low","medium","high"],"requireQualifiedBackup":true,"maximumQualifiedBackupAgeSeconds":3600,"operationalObjectivesPath":"config/deployment-operational-objectives.json","backupPolicyPath":"config/runtime-state-backup-policy.json","runtimeStateInventoryPath":"config/runtime-state-inventory.json","requireTrustedGate":true,"requireSpecialPlanForHighRisk":true,"requireSpecialPlanForIncompatible":true,"applicationStartupMigrationRemovalApproved":false}' > "$WORK/policy.json"
  echo '{"schemaVersion":1,"releaseVersion":"1.2.3","classification":"backward-compatible","rationale":"additive fixture change","rollbackStrategy":"retain schema and roll application safely","testedPostgresMajors":[13],"expectedDurationSeconds":5,"expectedAffectedRows":{"maximum":100,"basis":"fixture"},"lockRisk":"low","transactionStrategy":"single transaction","diskSpaceRequiredBytes":100,"specialDeploymentPlan":null,"fromMigrations":[],"migrations":[{"id":"20260101000000_expand","phase":"expand","classification":"backward-compatible","rationale":"adds nullable fixture column","backfill":null}]}' > "$WORK/metadata.json"
  COMMIT=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
  echo "{\"schemaVersion\":1,\"receiptType\":\"trusted-validation-gate\",\"status\":\"success\",\"commit\":\"$COMMIT\"}" > "$WORK/trusted.json"
  node - "$WORK/backup.json" "$COMMIT" <<'EOF'
const fs=require('fs'),crypto=require('crypto'); const [out,commit]=process.argv.slice(2); const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); const h='a'.repeat(64);
fs.writeFileSync(out,JSON.stringify({schemaVersion:1,receiptType:'runtime-state-backup-qualification',status:'success',scope:'fixture',release:{version:'1.2.3',commit},finishedAt:new Date().toISOString(),policy:{id:'nln-runtime-state-backup-policy-v1',sha256:hash('config/runtime-state-backup-policy.json')},inventory:{id:'nln-runtime-state-v1',sha256:hash('config/runtime-state-inventory.json')},archive:{sha256:h,bytes:100},databaseRestore:{status:'success',receiptSha256:h,invariantsSha256:h},assuranceStates:['captured','content-verified','database-restore-verified','qualified']}));
EOF
  echo '{"postgresMajor":13,"freeBytes":1000,"partialMigrations":false,"appliedMigrations":[]}' > "$WORK/state.json"
  echo "{\"release\":{\"version\":\"1.2.3\",\"commit\":\"$COMMIT\"}}" > "$WORK/bundle-manifest.json"
  chmod 600 "$WORK"/*.json; chmod +x scripts/tests/fixtures/migration-adapter-stub.mjs
}
@test "valid structured metadata covers the exact migration set" {
  run node scripts/validate-migration-compatibility.mjs --policy "$WORK/policy.json" --metadata "$WORK/metadata.json" --migration-root "$WORK/migrations"
  [ "$status" -eq 0 ]; [[ "$output" == *"Migration compatibility passed"* ]]
}
@test "unclassified migration directory is rejected" {
  mkdir "$WORK/migrations/20260102000000_extra"; echo 'SELECT 1;' > "$WORK/migrations/20260102000000_extra/migration.sql"
  run node scripts/validate-migration-compatibility.mjs --policy "$WORK/policy.json" --metadata "$WORK/metadata.json" --migration-root "$WORK/migrations"
  [ "$status" -ne 0 ]; [[ "$output" == *"every migration directory"* ]]
}
@test "destructive SQL cannot claim unconditional compatibility" {
  echo 'ALTER TABLE example DROP COLUMN note;' > "$WORK/migrations/20260101000000_expand/migration.sql"
  run node scripts/validate-migration-compatibility.mjs --policy "$WORK/policy.json" --metadata "$WORK/metadata.json" --migration-root "$WORK/migrations"
  [ "$status" -ne 0 ]; [[ "$output" == *"restrictive structured classification"* ]]
}
@test "runner uses advisory lock and writes owner-only success evidence" {
  run env MIGRATION_STUB_STATE="$WORK/state.json" MIGRATION_STUB_LOG="$WORK/log" node scripts/run-controlled-migrations.mjs --metadata "$WORK/metadata.json" --policy "$WORK/policy.json" --adapter scripts/tests/fixtures/migration-adapter-stub.mjs --trusted-receipt "$WORK/trusted.json" --backup-receipt "$WORK/backup.json" --commit "$COMMIT" --output "$WORK/out/receipt.json"
  [ "$status" -eq 0 ]; [ "$(stat -c %a "$WORK/out/receipt.json")" = 600 ]; grep -q '^acquire-lock ' "$WORK/log"; grep -q '^apply ' "$WORK/log"; grep -q '^release-lock ' "$WORK/log"
}
@test "lock contention never applies migrations and records failure" {
  run env MIGRATION_STUB_STATE="$WORK/state.json" MIGRATION_STUB_LOG="$WORK/log" MIGRATION_STUB_LOCKED=1 node scripts/run-controlled-migrations.mjs --metadata "$WORK/metadata.json" --policy "$WORK/policy.json" --adapter scripts/tests/fixtures/migration-adapter-stub.mjs --trusted-receipt "$WORK/trusted.json" --backup-receipt "$WORK/backup.json" --commit "$COMMIT" --output "$WORK/out/receipt.json"
  [ "$status" -ne 0 ]; ! grep -q '^apply ' "$WORK/log"; node -e 'const r=require(process.argv[1]);if(r.status!=="failure"||r.failure.stage!=="lock")process.exit(1)' "$WORK/out/receipt.json"
}
@test "partial migrations and insufficient disk fail before lock" {
  echo '{"postgresMajor":13,"freeBytes":1,"partialMigrations":true,"appliedMigrations":[]}' > "$WORK/state.json"
  run env MIGRATION_STUB_STATE="$WORK/state.json" MIGRATION_STUB_LOG="$WORK/log" node scripts/run-controlled-migrations.mjs --metadata "$WORK/metadata.json" --policy "$WORK/policy.json" --adapter scripts/tests/fixtures/migration-adapter-stub.mjs --trusted-receipt "$WORK/trusted.json" --backup-receipt "$WORK/backup.json" --commit "$COMMIT" --output "$WORK/out/receipt.json"
  [ "$status" -ne 0 ]; [ ! -e "$WORK/log" ] || ! grep -q '^acquire-lock ' "$WORK/log"
}
@test "adapter failure output is redacted and lock is released" {
  run env MIGRATION_STUB_STATE="$WORK/state.json" MIGRATION_STUB_LOG="$WORK/log" MIGRATION_STUB_FAIL=apply TEST_SECRET=do-not-print node scripts/run-controlled-migrations.mjs --metadata "$WORK/metadata.json" --policy "$WORK/policy.json" --adapter scripts/tests/fixtures/migration-adapter-stub.mjs --trusted-receipt "$WORK/trusted.json" --backup-receipt "$WORK/backup.json" --commit "$COMMIT" --output "$WORK/out/receipt.json"
  [ "$status" -ne 0 ]; [[ "$output" != *"do-not-print"* ]]; grep -q '^release-lock ' "$WORK/log"
}
@test "rollback evaluator permits compatible schema and blocks incompatible release" {
  echo '{"postgresMajor":13,"partialMigrations":false,"appliedMigrations":["20260101000000_expand"]}' > "$WORK/observed.json"
  run node scripts/evaluate-migration-compatibility.mjs --metadata "$WORK/metadata.json" --observed "$WORK/observed.json" --bundle-manifest "$WORK/bundle-manifest.json" --commit "$COMMIT" --context-id fixture-context-1 --output "$WORK/out/compat.json" --now 2026-01-01T00:00:00Z
  [ "$status" -eq 0 ]; [ "$(stat -c %a "$WORK/out/compat.json")" = 600 ]
  sed -i 's/"classification":"backward-compatible"/"classification":"incompatible"/' "$WORK/metadata.json"
  run node scripts/evaluate-migration-compatibility.mjs --metadata "$WORK/metadata.json" --observed "$WORK/observed.json" --bundle-manifest "$WORK/bundle-manifest.json" --commit "$COMMIT" --context-id fixture-context-1 --output "$WORK/out/blocked.json"
  [ "$status" -ne 0 ]; [[ "$output" == *"explicitly incompatible"* ]]
}
