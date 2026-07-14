#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

PUBLISH="$BATS_TEST_DIRNAME/../publish-runtime-state-backup.mjs"
ARCHIVE_TOOL="$BATS_TEST_DIRNAME/../runtime-state-archive-v2.mjs"
MANIFEST_TOOL="$BATS_TEST_DIRNAME/../runtime-state-manifest-v2.mjs"
PROVIDER="$BATS_TEST_DIRNAME/fixtures/runtime-state-s3-emulator-provider.mjs"
INVENTORY="$BATS_TEST_DIRNAME/../../config/runtime-state-inventory.json"
POLICY="$BATS_TEST_DIRNAME/../../config/runtime-state-remote-storage-policy.json"
MINIO_IMAGE="minio/minio@sha256:a1ea29fa28355559ef137d71fc570e508a214ec84ff8083e39bc5428980b015e"
MC_IMAGE="minio/mc@sha256:aead63c77f9db9107f1696fb08ecb0faeda23729cde94b0f663edf4fe09728e3"

setup_file() {
    [ "${RUN_RUNTIME_STATE_S3_EMULATOR:-0}" = 1 ] || skip "set RUN_RUNTIME_STATE_S3_EMULATOR=1 for the disposable S3/real-age integration"
    command -v docker >/dev/null || skip "docker is unavailable"
    command -v age >/dev/null || skip "age is unavailable"
    command -v age-keygen >/dev/null || skip "age-keygen is unavailable"
    docker info >/dev/null 2>&1 || skip "docker daemon is unavailable"
    export EMULATOR_ID="runtime-state-s3-$$"
    export EMULATOR_NETWORK="$EMULATOR_ID"
    export EMULATOR_SERVER="$EMULATOR_ID-server"
    export EMULATOR_MC="$EMULATOR_ID-mc"
    export RUNTIME_STATE_S3_MC_CONTAINER="$EMULATOR_MC"
    export RUNTIME_STATE_S3_BUCKET="runtime-state-fixture"
    export RUNTIME_STATE_S3_ALIAS="fixture"
    export MINIO_ROOT_USER="fixture-access-only"
    export MINIO_ROOT_PASSWORD="fixture-secret-only-123456"
    docker network create --internal "$EMULATOR_NETWORK" >/dev/null
    docker run -d --rm --name "$EMULATOR_SERVER" --network "$EMULATOR_NETWORK" -e MINIO_ROOT_USER -e MINIO_ROOT_PASSWORD "$MINIO_IMAGE" server /data >/dev/null
    docker run -d --rm --name "$EMULATOR_MC" --network "$EMULATOR_NETWORK" --entrypoint sh "$MC_IMAGE" -c 'while :; do sleep 3600; done' >/dev/null
    ready=0
    for _ in $(seq 1 30); do
        if docker exec "$EMULATOR_MC" mc alias set fixture http://"$EMULATOR_SERVER":9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1; then ready=1; break; fi
        sleep 1
    done
    [ "$ready" -eq 1 ]
    docker exec "$EMULATOR_MC" mc mb --with-lock fixture/"$RUNTIME_STATE_S3_BUCKET" >/dev/null
    docker exec "$EMULATOR_MC" mc version enable fixture/"$RUNTIME_STATE_S3_BUCKET" >/dev/null
}

teardown_file() {
    [ -n "${EMULATOR_SERVER:-}" ] && docker rm -f "$EMULATOR_SERVER" >/dev/null 2>&1 || true
    [ -n "${EMULATOR_MC:-}" ] && docker rm -f "$EMULATOR_MC" >/dev/null 2>&1 || true
    [ -n "${EMULATOR_NETWORK:-}" ] && docker network rm "$EMULATOR_NETWORK" >/dev/null 2>&1 || true
}

setup() {
    export RUNTIME_STATE_S3_MC_CONTAINER="$EMULATOR_MC" RUNTIME_STATE_S3_BUCKET="runtime-state-fixture" RUNTIME_STATE_S3_ALIAS="fixture"
    ROOT="$BATS_TMPDIR/s3-root-$BATS_TEST_NUMBER"; ARCHIVE="$BATS_TMPDIR/s3-$BATS_TEST_NUMBER.tar.gz"; ARCHIVE_RECEIPT="$BATS_TMPDIR/s3-$BATS_TEST_NUMBER.json"
    MANIFEST="$ROOT/runtime-state-manifest-v2.json"; METADATA="$BATS_TMPDIR/s3-metadata-$BATS_TEST_NUMBER.json"; IDENTITY="$BATS_TMPDIR/s3-identity-$BATS_TEST_NUMBER.txt"; RECIPIENT="$BATS_TMPDIR/s3-recipient-$BATS_TEST_NUMBER.txt"
    mkdir -p "$ROOT/data/uploads" "$ROOT/assets" "$ROOT/data/redis" "$ROOT/data/migration-backups"
    printf 'fixture sql\n' >"$ROOT/data/postgres.sql"; printf 'upload\n' >"$ROOT/data/uploads/file.txt"; printf 'asset\n' >"$ROOT/assets/file.txt"; printf 'redis\n' >"$ROOT/data/redis/dump.rdb"; printf 'migration\n' >"$ROOT/data/migration-backups/one.sql"; printf 'SECRET=s3-emulator-fixture\n' >"$ROOT/.env-prod"; chmod 600 "$ROOT/.env-prod"
    age-keygen -o "$IDENTITY" 2>"$RECIPIENT"; sed -i 's/^Public key: //' "$RECIPIENT"; chmod 600 "$IDENTITY" "$RECIPIENT"
    node "$MANIFEST_TOOL" create --root "$ROOT" --manifest "$MANIFEST" --inventory "$INVENTORY" >/dev/null
    printf '%s\n' '{"schemaVersion":1,"metadataType":"nln-runtime-state-capture","sourceCommit":"0123456789abcdef0123456789abcdef01234567","releaseVersion":"fixture-s3","startedAt":"2026-01-01T00:00:00.000Z","finishedAt":"2026-01-01T00:00:01.000Z","postgresServerVersion":"13.0","pgDumpVersion":"13.0","appliedMigrations":[],"databaseFacts":{"tables":1}}' >"$METADATA"; chmod 600 "$METADATA"
    node "$ARCHIVE_TOOL" create --root "$ROOT" --manifest "$MANIFEST" --metadata "$METADATA" --archive "$ARCHIVE" --receipt "$ARCHIVE_RECEIPT" --inventory "$INVENTORY" >/dev/null
}

@test "real age publication round-trips through an isolated versioned S3 emulator" {
    run node "$PUBLISH" --archive "$ARCHIVE" --archive-receipt "$ARCHIVE_RECEIPT" --recipient-file "$RECIPIENT" --identity-file "$IDENTITY" --backup-id "s3-$BATS_TEST_NUMBER" --provider-command "$PROVIDER" --age-command age --policy "$POLICY" --inventory "$INVENTORY"
    [ "$status" -eq 0 ]; assert_output --partial "publication qualified"
    run docker exec "$EMULATOR_MC" mc stat fixture/"$RUNTIME_STATE_S3_BUCKET"/qualified/"s3-$BATS_TEST_NUMBER"/receipt.json
    [ "$status" -eq 0 ]; refute_output --partial "s3-emulator-fixture"
}

@test "real age rejects the wrong identity without qualifying S3 objects" {
    WRONG_IDENTITY="$BATS_TMPDIR/s3-wrong-identity-$BATS_TEST_NUMBER.txt"
    age-keygen -o "$WRONG_IDENTITY" >/dev/null 2>&1
    chmod 600 "$WRONG_IDENTITY"
    run node "$PUBLISH" --archive "$ARCHIVE" --archive-receipt "$ARCHIVE_RECEIPT" --recipient-file "$RECIPIENT" --identity-file "$WRONG_IDENTITY" --backup-id "s3-$BATS_TEST_NUMBER" --provider-command "$PROVIDER" --age-command age --policy "$POLICY" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "age decryption failed"
    run docker exec "$EMULATOR_MC" mc stat fixture/"$RUNTIME_STATE_S3_BUCKET"/qualified/"s3-$BATS_TEST_NUMBER"/receipt.json
    [ "$status" -ne 0 ]
}

@test "corrupt S3 download fails before qualification" {
    run env RUNTIME_STATE_S3_CORRUPT_DOWNLOAD=1 RUNTIME_STATE_S3_MC_CONTAINER="$EMULATOR_MC" RUNTIME_STATE_S3_BUCKET="$RUNTIME_STATE_S3_BUCKET" RUNTIME_STATE_S3_ALIAS=fixture node "$PUBLISH" --archive "$ARCHIVE" --archive-receipt "$ARCHIVE_RECEIPT" --recipient-file "$RECIPIENT" --identity-file "$IDENTITY" --backup-id "s3-$BATS_TEST_NUMBER" --provider-command "$PROVIDER" --age-command age --policy "$POLICY" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "downloaded ciphertext hash mismatch"
    run docker exec "$EMULATOR_MC" mc stat fixture/"$RUNTIME_STATE_S3_BUCKET"/qualified/"s3-$BATS_TEST_NUMBER"/receipt.json
    [ "$status" -ne 0 ]
}

@test "interrupted S3 promotion leaves no qualification receipt" {
    run env RUNTIME_STATE_S3_FAIL_OPERATION=promote RUNTIME_STATE_S3_MC_CONTAINER="$EMULATOR_MC" RUNTIME_STATE_S3_BUCKET="$RUNTIME_STATE_S3_BUCKET" RUNTIME_STATE_S3_ALIAS=fixture node "$PUBLISH" --archive "$ARCHIVE" --archive-receipt "$ARCHIVE_RECEIPT" --recipient-file "$RECIPIENT" --identity-file "$IDENTITY" --backup-id "s3-$BATS_TEST_NUMBER" --provider-command "$PROVIDER" --age-command age --policy "$POLICY" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "provider promotion failed"
    run docker exec "$EMULATOR_MC" mc stat fixture/"$RUNTIME_STATE_S3_BUCKET"/qualified/"s3-$BATS_TEST_NUMBER"/receipt.json
    [ "$status" -ne 0 ]
}
