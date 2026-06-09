#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

. "$BATS_TEST_DIRNAME/../utils.sh"
. "$BATS_TEST_DIRNAME/../runtime-state.sh"

make_runtime_backup() {
    BACKUP_DIR="${BATS_TMPDIR}/runtime-state"
    mkdir -p \
        "${BACKUP_DIR}/data/postgres" \
        "${BACKUP_DIR}/data/uploads" \
        "${BACKUP_DIR}/assets" \
        "${BACKUP_DIR}/data/redis" \
        "${BACKUP_DIR}/data/migration-backups"
    touch "${BACKUP_DIR}/.env-prod"
    cat >"${BACKUP_DIR}/manifest.txt" <<EOF
backup_type=runtime-state
paths:
EOF
}

teardown() {
    rm -rf "${BATS_TMPDIR}/runtime-state" "${BATS_TMPDIR}/version"
}

@test "runtime-state gate refuses missing backup before container changes" {
    run runtime_state_require_backup_before_container_change "${BATS_TMPDIR}/missing-runtime-state"

    assert_equal "$status" 1
    assert_output --partial "Refusing to stop containers"
}

@test "runtime-state validation accepts complete backup" {
    make_runtime_backup

    run runtime_state_validate_backup "${BACKUP_DIR}"

    assert_equal "$status" 0
}

@test "runtime-state validation rejects missing critical path" {
    make_runtime_backup
    rm -rf "${BACKUP_DIR}/data/uploads"

    run runtime_state_validate_backup "${BACKUP_DIR}"

    assert_equal "$status" 1
    assert_output --partial "data/uploads"
}

@test "rollback database selection prefers runtime-state backup over legacy postgres backup" {
    VERSION_DIR="${BATS_TMPDIR}/version"
    mkdir -p "${VERSION_DIR}/postgres"
    make_runtime_backup
    mkdir -p "${VERSION_DIR}"
    mv "${BACKUP_DIR}" "${VERSION_DIR}/runtime-state"

    run runtime_state_select_db_backup "${VERSION_DIR}"

    assert_equal "$status" 0
    assert_output "${VERSION_DIR}/runtime-state/data/postgres"
}

@test "rollback database selection supports legacy postgres backup" {
    VERSION_DIR="${BATS_TMPDIR}/version"
    mkdir -p "${VERSION_DIR}/postgres"

    run runtime_state_select_db_backup "${VERSION_DIR}"

    assert_equal "$status" 0
    assert_output "${VERSION_DIR}/postgres"
}
