#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

LOCK_HELPER="$BATS_TEST_DIRNAME/../deploy-lock.sh"
UTILS_HELPER="$BATS_TEST_DIRNAME/../utils.sh"

@test "deploy lock writes metadata and blocks a second holder" {
    lock_path="${BATS_TMPDIR}/deploy.lock"

    run bash -c "source '$UTILS_HELPER'; source '$LOCK_HELPER'; deploy_lock_acquire '$lock_path' deploy-production.sh 9.9.9 '$BATS_TEST_DIRNAME/../..'; grep -q '^command=deploy-production.sh$' '$lock_path'; flock -n '$lock_path' -c true"

    assert_equal "$status" 1
    grep -q '^version=9.9.9$' "${lock_path}"
    grep -q '^pid=' "${lock_path}"
}

@test "deploy lock can be disabled for isolated tests" {
    lock_path="${BATS_TMPDIR}/deploy.lock"

    run env DEPLOY_LOCK_DISABLED=true bash -c "source '$UTILS_HELPER'; source '$LOCK_HELPER'; deploy_lock_acquire '$lock_path' deploy-production.sh 9.9.9 '$BATS_TEST_DIRNAME/../..'"

    assert_equal "$status" 0
    [ ! -f "${lock_path}" ]
}

@test "deploy lock force flag cannot override active lock" {
    lock_path="${BATS_TMPDIR}/deploy.lock"
    printf 'command=other\npid=123\n' >"${lock_path}"

    run flock "${lock_path}" env DEPLOY_FORCE_LOCK=true bash -c "source '$UTILS_HELPER'; source '$LOCK_HELPER'; deploy_lock_acquire '$lock_path' deploy-production.sh 9.9.9 '$BATS_TEST_DIRNAME/../..'"

    assert_equal "$status" 1
    assert_output --partial "cannot override an actively held flock lock"
}
