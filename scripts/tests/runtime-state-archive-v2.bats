#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

ARCHIVE_SCRIPT="$BATS_TEST_DIRNAME/../runtime-state-archive-v2.mjs"
MANIFEST_SCRIPT="$BATS_TEST_DIRNAME/../runtime-state-manifest-v2.mjs"
INVENTORY="$BATS_TEST_DIRNAME/../../config/runtime-state-inventory.json"

setup() {
    ROOT="$BATS_TMPDIR/archive-root-$BATS_TEST_NUMBER"
    ARCHIVE="$BATS_TMPDIR/runtime-state-$BATS_TEST_NUMBER.tar.gz"
    RECEIPT="$BATS_TMPDIR/runtime-state-$BATS_TEST_NUMBER.receipt.json"
    MANIFEST="$ROOT/runtime-state-manifest-v2.json"
    METADATA="$BATS_TMPDIR/metadata-$BATS_TEST_NUMBER.json"
    mkdir -p "$ROOT/data/uploads" "$ROOT/assets" "$ROOT/data/redis" "$ROOT/data/migration-backups"
    printf 'fixture sql\n' >"$ROOT/data/postgres.sql"
    printf 'upload\n' >"$ROOT/data/uploads/file.txt"
    printf 'asset\n' >"$ROOT/assets/file.txt"
    printf 'redis\n' >"$ROOT/data/redis/dump.rdb"
    printf 'migration\n' >"$ROOT/data/migration-backups/one.sql"
    printf 'SECRET=fixture\n' >"$ROOT/.env-prod"
    chmod 600 "$ROOT/.env-prod"
    node "$MANIFEST_SCRIPT" create --root "$ROOT" --manifest "$MANIFEST" --inventory "$INVENTORY" >/dev/null
    cat >"$METADATA" <<'EOF'
{"schemaVersion":1,"metadataType":"nln-runtime-state-capture","sourceCommit":"0123456789abcdef0123456789abcdef01234567","releaseVersion":"fixture-1","startedAt":"2026-01-01T00:00:00.000Z","finishedAt":"2026-01-01T00:00:01.000Z","postgresServerVersion":"16.4","pgDumpVersion":"16.4","appliedMigrations":["001_fixture"],"databaseFacts":{"tables":1,"safeRowCounts":{"users":2}}}
EOF
    chmod 600 "$METADATA"
}

create_archive() {
    node "$ARCHIVE_SCRIPT" create --root "$ROOT" --manifest "$MANIFEST" --metadata "$METADATA" --archive "$ARCHIVE" --receipt "$RECEIPT" --inventory "$INVENTORY"
}

@test "v2 archive creation and disposable extraction verification pass" {
    run create_archive
    [ "$status" -eq 0 ]
    [ "$(stat -c %a "$ARCHIVE")" = 600 ]
    [ "$(stat -c %a "$RECEIPT")" = 600 ]
    run node "$ARCHIVE_SCRIPT" verify --archive "$ARCHIVE" --receipt "$RECEIPT" --inventory "$INVENTORY"
    [ "$status" -eq 0 ]
    assert_output --partial "archive verified"
}

@test "disposable extraction preserves manifest modes under a restrictive caller umask" {
    grep -q '"--same-permissions"' "$ARCHIVE_SCRIPT"
    grep -q 'fs.mkdtempSync(path.join(os.tmpdir(), "runtime-state-v2-verify-"))' "$ARCHIVE_SCRIPT"
}

@test "archives are reproducible for identical input" {
    create_archive >/dev/null
    FIRST_HASH=$(sha256sum "$ARCHIVE" | cut -d' ' -f1)
    rm "$ARCHIVE" "$RECEIPT"
    create_archive >/dev/null
    [ "$(sha256sum "$ARCHIVE" | cut -d' ' -f1)" = "$FIRST_HASH" ]
}

@test "corrupt and truncated archives fail before extraction" {
    create_archive >/dev/null
    printf 'corrupt' >>"$ARCHIVE"
    run node "$ARCHIVE_SCRIPT" verify --archive "$ARCHIVE" --receipt "$RECEIPT" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "archive size does not match receipt"
}

@test "changed content and manifest evidence fail closed" {
    printf 'changed\n' >"$ROOT/assets/file.txt"
    run create_archive
    [ "$status" -ne 0 ]
    assert_output --partial "content verification failed"
}

@test "unsafe metadata and permissions fail closed without leaking values" {
    chmod 644 "$METADATA"
    run create_archive
    [ "$status" -ne 0 ]
    assert_output --partial "capture metadata must be owner-only"
    refute_output --partial "SECRET=fixture"
}

@test "existing evidence and extraction destinations are never overwritten" {
    printf 'keep\n' >"$ARCHIVE"
    run create_archive
    [ "$status" -ne 0 ]
    [ "$(cat "$ARCHIVE")" = keep ]
    rm "$ARCHIVE"
    create_archive >/dev/null
    EXTRACT="$BATS_TMPDIR/existing-extract-$BATS_TEST_NUMBER"
    mkdir "$EXTRACT"
    run node "$ARCHIVE_SCRIPT" verify --archive "$ARCHIVE" --receipt "$RECEIPT" --extract-to "$EXTRACT" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "extract destination already exists"
}

@test "receipt tampering and wrong inventory fail closed" {
    create_archive >/dev/null
    node -e 'const fs=require("fs"),p=process.argv[1],r=require(p);r.archiveSha256="0".repeat(64);fs.writeFileSync(p,JSON.stringify(r));fs.chmodSync(p,0o600)' "$RECEIPT"
    run node "$ARCHIVE_SCRIPT" verify --archive "$ARCHIVE" --receipt "$RECEIPT" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "archive hash does not match receipt"

    rm "$ARCHIVE" "$RECEIPT"
    create_archive >/dev/null
    WRONG_INVENTORY="$BATS_TMPDIR/wrong-inventory-$BATS_TEST_NUMBER.json"
    cp "$INVENTORY" "$WRONG_INVENTORY"
    node -e 'const fs=require("fs"),p=process.argv[1],i=require(p);i.inventoryId="wrong";fs.writeFileSync(p,JSON.stringify(i))' "$WRONG_INVENTORY"
    run node "$ARCHIVE_SCRIPT" verify --archive "$ARCHIVE" --receipt "$RECEIPT" --inventory "$WRONG_INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "content verification failed"
}
