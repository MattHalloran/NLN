#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

FRESHNESS="$BATS_TEST_DIRNAME/../check-runtime-state-backup-freshness.mjs"
CLEANUP="$BATS_TEST_DIRNAME/../cleanup-runtime-state-remote-backups.mjs"
PROVIDER="$BATS_TEST_DIRNAME/fixtures/runtime-state-local-provider.mjs"
POLICY="$BATS_TEST_DIRNAME/../../config/runtime-state-remote-storage-policy.json"

setup() {
    ROOT="$BATS_TMPDIR/remote-operations-$BATS_TEST_NUMBER"
    RECEIPT="$BATS_TMPDIR/remote-operations-$BATS_TEST_NUMBER.json"
    mkdir -p "$ROOT/qualified/recent" "$ROOT/qualified/old" "$ROOT/qualified/held"
    for id in recent old held; do
        printf 'ciphertext\n' >"$ROOT/qualified/$id/archive.age"
        printf 'checksum\n' >"$ROOT/qualified/$id/archive.sha256"
        printf '{}\n' >"$ROOT/qualified/$id/safe-manifest.json"
        printf '{}\n' >"$ROOT/qualified/$id/receipt.json"
    done
    printf 'hold\n' >"$ROOT/qualified/held/incident-hold"
    touch -d '2026-07-10T23:30:00Z' "$ROOT/qualified/recent"/*
    touch -d '2026-06-01T00:00:00Z' "$ROOT/qualified/old"/* "$ROOT/qualified/held"/*
}

add_expired_history() {
    for month in $(seq -w 1 24); do
        id="expired-$month"; mkdir -p "$ROOT/qualified/$id"
        for name in archive.age archive.sha256 safe-manifest.json receipt.json; do printf '{}\n' >"$ROOT/qualified/$id/$name"; done
        touch -d "2023-$(((10#$month - 1) % 12 + 1))-01 00:00:00 UTC" "$ROOT/qualified/$id"/*
        if [ "$month" -gt 12 ]; then touch -d "2024-$(((10#$month - 1) % 12 + 1))-01 00:00:00 UTC" "$ROOT/qualified/$id"/*; fi
    done
}

@test "fresh qualified metadata produces owner-only safe evidence" {
    run env FIXTURE_PROVIDER_ROOT="$ROOT" node "$FRESHNESS" --provider-command "$PROVIDER" --policy "$POLICY" --now 2026-07-11T00:00:00Z --receipt "$RECEIPT"
    [ "$status" -eq 0 ]
    assert_output --partial "freshness passed: recent"
    [ "$(stat -c %a "$RECEIPT")" = 600 ]
    [ "$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).latestBackupId)' "$RECEIPT")" = recent ]
}

@test "missing and stale qualified backups fail closed" {
    rm -rf "$ROOT/qualified"
    run env FIXTURE_PROVIDER_ROOT="$ROOT" node "$FRESHNESS" --provider-command "$PROVIDER" --policy "$POLICY" --now 2026-07-11T00:00:00Z
    [ "$status" -ne 0 ]; assert_output --partial "no qualified backup receipt"
    mkdir -p "$ROOT/qualified/old"; printf '{}\n' >"$ROOT/qualified/old/receipt.json"; touch -d '2026-06-01T00:00:00Z' "$ROOT/qualified/old/receipt.json"
    run env FIXTURE_PROVIDER_ROOT="$ROOT" node "$FRESHNESS" --provider-command "$PROVIDER" --policy "$POLICY" --now 2026-07-11T00:00:00Z
    [ "$status" -ne 0 ]; assert_output --partial "stale"
}

@test "future timestamps and malformed provider metadata fail closed" {
    touch -d '2026-07-12T00:00:00Z' "$ROOT/qualified/recent/receipt.json"
    run env FIXTURE_PROVIDER_ROOT="$ROOT" node "$FRESHNESS" --provider-command "$PROVIDER" --policy "$POLICY" --now 2026-07-11T00:00:00Z
    [ "$status" -ne 0 ]; assert_output --partial "future-dated"
    run env FIXTURE_PROVIDER_FAIL=list-safe-metadata FIXTURE_PROVIDER_ROOT="$ROOT" node "$FRESHNESS" --provider-command "$PROVIDER" --policy "$POLICY"
    [ "$status" -ne 0 ]; assert_output --partial "metadata listing failed"
}

@test "expired provider credentials are redacted" {
    run env PROVIDER_SECRET=expired-provider-token FIXTURE_PROVIDER_FAIL=list-safe-metadata FIXTURE_PROVIDER_ROOT="$ROOT" node "$FRESHNESS" --provider-command "$PROVIDER" --policy "$POLICY"
    [ "$status" -ne 0 ]
    refute_output --partial "expired-provider-token"
}

@test "retention defaults to dry-run and preserves qualified objects and holds" {
    add_expired_history
    run env FIXTURE_PROVIDER_ROOT="$ROOT" node "$CLEANUP" --provider-command "$PROVIDER" --policy "$POLICY" --older-than 2026-07-01T00:00:00Z --receipt "$RECEIPT"
    [ "$status" -eq 0 ]; assert_output --partial "dry-run:"
    [ "$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).candidateBackupIds.length)' "$RECEIPT")" -gt 0 ]
    [ -d "$ROOT/qualified/old" ]; [ -d "$ROOT/qualified/held" ]
    [ "$(stat -c %a "$RECEIPT")" = 600 ]
}

@test "retention execution requires exact confirmation and deletes only candidates" {
    add_expired_history
    run env FIXTURE_PROVIDER_ROOT="$ROOT" node "$CLEANUP" --provider-command "$PROVIDER" --policy "$POLICY" --older-than 2026-07-01T00:00:00Z --execute
    [ "$status" -ne 0 ]; assert_output --partial "exact deletion confirmation"
    run env FIXTURE_PROVIDER_ROOT="$ROOT" node "$CLEANUP" --provider-command "$PROVIDER" --policy "$POLICY" --older-than 2026-07-01T00:00:00Z --execute --confirm DELETE-QUALIFIED-BACKUPS
    [ "$status" -eq 0 ]; [ -d "$ROOT/qualified/recent" ]; [ -d "$ROOT/qualified/held" ]
    [ ! -e "$ROOT/qualified/expired-01" ]
}

@test "incomplete qualified backups stop all retention deletion" {
    rm "$ROOT/qualified/old/archive.sha256"
    run env FIXTURE_PROVIDER_ROOT="$ROOT" node "$CLEANUP" --provider-command "$PROVIDER" --policy "$POLICY" --older-than 2026-07-01T00:00:00Z --execute --confirm DELETE-QUALIFIED-BACKUPS
    [ "$status" -ne 0 ]; assert_output --partial "incomplete"
    [ -d "$ROOT/qualified/old" ]; [ -d "$ROOT/qualified/recent" ]
}

@test "retention receipts cannot be overwritten" {
    printf '{}\n' >"$RECEIPT"
    run env FIXTURE_PROVIDER_ROOT="$ROOT" node "$CLEANUP" --provider-command "$PROVIDER" --policy "$POLICY" --older-than 2026-07-01T00:00:00Z --receipt "$RECEIPT"
    [ "$status" -ne 0 ]; assert_output --partial "refusing to overwrite"
}
