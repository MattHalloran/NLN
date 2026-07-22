#!/bin/bash
# Creates a fresh local/offsite runtime-state backup and runs deploy readiness.
#
# This wrapper is intended to be run from a development machine before the
# deployment window. It does not deploy, restart, restore, prune, update, clean
# up, or run migrations on production. Production interaction is limited to the
# existing read/copy behavior of backup.sh and the read-only/preflight checks in
# deploy-readiness.sh.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"

ENV_FILE="${HERE}/../.env-prod"
VERSION=""
VALIDATE_ENV_SCRIPT="${VALIDATE_ENV_SCRIPT:-${HERE}/validate-env.sh}"
RECOVERY_PACKAGE_SCRIPT="${RECOVERY_PACKAGE_SCRIPT:-${HERE}/capture-production-recovery-package.sh}"
READINESS_SCRIPT="${READINESS_SCRIPT:-${HERE}/deploy-readiness.sh}"

usage() {
    cat <<EOF
Usage: $0 -v VERSION [options]
  -v, --version VERSION     Production version planned for deployment
  -e, --env-file FILE       Environment file to validate (default: .env-prod)
  -h, --help                Show this help message

Creates a verified local/offsite production recovery package, runs deploy-readiness.sh
with that backup as --migration-backup, then prints the exact production deploy
command. It does not run deploy-production.sh.
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

header "Validating environment"
"${VALIDATE_ENV_SCRIPT}" "${ENV_FILE}"

header "Creating verified production recovery package"
backup_output=$("${RECOVERY_PACKAGE_SCRIPT}" -e "${ENV_FILE}")
printf '%s\n' "${backup_output}"
backup_dir=$(printf '%s\n' "${backup_output}" | sed -n 's/^backup_dir=//p' | tail -n 1)

if [ -z "${backup_dir}" ]; then
    error "Could not determine backup directory from backup.sh output."
    error "Expected backup_dir=PATH from the recovery-package capture."
    exit 1
fi

if [ ! -d "${backup_dir}" ]; then
    error "Backup directory reported by backup.sh does not exist: ${backup_dir}"
    exit 1
fi

header "Running deploy readiness with verified backup"
"${READINESS_SCRIPT}" -v "${VERSION}" -e "${ENV_FILE}" --migration-backup "${backup_dir}"

success "Deploy readiness preparation completed for version ${VERSION}"
info "Verified backup: ${backup_dir}"
info "Production deploy command, for an approved deployment window:"
printf './scripts/deploy-production.sh -v %s -e %s\n' "${VERSION}" "${ENV_FILE}"
