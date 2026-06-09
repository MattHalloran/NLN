#!/bin/bash
# Runs the standard production deployment workflow from the development machine.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"

ENV_FILE="${HERE}/../.env-prod"
VERSION=""
SKIP_TESTS=false
YARN_CMD="${YARN_CMD:-yarn}"
VALIDATE_ENV_SCRIPT="${VALIDATE_ENV_SCRIPT:-${HERE}/validate-env.sh}"
HEALTHCHECK_SCRIPT="${HEALTHCHECK_SCRIPT:-${HERE}/vps-healthcheck.sh}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-${HERE}/backup.sh}"
BUILD_SCRIPT="${BUILD_SCRIPT:-${HERE}/build.sh}"

usage() {
    cat <<EOF
Usage: $0 -v VERSION [options]
  -v, --version VERSION     Version number to build and deploy
  -e, --env-file FILE       Environment file to source (default: .env-prod)
      --skip-tests          Skip yarn test and yarn typecheck
  -h, --help                Show this help message
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

header "Validating environment"
"${VALIDATE_ENV_SCRIPT}" "${ENV_FILE}"

cd "${HERE}/.."

if [ "${SKIP_TESTS}" != true ]; then
    header "Running tests"
    "${YARN_CMD}" test

    header "Running typecheck"
    "${YARN_CMD}" typecheck
else
    warning "Skipping tests and typecheck by request"
fi

header "Running VPS health checks"
"${HEALTHCHECK_SCRIPT}" -e "${ENV_FILE}"

header "Checking deployment version backup slot"
if ! ssh -i "${KEY_PATH}" -o BatchMode=yes "root@${SITE_IP}" \
    "test ! -f '/var/tmp/${VERSION}/runtime-state/manifest.txt'"; then
    error "Runtime-state backup already exists for version ${VERSION}."
    error "Use a fresh version so this deployment can create a current backup."
    exit 1
fi

header "Verifying offsite backup preflight"
"${BACKUP_SCRIPT}" -e "${ENV_FILE}" --preflight-only

header "Creating mandatory offsite backup"
"${BACKUP_SCRIPT}" -e "${ENV_FILE}"

header "Building and transferring artifacts"
DEPLOY_CONFIRMED=true "${BUILD_SCRIPT}" -v "${VERSION}" -e "${ENV_FILE}" -d y

header "Deploying remotely"
ssh -i "${KEY_PATH}" -o BatchMode=yes "root@${SITE_IP}" \
    "cd '${PROJECT_DIR}' && ./scripts/deploy.sh -v '${VERSION}'"

header "Verifying remote containers"
ssh -i "${KEY_PATH}" -o BatchMode=yes "root@${SITE_IP}" \
    "docker ps --format 'table {{.Names}}\t{{.Status}}'"

success "Production deployment completed for version ${VERSION}"
