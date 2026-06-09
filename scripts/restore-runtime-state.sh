#!/bin/bash
# Restores a full runtime-state backup from /var/tmp/<VERSION>/runtime-state.
# Dry-run is the default. Pass --execute and type "yes" to make changes.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"
# shellcheck source=scripts/runtime-state.sh
. "${HERE}/runtime-state.sh"

VERSION=""
EXECUTE=false

usage() {
    cat <<EOF
Usage: $0 -v VERSION [--execute]
  -v, --version VERSION  Deployment version whose runtime-state backup should be restored
      --execute          Actually stop containers and restore files after confirmation
  -h, --help             Show this help message
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
    -v | --version)
        VERSION="$2"
        shift 2
        ;;
    --execute)
        EXECUTE=true
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

PROJECT_DIR="${RUNTIME_STATE_PROJECT_DIR:-$(cd "${HERE}/.." && pwd)}"
BACKUP_BASE="${RUNTIME_STATE_BACKUP_BASE:-/var/tmp}"
BACKUP_DIR="${BACKUP_BASE}/${VERSION}/runtime-state"
EMERGENCY_BACKUP_DIR="${RUNTIME_STATE_EMERGENCY_DIR:-/var/tmp/emergency-runtime-state-$(date +%Y%m%d-%H%M%S)}"

header "Validating runtime-state backup"
runtime_state_validate_backup "${BACKUP_DIR}"

info "Backup: ${BACKUP_DIR}"
info "Project: ${PROJECT_DIR}"

info "Paths that will be restored:"
while IFS= read -r path; do
    echo "  ${path}"
done <<EOF
$(runtime_state_critical_paths)
EOF

while IFS= read -r path; do
    if [ -e "${BACKUP_DIR}/${path}" ]; then
        echo "  ${path}"
    fi
done <<EOF
$(runtime_state_optional_paths)
EOF

shopt -s nullglob
JWT_BACKUPS=("${BACKUP_DIR}"/jwt_*)
shopt -u nullglob
for jwt_file in "${JWT_BACKUPS[@]}"; do
    echo "  $(basename "${jwt_file}")"
done

if [ "${EXECUTE}" != true ]; then
    success "Dry run complete. No files or containers were changed."
    info "Run with --execute to restore this runtime-state backup."
    exit 0
fi

warning "This will stop containers and replace current runtime state from ${BACKUP_DIR}."
prompt "Type yes to restore version ${VERSION}:"
read -r CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
    info "Restore cancelled."
    exit 0
fi

create_emergency_backup() {
    header "Creating emergency runtime-state backup"
    mkdir -p "${EMERGENCY_BACKUP_DIR}"

    {
        echo "backup_type=runtime-state-emergency"
        echo "source_version=${VERSION}"
        echo "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo "project_dir=${PROJECT_DIR}"
        echo "paths:"
    } >"${EMERGENCY_BACKUP_DIR}/manifest.txt"

    local path
    while IFS= read -r path; do
        if [ -e "${PROJECT_DIR}/${path}" ]; then
            mkdir -p "${EMERGENCY_BACKUP_DIR}/$(dirname "${path}")"
            cp -rp "${PROJECT_DIR}/${path}" "${EMERGENCY_BACKUP_DIR}/${path}"
            echo "- ${path}" >>"${EMERGENCY_BACKUP_DIR}/manifest.txt"
        fi
    done <<EOF
$(runtime_state_critical_paths)
$(runtime_state_optional_paths)
EOF

    shopt -s nullglob
    local jwt_file
    for jwt_file in "${PROJECT_DIR}"/jwt_*; do
        cp -rp "${jwt_file}" "${EMERGENCY_BACKUP_DIR}/$(basename "${jwt_file}")"
        echo "- $(basename "${jwt_file}")" >>"${EMERGENCY_BACKUP_DIR}/manifest.txt"
    done
    shopt -u nullglob

    success "Emergency backup created at ${EMERGENCY_BACKUP_DIR}"
}

restore_path() {
    local path="$1"
    local source="${BACKUP_DIR}/${path}"
    local target="${PROJECT_DIR}/${path}"

    if [ ! -e "${source}" ]; then
        return 0
    fi

    mkdir -p "$(dirname "${target}")"
    rm -rf "${target}"
    cp -rp "${source}" "${target}"
}

create_emergency_backup

header "Stopping containers"
cd "${PROJECT_DIR}"
docker-compose --env-file "${BACKUP_DIR}/.env-prod" -f docker-compose-prod.yml down

header "Restoring runtime-state paths"
while IFS= read -r path; do
    restore_path "${path}"
done <<EOF
$(runtime_state_critical_paths)
$(runtime_state_optional_paths)
EOF

shopt -s nullglob
rm -f "${PROJECT_DIR}"/jwt_*
for jwt_file in "${BACKUP_DIR}"/jwt_*; do
    cp -rp "${jwt_file}" "${PROJECT_DIR}/$(basename "${jwt_file}")"
done
shopt -u nullglob

header "Starting containers"
docker-compose --env-file .env-prod -f docker-compose-prod.yml up -d

success "Runtime-state restore completed from ${BACKUP_DIR}"
info "Emergency backup of previous state saved at: ${EMERGENCY_BACKUP_DIR}"
