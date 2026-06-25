#!/bin/bash
# Runs the standard production deployment workflow from the development machine.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"
# shellcheck source=scripts/deploy-safety.sh
. "${HERE}/deploy-safety.sh"

ENV_FILE="${HERE}/../.env-prod"
VERSION=""
SKIP_TESTS=false
YARN_CMD="${YARN_CMD:-yarn}"
DEPLOY_VALIDATE_CMD="${DEPLOY_VALIDATE_CMD:-validate:ci}"
VALIDATE_ENV_SCRIPT="${VALIDATE_ENV_SCRIPT:-${HERE}/validate-env.sh}"
HEALTHCHECK_SCRIPT="${HEALTHCHECK_SCRIPT:-${HERE}/vps-healthcheck.sh}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-${HERE}/backup.sh}"
BUILD_SCRIPT="${BUILD_SCRIPT:-${HERE}/build.sh}"
SMOKE_SCRIPT="${SMOKE_SCRIPT:-./scripts/deploy-smoke.sh}"
RECEIPT_SCRIPT="${RECEIPT_SCRIPT:-${HERE}/deploy-receipt.mjs}"
RECEIPT_MAX_AGE_SECONDS="${DEPLOY_READINESS_RECEIPT_MAX_AGE_SECONDS:-14400}"
DEPLOY_TIMINGS_FILE=""
DEPLOY_RECEIPT_STATUS="failed"
DEPLOY_RECEIPT_PATH=""

usage() {
    cat <<EOF
Usage: $0 -v VERSION [options]
  -v, --version VERSION     Version number to build and deploy
  -e, --env-file FILE       Environment file to source (default: .env-prod)
      --skip-tests          Emergency-only: skip readiness receipt when DEPLOY_ALLOW_UNVALIDATED=true
  -h, --help                Show this help message

Requires a fresh matching receipt from:
  ./scripts/deploy-readiness.sh -v VERSION -e ENV_FILE
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
    -v | --version)
        VERSION="$2"
        shift 2
        ;;
    -e | --env-file)
        ENV_FILE="$2"
        shift 2
        ;;
    --skip-tests)
        SKIP_TESTS=true
        shift
        ;;
    -h | --help)
        usage
        exit 0
        ;;
    *)
        error "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
done

if [ -z "${VERSION}" ]; then
    error "Version is required."
    usage
    exit 1
fi
validate_deploy_version "${VERSION}"

DEPLOY_TIMINGS_FILE=$(mktemp "/tmp/nln-deploy-${VERSION}.timings.XXXXXX")
DEPLOY_RECEIPT_PATH="${DEPLOY_RECEIPT_PATH:-${HERE}/../.validation/deploy-${VERSION}.json}"

record_deploy_phase() {
    local phase="$1"
    local status="$2"
    local duration="$3"
    printf '%s|%s|%s\n' "${phase}" "${status}" "${duration}" >>"${DEPLOY_TIMINGS_FILE}"
}

run_deploy_phase() {
    local phase="$1"
    shift

    header "${phase}"
    local started finished
    started=$(date -u +%s)
    if "$@"; then
        finished=$(date -u +%s)
        record_deploy_phase "${phase}" "success" "$((finished - started))"
        return 0
    fi

    finished=$(date -u +%s)
    record_deploy_phase "${phase}" "failed" "$((finished - started))"
    return 1
}

write_deploy_receipt() {
    if [ -z "${DEPLOY_TIMINGS_FILE}" ] || [ -z "${DEPLOY_RECEIPT_PATH}" ]; then
        return 0
    fi

    if [ -f "${RECEIPT_SCRIPT}" ]; then
        node "${RECEIPT_SCRIPT}" \
            --version "${VERSION}" \
            --status "${DEPLOY_RECEIPT_STATUS}" \
            --timings "${DEPLOY_TIMINGS_FILE}" \
            --output "${DEPLOY_RECEIPT_PATH}" \
            --backup-root "${HERE}/../backups/${SITE_IP:-unknown}" >/dev/null 2>&1 || true
    fi
    rm -f "${DEPLOY_TIMINGS_FILE}"
}

trap write_deploy_receipt EXIT

REPO_ROOT=$(deploy_repo_root "${HERE}")

if [ -f "${ENV_FILE}" ]; then
    # shellcheck disable=SC1090
    . "${ENV_FILE}"
else
    error "Environment file not found: ${ENV_FILE}"
    exit 1
fi

if [ -z "${SITE_IP:-}" ] || [ -z "${PROJECT_DIR:-}" ]; then
    error "SITE_IP and PROJECT_DIR must be set in ${ENV_FILE}"
    exit 1
fi

KEY_PATH="${HOME}/.ssh/id_rsa_${SITE_IP}"
if [ ! -f "${KEY_PATH}" ]; then
    error "SSH key not found: ${KEY_PATH}"
    error "Run ./scripts/keylessSsh.sh -e ${ENV_FILE} before deploying."
    exit 1
fi

run_deploy_phase "Validating environment" "${VALIDATE_ENV_SCRIPT}" "${ENV_FILE}"

cd "${HERE}/.."
run_deploy_phase "Checking git readiness" deploy_require_clean_synced_worktree "${REPO_ROOT}"

if [ "${SKIP_TESTS}" != true ]; then
    run_deploy_phase "Verifying deploy readiness receipt" \
        deploy_verify_readiness_receipt "${REPO_ROOT}" "${VERSION}" "${DEPLOY_VALIDATE_CMD}" "${RECEIPT_MAX_AGE_SECONDS}"
    header "Using readiness receipt validation gate"
    info "Skipping duplicate local ${DEPLOY_VALIDATE_CMD}; receipt proves it passed for this commit."
else
    if [ "${DEPLOY_ALLOW_UNVALIDATED:-false}" != "true" ]; then
        error "--skip-tests requires DEPLOY_ALLOW_UNVALIDATED=true for explicit emergency use."
        error "Normal production deploys must use a fresh deploy-readiness receipt."
        exit 1
    fi
    warning "Emergency validation/readiness receipt bypass enabled; backups and VPS health checks still run."
fi

run_deploy_phase "Running VPS health checks" "${HEALTHCHECK_SCRIPT}" -e "${ENV_FILE}"

if ! run_deploy_phase "Checking deployment version backup slot" \
    ssh -i "${KEY_PATH}" -o BatchMode=yes "root@${SITE_IP}" \
    "test ! -f '/var/tmp/${VERSION}/runtime-state/manifest.txt'"; then
    error "Runtime-state backup already exists for version ${VERSION}."
    error "Use a fresh version so this deployment can create a current backup."
    exit 1
fi

run_deploy_phase "Verifying offsite backup preflight" "${BACKUP_SCRIPT}" -e "${ENV_FILE}" --preflight-only

run_deploy_phase "Creating mandatory offsite backup" "${BACKUP_SCRIPT}" -e "${ENV_FILE}" --verify-restore

run_deploy_phase "Building and transferring artifacts" \
    env BUILD_SKIP_PACKAGE_VERSION_UPDATE=true DEPLOY_CONFIRMED=true "${BUILD_SCRIPT}" -v "${VERSION}" -e "${ENV_FILE}" -d y

run_deploy_phase "Deploying remotely" \
    ssh -i "${KEY_PATH}" -o BatchMode=yes "root@${SITE_IP}" \
    "cd '${PROJECT_DIR}' && ./scripts/deploy.sh -v '${VERSION}'"

run_deploy_phase "Running post-deploy smoke checks" \
    ssh -i "${KEY_PATH}" -o BatchMode=yes "root@${SITE_IP}" \
    "cd '${PROJECT_DIR}' && ${SMOKE_SCRIPT} -e .env-prod --admin"

run_deploy_phase "Verifying remote containers" \
    ssh -i "${KEY_PATH}" -o BatchMode=yes "root@${SITE_IP}" \
    "docker ps --format 'table {{.Names}}\t{{.Status}}'"

DEPLOY_RECEIPT_STATUS="success"
success "Production deployment completed for version ${VERSION}"
