#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

PUBLISH="$BATS_TEST_DIRNAME/../publish-runtime-state-backup.mjs"
ARCHIVE_TOOL="$BATS_TEST_DIRNAME/../runtime-state-archive-v2.mjs"
MANIFEST_TOOL="$BATS_TEST_DIRNAME/../runtime-state-manifest-v2.mjs"
INVENTORY="$BATS_TEST_DIRNAME/../../config/runtime-state-inventory.json"
POLICY="$BATS_TEST_DIRNAME/../../config/runtime-state-remote-storage-policy.json"
PROVIDER="$BATS_TEST_DIRNAME/fixtures/runtime-state-local-provider.mjs"
AGE="$BATS_TEST_DIRNAME/fixtures/age-stub.sh"

setup() {
    ROOT="$BATS_TMPDIR/publish-root-$BATS_TEST_NUMBER"
    PROVIDER_ROOT="$BATS_TMPDIR/provider-$BATS_TEST_NUMBER"
    ARCHIVE="$BATS_TMPDIR/archive-$BATS_TEST_NUMBER.tar.gz"
    ARCHIVE_RECEIPT="$BATS_TMPDIR/archive-$BATS_TEST_NUMBER.json"
    MANIFEST="$ROOT/runtime-state-manifest-v2.json"
    METADATA="$BATS_TMPDIR/metadata-$BATS_TEST_NUMBER.json"
    KEY="$BATS_TMPDIR/key-$BATS_TEST_NUMBER.txt"
    OUTPUT_RECEIPT="$BATS_TMPDIR/publication-$BATS_TEST_NUMBER.json"
    mkdir -p "$ROOT/data/uploads" "$ROOT/assets" "$ROOT/data/redis" "$ROOT/data/migration-backups" "$PROVIDER_ROOT"
    printf 'fixture sql\n' >"$ROOT/data/postgres.sql"
    printf 'upload\n' >"$ROOT/data/uploads/file.txt"
    printf 'asset\n' >"$ROOT/assets/file.txt"
    printf 'redis\n' >"$ROOT/data/redis/dump.rdb"
    printf 'migration\n' >"$ROOT/data/migration-backups/one.sql"
    printf 'SECRET=fixture-only\n' >"$ROOT/.env-prod"
    printf 'fixture-recipient-private-material\n' >"$KEY"
    chmod 600 "$ROOT/.env-prod" "$KEY"
    node "$MANIFEST_TOOL" create --root "$ROOT" --manifest "$MANIFEST" --inventory "$INVENTORY" >/dev/null
    printf '%s\n' '{"schemaVersion":1,"metadataType":"nln-runtime-state-capture","sourceCommit":"0123456789abcdef0123456789abcdef01234567","releaseVersion":"fixture-1","startedAt":"2026-01-01T00:00:00.000Z","finishedAt":"2026-01-01T00:00:01.000Z","postgresServerVersion":"13.0","pgDumpVersion":"13.0","appliedMigrations":[],"databaseFacts":{"tables":1}}' >"$METADATA"
    chmod 600 "$METADATA"
    node "$ARCHIVE_TOOL" create --root "$ROOT" --manifest "$MANIFEST" --metadata "$METADATA" --archive "$ARCHIVE" --receipt "$ARCHIVE_RECEIPT" --inventory "$INVENTORY" >/dev/null
}

publish() {
    FIXTURE_PROVIDER_ROOT="$PROVIDER_ROOT" node "$PUBLISH" --archive "$ARCHIVE" \
        --archive-receipt "$ARCHIVE_RECEIPT" --recipient-file "$KEY" --identity-file "$KEY" --backup-id fixture-v1 \
        --provider-command "$PROVIDER" --age-command "$AGE" --policy "$POLICY" \
        --inventory "$INVENTORY" --receipt "$OUTPUT_RECEIPT"
}

@test "encrypted fixture publication stages promotes downloads and restores" {
    run publish
    [ "$status" -eq 0 ]
    assert_output --partial "publication qualified"
    [ ! -e "$PROVIDER_ROOT/staging/fixture-v1" ]
    [ -f "$PROVIDER_ROOT/qualified/fixture-v1/archive.age" ]
    [ "$(stat -c %a "$OUTPUT_RECEIPT")" = 600 ]
    ! grep -q 'SECRET=fixture-only' "$PROVIDER_ROOT/qualified/fixture-v1/archive.age"
}

@test "interrupted upload never creates a qualified publication and cleans staging" {
    run env FIXTURE_PROVIDER_FAIL=put FIXTURE_PROVIDER_ROOT="$PROVIDER_ROOT" node "$PUBLISH" --archive "$ARCHIVE" --archive-receipt "$ARCHIVE_RECEIPT" --recipient-file "$KEY" --identity-file "$KEY" --backup-id fixture-v1 --provider-command "$PROVIDER" --age-command "$AGE" --policy "$POLICY"
    [ "$status" -ne 0 ]
    [ ! -e "$PROVIDER_ROOT/qualified/fixture-v1" ]
    [ ! -e "$PROVIDER_ROOT/staging/fixture-v1" ]
}

@test "corrupt downloaded ciphertext fails qualification evidence" {
    run env FIXTURE_PROVIDER_CORRUPT_DOWNLOAD=1 FIXTURE_PROVIDER_ROOT="$PROVIDER_ROOT" node "$PUBLISH" --archive "$ARCHIVE" --archive-receipt "$ARCHIVE_RECEIPT" --recipient-file "$KEY" --identity-file "$KEY" --backup-id fixture-v1 --provider-command "$PROVIDER" --age-command "$AGE" --policy "$POLICY"
    [ "$status" -ne 0 ]
    assert_output --partial "downloaded ciphertext hash mismatch"
    [ ! -e "$PROVIDER_ROOT/qualified/fixture-v1" ]
}

@test "wrong decryption key fails without exposing key material" {
    WRONG="$BATS_TMPDIR/wrong-key-$BATS_TEST_NUMBER"; printf 'wrong-private-material\n' >"$WRONG"; chmod 600 "$WRONG"
    run env AGE_STUB_DECRYPT_KEY_FILE="$WRONG" FIXTURE_PROVIDER_ROOT="$PROVIDER_ROOT" node "$PUBLISH" --archive "$ARCHIVE" --archive-receipt "$ARCHIVE_RECEIPT" --recipient-file "$KEY" --identity-file "$KEY" --backup-id fixture-v1 --provider-command "$PROVIDER" --age-command "$AGE" --policy "$POLICY"
    [ "$status" -ne 0 ]
    assert_output --partial "age decryption failed"
    refute_output --partial "wrong-private-material"
    refute_output --partial "fixture-recipient-private-material"
}

@test "duplicate backup IDs cannot overwrite qualified objects" {
    publish >/dev/null
    rm "$OUTPUT_RECEIPT"
    run publish
    [ "$status" -ne 0 ]
    assert_output --partial "provider promotion failed"
}

@test "credentials and archive secrets are redacted from failure output" {
    run env PROVIDER_SECRET='provider-super-secret' FIXTURE_PROVIDER_FAIL=stat FIXTURE_PROVIDER_ROOT="$PROVIDER_ROOT" node "$PUBLISH" --archive "$ARCHIVE" --archive-receipt "$ARCHIVE_RECEIPT" --recipient-file "$KEY" --identity-file "$KEY" --backup-id fixture-v1 --provider-command "$PROVIDER" --age-command "$AGE" --policy "$POLICY"
    [ "$status" -ne 0 ]
    refute_output --partial "provider-super-secret"
    refute_output --partial "SECRET=fixture-only"
    refute_output --partial "fixture-recipient-private-material"
}
