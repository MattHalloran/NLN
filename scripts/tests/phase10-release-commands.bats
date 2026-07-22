#!/usr/bin/env bats
setup() {
  WORK="$BATS_TEST_TMPDIR/release-commands-$BATS_TEST_NUMBER"; mkdir -p "$WORK"; COMMIT=$(printf 'a%.0s' {1..40}); H=$(printf 'b%.0s' {1..64}); NOW=2026-01-01T00:00:10.000Z
  node --input-type=module - "$WORK/identity.json" "$WORK/backup.json" "$COMMIT" "$H" <<'EOF'
import fs from'node:fs';import{createReleaseIdentity,}from'./scripts/lib/release-identity.mjs';import{receiptEnvelope}from'./scripts/lib/phase10-safe-io.mjs';const[idFile,backupFile,commit,h]=process.argv.slice(2),identity=createReleaseIdentity({releaseVersion:'10.0.0',commitSha:commit,repositoryId:'nln/fixture',trustedManifestId:'trusted-v1',trustedManifestSha256:h,immutablePolicyId:'immutable-v1',immutablePolicySha256:h,bundleManifestSha256:h,environmentSchemaSha256:h,migrationMetadataSha256:h,createdAt:'2026-01-01T00:00:00.000Z',scope:'fixture'});fs.writeFileSync(idFile,JSON.stringify(identity),{mode:0o600});const backup=receiptEnvelope({receiptType:'runtime-state-backup-qualification',receiptId:'backup',status:'success',scope:'fixture',command:'fixture',release:{version:'10.0.0',commit,releaseId:identity.releaseId},policy:{id:'backup',sha256:h},startedAt:'2026-01-01T00:00:01.000Z',finishedAt:'2026-01-01T00:00:05.000Z',result:{profile:'database',inventory:{sha256:h},archive:{sha256:h,bytes:1},databaseRestore:{status:'success',receiptSha256:h,invariantsSha256:h},assuranceStates:['captured','content-verified','database-restore-verified','qualified']}});fs.writeFileSync(backupFile,JSON.stringify(backup),{mode:0o600});
EOF
  echo '{"fixture":true,"production":false,"redactions":{"credential":"fixture-secret"}}' >"$WORK/context.json"; chmod 600 "$WORK/context.json"; echo 'fixture bundle' >"$WORK/bundle"; chmod 600 "$WORK/bundle"
  RELEASE_ID=$(node -e 'process.stdout.write(require(process.argv[1]).releaseId)' "$WORK/identity.json")
}

@test "verify-local defaults to plan and executes only inside explicit fixture scope" {
  run node scripts/release.mjs verify-local --identity "$WORK/identity.json" --backup-receipt "$WORK/backup.json" --receipt "$WORK/plan.json" --now "$NOW"
  [ "$status" -eq 0 ]; node -e 'const r=require(process.argv[1]);if(r.status!=="planned"||r.result.executed)process.exit(1)' "$WORK/plan.json"
  run node scripts/release.mjs verify-local --identity "$WORK/identity.json" --backup-receipt "$WORK/backup.json" --receipt "$WORK/executed.json" --execute --fixture --confirm "VERIFY-LOCAL-$RELEASE_ID" --adapter scripts/tests/fixtures/phase10-release-adapter.mjs --context "$WORK/context.json" --now "$NOW"
  [ "$status" -eq 0 ]; node -e 'const r=require(process.argv[1]);if(r.status!=="success"||!r.result.application.applicationSmokePassed)process.exit(1)' "$WORK/executed.json"
  run node scripts/verify-release-receipt.mjs --receipt "$WORK/executed.json" --type release-local-verification --scope fixture --version 10.0.0 --commit "$COMMIT" --now "$NOW"
  [ "$status" -eq 0 ]
}

@test "verify-local rejects production wrong confirmation and unsafe adapter claims" {
  run node scripts/release.mjs verify-local --production --identity "$WORK/identity.json" --backup-receipt "$WORK/backup.json" --receipt "$WORK/no.json"
  [ "$status" -eq 3 ]; [ ! -e "$WORK/no.json" ]
  run node scripts/release.mjs verify-local --identity "$WORK/identity.json" --backup-receipt "$WORK/backup.json" --receipt "$WORK/no.json" --execute --fixture --confirm wrong --adapter scripts/tests/fixtures/phase10-release-adapter.mjs --context "$WORK/context.json" --now "$NOW"
  [ "$status" -eq 3 ]; [ ! -e "$WORK/no.json" ]
}

@test "database and disaster restore are conspicuous immutable plans only" {
  for command in restore-database restore-disaster; do
    run node scripts/release.mjs "$command" --identity "$WORK/identity.json" --backup-receipt "$WORK/backup.json" --release-bundle "$WORK/bundle" --receipt "$WORK/$command.json" --now "$NOW"
    [ "$status" -eq 0 ]; grep -q 'Writes newer than the selected backup may be lost' "$WORK/$command.json"
    run node scripts/release.mjs "$command" --identity "$WORK/identity.json" --backup-receipt "$WORK/backup.json" --release-bundle "$WORK/bundle" --receipt "$WORK/$command-execute.json" --execute --now "$NOW"
    [ "$status" -ne 0 ]; [ ! -e "$WORK/$command-execute.json" ]
  done
}

@test "release exit codes distinguish invalid input gates and disabled mutation" {
  run node scripts/release.mjs unknown-command
  [ "$status" -eq 2 ]
  run node scripts/release.mjs verify-local --identity missing
  [ "$status" -eq 2 ]
  run node scripts/release.mjs restore-database --identity "$WORK/identity.json" --backup-receipt "$WORK/backup.json" --release-bundle "$WORK/bundle" --receipt "$WORK/no.json" --execute --now "$NOW"
  [ "$status" -eq 3 ]; [ ! -e "$WORK/no.json" ]
}

@test "all canonical command help remains side-effect free" {
  before=$(find "$WORK" -type f -printf '%P\n' | sort)
  for args in "verify-local --help" "health --help" "restore-database --help" "restore-disaster --help" "maintenance plan --help" "maintenance execute --help" "evidence summarize --help"; do run node scripts/release.mjs $args; [ "$status" -eq 0 ]; done
  [ "$before" = "$(find "$WORK" -type f -printf '%P\n' | sort)" ]
}
