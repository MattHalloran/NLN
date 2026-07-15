#!/usr/bin/env bats

setup() {
  WORK="$BATS_TEST_TMPDIR/application-restore-$BATS_TEST_NUMBER"
  ROOT="$WORK/root"
  ARCHIVE="$WORK/runtime-state.tar.gz"
  ARCHIVE_RECEIPT="$WORK/archive.json"
  MANIFEST="$ROOT/runtime-state-manifest-v2.json"
  METADATA="$WORK/metadata.json"
  IDENTITY="$WORK/identity.json"
  LOCAL_RECEIPT="$WORK/local-verification.receipt"
  OUTPUT="$WORK/application.json"
  COMMIT=0123456789abcdef0123456789abcdef01234567
  VERSION=10.0.0
  NOW=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
  mkdir -p "$ROOT/data/uploads" "$ROOT/assets" "$ROOT/data/redis" "$ROOT/data/migration-backups"
  printf 'fixture sql\n' >"$ROOT/data/postgres.sql"
  printf 'upload\n' >"$ROOT/data/uploads/file.txt"
  printf 'asset\n' >"$ROOT/assets/file.txt"
  printf 'redis\n' >"$ROOT/data/redis/dump.rdb"
  printf 'migration\n' >"$ROOT/data/migration-backups/one.sql"
  printf 'SECRET=fixture-only\n' >"$ROOT/.env-prod"
  chmod 600 "$ROOT/.env-prod"
  node scripts/runtime-state-manifest-v2.mjs create --root "$ROOT" --manifest "$MANIFEST" --inventory config/runtime-state-inventory.json >/dev/null
  node - "$METADATA" "$COMMIT" "$VERSION" "$NOW" <<'EOF'
const fs=require('fs'),[out,sourceCommit,releaseVersion,finishedAt]=process.argv.slice(2);fs.writeFileSync(out,JSON.stringify({schemaVersion:1,metadataType:'nln-runtime-state-capture',sourceCommit,releaseVersion,startedAt:finishedAt,finishedAt,postgresServerVersion:'13.16',pgDumpVersion:'13.16',appliedMigrations:['001_fixture'],databaseFacts:{tables:1,safeRowCounts:{fixture:1}}}),{mode:0o600});
EOF
  node scripts/runtime-state-archive-v2.mjs create --root "$ROOT" --manifest "$MANIFEST" --metadata "$METADATA" --archive "$ARCHIVE" --receipt "$ARCHIVE_RECEIPT" --inventory config/runtime-state-inventory.json >/dev/null
  node --input-type=module - "$IDENTITY" "$COMMIT" "$VERSION" "$NOW" <<'EOF'
import fs from'node:fs';import{createReleaseIdentity}from'./scripts/lib/release-identity.mjs';const[out,commitSha,releaseVersion,createdAt]=process.argv.slice(2),h='a'.repeat(64);fs.writeFileSync(out,JSON.stringify(createReleaseIdentity({releaseVersion,commitSha,repositoryId:'nln/fixture',trustedManifestId:'nln-trusted-validation-v1',trustedManifestSha256:h,immutablePolicyId:'nln-immutable-release-v1',immutablePolicySha256:h,bundleManifestSha256:h,environmentSchemaSha256:h,migrationMetadataSha256:h,createdAt,scope:'fixture'})),{mode:0o600});
EOF
  cat >"$LOCAL_RECEIPT" <<EOF
result=passed
commit=$COMMIT
created_at=$NOW
version=$VERSION
sensitive_data_retained=false
checks=backup-validated,allowlist-env,delivery-sink-canaries,empty-active-redis,internal-networks,egress-denied,sql-restored,api-health,ui-root,same-origin-api,reversible-admin-writes
EOF
  chmod 600 "$LOCAL_RECEIPT"
}

qualify() {
  node scripts/qualify-runtime-state-application-restore.mjs \
    --identity "$IDENTITY" --archive "$ARCHIVE" --archive-receipt "$ARCHIVE_RECEIPT" \
    --local-verification-receipt "$LOCAL_RECEIPT" --output "$OUTPUT" --now "$NOW"
}

@test "a verified v2 archive and isolated rehearsal produce typed application evidence" {
  run qualify
  [ "$status" -eq 0 ]
  [ "$(stat -c %a "$OUTPUT")" = 600 ]
  run node scripts/verify-release-receipt.mjs --receipt "$OUTPUT" \
    --type runtime-state-application-restore-verification --scope fixture \
    --version "$VERSION" --commit "$COMMIT" --now "$NOW"
  [ "$status" -eq 0 ]
  node -e 'const r=require(process.argv[1]);if(r.result.productionConnectivity||r.result.sensitiveDataRetained||!r.assuranceStates.includes("application-restore-verified"))process.exit(1)' "$OUTPUT"
  node - "$WORK/database.json" <<'EOF'
const fs=require('fs'),h='b'.repeat(64);fs.writeFileSync(process.argv[2],JSON.stringify({schemaVersion:1,receiptType:'nln-runtime-state-database-invariant-verification',contractId:'fixture-contract',contractSha256:h,expectedSha256:h,observedSha256:h,status:'passed'}),{mode:0o600});
EOF
  run node scripts/qualify-runtime-state-backup.mjs --identity "$IDENTITY" \
    --archive "$ARCHIVE" --archive-receipt "$ARCHIVE_RECEIPT" \
    --database-receipt "$WORK/database.json" --application-receipt "$OUTPUT" \
    --profile application --output "$WORK/application-backup.json" --now "$NOW"
  [ "$status" -eq 0 ]
  run node scripts/verify-release-receipt.mjs --receipt "$WORK/application-backup.json" \
    --type runtime-state-backup-qualification --scope fixture \
    --version "$VERSION" --commit "$COMMIT" --now "$NOW"
  [ "$status" -eq 0 ]
}

@test "missing isolation checks and retained sensitive data fail closed" {
  sed -i 's/,egress-denied//' "$LOCAL_RECEIPT"
  run qualify
  [ "$status" -ne 0 ]; [ ! -e "$OUTPUT" ]
  sed -i 's/internal-networks,/internal-networks,egress-denied,/' "$LOCAL_RECEIPT"
  sed -i 's/sensitive_data_retained=false/sensitive_data_retained=true/' "$LOCAL_RECEIPT"
  run qualify
  [ "$status" -ne 0 ]; [ ! -e "$OUTPUT" ]
}

@test "wrong release identity and corrupt archive fail before publication" {
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.sourceCommit="f".repeat(40);fs.writeFileSync(p,JSON.stringify(v));fs.chmodSync(p,0o600)' "$ARCHIVE_RECEIPT"
  run qualify
  [ "$status" -ne 0 ]; [ ! -e "$OUTPUT" ]
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.sourceCommit=process.argv[2];fs.writeFileSync(p,JSON.stringify(v));fs.chmodSync(p,0o600)' "$ARCHIVE_RECEIPT" "$COMMIT"
  printf 'corrupt' >>"$ARCHIVE"
  run qualify
  [ "$status" -ne 0 ]; [ ! -e "$OUTPUT" ]
}
