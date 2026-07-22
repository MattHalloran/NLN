#!/bin/bash
# Restores a local runtime-state backup into disposable Postgres and runs migrations.
# This script never connects to production. Provide a local backup directory or archive.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"
# shellcheck source=scripts/runtime-state.sh
. "${HERE}/runtime-state.sh"

BACKUP_INPUT=""
KEEP=false

usage() {
    cat <<EOF
Usage: $0 --backup PATH [--keep]
      --backup PATH   Local runtime-state backup directory, timestamp dir, or .tar.gz archive
      --keep          Keep disposable working directory and container for inspection
  -h, --help          Show this help message

The backup must contain runtime-state/manifest.txt or manifest.txt plus data/postgres.sql.
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
    --backup)
        BACKUP_INPUT="$2"
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

if [ -z "${BACKUP_INPUT}" ]; then
    error "Backup path is required."
    usage
    exit 1
fi

if [ ! -e "${BACKUP_INPUT}" ]; then
    error "Backup path does not exist: ${BACKUP_INPUT}"
    exit 1
fi

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
    error "Docker is required and must be reachable for migration rehearsal."
    exit 1
fi

WORK_DIR=$(mktemp -d /tmp/nln-migration-rehearsal.XXXXXX)
EXTRACT_DIR="${WORK_DIR}/backup"
RESTORE_CONTAINER="nln_migration_rehearsal_$(date +%s)"
BACKUP_DIR=""

cleanup() {
    if [ "${KEEP}" = true ]; then
        info "Kept migration rehearsal work directory: ${WORK_DIR}"
        info "Kept migration rehearsal container: ${RESTORE_CONTAINER}"
        return 0
    fi

    docker rm -f "${RESTORE_CONTAINER}" >/dev/null 2>&1 || true
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
runtime_state_validate_backup "${BACKUP_DIR}"

set -a
# shellcheck disable=SC1090
. "${BACKUP_DIR}/.env-prod"
set +a

if [ -z "${DB_NAME:-}" ] || [ -z "${DB_USER:-}" ] || [ -z "${DB_PASSWORD:-}" ]; then
    error "DB_NAME, DB_USER, and DB_PASSWORD are required in backup .env-prod"
    exit 1
fi

header "Starting disposable Postgres for migration rehearsal"
docker rm -f "${RESTORE_CONTAINER}" >/dev/null 2>&1 || true
docker run -d --name "${RESTORE_CONTAINER}" \
    -e POSTGRES_DB="${DB_NAME}" \
    -e POSTGRES_USER="${DB_USER}" \
    -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
    postgres:13-alpine >/dev/null

ready=false
for _ in $(seq 1 30); do
    if docker exec "${RESTORE_CONTAINER}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
        ready=true
        break
    fi
    sleep 2
done

if [ "${ready}" != true ]; then
    error "Disposable Postgres did not become ready"
    exit 1
fi

db_dump="$(runtime_state_database_dump_path)"
header "Restoring backup SQL dump"
docker exec -i -e PGPASSWORD="${DB_PASSWORD}" "${RESTORE_CONTAINER}" \
    psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB_NAME}" <"${BACKUP_DIR}/${db_dump}"

header "Running checked-in migrations against restored backup"
# The repository's node_modules is installed on the glibc host and mounted
# read-only. Use a matching glibc runtime so Prisma can load the exact
# checked-in schema engine instead of looking for an unavailable musl build.
docker run --rm \
    --network "container:${RESTORE_CONTAINER}" \
    -v "$(cd "${HERE}/.." && pwd):/workspace:ro" \
    -w /workspace/packages/server \
    -e "DB_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}" \
    node:20-bookworm \
    sh -lc 'yarn prisma migrate deploy --schema=src/db/schema.prisma && yarn prisma migrate status --schema=src/db/schema.prisma'

success "Migration rehearsal passed against restored backup"
