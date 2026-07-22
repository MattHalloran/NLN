#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../restore-runtime-state.sh"

setup() {
    VERSION="restore-test-${BATS_TEST_NUMBER}"
    BACKUP_BASE="${BATS_TMPDIR}/var-tmp"
    BACKUP_DIR="${BACKUP_BASE}/${VERSION}/runtime-state"
    PROJECT_DIR="${BATS_TMPDIR}/project"
    EMERGENCY_DIR="${BATS_TMPDIR}/emergency-runtime-state"
    export RUNTIME_STATE_PROJECT_DIR="${PROJECT_DIR}"
    export RUNTIME_STATE_EMERGENCY_DIR="${EMERGENCY_DIR}"
    export RUNTIME_STATE_BACKUP_BASE="${BACKUP_BASE}"

    mkdir -p \
        "${BACKUP_DIR}/data/uploads" \
        "${BACKUP_DIR}/assets" \
        "${BACKUP_DIR}/data/redis" \
        "${BACKUP_DIR}/data/migration-backups"
    echo "-- PostgreSQL database dump" >"${BACKUP_DIR}/data/postgres.sql"
    echo "new-upload" >"${BACKUP_DIR}/data/uploads/marker"
    echo "new-asset" >"${BACKUP_DIR}/assets/marker"
    echo "new-redis" >"${BACKUP_DIR}/data/redis/marker"
    echo "new-migration" >"${BACKUP_DIR}/data/migration-backups/marker"
    cat >"${BACKUP_DIR}/.env-prod" <<EOF
DB_NAME=nln_restore_test
DB_USER=nln_restore_test
DB_PASSWORD=nln_restore_password
EOF
    echo "local-env" >"${BACKUP_DIR}/.env"
    echo "jwt" >"${BACKUP_DIR}/jwt_private"
    cat >"${BACKUP_DIR}/manifest.txt" <<EOF
backup_type=runtime-state
paths:
EOF

    mkdir -p "${PROJECT_DIR}/data/uploads"
    echo "old-upload" >"${PROJECT_DIR}/data/uploads/marker"
    cat >"${PROJECT_DIR}/.env-prod" <<EOF
DB_NAME=nln_current_test
DB_USER=nln_current_test
DB_PASSWORD=nln_current_password
EOF
}

teardown() {
    rm -rf "${BACKUP_BASE}" "${PROJECT_DIR}" "${EMERGENCY_DIR}"
    rm -f "${BATS_MOCK_BINDIR}/docker-compose"
    rm -f "${BATS_MOCK_BINDIR}/docker"
    unset RUNTIME_STATE_PROJECT_DIR RUNTIME_STATE_EMERGENCY_DIR RUNTIME_STATE_BACKUP_BASE DOCKER_NO_DB
}

install_docker_compose_stub() {
    cat >"${BATS_MOCK_BINDIR}/docker-compose" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"${BATS_TMPDIR}/docker-compose.log"
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/docker-compose"
}

install_docker_stub() {
    cat >"${BATS_MOCK_BINDIR}/docker" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"${BATS_TMPDIR}/docker.log"
if [ "$1" = "ps" ]; then
  if [ "${DOCKER_NO_DB:-false}" = "true" ]; then
    exit 0
  fi
  echo "nln_db"
  exit 0
fi
if [ "$1" = "exec" ]; then
  if [[ "$*" == *"pg_dump"* ]]; then
    echo "-- emergency dump"
    exit 0
  fi
  if [[ "$*" == *"pg_isready"* ]]; then
    exit 0
  fi
  if [[ "$*" == *"psql"* ]]; then
    cat >/dev/null
    exit 0
  fi
fi
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/docker"
}

@test "restore-runtime-state dry-run validates backup without changing project" {
    run "$SCRIPT_PATH" -v "$VERSION"

    assert_equal "$status" 0
    assert_output --partial "Dry run complete"
    assert_equal "$(cat "${PROJECT_DIR}/data/uploads/marker")" "old-upload"
}

@test "restore-runtime-state rejects missing manifest" {
    rm -f "${BACKUP_DIR}/manifest.txt"

    run "$SCRIPT_PATH" -v "$VERSION"

    assert_equal "$status" 1
    assert_output --partial "manifest not found"
}

@test "restore-runtime-state rejects missing critical path" {
    rm -rf "${BACKUP_DIR}/data/redis"

    run "$SCRIPT_PATH" -v "$VERSION"

    assert_equal "$status" 1
    assert_output --partial "data/redis"
}

@test "restore-runtime-state rejects missing database dump" {
    rm -f "${BACKUP_DIR}/data/postgres.sql"

    run "$SCRIPT_PATH" -v "$VERSION"

    assert_equal "$status" 1
    assert_output --partial "data/postgres.sql"
}

@test "restore-runtime-state execute cancels unless user types yes" {
    install_docker_compose_stub

    run bash -c "printf 'no\n' | '$SCRIPT_PATH' -v '$VERSION' --execute"

    assert_equal "$status" 0
    assert_output --partial "Restore cancelled"
    assert_equal "$(cat "${PROJECT_DIR}/data/uploads/marker")" "old-upload"
    [ ! -f "${BATS_TMPDIR}/docker-compose.log" ]
}

@test "restore-runtime-state execute aborts before stopping containers without emergency database dump" {
    install_docker_compose_stub
    install_docker_stub
    export DOCKER_NO_DB=true

    run bash -c "printf 'yes\n' | '$SCRIPT_PATH' -v '$VERSION' --execute"

    assert_equal "$status" 1
    assert_output --partial "Could not create emergency logical database dump"
    [ ! -f "${BATS_TMPDIR}/docker-compose.log" ]
}

@test "restore-runtime-state execute restores runtime paths with fixture project" {
    install_docker_compose_stub
    install_docker_stub
    export DEPLOY_LOCK_PATH="${BATS_TMPDIR}/restore-runtime-state.lock"

    run bash -c "printf 'yes\n' | '$SCRIPT_PATH' -v '$VERSION' --execute"

    assert_equal "$status" 0
    assert_output --partial "Runtime-state restore completed"
    assert_equal "$(cat "${PROJECT_DIR}/data/uploads/marker")" "new-upload"
    assert_equal "$(cat "${PROJECT_DIR}/assets/marker")" "new-asset"
    assert_equal "$(cat "${PROJECT_DIR}/data/redis/marker")" "new-redis"
    assert_equal "$(cat "${PROJECT_DIR}/data/migration-backups/marker")" "new-migration"
    grep -q "DB_NAME=nln_restore_test" "${PROJECT_DIR}/.env-prod"
    assert_equal "$(cat "${PROJECT_DIR}/.env")" "local-env"
    assert_equal "$(cat "${PROJECT_DIR}/jwt_private")" "jwt"
    assert_equal "$(cat "${EMERGENCY_DIR}/data/postgres.sql")" "-- emergency dump"
    grep -q "down" "${BATS_TMPDIR}/docker-compose.log"
    grep -q "up -d db" "${BATS_TMPDIR}/docker-compose.log"
    grep -q "up -d" "${BATS_TMPDIR}/docker-compose.log"
    grep -q "psql" "${BATS_TMPDIR}/docker.log"
    grep -q '^command=restore-runtime-state.sh$' "${DEPLOY_LOCK_PATH}"
}
