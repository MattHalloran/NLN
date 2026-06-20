#!/bin/bash
# Runs the non-deploying checks that should pass before a production deploy.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"

ENV_FILE="${HERE}/../.env-prod"
VERSION=""
YARN_CMD="${YARN_CMD:-yarn}"
DEPLOY_VALIDATE_CMD="${DEPLOY_VALIDATE_CMD:-validate:ci}"
VALIDATE_ENV_SCRIPT="${VALIDATE_ENV_SCRIPT:-${HERE}/validate-env.sh}"
HEALTHCHECK_SCRIPT="${HEALTHCHECK_SCRIPT:-${HERE}/vps-healthcheck.sh}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-${HERE}/backup.sh}"
REHEARSAL_SCRIPT="${REHEARSAL_SCRIPT:-${HERE}/deploy-rehearsal.sh}"
SKIP_VALIDATION=false
SKIP_REHEARSAL=false
SKIP_VPS=false

usage() {
    cat <<EOF
Usage: $0 -v VERSION [options]
  -v, --version VERSION     Production version planned for deployment
  -e, --env-file FILE       Environment file to validate (default: .env-prod)
      --skip-validation     Skip local yarn validation
      --skip-rehearsal      Skip disposable local deploy rehearsal
      --skip-vps            Skip read-only/preflight VPS checks
  -h, --help                Show this help message

This script does not deploy, restart, restore, prune, update, clean up, or create
backup archives. The VPS checks are limited to health checks, version-slot
inspection, and backup preflight.
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
    --skip-validation)
        SKIP_VALIDATION=true
        shift
        ;;
    --skip-rehearsal)
        SKIP_REHEARSAL=true
        shift
        ;;
    --skip-vps)
        SKIP_VPS=true
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

if [ -f "${ENV_FILE}" ]; then
    # shellcheck disable=SC1090
    . "${ENV_FILE}"
else
    error "Environment file not found: ${ENV_FILE}"
    exit 1
fi

require_clean_synced_worktree() {
    header "Checking git readiness"

    local repo_root changes upstream counts behind ahead
    repo_root="${HERE}/.."
    changes=$(git -C "${repo_root}" status --porcelain --untracked-files=no)
    if [ -n "${changes}" ]; then
        error "Tracked worktree changes are present. Commit or stash them before readiness/deploy."
        git -C "${repo_root}" status --short --untracked-files=no
        exit 1
    fi

    if ! upstream=$(git -C "${repo_root}" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null); then
        error "Current branch has no upstream. Push and set upstream before production deploy."
        exit 1
    fi

    git -C "${repo_root}" fetch --quiet
    counts=$(git -C "${repo_root}" rev-list --left-right --count "${upstream}...HEAD")
    behind=$(echo "${counts}" | awk '{print $1}')
    ahead=$(echo "${counts}" | awk '{print $2}')

    if [ "${behind}" != "0" ] || [ "${ahead}" != "0" ]; then
        error "Branch is not synchronized with ${upstream}: ahead=${ahead}, behind=${behind}."
        error "Push/pull until ahead=0 and behind=0 before production deploy."
        exit 1
    fi

    success "Git branch is clean and synchronized with ${upstream}"
}

run_local_gates() {
    header "Validating environment"
    "${VALIDATE_ENV_SCRIPT}" "${ENV_FILE}"

    require_clean_synced_worktree

    if [ "${SKIP_VALIDATION}" != true ]; then
        header "Running local validation gate"
        cd "${HERE}/.."
        "${YARN_CMD}" "${DEPLOY_VALIDATE_CMD}"
    else
        warning "Skipping local validation gate by request."
    fi

    if [ "${SKIP_REHEARSAL}" != true ]; then
        header "Running disposable deploy rehearsal"
        "${REHEARSAL_SCRIPT}" -v "rehearsal-${VERSION}"
    else
        warning "Skipping deploy rehearsal by request."
    fi
}

run_vps_preflight_gates() {
    if [ "${SKIP_VPS}" = true ]; then
        warning "Skipping read-only/preflight VPS checks by request."
        return 0
    fi

    if [ -z "${SITE_IP:-}" ] || [ -z "${PROJECT_DIR:-}" ]; then
        error "SITE_IP and PROJECT_DIR must be set in ${ENV_FILE}"
        exit 1
    fi

    local key_path
    key_path="${HOME}/.ssh/id_rsa_${SITE_IP}"
    if [ ! -f "${key_path}" ]; then
        error "SSH key not found: ${key_path}"
        error "Run ./scripts/keylessSsh.sh -e ${ENV_FILE} before readiness/deploy."
        exit 1
    fi

    header "Running read-only VPS health checks"
    "${HEALTHCHECK_SCRIPT}" -e "${ENV_FILE}"

    header "Checking deployment version backup slot"
    if ! ssh -i "${key_path}" -o BatchMode=yes "root@${SITE_IP}" \
        "test ! -f '/var/tmp/${VERSION}/runtime-state/manifest.txt'"; then
        error "Runtime-state backup already exists for version ${VERSION}."
        error "Use a fresh version so deployment can create a current backup."
        exit 1
    fi

    header "Verifying offsite backup preflight"
    "${BACKUP_SCRIPT}" -e "${ENV_FILE}" --preflight-only
}

run_local_gates
run_vps_preflight_gates

success "Deploy readiness checks passed for version ${VERSION}. No deployment was run."
