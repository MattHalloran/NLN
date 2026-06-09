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
        "${BACKUP_DIR}/data/postgres" \
        "${BACKUP_DIR}/data/uploads" \
        "${BACKUP_DIR}/assets" \
        "${BACKUP_DIR}/data/redis" \
        "${BACKUP_DIR}/data/migration-backups"
    echo "new-db" >"${BACKUP_DIR}/data/postgres/marker"
    echo "new-upload" >"${BACKUP_DIR}/data/uploads/marker"
    echo "new-asset" >"${BACKUP_DIR}/assets/marker"
    echo "new-redis" >"${BACKUP_DIR}/data/redis/marker"
    echo "new-migration" >"${BACKUP_DIR}/data/migration-backups/marker"
    echo "prod-env" >"${BACKUP_DIR}/.env-prod"
    echo "local-env" >"${BACKUP_DIR}/.env"
    echo "jwt" >"${BACKUP_DIR}/jwt_private"
    cat >"${BACKUP_DIR}/manifest.txt" <<EOF
backup_type=runtime-state
paths:
EOF

    mkdir -p "${PROJECT_DIR}/data/postgres"
    echo "old-db" >"${PROJECT_DIR}/data/postgres/marker"
}

teardown() {
    rm -rf "${BACKUP_BASE}" "${PROJECT_DIR}" "${EMERGENCY_DIR}"
    rm -f "${BATS_MOCK_BINDIR}/docker-compose"
    unset RUNTIME_STATE_PROJECT_DIR RUNTIME_STATE_EMERGENCY_DIR RUNTIME_STATE_BACKUP_BASE
}

install_docker_compose_stub() {
    cat >"${BATS_MOCK_BINDIR}/docker-compose" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"${BATS_TMPDIR}/docker-compose.log"
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/docker-compose"
}

@test "restore-runtime-state dry-run validates backup without changing project" {
    run "$SCRIPT_PATH" -v "$VERSION"

    assert_equal "$status" 0
    assert_output --partial "Dry run complete"
    assert_equal "$(cat "${PROJECT_DIR}/data/postgres/marker")" "old-db"
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

@test "restore-runtime-state execute cancels unless user types yes" {
    install_docker_compose_stub

    run bash -c "printf 'no\n' | '$SCRIPT_PATH' -v '$VERSION' --execute"

    assert_equal "$status" 0
    assert_output --partial "Restore cancelled"
    assert_equal "$(cat "${PROJECT_DIR}/data/postgres/marker")" "old-db"
    [ ! -f "${BATS_TMPDIR}/docker-compose.log" ]
}

@test "restore-runtime-state execute restores runtime paths with fixture project" {
    install_docker_compose_stub

    run bash -c "printf 'yes\n' | '$SCRIPT_PATH' -v '$VERSION' --execute"

    assert_equal "$status" 0
    assert_output --partial "Runtime-state restore completed"
    assert_equal "$(cat "${PROJECT_DIR}/data/postgres/marker")" "new-db"
    assert_equal "$(cat "${PROJECT_DIR}/data/uploads/marker")" "new-upload"
    assert_equal "$(cat "${PROJECT_DIR}/assets/marker")" "new-asset"
    assert_equal "$(cat "${PROJECT_DIR}/data/redis/marker")" "new-redis"
    assert_equal "$(cat "${PROJECT_DIR}/data/migration-backups/marker")" "new-migration"
    assert_equal "$(cat "${PROJECT_DIR}/.env-prod")" "prod-env"
    assert_equal "$(cat "${PROJECT_DIR}/.env")" "local-env"
    assert_equal "$(cat "${PROJECT_DIR}/jwt_private")" "jwt"
    grep -q "down" "${BATS_TMPDIR}/docker-compose.log"
    grep -q "up -d" "${BATS_TMPDIR}/docker-compose.log"
}
