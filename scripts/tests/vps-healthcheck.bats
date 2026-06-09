#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../vps-healthcheck.sh"

write_env_file() {
    ENV_FILE="${BATS_TMPDIR}/.env-prod"
    cat >"${ENV_FILE}" <<EOF
SITE_IP=203.0.113.10
PROJECT_DIR=/srv/app
EOF
}

install_ssh_stub() {
    local output="$1"
    local exit_code="${2:-0}"

    cat >"${BATS_MOCK_BINDIR}/ssh" <<EOF
#!/usr/bin/env bash
printf '%s\n' "\$*" >"${BATS_TMPDIR}/ssh-command.log"
cat <<'STUB_OUTPUT'
${output}
STUB_OUTPUT
exit ${exit_code}
EOF
    chmod +x "${BATS_MOCK_BINDIR}/ssh"
}

setup() {
    mkdir -p "${BATS_MOCK_BINDIR}" "${BATS_TMPDIR}/home/.ssh"
    export HOME="${BATS_TMPDIR}/home"
    write_env_file
}

teardown() {
    rm -rf "${BATS_TMPDIR}"
}

@test "healthcheck passes when remote reports no critical issues" {
    touch "${HOME}/.ssh/id_rsa_203.0.113.10"
    install_ssh_stub $'OK|Docker daemon is reachable\nSUMMARY|critical=0|warning=0'

    run "$SCRIPT_PATH" -e "$ENV_FILE"

    assert_equal "$status" 0
    assert_output --partial "VPS health check passed"
}

@test "healthcheck blocks when remote reports a critical issue" {
    touch "${HOME}/.ssh/id_rsa_203.0.113.10"
    install_ssh_stub $'CRITICAL|Low disk space on project: 4% free\nSUMMARY|critical=1|warning=0'

    run "$SCRIPT_PATH" -e "$ENV_FILE"

    assert_equal "$status" 1
    assert_output --partial "Low disk space"
    assert_output --partial "Deployment should not proceed"
}

@test "healthcheck warns without blocking when only recommendations are present" {
    touch "${HOME}/.ssh/id_rsa_203.0.113.10"
    install_ssh_stub $'WARN|Deployment backups may need cleanup\nRECOMMEND|Inventory first: ls -lh /var/tmp\nSUMMARY|critical=0|warning=1'

    run "$SCRIPT_PATH" -e "$ENV_FILE"

    assert_equal "$status" 0
    assert_output --partial "Deployment backups may need cleanup"
    assert_output --partial "RECOMMEND|Inventory first"
}

@test "healthcheck fails before ssh when key is missing" {
    install_ssh_stub $'SUMMARY|critical=0|warning=0'

    run "$SCRIPT_PATH" -e "$ENV_FILE"

    assert_equal "$status" 1
    assert_output --partial "SSH key not found"
    [ ! -f "${BATS_TMPDIR}/ssh-command.log" ]
}

@test "healthcheck blocks when ssh execution fails" {
    touch "${HOME}/.ssh/id_rsa_203.0.113.10"
    install_ssh_stub "" 255

    run "$SCRIPT_PATH" -e "$ENV_FILE"

    assert_equal "$status" 1
    assert_output --partial "Could not run VPS health checks"
}
