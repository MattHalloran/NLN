#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../check-deploy-migration-gate.sh"

write_env_file() {
    ENV_FILE="${BATS_TMPDIR}/.env-prod"
    cat >"${ENV_FILE}" <<'EOF'
DB_NAME=nln_gate
DB_USER=nln_gate
DB_PASSWORD=nln_gate_password
EOF
}

make_migration() {
    local name="$1"
    local sql="$2"
    mkdir -p "${MIGRATION_ROOT}/${name}"
    printf '%s\n' "${sql}" >"${MIGRATION_ROOT}/${name}/migration.sql"
}

install_docker_stub() {
    cat >"${BATS_MOCK_BINDIR}/docker" <<'EOF'
#!/usr/bin/env bash
echo "docker:$*" >>"${MIGRATION_GATE_LOG}"
if [ "$1" = "ps" ]; then
  echo "nln_db"
  exit 0
fi
if [ "$1" = "exec" ]; then
  printf '%s\n' "${APPLIED_MIGRATIONS:-}"
  exit 0
fi
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/docker"
}

write_readiness_receipt() {
    local receipt_path="$1"
    local skipped="${2:-false}"
    cat >"${receipt_path}" <<EOF
version=9.9.9
commit=abc123
validation_command=validate:ci
validation_skipped=false
rehearsal_skipped=false
vps_skipped=false
migration_rehearsal_skipped=${skipped}
created_epoch=$(date -u +%s)
EOF
}

setup() {
    mkdir -p "${BATS_MOCK_BINDIR}"
    export MIGRATION_ROOT="${BATS_TMPDIR}/migrations"
    export MIGRATION_GATE_LOG="${BATS_TMPDIR}/migration-gate.log"
    mkdir -p "${MIGRATION_ROOT}"
    write_env_file
}

teardown() {
    rm -rf "${BATS_TMPDIR}"
}

@test "migration gate reports pending safe migrations without applying them" {
    make_migration "202607080001_safe" "CREATE TABLE example (id integer);"
    install_docker_stub

    run env APPLIED_MIGRATIONS="" MIGRATION_GATE_LOG="${MIGRATION_GATE_LOG}" "$SCRIPT_PATH" --migration-root "${MIGRATION_ROOT}" --env-file "${ENV_FILE}" --readiness-receipt "${BATS_TMPDIR}/receipt"

    assert_equal "$status" 0
    assert_output --partial "Pending production migration count: 1"
    assert_output --partial "Pending migrations were rehearsed against restored backup"
    assert_output --partial "202607080001_safe"
    refute grep -q 'migrate deploy' "${MIGRATION_GATE_LOG}"
}

@test "migration gate passes with zero pending migrations" {
    make_migration "202607080001_safe" "CREATE TABLE example (id integer);"
    install_docker_stub

    run env APPLIED_MIGRATIONS="202607080001_safe" MIGRATION_GATE_LOG="${MIGRATION_GATE_LOG}" "$SCRIPT_PATH" --migration-root "${MIGRATION_ROOT}" --env-file "${ENV_FILE}" --readiness-receipt "${BATS_TMPDIR}/receipt"

    assert_equal "$status" 0
    assert_output --partial "Pending production migration count: 0"
}

@test "migration gate blocks destructive migration without review marker" {
    make_migration "202607080001_drop" "DROP TABLE example;"
    install_docker_stub

    run env MIGRATION_GATE_LOG="${MIGRATION_GATE_LOG}" "$SCRIPT_PATH" --migration-root "${MIGRATION_ROOT}" --env-file "${ENV_FILE}" --readiness-receipt "${BATS_TMPDIR}/receipt"

    assert_equal "$status" 1
    assert_output --partial "Potentially destructive migration SQL requires an explicit review marker"
}

@test "migration gate allows destructive migration with review marker" {
    make_migration "202607080001_drop" "-- deploy-safe: allow-destructive-migration: tested rollback
DROP TABLE example;"
    install_docker_stub

    run env APPLIED_MIGRATIONS="" MIGRATION_GATE_LOG="${MIGRATION_GATE_LOG}" "$SCRIPT_PATH" --migration-root "${MIGRATION_ROOT}" --env-file "${ENV_FILE}" --readiness-receipt "${BATS_TMPDIR}/receipt"

    assert_equal "$status" 0
    assert_output --partial "Allowed destructive migration marker"
    assert_output --partial "Pending production migration count: 1"
}

@test "migration gate blocks missing readiness receipt by default" {
    make_migration "202607080001_safe" "CREATE TABLE example (id integer);"
    install_docker_stub

    run env APPLIED_MIGRATIONS="" MIGRATION_GATE_LOG="${MIGRATION_GATE_LOG}" "$SCRIPT_PATH" --migration-root "${MIGRATION_ROOT}" --env-file "${ENV_FILE}"

    assert_equal "$status" 1
    assert_output --partial "Readiness receipt proof is required"
}

@test "migration gate blocks unavailable DB status by default" {
    make_migration "202607080001_safe" "CREATE TABLE example (id integer);"

    cat >"${BATS_MOCK_BINDIR}/docker" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = "ps" ]; then
  exit 0
fi
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/docker"

    run "$SCRIPT_PATH" --migration-root "${MIGRATION_ROOT}" --env-file "${ENV_FILE}" --readiness-receipt "${BATS_TMPDIR}/receipt"

    assert_equal "$status" 1
    assert_output --partial "nln_db is not running"
}

@test "migration gate blocks receipt that skipped restored-backup migration rehearsal" {
    make_migration "202607080001_safe" "CREATE TABLE example (id integer);"
    install_docker_stub
    write_readiness_receipt "${BATS_TMPDIR}/receipt" "true"

    run env APPLIED_MIGRATIONS="" MIGRATION_GATE_LOG="${MIGRATION_GATE_LOG}" "$SCRIPT_PATH" --migration-root "${MIGRATION_ROOT}" --env-file "${ENV_FILE}" --readiness-receipt "${BATS_TMPDIR}/receipt"

    assert_equal "$status" 1
    assert_output --partial "does not prove restored-backup migration rehearsal"
}

@test "migration gate accepts receipt that records restored-backup migration rehearsal" {
    make_migration "202607080001_safe" "CREATE TABLE example (id integer);"
    install_docker_stub
    write_readiness_receipt "${BATS_TMPDIR}/receipt" "false"

    run env APPLIED_MIGRATIONS="" MIGRATION_GATE_LOG="${MIGRATION_GATE_LOG}" "$SCRIPT_PATH" --migration-root "${MIGRATION_ROOT}" --env-file "${ENV_FILE}" --readiness-receipt "${BATS_TMPDIR}/receipt"

    assert_equal "$status" 0
    assert_output --partial "Pending migrations were rehearsed against restored backup"
}
