#!/usr/bin/env bats
setup() {
  WORK="$BATS_TEST_TMPDIR/backup-qualification-$BATS_TEST_NUMBER"; ROOT="$WORK/root"; mkdir -p "$ROOT/data/uploads" "$ROOT/assets" "$ROOT/data/redis" "$ROOT/data/migration-backups"
  printf 'fixture sql\n' >"$ROOT/data/postgres.sql"; printf 'upload\n' >"$ROOT/data/uploads/file"; printf 'asset\n' >"$ROOT/assets/file"; printf 'redis\n' >"$ROOT/data/redis/dump.rdb"; printf 'migration\n' >"$ROOT/data/migration-backups/one.sql"; printf 'SECRET=fixture\n' >"$ROOT/.env-prod"; chmod 600 "$ROOT/.env-prod"
  COMMIT=$(printf 'a%.0s' {1..40}); H=$(printf 'b%.0s' {1..64}); NOW=2026-01-01T00:00:02.000Z
  node scripts/runtime-state-manifest-v2.mjs create --root "$ROOT" --manifest "$ROOT/manifest.json" >/dev/null
  cat >"$WORK/metadata.json" <<EOF
{"schemaVersion":1,"metadataType":"nln-runtime-state-capture","sourceCommit":"$COMMIT","releaseVersion":"10.0.0","startedAt":"2026-01-01T00:00:00.000Z","finishedAt":"2026-01-01T00:00:01.000Z","postgresServerVersion":"13.1","pgDumpVersion":"13.1","appliedMigrations":["001_fixture"],"databaseFacts":{"tables":1}}
EOF
  chmod 600 "$WORK/metadata.json"
  node scripts/runtime-state-archive-v2.mjs create --root "$ROOT" --manifest "$ROOT/manifest.json" --metadata "$WORK/metadata.json" --archive "$WORK/archive.tar.gz" --receipt "$WORK/archive.json" >/dev/null
  node --input-type=module - "$WORK/identity.json" "$COMMIT" "$H" <<'EOF'
import fs from'node:fs';import{createReleaseIdentity}from'./scripts/lib/release-identity.mjs';const[o,c,h]=process.argv.slice(2);fs.writeFileSync(o,JSON.stringify(createReleaseIdentity({releaseVersion:'10.0.0',commitSha:c,repositoryId:'nln/fixture',trustedManifestId:'trusted-v1',trustedManifestSha256:h,immutablePolicyId:'immutable-v1',immutablePolicySha256:h,bundleManifestSha256:h,environmentSchemaSha256:h,migrationMetadataSha256:h,createdAt:'2026-01-01T00:00:00.000Z',scope:'fixture'})),{mode:0o600});
EOF
  cat >"$WORK/database.json" <<EOF
{"schemaVersion":1,"receiptType":"nln-runtime-state-database-invariant-verification","contractId":"fixture","contractSha256":"$H","expectedSha256":"$H","observedSha256":"$H","status":"passed"}
EOF
  chmod 600 "$WORK/database.json"
}
qualify() { run node scripts/qualify-runtime-state-backup.mjs --identity "$WORK/identity.json" --archive "$WORK/archive.tar.gz" --archive-receipt "$WORK/archive.json" --database-receipt "$WORK/database.json" --profile database --output "$WORK/qualified.json" --now "$NOW"; }

@test "database assurance produces canonical hash-bound qualification" {
  qualify; [ "$status" -eq 0 ]; [ "$(stat -c %a "$WORK/qualified.json")" = 600 ]
  node -e 'const r=require(process.argv[1]);if(r.result.profile!=="database"||!r.result.assuranceStates.includes("database-restore-verified")||r.childReceipts.length!==2)process.exit(1)' "$WORK/qualified.json"
  run node scripts/verify-release-receipt.mjs --receipt "$WORK/qualified.json" --type runtime-state-backup-qualification --scope fixture --version 10.0.0 --commit "$COMMIT" --now "$NOW" --max-age-seconds 10
  [ "$status" -eq 0 ]
  run node scripts/release.mjs verify-backup --receipt "$WORK/qualified.json" --identity "$WORK/identity.json" --now "$NOW"
  [ "$status" -eq 0 ]
}

@test "stronger profiles cannot be satisfied by weaker evidence" {
  run node scripts/qualify-runtime-state-backup.mjs --identity "$WORK/identity.json" --archive "$WORK/archive.tar.gz" --archive-receipt "$WORK/archive.json" --database-receipt "$WORK/database.json" --profile application --output "$WORK/application.json" --now "$NOW"
  [ "$status" -ne 0 ]; [[ "$output" == *"application-restore-verified"* ]]; [ ! -e "$WORK/application.json" ]
  run node scripts/qualify-runtime-state-backup.mjs --identity "$WORK/identity.json" --archive "$WORK/archive.tar.gz" --archive-receipt "$WORK/archive.json" --profile integrity --output "$WORK/integrity.json" --now "$NOW"
  [ "$status" -eq 0 ]
  run node scripts/release.mjs verify-backup --receipt "$WORK/integrity.json" --identity "$WORK/identity.json" --now "$NOW"
  [ "$status" -ne 0 ]
}

@test "qualification rejects wrong release corrupted evidence and overwrite" {
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.releaseVersion="9.0.0";fs.writeFileSync(p,JSON.stringify(v));fs.chmodSync(p,0o600)' "$WORK/archive.json"
  qualify; [ "$status" -ne 0 ]; [ ! -e "$WORK/qualified.json" ]
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.releaseVersion="10.0.0";fs.writeFileSync(p,JSON.stringify(v));fs.chmodSync(p,0o600)' "$WORK/archive.json"
  printf 'corrupt' >>"$WORK/archive.tar.gz"
  qualify; [ "$status" -ne 0 ]; [ ! -e "$WORK/qualified.json" ]
}
