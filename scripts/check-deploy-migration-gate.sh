#!/bin/bash
# Read-only pre-downtime migration safety gate for deploy.sh.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"

MIGRATION_ROOT=""
ENV_FILE=""
READINESS_RECEIPT=""
CHECK_MIGRATIONS_SCRIPT="${CHECK_MIGRATIONS_SCRIPT:-${HERE}/check-migrations.sh}"
ALLOW_MISSING_DB_STATUS=false
ALLOW_MISSING_READINESS_RECEIPT=false

usage() {
    cat <<EOF
Usage: $0 --migration-root DIR --env-file FILE [options]
      --migration-root DIR  Directory containing Prisma migration folders
      --env-file FILE       Environment file with DB_NAME, DB_USER, DB_PASSWORD
      --readiness-receipt PATH_OR_ID
                            Readiness receipt proving restored-backup migration rehearsal
      --allow-missing-db-status
                            Allow unavailable DB status inspection with warning
      --allow-missing-readiness-receipt
                            Allow missing readiness receipt with warning
  -h, --help                Show this help message

This gate does not apply migrations. It scans migration SQL for risky changes and
prints pending migration status when the running database is readable.
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
    --migration-root)
        MIGRATION_ROOT="$2"
        shift 2
        ;;
    --env-file)
        ENV_FILE="$2"
        shift 2
        ;;
    --readiness-receipt)
        READINESS_RECEIPT="$2"
        shift 2
        ;;
    --allow-missing-db-status)
        ALLOW_MISSING_DB_STATUS=true
        shift
        ;;
    --allow-missing-readiness-receipt)
        ALLOW_MISSING_READINESS_RECEIPT=true
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

if [ -z "${MIGRATION_ROOT}" ] || [ -z "${ENV_FILE}" ]; then
    error "--migration-root and --env-file are required."
    usage
    exit 1
fi

if [ ! -d "${MIGRATION_ROOT}" ]; then
    error "Migration directory not found: ${MIGRATION_ROOT}"
    exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
    error "Environment file not found: ${ENV_FILE}"
    exit 1
fi

header "Scanning migration SQL for destructive operations"
MIGRATION_ROOT="${MIGRATION_ROOT}" "${CHECK_MIGRATIONS_SCRIPT}"

if [ -z "${READINESS_RECEIPT}" ]; then
    if [ "${ALLOW_MISSING_READINESS_RECEIPT}" = true ]; then
        warning "Readiness receipt proof was not provided; proceeding because override is enabled."
    else
        error "Readiness receipt proof is required before downtime."
        error "Run prepare-deploy-readiness/deploy-readiness and pass --readiness-receipt PATH_OR_ID."
        exit 1
    fi
else
    if [ -f "${READINESS_RECEIPT}" ]; then
        if ! grep -q '^migration_rehearsal_skipped=false$' "${READINESS_RECEIPT}"; then
            error "Readiness receipt does not prove restored-backup migration rehearsal: ${READINESS_RECEIPT}"
            exit 1
        fi
    fi
    info "Pending migrations were rehearsed against restored backup in readiness receipt ${READINESS_RECEIPT}."
fi

set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

if [ -z "${DB_NAME:-}" ] || [ -z "${DB_USER:-}" ] || [ -z "${DB_PASSWORD:-}" ]; then
    if [ "${ALLOW_MISSING_DB_STATUS}" = true ]; then
        warning "DB_NAME, DB_USER, or DB_PASSWORD is missing; pending migration count unavailable."
        exit 0
    fi
    error "DB_NAME, DB_USER, and DB_PASSWORD are required for pending migration inspection."
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    if [ "${ALLOW_MISSING_DB_STATUS}" = true ]; then
        warning "Docker not found; pending migration count unavailable."
        exit 0
    fi
    error "Docker not found; pending migration count unavailable."
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q '^nln_db$'; then
    if [ "${ALLOW_MISSING_DB_STATUS}" = true ]; then
        warning "nln_db is not running; pending migration count unavailable."
        exit 0
    fi
    error "nln_db is not running; pending migration count unavailable."
    exit 1
fi

applied_file=$(mktemp /tmp/nln-applied-migrations.XXXXXX)
all_file=$(mktemp /tmp/nln-all-migrations.XXXXXX)
pending_file=$(mktemp /tmp/nln-pending-migrations.XXXXXX)
trap 'rm -f "${applied_file}" "${all_file}" "${pending_file}"' EXIT

if ! docker exec -e PGPASSWORD="${DB_PASSWORD}" nln_db \
    psql -At -U "${DB_USER}" -d "${DB_NAME}" \
    -c "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name;" >"${applied_file}"; then
    if [ "${ALLOW_MISSING_DB_STATUS}" = true ]; then
        warning "Could not read _prisma_migrations; pending migration count unavailable."
        exit 0
    fi
    error "Could not read _prisma_migrations; pending migration count unavailable."
    exit 1
fi

find "${MIGRATION_ROOT}" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort >"${all_file}"
comm -23 "${all_file}" "${applied_file}" >"${pending_file}"
pending_count=$(wc -l <"${pending_file}" | tr -d '[:space:]')

info "Pending production migration count: ${pending_count}"
if [ "${pending_count}" != "0" ]; then
    info "Pending migrations:"
    sed 's/^/  /' "${pending_file}"
fi

success "Pre-downtime migration safety gate passed"
