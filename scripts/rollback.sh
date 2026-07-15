#!/bin/bash
# Rolls back application images and database to a previous deployment version
# NOTE: Run this on the production server
#
# This script:
# 1. Stops current containers
# 2. Restores database from the specified version's backup
# 3. Loads Docker images from the specified version
# 4. Starts containers with the old version
# 5. Verifies containers are healthy
#
# Arguments:
# -v, --version: Version number to roll back to (REQUIRED)
# --dry-run: Validate inputs and print the rollback summary without changing containers or data
# -h, --help: Show this help message
#
# Prerequisites:
# - The version backup must exist at /var/tmp/{VERSION}/
# - Backup must contain: runtime-state/data/postgres.sql or legacy postgres/,
#   production-docker-images.tar.gz, .env-prod

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"
# shellcheck source=scripts/runtime-state.sh
. "${HERE}/runtime-state.sh"
# shellcheck source=scripts/deploy-lock.sh
. "${HERE}/deploy-lock.sh"

VERSION=""
DRY_RUN=false
while [ $# -gt 0 ]; do
    case "$1" in
    -v | --version)
        VERSION="${2:-}"
        shift 2
        ;;
    --dry-run)
        DRY_RUN=true
        shift
        ;;
    -h | --help)
        echo "Usage: $0 -v VERSION [--dry-run] [-h]"
        echo "  -v: Version number to roll back to (REQUIRED, e.g., \"2.2.5\")"
        echo "  --dry-run: Validate rollback inputs and print the rollback summary without mutation"
        echo "  -h: Show this help message"
        echo ""
        echo "Example: $0 -v 2.2.5 --dry-run"
        echo ""
        echo "This script rolls back your deployment to a previous version."
        echo "It will restore the database and Docker containers from backups."
        exit 0
        ;;
    *)
        error "Unknown option: $1"
        echo "Usage: $0 -v VERSION [--dry-run] [-h]"
        exit 1
        ;;
    esac
done

# Validate required arguments
if [ -z "$VERSION" ]; then
    error "Version number is required!"
    echo "Usage: $0 -v VERSION"
    echo "Example: $0 -v 2.2.5"
    exit 1
fi
validate_deploy_version "${VERSION}"

header "Rolling back to version ${VERSION}"
deploy_lock_acquire "${DEPLOY_LOCK_PATH:-/var/lock/nln-deploy.lock}" "rollback.sh" "${VERSION}" "$(cd "${HERE}/.." && pwd)"

ROLLBACK_BACKUP_ROOT="${ROLLBACK_BACKUP_ROOT:-/var/tmp}"

# Check if backup directory exists
BACKUP_DIR="${ROLLBACK_BACKUP_ROOT}/${VERSION}"
if [ ! -d "${BACKUP_DIR}" ]; then
    error "Backup directory not found: ${BACKUP_DIR}"
    error "Available versions:"
    found_version=false
    for version_dir in "${ROLLBACK_BACKUP_ROOT}"/*; do
        [ -e "${version_dir}" ] || continue
        version_name=$(basename "${version_dir}")
        if [[ "${version_name}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "${version_name}"
            found_version=true
        fi
    done
    if [ "${found_version}" != true ]; then
        echo "  (none found)"
    fi
    exit 1
fi

# Check if required backup files exist
if [ ! -f "${BACKUP_DIR}/.env-prod" ]; then
    error "Environment file not found in backup: ${BACKUP_DIR}/.env-prod"
    exit 1
fi

if ! DB_BACKUP_PATH=$(runtime_state_select_db_backup "${BACKUP_DIR}"); then
    exit 1
fi

print_rollback_diagnostics() {
    warning "Recent container logs:"
    for container in nln_ui nln_server nginx-proxy; do
        echo "---- ${container} ----"
        docker logs --tail 80 "${container}" 2>&1 || true
    done
}

verify_database_connectivity() {
    header "Verifying database connectivity"

    if docker exec -e PGPASSWORD="${DB_PASSWORD}" nln_db psql -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" >/dev/null; then
        success "Database connectivity verified"
        return 0
    fi

    error "Database connectivity verification failed"
    error "Emergency database dump is available at: ${EMERGENCY_DB_DUMP}"
    exit 1
}

verify_public_endpoints() {
    header "Verifying public endpoints"

    local ui_url server_health_url attempt
    ui_url="${UI_URL:-}"
    server_health_url="${SERVER_URL:-}"

    if [ "${DEPLOY_REHEARSAL:-false}" != "true" ] && { [ -z "${ui_url}" ] || [ -z "${server_health_url}" ]; }; then
        warning "UI_URL or SERVER_URL is not set; skipping public endpoint verification."
        return 0
    fi

    server_health_url="${server_health_url%/}/healthcheck"

    for attempt in {1..12}; do
        if [ "${DEPLOY_REHEARSAL:-false}" = "true" ]; then
            if docker exec nln_ui wget -q --spider "http://127.0.0.1:${PORT_UI}" && \
                docker exec nln_server wget -q --spider "http://127.0.0.1:${PORT_SERVER}/healthcheck"; then
                success "Rehearsal rollback UI and API endpoints are responding inside their isolated containers"
                return 0
            fi
        elif curl -fsS "${ui_url}" >/dev/null && curl -fsS "${server_health_url}" >/dev/null; then
            success "Public UI and API healthcheck endpoints are responding"
            return 0
        fi
        info "Public endpoint verification attempt ${attempt}/12 failed; retrying..."
        sleep 5
    done

    error "Public endpoint verification failed."
    docker ps --format 'table {{.Names}}\t{{.Status}}'
    print_rollback_diagnostics
    error "Emergency database dump is available at: ${EMERGENCY_DB_DUMP}"
    exit 1
}

# List available Docker image archives
DOCKER_IMAGES_ARCHIVE="${BACKUP_DIR}/production-docker-images.tar.gz"
if [ ! -f "${DOCKER_IMAGES_ARCHIVE}" ]; then
    error "Docker images archive not found: ${DOCKER_IMAGES_ARCHIVE}"
    exit 1
fi
if ! gzip -t "${DOCKER_IMAGES_ARCHIVE}"; then
    error "Docker images archive failed integrity check: ${DOCKER_IMAGES_ARCHIVE}"
    exit 1
fi

EXPECTED_EMERGENCY_DB_DUMP="/var/tmp/emergency-backup-<timestamp>/current-postgres.sql"
print_rollback_summary() {
    warning "Rollback summary for ${VERSION}:"
    warning "  Backup directory: ${BACKUP_DIR}"
    warning "  Environment file: ${BACKUP_DIR}/.env-prod"
    warning "  Database backup selected: ${DB_BACKUP_PATH}"
    warning "  Docker image archive: ${DOCKER_IMAGES_ARCHIVE}"
    warning "  Expected emergency dump before mutation: ${EXPECTED_EMERGENCY_DB_DUMP}"
    warning "  Containers affected: nln_ui nln_server nln_db nln_redis"
    warning "Data-loss risk: this rollback replaces the live database with the ${VERSION} backup."
    warning "Writes made after that backup may be lost from the live database."
    warning "The emergency dump is retained for manual salvage of recent writes."
}

print_rollback_summary

if [ "${DRY_RUN}" = true ]; then
    success "Rollback dry-run completed. No containers, files, images, or databases were changed."
    exit 0
fi

if [ "${ROLLBACK_CONFIRMED:-false}" != "true" ]; then
    # Confirm rollback with user
    warning "WARNING: This will:"
    warning "  1. Stop all running containers"
    warning "  2. Replace the current database with the ${VERSION} database backup"
    warning "  3. Load Docker images from ${VERSION}"
    warning "  4. Start containers with the old version"
    warning "Writes made after the selected backup may be lost from the live database."
    warning "An emergency dump will be created before mutation and retained for manual salvage."
    echo ""
    prompt "Are you absolutely sure you want to roll back to version ${VERSION}? (yes/no)"
    read -r CONFIRM

    if [[ ! "$CONFIRM" =~ ^(yes|YES)$ ]]; then
        info "Rollback cancelled."
        exit 0
    fi
else
    warning "ROLLBACK_CONFIRMED=true set; skipping interactive rollback confirmation."
fi

set -a
# shellcheck disable=SC1090
. "${BACKUP_DIR}/.env-prod"
set +a

# Create a backup of current database before rollback
EMERGENCY_BACKUP_DIR="/var/tmp/emergency-backup-$(date +%Y%m%d-%H%M%S)"
EMERGENCY_DB_DUMP="${EMERGENCY_BACKUP_DIR}/current-postgres.sql"
info "Creating emergency logical database backup at ${EMERGENCY_DB_DUMP}"
mkdir -p "${EMERGENCY_BACKUP_DIR}"
if ! docker exec -e PGPASSWORD="${DB_PASSWORD}" nln_db pg_dump -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-privileges >"${EMERGENCY_DB_DUMP}"; then
    error "Failed to create emergency logical database backup"
    error "Rollback aborted before stopping containers."
    exit 1
fi
if [ ! -s "${EMERGENCY_DB_DUMP}" ]; then
    error "Emergency logical database backup is empty"
    error "Rollback aborted before stopping containers."
    exit 1
fi
success "Emergency logical database backup created successfully"

# Stop current containers
info "Stopping current containers..."
cd "${HERE}/.."
if ! docker-compose -f docker-compose-prod.yml down; then
    error "Failed to stop containers"
    exit 1
fi
success "Containers stopped"

DB_DIR="${HERE}/../data/postgres"

if [ -f "${DB_BACKUP_PATH}" ]; then
    info "Restoring database from logical dump ${DB_BACKUP_PATH}"
    if [ -d "${DB_DIR}" ]; then
        info "Removing current database directory so Postgres initializes a clean database..."
        if ! rm -rf "${DB_DIR}"; then
            error "Failed to remove current database"
            exit 1
        fi
    fi

    info "Starting database container for restore..."
    if ! docker-compose --env-file "${BACKUP_DIR}/.env-prod" -f "${HERE}/../docker-compose-prod.yml" up -d db; then
        error "Failed to start database container for restore"
        exit 1
    fi

    DB_READY=false
    for _ in {1..30}; do
        if docker exec nln_db pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
            DB_READY=true
            break
        fi
        sleep 2
    done

    if [ "${DB_READY}" != true ]; then
        error "Database did not become ready for restore"
        error "Emergency database dump is available at: ${EMERGENCY_DB_DUMP}"
        exit 1
    fi

    if ! docker exec -i -e PGPASSWORD="${DB_PASSWORD}" nln_db psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB_NAME}" <"${DB_BACKUP_PATH}"; then
        error "Failed to restore logical database dump"
        error "Emergency database dump is available at: ${EMERGENCY_DB_DUMP}"
        exit 1
    fi

    if ! docker-compose --env-file "${BACKUP_DIR}/.env-prod" -f "${HERE}/../docker-compose-prod.yml" down; then
        error "Failed to stop database container after restore"
        exit 1
    fi
    success "Database restored successfully from logical dump"
else
    warning "Using legacy raw Postgres directory restore: ${DB_BACKUP_PATH}"
    if [ -d "${DB_DIR}" ]; then
        info "Removing current database..."
        if ! rm -rf "${DB_DIR}"; then
            error "Failed to remove current database"
            exit 1
        fi
    fi

    info "Restoring legacy database directory backup..."
    if ! cp -rp "${DB_BACKUP_PATH}" "${DB_DIR}"; then
        error "Failed to restore legacy database backup"
        error "Emergency database dump is available at: ${EMERGENCY_DB_DUMP}"
        exit 1
    fi
    success "Legacy database directory restored successfully"
fi

# Load Docker images
info "Loading Docker images from ${DOCKER_IMAGES_ARCHIVE}"
if ! docker load -i "${DOCKER_IMAGES_ARCHIVE}"; then
    error "Failed to load Docker images"
    exit 1
fi
success "Docker images loaded successfully"

# Start containers with old version
info "Starting containers with version ${VERSION}..."
if ! docker-compose --env-file "${BACKUP_DIR}/.env-prod" -f "${HERE}/../docker-compose-prod.yml" up -d; then
    error "Failed to start containers"
    exit 1
fi
success "Containers started"

# Wait for containers to become healthy (copied from deploy.sh)
info "Waiting for containers to become healthy..."
TIMEOUT=300  # 5 minutes timeout
ELAPSED=0
CHECK_INTERVAL=5
EXPECTED_CONTAINERS=("nln_ui" "nln_server" "nln_db" "nln_redis")

while [ $ELAPSED -lt $TIMEOUT ]; do
    ALL_HEALTHY=true
    CONTAINER_STATUS=""

    for container in "${EXPECTED_CONTAINERS[@]}"; do
        if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            ALL_HEALTHY=false
            CONTAINER_STATUS="${CONTAINER_STATUS}\n  ${container}: NOT RUNNING"
            continue
        fi

        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "${container}" 2>/dev/null || echo "no-healthcheck")

        if [ "$HEALTH" = "healthy" ]; then
            CONTAINER_STATUS="${CONTAINER_STATUS}\n  ${container}: ✓ healthy"
        elif [ "$HEALTH" = "no-healthcheck" ]; then
            STATE=$(docker inspect --format='{{.State.Status}}' "${container}")
            if [ "$STATE" = "running" ]; then
                CONTAINER_STATUS="${CONTAINER_STATUS}\n  ${container}: ✓ running (no health check)"
            else
                ALL_HEALTHY=false
                CONTAINER_STATUS="${CONTAINER_STATUS}\n  ${container}: ✗ ${STATE}"
            fi
        elif [ "$HEALTH" = "starting" ]; then
            ALL_HEALTHY=false
            CONTAINER_STATUS="${CONTAINER_STATUS}\n  ${container}: ⏳ starting..."
        else
            ALL_HEALTHY=false
            CONTAINER_STATUS="${CONTAINER_STATUS}\n  ${container}: ✗ ${HEALTH}"
        fi
    done

    if [ "$ALL_HEALTHY" = true ]; then
        echo -e "${CONTAINER_STATUS}"
        success "✅ All containers are healthy!"
        break
    fi

    if [ $((ELAPSED % 15)) -eq 0 ]; then
        echo -e "Container status after ${ELAPSED}s:${CONTAINER_STATUS}"
    fi

    sleep $CHECK_INTERVAL
    ELAPSED=$((ELAPSED + CHECK_INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    error "❌ Timeout waiting for containers to become healthy after ${TIMEOUT} seconds"
    echo -e "Final container status:${CONTAINER_STATUS}"
    echo ""
    error "Rollback may have failed. Check container logs:"
    for container in "${EXPECTED_CONTAINERS[@]}"; do
        echo "  docker logs ${container}"
    done
    echo ""
    error "You can restore the previous state from: ${EMERGENCY_BACKUP_DIR}"
    exit 1
fi

verify_database_connectivity
verify_public_endpoints

# Final success message
echo ""
success "✅ Rollback to version ${VERSION} completed successfully!"
echo ""
info "Emergency database dump of previous state saved at: ${EMERGENCY_DB_DUMP}"
info "If everything is working correctly, you can remove it with:"
info "  rm -rf ${EMERGENCY_BACKUP_DIR}"
