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

make_rollback_version_backup() {
    VERSION_DIR="${BATS_TMPDIR}/versions/1.2.3"
    mkdir -p "${VERSION_DIR}"
    make_runtime_backup
    mv "${BACKUP_DIR}" "${VERSION_DIR}/runtime-state"
    touch "${VERSION_DIR}/.env-prod"
    tar -czf "${VERSION_DIR}/production-docker-images.tar.gz" -C "${BATS_TMPDIR}" version 2>/dev/null || {
        mkdir -p "${BATS_TMPDIR}/archive-src"
        echo image >"${BATS_TMPDIR}/archive-src/image.txt"
        tar -czf "${VERSION_DIR}/production-docker-images.tar.gz" -C "${BATS_TMPDIR}/archive-src" .
    }
}

teardown() {
    rm -rf "${BATS_TMPDIR}/runtime-state" "${BATS_TMPDIR}/version" "${BATS_TMPDIR}/versions" "${BATS_TMPDIR}/archive-src"
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
    grep -q 'wait-for-postgres-database.sh' "$BATS_TEST_DIRNAME/../rollback.sh"
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

@test "trusted browser validation is isolated from local and production runtime state" {
    local root="$BATS_TEST_DIRNAME/../.."

    grep -q 'E2E_IGNORE_DOTENV=true' "$root/scripts/validate-browser-fixture.sh"
    grep -q 'E2E_TEARDOWN_REMOVE_SERVICES=true' "$root/scripts/validate-browser-fixture.sh"
    grep -q 'E2E_DB_CONTAINER="nln_validation_db_' "$root/scripts/validate-browser-fixture.sh"
    grep -q 'E2E_REDIS_CONTAINER="nln_validation_redis_' "$root/scripts/validate-browser-fixture.sh"
    grep -q 'PORT_PWA="${VALIDATION_PORT_PWA:-13002}"' "$root/scripts/validate-browser-fixture.sh"
    grep -q 'fixture_image_source=' "$root/scripts/start-e2e-server.sh"
    grep -q '"${PROJECT_DIR}/assets/images/${fixture_image_name}"' "$root/scripts/start-e2e-server.sh"
    ! grep -q 'ln -s "${ROOT_DIR}/assets"' "$root/scripts/start-e2e-server.sh"
    grep -q 'process.env.PORT_SERVER' "$root/packages/server/src/index.ts"
    grep -q 'process.env.PORT_UI' "$root/packages/ui/vite.config.ts"
    grep -q 'E2E_SERVER_ORIGIN' "$root/e2e/hero-data.setup.ts"
    ! grep -R -q 'DEFAULT_SERVER_URLS\|LOCAL_DEV_ORIGINS' "$root/e2e" --include='*.ts'
}

@test "local lighthouse gate starts disposable API services" {
    grep -q 'default_env_apply_e2e' "$BATS_TEST_DIRNAME/../lighthouse-local.sh"
    grep -q 'E2E_MANAGE_SERVICES=true bash "${ROOT_DIR}/scripts/start-e2e-server.sh"' "$BATS_TEST_DIRNAME/../lighthouse-local.sh"
    grep -q 'http://localhost:${PORT_SERVER}/healthcheck' "$BATS_TEST_DIRNAME/../lighthouse-local.sh"
    grep -q 'kill -TERM "${api_pid}"' "$BATS_TEST_DIRNAME/../lighthouse-local.sh"
    grep -q 'LIGHTHOUSE_PORT_UI:-14001' "$BATS_TEST_DIRNAME/../lighthouse-local.sh"
    grep -q 'nln_lighthouse_db_' "$BATS_TEST_DIRNAME/../lighthouse-local.sh"
    grep -q 'LIGHTHOUSE_BASE_URL' "$BATS_TEST_DIRNAME/../../lighthouserc.cjs"
    grep -q 'LIGHTHOUSE_LOAD_DOTENV:-false' "$BATS_TEST_DIRNAME/../lighthouse-local.sh"
    grep -q 'CSRF_SECRET=lighthouse-fixture-csrf-secret' "$BATS_TEST_DIRNAME/../lighthouse-local.sh"
    ! grep -q 'Secret read:' "$BATS_TEST_DIRNAME/../../packages/server/src/middleware/csrf.ts"
    ! grep -q 'tokenValue:\|cookieValue:' "$BATS_TEST_DIRNAME/../../packages/server/src/middleware/csrf.ts"
}

@test "rollback script verifies database and public endpoints after rollback" {
    grep -q 'verify_database_connectivity' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'SELECT 1;' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'verify_public_endpoints' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'curl -fsS "${ui_url}"' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'curl -fsS "${server_health_url}"' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'DEPLOY_REHEARSAL' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'print_rollback_diagnostics' "$BATS_TEST_DIRNAME/../rollback.sh"
}

@test "rollback confirmation bypass is explicit for rehearsal automation" {
    grep -q 'ROLLBACK_CONFIRMED' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'skipping interactive rollback confirmation' "$BATS_TEST_DIRNAME/../rollback.sh"
}

@test "rollback script is protected by deployment mutation lock" {
    grep -q 'deploy-lock.sh' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q 'deploy_lock_acquire.*rollback.sh' "$BATS_TEST_DIRNAME/../rollback.sh"
    grep -q '/var/lock/nln-deploy.lock' "$BATS_TEST_DIRNAME/../rollback.sh"
}

@test "rollback dry-run prints summary and does not call docker" {
    make_rollback_version_backup
    cat >"${BATS_MOCK_BINDIR}/docker" <<'EOF'
#!/usr/bin/env bash
echo "docker should not be called in rollback dry-run" >&2
exit 42
EOF
    chmod +x "${BATS_MOCK_BINDIR}/docker"

    run env ROLLBACK_BACKUP_ROOT="${BATS_TMPDIR}/versions" DEPLOY_LOCK_PATH="${BATS_TMPDIR}/rollback.lock" "$BATS_TEST_DIRNAME/../rollback.sh" -v 1.2.3 --dry-run

    assert_equal "$status" 0
    assert_output --partial "Rollback summary for 1.2.3"
    assert_output --partial "Database backup selected: ${BATS_TMPDIR}/versions/1.2.3/runtime-state/data/postgres.sql"
    assert_output --partial "Expected emergency dump before mutation: /var/tmp/emergency-backup-<timestamp>/current-postgres.sql"
    assert_output --partial "Data-loss risk"
    assert_output --partial "No containers, files, images, or databases were changed"
    refute_output --partial "docker should not be called"
}
