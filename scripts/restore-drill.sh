#!/bin/bash
# Runs a local restore drill against a runtime-state backup.
#
# Default mode never connects to production. Provide a local backup directory or
# archive. If --create-backup is passed, this script delegates to backup.sh,
# which may read/copy production runtime state but must not mutate the VPS.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"
# shellcheck source=scripts/runtime-state.sh
. "${HERE}/runtime-state.sh"

BACKUP_INPUT=""
ENV_FILE="${HERE}/../.env-prod"
CREATE_BACKUP=false
KEEP=false
RECEIPT_DIR="${RESTORE_DRILL_RECEIPT_DIR:-${HERE}/../.validation/restore-drills}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-${HERE}/backup.sh}"
MIGRATION_REHEARSAL_SCRIPT="${MIGRATION_REHEARSAL_SCRIPT:-${HERE}/rehearse-migrations-from-backup.sh}"
RESTORE_RUNTIME_STATE_SCRIPT="${RESTORE_RUNTIME_STATE_SCRIPT:-${HERE}/restore-runtime-state.sh}"

usage() {
    cat <<EOF
Usage: $0 --backup PATH [options]
       $0 --create-backup -e ENV_FILE [options]
      --backup PATH        Local runtime-state backup directory, timestamp dir, or .tar.gz archive
      --create-backup      Create a fresh read/copy backup first using backup.sh --verify-restore
  -e, --env-file FILE      Env file for --create-backup (default: .env-prod)
      --keep               Keep migration rehearsal disposable resources
  -h, --help               Show this help message

The drill validates a local runtime-state backup, runs restored-backup migration
rehearsal, performs a local dry-run restore validation, and writes a local
receipt under .validation/restore-drills/.
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
    --backup)
        BACKUP_INPUT="$2"
        shift 2
        ;;
    --create-backup)
        CREATE_BACKUP=true
        shift
        ;;
    -e | --env-file)
        ENV_FILE="$2"
        shift 2
        ;;
    --keep)
        KEEP=true
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

if [ "${CREATE_BACKUP}" = true ] && [ -n "${BACKUP_INPUT}" ]; then
    error "Use either --backup PATH or --create-backup, not both."
    exit 1
fi

if [ "${CREATE_BACKUP}" != true ] && [ -z "${BACKUP_INPUT}" ]; then
    error "Backup path is required unless --create-backup is used."
    usage
    exit 1
fi

if [ "${CREATE_BACKUP}" = true ]; then
    header "Creating verified runtime-state backup"
    backup_output=$("${BACKUP_SCRIPT}" -e "${ENV_FILE}" --verify-restore --print-backup-dir)
    printf '%s\n' "${backup_output}"
    BACKUP_INPUT=$(printf '%s\n' "${backup_output}" | sed -n 's/^backup_dir=//p' | tail -n 1)
    if [ -z "${BACKUP_INPUT}" ]; then
        error "Could not determine backup directory from backup.sh output."
        exit 1
    fi
fi

if [ ! -e "${BACKUP_INPUT}" ]; then
    error "Backup path does not exist: ${BACKUP_INPUT}"
    exit 1
fi

WORK_DIR=$(mktemp -d /tmp/nln-restore-drill.XXXXXX)
EXTRACT_DIR="${WORK_DIR}/backup"
RESTORE_BACKUP_BASE="${WORK_DIR}/var-tmp"
RESTORE_VERSION="restore-drill"
BACKUP_DIR=""
RECEIPT_PATH=""

cleanup() {
    rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

resolve_backup_dir() {
    local input="$1"

    if [ -d "${input}/runtime-state" ]; then
        printf '%s\n' "${input}/runtime-state"
        return 0
    fi

    if [ -d "${input}" ] && [ -f "${input}/manifest.txt" ]; then
        printf '%s\n' "${input}"
        return 0
    fi

    if [ -f "${input}" ]; then
        mkdir -p "${EXTRACT_DIR}"
        tar -xzf "${input}" -C "${EXTRACT_DIR}"
        if [ -d "${EXTRACT_DIR}/runtime-state" ]; then
            printf '%s\n' "${EXTRACT_DIR}/runtime-state"
            return 0
        fi
        if [ -f "${EXTRACT_DIR}/manifest.txt" ]; then
            printf '%s\n' "${EXTRACT_DIR}"
            return 0
        fi
    fi

    error "Could not find a runtime-state backup in: ${input}"
    return 1
}

BACKUP_DIR=$(resolve_backup_dir "${BACKUP_INPUT}")

header "Validating runtime-state backup"
runtime_state_validate_backup "${BACKUP_DIR}"

header "Running restored-backup migration rehearsal"
if [ "${KEEP}" = true ]; then
    "${MIGRATION_REHEARSAL_SCRIPT}" --backup "${BACKUP_INPUT}" --keep
else
    "${MIGRATION_REHEARSAL_SCRIPT}" --backup "${BACKUP_INPUT}"
fi

header "Running runtime-state restore dry run"
mkdir -p "${RESTORE_BACKUP_BASE}/${RESTORE_VERSION}"
cp -rp "${BACKUP_DIR}" "${RESTORE_BACKUP_BASE}/${RESTORE_VERSION}/runtime-state"
RUNTIME_STATE_BACKUP_BASE="${RESTORE_BACKUP_BASE}" \
RUNTIME_STATE_PROJECT_DIR="${WORK_DIR}/project" \
"${RESTORE_RUNTIME_STATE_SCRIPT}" -v "${RESTORE_VERSION}"

mkdir -p "${RECEIPT_DIR}"
chmod 700 "${RECEIPT_DIR}"
RECEIPT_PATH="${RECEIPT_DIR}/restore-drill-$(date -u +%Y%m%d%H%M%S).receipt"
{
    echo "backup_input=${BACKUP_INPUT}"
    echo "resolved_backup_dir=${BACKUP_DIR}"
    echo "commit=$(git -C "${HERE}/.." rev-parse HEAD 2>/dev/null || echo unknown)"
    echo "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "migration_rehearsal=passed"
    echo "restore_dry_run=passed"
} >"${RECEIPT_PATH}"
chmod 600 "${RECEIPT_PATH}"

success "Restore drill passed"
info "Restore drill receipt written: ${RECEIPT_PATH}"
