#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

. "$BATS_TEST_DIRNAME/../utils.sh"
. "$BATS_TEST_DIRNAME/../runtime-state.sh"

make_runtime_backup() {
    BACKUP_DIR="${BATS_TMPDIR}/runtime-state"
    mkdir -p \
        "${BACKUP_DIR}/data/uploads" \
        "${BACKUP_DIR}/assets" \
        "${BACKUP_DIR}/data/redis" \
        "${BACKUP_DIR}/data/migration-backups"
    echo "postgres dump" >"${BACKUP_DIR}/data/postgres.sql"
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

@test "runtime-state validation rejects missing database dump" {
    make_runtime_backup
    rm -f "${BACKUP_DIR}/data/postgres.sql"

    run runtime_state_validate_backup "${BACKUP_DIR}"

    assert_equal "$status" 1
    assert_output --partial "data/postgres.sql"
}

@test "rollback database selection prefers runtime-state backup over legacy postgres backup" {
    VERSION_DIR="${BATS_TMPDIR}/version"
    mkdir -p "${VERSION_DIR}/postgres"
    make_runtime_backup
    mkdir -p "${VERSION_DIR}"
    mv "${BACKUP_DIR}" "${VERSION_DIR}/runtime-state"

    run runtime_state_select_db_backup "${VERSION_DIR}"

    assert_equal "$status" 0
    assert_output "${VERSION_DIR}/runtime-state/data/postgres.sql"
}

@test "rollback database selection supports legacy postgres backup" {
    VERSION_DIR="${BATS_TMPDIR}/version"
    mkdir -p "${VERSION_DIR}/postgres"

    run runtime_state_select_db_backup "${VERSION_DIR}"

    assert_equal "$status" 0
    assert_output "${VERSION_DIR}/postgres"
}

@test "rollback script creates and restores logical database dumps" {
    grep -q 'current-postgres.sql' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'pg_dump' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'psql -v ON_ERROR_STOP=1' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'Using legacy raw Postgres directory restore' "$BATS_TEST_DIRNAME/../rollback.sh"
}

@test "rollback script validates image archive before stopping containers" {
    grep -q 'gzip -t "${DOCKER_IMAGES_ARCHIVE}"' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'Docker images archive failed integrity check' "$BATS_TEST_DIRNAME/../rollback.sh"
}

@test "playwright e2e server manages disposable local services" {
    grep -q 'process.env.E2E_MANAGE_SERVICES' "$BATS_TEST_DIRNAME/../../playwright.shared.ts"
    grep -q 'globalTeardown: "./e2e/teardown/e2e-services.teardown.ts"' "$BATS_TEST_DIRNAME/../../playwright.shared.ts"
    grep -q 'docker run -d' "$BATS_TEST_DIRNAME/../start-e2e-server.sh"
    grep -q 'postgres:13-alpine' "$BATS_TEST_DIRNAME/../start-e2e-server.sh"
    grep -q 'redis:7-alpine' "$BATS_TEST_DIRNAME/../start-e2e-server.sh"
    grep -q 'docker rm -f "${E2E_DB_CONTAINER}" "${E2E_REDIS_CONTAINER}"' "$BATS_TEST_DIRNAME/../start-e2e-server.sh"
    grep -q 'execFileSync("docker", \["rm", "-f", name\]' "$BATS_TEST_DIRNAME/../../e2e/teardown/e2e-services.teardown.ts"
}

@test "local lighthouse gate starts disposable API services" {
    grep -q 'default_env_apply_e2e' "$BATS_TEST_DIRNAME/../lighthouse-local.sh"
    grep -q 'E2E_MANAGE_SERVICES=true bash "${ROOT_DIR}/scripts/start-e2e-server.sh"' "$BATS_TEST_DIRNAME/../lighthouse-local.sh"
    grep -q 'http://localhost:${PORT_SERVER}/healthcheck' "$BATS_TEST_DIRNAME/../lighthouse-local.sh"
    grep -q 'kill -TERM "${api_pid}"' "$BATS_TEST_DIRNAME/../lighthouse-local.sh"
}

@test "rollback script verifies database and public endpoints after rollback" {
    grep -q 'verify_database_connectivity' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'SELECT 1;' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'verify_public_endpoints' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'curl -fsS "${ui_url}"' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'curl -fsS "${server_health_url}"' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'print_rollback_diagnostics' "$BATS_TEST_DIRNAME/../rollback.sh"
}

@test "rollback confirmation bypass is explicit for rehearsal automation" {
    grep -q 'ROLLBACK_CONFIRMED' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'skipping interactive rollback confirmation' "$BATS_TEST_DIRNAME/../rollback.sh"
}
