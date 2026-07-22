#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../prepare-deploy-readiness.sh"

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

setup() {
    mkdir -p "${BATS_MOCK_BINDIR}"
    export PREPARE_ORDER_LOG="${BATS_TMPDIR}/order.log"
    write_env_file

    VALIDATE_ENV_SCRIPT="${BATS_TMPDIR}/validate-env"
    RECOVERY_PACKAGE_SCRIPT="${BATS_TMPDIR}/recovery-package"
    READINESS_SCRIPT="${BATS_TMPDIR}/deploy-readiness"
    VERIFIED_BACKUP="${BATS_TMPDIR}/backups/20260708120000"

    write_executable "${VALIDATE_ENV_SCRIPT}" '#!/usr/bin/env bash
echo "validate:$*" >>"${PREPARE_ORDER_LOG}"'

    write_executable "${RECOVERY_PACKAGE_SCRIPT}" '#!/usr/bin/env bash
echo "recovery:$*" >>"${PREPARE_ORDER_LOG}"
if [ "${BACKUP_FAIL:-false}" = "true" ]; then
  exit 1
fi
mkdir -p "${VERIFIED_BACKUP}"
echo "backup_dir=${VERIFIED_BACKUP}"
echo "recovery_package=${VERIFIED_BACKUP}/production-recovery"'

    write_executable "${READINESS_SCRIPT}" '#!/usr/bin/env bash
echo "readiness:$*" >>"${PREPARE_ORDER_LOG}"
[ "${READINESS_FAIL:-false}" = "true" ] && exit 1
exit 0'
}

teardown() {
    rm -rf "${BATS_TMPDIR}"
}

run_prepare() {
    run env \
        VALIDATE_ENV_SCRIPT="${VALIDATE_ENV_SCRIPT}" \
        RECOVERY_PACKAGE_SCRIPT="${RECOVERY_PACKAGE_SCRIPT}" \
        READINESS_SCRIPT="${READINESS_SCRIPT}" \
        VERIFIED_BACKUP="${VERIFIED_BACKUP}" \
        PREPARE_ORDER_LOG="${PREPARE_ORDER_LOG}" \
        BACKUP_FAIL="${BACKUP_FAIL:-false}" \
        READINESS_FAIL="${READINESS_FAIL:-false}" \
        "$SCRIPT_PATH" -v 9.9.9 -e "$ENV_FILE"
}

@test "prepare wrapper creates verified backup before readiness" {
    run_prepare

    assert_equal "$status" 0
    expected=$'validate:'"${ENV_FILE}"$'\nrecovery:-e '"${ENV_FILE}"$'\nreadiness:-v 9.9.9 -e '"${ENV_FILE}"$' --migration-backup '"${VERIFIED_BACKUP}"
    assert_equal "$(cat "${PREPARE_ORDER_LOG}")" "${expected}"
    assert_output --partial "backup_dir=${VERIFIED_BACKUP}"
    assert_output --partial "./scripts/deploy-production.sh -v 9.9.9 -e ${ENV_FILE}"
}

@test "prepare wrapper stops when verified backup fails" {
    export BACKUP_FAIL=true

    run_prepare

    assert_equal "$status" 1
    refute grep -q '^readiness:' "${PREPARE_ORDER_LOG}"
}

@test "prepare wrapper requires backup_dir output" {
    write_executable "${RECOVERY_PACKAGE_SCRIPT}" '#!/usr/bin/env bash
echo "recovery:$*" >>"${PREPARE_ORDER_LOG}"'

    run_prepare

    assert_equal "$status" 1
    assert_output --partial "Could not determine backup directory"
    refute grep -q '^readiness:' "${PREPARE_ORDER_LOG}"
}
