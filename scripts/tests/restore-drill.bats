#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../restore-drill.sh"

make_backup() {
    BACKUP_INPUT="${BATS_TMPDIR}/backup"
    BACKUP_DIR="${BACKUP_INPUT}/runtime-state"
    mkdir -p "${BACKUP_DIR}/data/uploads" \
        "${BACKUP_DIR}/assets" \
        "${BACKUP_DIR}/data/redis" \
        "${BACKUP_DIR}/data/migration-backups"
    printf 'upload\n' >"${BACKUP_DIR}/data/uploads/README"
    printf 'asset\n' >"${BACKUP_DIR}/assets/README"
    printf 'redis\n' >"${BACKUP_DIR}/data/redis/README"
    printf 'migration\n' >"${BACKUP_DIR}/data/migration-backups/README"
    printf 'select 1;\n' >"${BACKUP_DIR}/data/postgres.sql"
    cat >"${BACKUP_DIR}/.env-prod" <<'EOF'
DB_NAME=nln_restore_drill
DB_USER=nln_restore_drill
DB_PASSWORD=restore-drill-password
EOF
    cat >"${BACKUP_DIR}/manifest.txt" <<'EOF'
backup_type=runtime-state
paths:
- data/postgres.sql
- data/uploads
- assets
- data/redis
- data/migration-backups
- .env-prod
EOF
}

write_executable() {
    local path="$1"
    local body="$2"
    printf '%s\n' "${body}" >"${path}"
    chmod +x "${path}"
}

setup() {
    mkdir -p "${BATS_MOCK_BINDIR}"
    export RESTORE_DRILL_LOG="${BATS_TMPDIR}/restore-drill.log"
    export RESTORE_DRILL_RECEIPT_DIR="${BATS_TMPDIR}/receipts"
    make_backup

    MIGRATION_REHEARSAL_SCRIPT="${BATS_TMPDIR}/migration-rehearsal"
    RESTORE_RUNTIME_STATE_SCRIPT="${BATS_TMPDIR}/restore-runtime-state"
    BACKUP_SCRIPT="${BATS_TMPDIR}/backup-script"

    write_executable "${MIGRATION_REHEARSAL_SCRIPT}" '#!/usr/bin/env bash
echo "migration-rehearsal:$*" >>"${RESTORE_DRILL_LOG}"'

    write_executable "${RESTORE_RUNTIME_STATE_SCRIPT}" '#!/usr/bin/env bash
echo "restore-runtime-state:$*" >>"${RESTORE_DRILL_LOG}"
echo "backup-base:${RUNTIME_STATE_BACKUP_BASE}" >>"${RESTORE_DRILL_LOG}"
echo "project-dir:${RUNTIME_STATE_PROJECT_DIR}" >>"${RESTORE_DRILL_LOG}"'

    export VERIFIED_BACKUP="${BACKUP_INPUT}"

    write_executable "${BACKUP_SCRIPT}" '#!/usr/bin/env bash
echo "backup:$*" >>"${RESTORE_DRILL_LOG}"
mkdir -p "${VERIFIED_BACKUP}"
echo "backup_dir=${VERIFIED_BACKUP}"'
}

teardown() {
    rm -rf "${BATS_TMPDIR}"
}

run_restore_drill() {
    run env \
        MIGRATION_REHEARSAL_SCRIPT="${MIGRATION_REHEARSAL_SCRIPT}" \
        RESTORE_RUNTIME_STATE_SCRIPT="${RESTORE_RUNTIME_STATE_SCRIPT}" \
        BACKUP_SCRIPT="${BACKUP_SCRIPT}" \
        VERIFIED_BACKUP="${VERIFIED_BACKUP}" \
        RESTORE_DRILL_LOG="${RESTORE_DRILL_LOG}" \
        RESTORE_DRILL_RECEIPT_DIR="${RESTORE_DRILL_RECEIPT_DIR}" \
        "$SCRIPT_PATH" "$@"
}

@test "restore drill validates backup, rehearses migrations, and dry-runs restore" {
    run_restore_drill --backup "${BACKUP_INPUT}"

    assert_equal "$status" 0
    grep -q '^migration-rehearsal:--backup '"${BACKUP_INPUT}"'$' "${RESTORE_DRILL_LOG}"
    grep -q '^restore-runtime-state:-v restore-drill$' "${RESTORE_DRILL_LOG}"
    receipt=$(find "${RESTORE_DRILL_RECEIPT_DIR}" -name 'restore-drill-*.receipt' | head -1)
    [ -f "${receipt}" ]
    grep -q '^migration_rehearsal=passed$' "${receipt}"
    grep -q '^restore_dry_run=passed$' "${receipt}"
}

@test "restore drill can create a verified backup first" {
    run_restore_drill --create-backup -e "${BATS_TMPDIR}/.env-prod"

    assert_equal "$status" 0
    grep -q '^backup:-e '"${BATS_TMPDIR}/.env-prod"' --verify-restore --print-backup-dir$' "${RESTORE_DRILL_LOG}"
    grep -q '^migration-rehearsal:--backup '"${BACKUP_INPUT}"'$' "${RESTORE_DRILL_LOG}"
}

@test "restore drill rejects missing backup path before rehearsal" {
    run_restore_drill --backup "${BATS_TMPDIR}/missing"

    assert_equal "$status" 1
    assert_output --partial "Backup path does not exist"
    [ ! -f "${RESTORE_DRILL_LOG}" ]
}

@test "restore drill rejects backup missing required SQL dump" {
    rm -f "${BACKUP_DIR}/data/postgres.sql"

    run_restore_drill --backup "${BACKUP_INPUT}"

    assert_equal "$status" 1
    assert_output --partial "data/postgres.sql"
    [ ! -f "${RESTORE_DRILL_LOG}" ]
}
