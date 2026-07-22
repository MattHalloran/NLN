#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../deploy-readiness.sh"

write_env_file() {
    ENV_FILE="${BATS_TMPDIR}/.env-prod"
    cat >"${ENV_FILE}" <<EOF
SITE_IP=203.0.113.10
PROJECT_DIR=/srv/app
EOF
}

write_executable() {
    local path="$1"
    local body="$2"
    printf '%s\n' "${body}" >"${path}"
    chmod +x "${path}"
}

install_git_stub() {
    cat >"${BATS_MOCK_BINDIR}/git" <<'EOF'
#!/usr/bin/env bash
printf 'git:%s\n' "$*" >>"${READINESS_ORDER_LOG}"
case "$*" in
  *"status --porcelain --untracked-files=no"*)
    [ -n "${GIT_CHANGES:-}" ] && printf '%s\n' "${GIT_CHANGES}"
    exit 0
    ;;
  *"rev-parse --abbrev-ref --symbolic-full-name @{u}"*)
    [ "${GIT_NO_UPSTREAM:-false}" = "true" ] && exit 1
    echo "origin/master"
    exit 0
    ;;
  *"fetch --quiet"*)
    exit 0
    ;;
  *"rev-list --left-right --count origin/master...HEAD"*)
    echo "${GIT_BEHIND:-0} ${GIT_AHEAD:-0}"
    exit 0
    ;;
  *"rev-parse HEAD"*)
    echo "${GIT_COMMIT:-abc123}"
    exit 0
    ;;
esac
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/git"
}

install_ssh_stub() {
    cat >"${BATS_MOCK_BINDIR}/ssh" <<'EOF'
#!/usr/bin/env bash
cmd="${*: -1}"
echo "ssh:${cmd}" >>"${READINESS_ORDER_LOG}"
if [[ "${cmd}" == test\ !\ -f* ]] && [ "${VERSION_EXISTS:-false}" = "true" ]; then
  exit 1
fi
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/ssh"
}

install_script_stubs() {
    VALIDATE_ENV_SCRIPT="${BATS_TMPDIR}/validate-env"
    CHECK_RATE_LIMIT_CONFIG_SCRIPT="${BATS_TMPDIR}/check-rate-limit-config"
    HEALTHCHECK_SCRIPT="${BATS_TMPDIR}/healthcheck"
    BACKUP_SCRIPT="${BATS_TMPDIR}/backup"
    REHEARSAL_SCRIPT="${BATS_TMPDIR}/deploy-rehearsal"
    MIGRATION_REHEARSAL_SCRIPT="${BATS_TMPDIR}/migration-rehearsal"
    YARN_CMD="${BATS_TMPDIR}/yarn"

    write_executable "${VALIDATE_ENV_SCRIPT}" '#!/usr/bin/env bash
echo validate >>"${READINESS_ORDER_LOG}"'

    write_executable "${CHECK_RATE_LIMIT_CONFIG_SCRIPT}" '#!/usr/bin/env bash
echo "rate-limit-config:$*" >>"${READINESS_ORDER_LOG}"'

    write_executable "${HEALTHCHECK_SCRIPT}" '#!/usr/bin/env bash
echo "health:$*" >>"${READINESS_ORDER_LOG}"'

    write_executable "${BACKUP_SCRIPT}" '#!/usr/bin/env bash
echo "backup:$*" >>"${READINESS_ORDER_LOG}"'

    write_executable "${REHEARSAL_SCRIPT}" '#!/usr/bin/env bash
echo "rehearsal:$*" >>"${READINESS_ORDER_LOG}"'

    write_executable "${MIGRATION_REHEARSAL_SCRIPT}" '#!/usr/bin/env bash
echo "migration-rehearsal:$*" >>"${READINESS_ORDER_LOG}"'

    write_executable "${YARN_CMD}" '#!/usr/bin/env bash
echo "yarn:$*" >>"${READINESS_ORDER_LOG}"'
}

setup() {
    mkdir -p "${BATS_MOCK_BINDIR}" "${BATS_TMPDIR}/home/.ssh"
    export HOME="${BATS_TMPDIR}/home"
    export READINESS_ORDER_LOG="${BATS_TMPDIR}/order.log"
    export DEPLOY_READINESS_RECEIPT_DIR="${BATS_TMPDIR}/receipts"
    touch "${HOME}/.ssh/id_rsa_203.0.113.10"
    write_env_file
    install_git_stub
    install_ssh_stub
    install_script_stubs
}

teardown() {
    rm -rf "${BATS_TMPDIR}"
}

run_readiness() {
    run env \
        VALIDATE_ENV_SCRIPT="${VALIDATE_ENV_SCRIPT}" \
        CHECK_RATE_LIMIT_CONFIG_SCRIPT="${CHECK_RATE_LIMIT_CONFIG_SCRIPT}" \
        DEPLOY_READINESS_RECEIPT_DIR="${DEPLOY_READINESS_RECEIPT_DIR}" \
        HEALTHCHECK_SCRIPT="${HEALTHCHECK_SCRIPT}" \
        BACKUP_SCRIPT="${BACKUP_SCRIPT}" \
        REHEARSAL_SCRIPT="${REHEARSAL_SCRIPT}" \
        MIGRATION_REHEARSAL_SCRIPT="${MIGRATION_REHEARSAL_SCRIPT}" \
        YARN_CMD="${YARN_CMD}" \
        READINESS_ORDER_LOG="${READINESS_ORDER_LOG}" \
        GIT_AHEAD="${GIT_AHEAD:-0}" \
        GIT_BEHIND="${GIT_BEHIND:-0}" \
        GIT_CHANGES="${GIT_CHANGES:-}" \
        GIT_COMMIT="${GIT_COMMIT:-abc123}" \
        GIT_NO_UPSTREAM="${GIT_NO_UPSTREAM:-false}" \
        VERSION_EXISTS="${VERSION_EXISTS:-false}" \
        "$SCRIPT_PATH" -v 9.9.9 -e "$ENV_FILE" "$@"
}

@test "readiness runs validation, rehearsal, read-only VPS checks, and backup preflight" {
    migration_backup="${BATS_TMPDIR}/migration-backup-fixture"
    mkdir -p "${migration_backup}"

    run_readiness --migration-backup "${migration_backup}"

    assert_equal "$status" 0
    assert_output --partial "No deployment was run"
    grep -q '^validate$' "${READINESS_ORDER_LOG}"
    grep -q '^rate-limit-config:.*/docker-compose-prod.yml$' "${READINESS_ORDER_LOG}"
    grep -q '^yarn:validate:ci$' "${READINESS_ORDER_LOG}"
    grep -q '^rehearsal:-v rehearsal-9.9.9$' "${READINESS_ORDER_LOG}"
    grep -q '^migration-rehearsal:--backup '"${migration_backup}"'$' "${READINESS_ORDER_LOG}"
    grep -q '^health:-e '"${ENV_FILE}"'$' "${READINESS_ORDER_LOG}"
    grep -q "^ssh:test ! -f '/var/tmp/9.9.9/runtime-state/manifest.txt'$" "${READINESS_ORDER_LOG}"
    grep -q '^backup:-e '"${ENV_FILE}"' --preflight-only$' "${READINESS_ORDER_LOG}"
    refute grep -q 'deploy.sh' "${READINESS_ORDER_LOG}"
    grep -q '^version=9.9.9$' "${DEPLOY_READINESS_RECEIPT_DIR}/9.9.9.receipt"
    grep -q '^commit=abc123$' "${DEPLOY_READINESS_RECEIPT_DIR}/9.9.9.receipt"
    grep -q '^validation_skipped=false$' "${DEPLOY_READINESS_RECEIPT_DIR}/9.9.9.receipt"
    grep -q '^rehearsal_skipped=false$' "${DEPLOY_READINESS_RECEIPT_DIR}/9.9.9.receipt"
    grep -q '^vps_skipped=false$' "${DEPLOY_READINESS_RECEIPT_DIR}/9.9.9.receipt"
    grep -q '^migration_rehearsal_skipped=false$' "${DEPLOY_READINESS_RECEIPT_DIR}/9.9.9.receipt"
}

@test "readiness requires restored-backup migration rehearsal" {
    run_readiness

    assert_equal "$status" 1
    assert_output --partial "Restored-backup migration rehearsal is required"
    [ ! -f "${DEPLOY_READINESS_RECEIPT_DIR}/9.9.9.receipt" ]
}

@test "readiness blocks when branch is ahead of upstream" {
    export GIT_AHEAD=5

    run_readiness

    assert_equal "$status" 1
    assert_output --partial "ahead=5"
    refute grep -q '^yarn:' "${READINESS_ORDER_LOG}"
    grep -q '^rate-limit-config:.*/docker-compose-prod.yml$' "${READINESS_ORDER_LOG}"
    refute grep -q '^rehearsal:' "${READINESS_ORDER_LOG}"
    refute grep -q '^migration-rehearsal:' "${READINESS_ORDER_LOG}"
    refute grep -q '^health:' "${READINESS_ORDER_LOG}"
    [ ! -f "${DEPLOY_READINESS_RECEIPT_DIR}/9.9.9.receipt" ]
}

@test "readiness skip flags avoid expensive local and VPS gates" {
    migration_backup="${BATS_TMPDIR}/migration-backup-fixture"
    mkdir -p "${migration_backup}"

    run_readiness --skip-validation --skip-rehearsal --skip-vps --migration-backup "${migration_backup}"

    assert_equal "$status" 0
    refute grep -q '^yarn:' "${READINESS_ORDER_LOG}"
    refute grep -q '^rehearsal:' "${READINESS_ORDER_LOG}"
    refute grep -q '^health:' "${READINESS_ORDER_LOG}"
    refute grep -q '^backup:' "${READINESS_ORDER_LOG}"
    grep -q '^migration-rehearsal:--backup '"${migration_backup}"'$' "${READINESS_ORDER_LOG}"
    grep -q '^validation_skipped=true$' "${DEPLOY_READINESS_RECEIPT_DIR}/9.9.9.receipt"
    grep -q '^rehearsal_skipped=true$' "${DEPLOY_READINESS_RECEIPT_DIR}/9.9.9.receipt"
    grep -q '^vps_skipped=true$' "${DEPLOY_READINESS_RECEIPT_DIR}/9.9.9.receipt"
    grep -q '^migration_rehearsal_skipped=false$' "${DEPLOY_READINESS_RECEIPT_DIR}/9.9.9.receipt"
}

@test "readiness blocks reused production version slot" {
    export VERSION_EXISTS=true
    migration_backup="${BATS_TMPDIR}/migration-backup-fixture"
    mkdir -p "${migration_backup}"

    run_readiness --skip-validation --skip-rehearsal --migration-backup "${migration_backup}"

    assert_equal "$status" 1
    assert_output --partial "Runtime-state backup already exists"
    refute grep -q '^backup:' "${READINESS_ORDER_LOG}"
}
