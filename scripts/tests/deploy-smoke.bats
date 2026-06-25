#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../deploy-smoke.sh"

write_env_file() {
    ENV_FILE="${BATS_TMPDIR}/.env-prod"
    cat >"${ENV_FILE}" <<EOF
UI_URL=https://example.test
SERVER_URL=https://api.example.test
ADMIN_EMAIL=admin@example.test
ADMIN_PASSWORD=admin-password
EOF
}

setup() {
    mkdir -p "${BATS_MOCK_BINDIR}"
    export SMOKE_LOG="${BATS_TMPDIR}/smoke.log"
    write_env_file

    cat >"${BATS_MOCK_BINDIR}/node" <<'EOF'
#!/usr/bin/env bash
echo "node:$*" >>"${SMOKE_LOG}"
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/node"

    cat >"${BATS_MOCK_BINDIR}/docker" <<'EOF'
#!/usr/bin/env bash
case "$*" in
  "ps --format {{.Names}}"*)
    printf 'nln_server\nnln_ui\n'
    exit 0
    ;;
  "exec nln_server sh -lc "*)
    echo "docker-migrate:$*" >>"${SMOKE_LOG}"
    exit 0
    ;;
  "logs --since "*)
    echo "started cleanly"
    exit 0
    ;;
esac
echo "docker:$*" >>"${SMOKE_LOG}"
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/docker"
}

teardown() {
    rm -rf "${BATS_TMPDIR}"
}

@test "deploy smoke runs public, migration, and log checks by default" {
    run env SMOKE_LOG="${SMOKE_LOG}" "$SCRIPT_PATH" -e "$ENV_FILE"

    assert_equal "$status" 0
    grep -q 'node:.*public-smoke.mjs' "${SMOKE_LOG}"
    grep -q 'docker-migrate:exec nln_server sh -lc' "${SMOKE_LOG}"
    assert_output --partial "Post-deploy smoke checks passed"
}

@test "deploy smoke admin checks are explicit" {
    run env SMOKE_LOG="${SMOKE_LOG}" ADMIN_SMOKE_CMD="echo admin-smoke >>${SMOKE_LOG}" \
        "$SCRIPT_PATH" -e "$ENV_FILE" --admin --skip-public --skip-migrations --skip-log-scan

    assert_equal "$status" 0
    grep -q '^admin-smoke$' "${SMOKE_LOG}"
}

@test "deploy smoke fails when migration container is missing" {
    cat >"${BATS_MOCK_BINDIR}/docker" <<'EOF'
#!/usr/bin/env bash
case "$*" in
  "ps --format {{.Names}}"*)
    printf 'nln_ui\n'
    exit 0
    ;;
esac
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/docker"

    run "$SCRIPT_PATH" -e "$ENV_FILE" --skip-public --skip-log-scan

    assert_equal "$status" 1
    assert_output --partial "nln_server is not running"
}
