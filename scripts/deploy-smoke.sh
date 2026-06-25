#!/bin/bash
# Production-safe post-deploy smoke checks. Runs read-only checks by default.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"

ENV_FILE="${HERE}/../.env-prod"
RUN_PUBLIC=true
RUN_ADMIN="${DEPLOY_SMOKE_ADMIN:-false}"
RUN_MIGRATIONS=true
RUN_LOG_SCAN=true
LOG_SINCE="${DEPLOY_SMOKE_LOG_SINCE:-3m}"
PUBLIC_SMOKE_SCRIPT="${PUBLIC_SMOKE_SCRIPT:-${HERE}/public-smoke.mjs}"
ADMIN_SMOKE_CMD="${ADMIN_SMOKE_CMD:-npx tsx ${HERE}/smoke-test-admin.ts}"

usage() {
    cat <<EOF
Usage: $0 [options]
  -e, --env-file FILE       Environment file to source (default: .env-prod)
      --admin               Run admin smoke checks that may perform reversible writes
      --skip-public         Skip public page content smoke checks
      --skip-migrations     Skip Prisma migration status check
      --skip-log-scan       Skip recent container log scan
  -h, --help                Show this help message
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
    -e | --env-file)
        ENV_FILE="$2"
        shift 2
        ;;
    --admin)
        RUN_ADMIN=true
        shift
        ;;
    --skip-public)
        RUN_PUBLIC=false
        shift
        ;;
    --skip-migrations)
        RUN_MIGRATIONS=false
        shift
        ;;
    --skip-log-scan)
        RUN_LOG_SCAN=false
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

if [ ! -f "${ENV_FILE}" ]; then
    error "Environment file not found: ${ENV_FILE}"
    exit 1
fi

set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

if [ "${RUN_PUBLIC}" = true ]; then
    if [ -z "${UI_URL:-}" ]; then
        error "UI_URL is required for public smoke checks"
        exit 1
    fi

    header "Running public content smoke checks"
    PUBLIC_SMOKE_BASE_URL="${UI_URL}" node "${PUBLIC_SMOKE_SCRIPT}"
fi

if [ "${RUN_ADMIN}" = true ]; then
    if [ -z "${SERVER_URL:-}" ] || [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; then
        error "SERVER_URL, ADMIN_EMAIL, and ADMIN_PASSWORD are required for admin smoke checks"
        exit 1
    fi

    header "Running admin reversible smoke checks"
    API_URL="${SERVER_URL%/}" ADMIN_EMAIL="${ADMIN_EMAIL}" ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
        bash -lc "${ADMIN_SMOKE_CMD}"
else
    info "Skipping admin smoke checks. Set DEPLOY_SMOKE_ADMIN=true or pass --admin to enable reversible write checks."
fi

if [ "${RUN_MIGRATIONS}" = true ]; then
    header "Checking Prisma migration status"
    if ! docker ps --format '{{.Names}}' | grep -q '^nln_server$'; then
        error "nln_server is not running; cannot check migration status"
        exit 1
    fi

    docker exec nln_server sh -lc \
        'cd "${PROJECT_DIR}/packages/server" && yarn prisma migrate status --schema=src/db/schema.prisma'
fi

if [ "${RUN_LOG_SCAN}" = true ]; then
    header "Scanning recent application logs"
    failures=0
    for container in nln_server nln_ui; do
        if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            error "Expected container is not running: ${container}"
            failures=$((failures + 1))
            continue
        fi

        logs=$(docker logs --since "${LOG_SINCE}" "${container}" 2>&1 || true)
        if printf '%s\n' "${logs}" | grep -Ei '(^|[^a-z])(fatal|panic|unhandled rejection|uncaught exception)([^a-z]|$)' >/dev/null; then
            error "Recent ${container} logs contain fatal startup errors"
            printf '%s\n' "${logs}" | tail -n 80
            failures=$((failures + 1))
        fi
    done

    if [ "${failures}" -gt 0 ]; then
        exit 1
    fi
fi

success "Post-deploy smoke checks passed"
