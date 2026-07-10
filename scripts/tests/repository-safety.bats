#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../audit-public-repository-safety.sh"
INVENTORY_PATH="$BATS_TEST_DIRNAME/../../docs/deployment-surface-inventory.md"

setup() {
    tracked_fixture="$BATS_TEST_DIRNAME/../../repository-safety-fixture.tmp"
}

teardown() {
    git -C "$BATS_TEST_DIRNAME/../.." reset -q -- repository-safety-fixture.tmp 2>/dev/null || true
    rm -f "$tracked_fixture"
}

@test "repository safety audit passes without production environment access" {
    run "$SCRIPT_PATH"

    assert_success
    assert_output --partial "Repository safety audit passed"
}

@test "repository safety audit rejects a copied production value without printing it" {
    secret="fixture-secret-value-that-must-not-print"
    env_file="${BATS_TMPDIR}/fixture.env"
    printf 'JWT_SECRET=%s\n' "$secret" >"$env_file"
    printf '%s\n' "$secret" >"$tracked_fixture"
    git -C "$BATS_TEST_DIRNAME/../.." add -N -f repository-safety-fixture.tmp

    run "$SCRIPT_PATH" --env-file "$env_file"

    assert_failure
    assert_output --partial "local value for JWT_SECRET"
    refute_output --partial "$secret"
}

@test "repository safety audit rejects high-confidence private key content" {
    private_key_header='-----BEGIN TEST PRIVATE'" KEY-----"
    printf '%s\nfixture-data\n' "$private_key_header" >"$tracked_fixture"
    git -C "$BATS_TEST_DIRNAME/../.." add -N -f repository-safety-fixture.tmp

    run "$SCRIPT_PATH"

    assert_failure
    assert_output --partial "high-confidence secret pattern (private key)"
    assert_output --partial "repository-safety-fixture.tmp"
    refute_output --partial "fixture-data"
}

@test "deployment inventory records the supported command and ownership boundaries" {
    grep -q './scripts/deploy-production.sh -v <VERSION> -e .env-prod' "$INVENTORY_PATH"
    grep -q 'Routine public entry points' "$INVENTORY_PATH"
    grep -q 'Advanced mutation and recovery entry points' "$INVENTORY_PATH"
    grep -q 'Tests replace validation, health, SSH, backup, build, and deploy calls with' "$INVENTORY_PATH"
}
