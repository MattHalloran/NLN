#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT="$BATS_TEST_DIRNAME/../verify-runtime-state-backup.mjs"
INVENTORY="$BATS_TEST_DIRNAME/../../config/runtime-state-inventory.json"

setup() {
    ROOT="$BATS_TMPDIR/compat-$BATS_TEST_NUMBER"
    CONTENT="$ROOT/content"
    BACKUP="$ROOT/legacy"
    RECEIPT="$ROOT/evidence/receipt.json"
    mkdir -p "$CONTENT/data/uploads" "$CONTENT/assets" "$CONTENT/data/redis" \
        "$CONTENT/data/migration-backups" "$BACKUP"
    printf 'sql fixture\n' >"$CONTENT/data/postgres.sql"
    printf 'secret=fixture\n' >"$CONTENT/.env-prod"
    chmod 600 "$CONTENT/.env-prod"
    tar -czf "$BACKUP/runtime-state.tar.gz" -C "$CONTENT" .
    chmod 700 "$ROOT" "$BACKUP"
    chmod 600 "$BACKUP/runtime-state.tar.gz"
    HASH=$(sha256sum "$BACKUP/runtime-state.tar.gz" | cut -d' ' -f1)
    printf 'backup_type=runtime-state\ndatabase_dump=data/postgres.sql\narchive=runtime-state.tar.gz\nsha256=%s\n' \
        "$HASH" >"$BACKUP/manifest.txt"
    chmod 600 "$BACKUP/manifest.txt"
}

@test "legacy reader verifies archive and states its limited assurance" {
    run node "$SCRIPT" --backup "$BACKUP" --receipt-output "$RECEIPT" --inventory "$INVENTORY"
    [ "$status" -eq 0 ]
    assert_output --partial "legacy-runtime-state-v1"
    [ "$(stat -c %a "$RECEIPT")" = 600 ]
    run node -e 'const r=require(process.argv[1]); if(r.status!=="passed" || r.assurance!=="legacy-integrity-only" || !r.limitations.includes("no-per-file-hashes")) process.exit(1)' "$RECEIPT"
    [ "$status" -eq 0 ]
}

@test "legacy reader rejects corruption, missing content, and unsafe permissions" {
    printf 'corrupt' >>"$BACKUP/runtime-state.tar.gz"
    run node "$SCRIPT" --backup "$BACKUP" --receipt-output "$RECEIPT" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "hash does not match"

    rm -rf "$BACKUP" "$CONTENT/data/uploads"
    mkdir -p "$BACKUP"
    tar -czf "$BACKUP/runtime-state.tar.gz" -C "$CONTENT" .
    chmod 700 "$BACKUP"
    chmod 600 "$BACKUP/runtime-state.tar.gz"
    HASH=$(sha256sum "$BACKUP/runtime-state.tar.gz" | cut -d' ' -f1)
    printf 'backup_type=runtime-state\narchive=runtime-state.tar.gz\nsha256=%s\n' "$HASH" >"$BACKUP/manifest.txt"
    chmod 600 "$BACKUP/manifest.txt"
    run node "$SCRIPT" --backup "$BACKUP" --receipt-output "$RECEIPT" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "missing critical path: data/uploads"

    mkdir -p "$CONTENT/data/uploads"
    chmod 755 "$BACKUP"
    run node "$SCRIPT" --backup "$BACKUP" --receipt-output "$RECEIPT" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "directory must be owner-only"
}

@test "compatibility evidence is never overwritten" {
    mkdir -p "$(dirname "$RECEIPT")"
    printf 'existing\n' >"$RECEIPT"
    run node "$SCRIPT" --backup "$BACKUP" --receipt-output "$RECEIPT" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "refusing to overwrite evidence"
    [ "$(cat "$RECEIPT")" = existing ]
}

@test "v2 archives are delegated to the strict v2 verifier" {
    V2_ROOT="$ROOT/v2-content"
    V2_MANIFEST="$V2_ROOT/content-manifest.json"
    V2_METADATA="$ROOT/metadata.json"
    V2_ARCHIVE="$ROOT/archive.tar.gz"
    V2_RECEIPT="$ROOT/archive-receipt.json"
    cp -a "$CONTENT" "$V2_ROOT"
    chmod 700 "$V2_ROOT"
    node "$BATS_TEST_DIRNAME/../runtime-state-manifest-v2.mjs" create \
        --root "$V2_ROOT" --manifest "$V2_MANIFEST" --inventory "$INVENTORY"
    printf '%s\n' '{"schemaVersion":1,"metadataType":"nln-runtime-state-capture","sourceCommit":"0123456789abcdef0123456789abcdef01234567","releaseVersion":"fixture-1","startedAt":"2026-01-01T00:00:00.000Z","finishedAt":"2026-01-01T00:00:01.000Z","postgresServerVersion":"13.0","pgDumpVersion":"13.0","appliedMigrations":[],"databaseFacts":{}}' >"$V2_METADATA"
    chmod 600 "$V2_METADATA"
    node "$BATS_TEST_DIRNAME/../runtime-state-archive-v2.mjs" create \
        --root "$V2_ROOT" --manifest "$V2_MANIFEST" --metadata "$V2_METADATA" \
        --archive "$V2_ARCHIVE" --receipt "$V2_RECEIPT" --inventory "$INVENTORY"
    run node "$SCRIPT" --backup "$V2_ARCHIVE" --v2-receipt "$V2_RECEIPT" \
        --receipt-output "$RECEIPT" --inventory "$INVENTORY"
    [ "$status" -eq 0 ]
    assert_output --partial "runtime-state-v2"
    run node -e 'const r=require(process.argv[1]); if(r.assurance!=="per-object-cryptographic-integrity") process.exit(1)' "$RECEIPT"
    [ "$status" -eq 0 ]
}
