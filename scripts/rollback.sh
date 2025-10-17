#!/bin/bash
# Rolls back to a previous deployment version
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
# -v: Version number to roll back to (REQUIRED)
# -h: Show this help message
#
# Prerequisites:
# - The version backup must exist at /var/tmp/{VERSION}/
# - Backup must contain: postgres/, *.tar.gz files, .env-prod

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
. "${HERE}/utils.sh"

# Parse arguments
VERSION=""
while getopts "v:h" opt; do
    case $opt in
    v)
        VERSION=$OPTARG
        ;;
    h)
        echo "Usage: $0 -v VERSION [-h]"
        echo "  -v: Version number to roll back to (REQUIRED, e.g., \"2.2.5\")"
        echo "  -h: Show this help message"
        echo ""
        echo "Example: $0 -v 2.2.5"
        echo ""
        echo "This script rolls back your deployment to a previous version."
        echo "It will restore the database and Docker containers from backups."
        exit 0
        ;;
    \?)
        error "Invalid option: -$OPTARG"
        exit 1
        ;;
    :)
        error "Option -$OPTARG requires an argument."
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

header "Rolling back to version ${VERSION}"

# Check if backup directory exists
BACKUP_DIR="/var/tmp/${VERSION}"
if [ ! -d "${BACKUP_DIR}" ]; then
    error "Backup directory not found: ${BACKUP_DIR}"
    error "Available versions:"
    ls -1 /var/tmp/ | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' || echo "  (none found)"
    exit 1
fi

# Check if required backup files exist
if [ ! -f "${BACKUP_DIR}/.env-prod" ]; then
    error "Environment file not found in backup: ${BACKUP_DIR}/.env-prod"
    exit 1
fi

if [ ! -d "${BACKUP_DIR}/postgres" ]; then
    error "Database backup not found: ${BACKUP_DIR}/postgres"
    exit 1
fi

# List available Docker image archives
DOCKER_IMAGES_ARCHIVE="${BACKUP_DIR}/production-docker-images.tar.gz"
if [ ! -f "${DOCKER_IMAGES_ARCHIVE}" ]; then
    error "Docker images archive not found: ${DOCKER_IMAGES_ARCHIVE}"
    exit 1
fi

# Confirm rollback with user
warning "⚠️  WARNING: This will:"
warning "  1. Stop all running containers"
warning "  2. Replace the current database with the ${VERSION} backup"
warning "  3. Load Docker images from ${VERSION}"
warning "  4. Start containers with the old version"
echo ""
prompt "Are you absolutely sure you want to roll back to version ${VERSION}? (yes/no)"
read -r CONFIRM

if [[ ! "$CONFIRM" =~ ^(yes|YES)$ ]]; then
    info "Rollback cancelled."
    exit 0
fi

# Create a backup of current state before rollback
EMERGENCY_BACKUP_DIR="/var/tmp/emergency-backup-$(date +%Y%m%d-%H%M%S)"
info "Creating emergency backup of current state at ${EMERGENCY_BACKUP_DIR}"
mkdir -p "${EMERGENCY_BACKUP_DIR}"
if [ -d "${HERE}/../data/postgres" ]; then
    info "Backing up current database..."
    cp -rp "${HERE}/../data/postgres" "${EMERGENCY_BACKUP_DIR}/"
    if [ $? -ne 0 ]; then
        error "Failed to create emergency backup"
        exit 1
    fi
    success "Emergency backup created successfully"
else
    warning "No current database found to backup"
fi

# Stop current containers
info "Stopping current containers..."
cd ${HERE}/..
docker-compose -f docker-compose-prod.yml down

if [ $? -ne 0 ]; then
    error "Failed to stop containers"
    exit 1
fi
success "Containers stopped"

# Restore database
info "Restoring database from ${BACKUP_DIR}/postgres"
DB_DIR="${HERE}/../data/postgres"

# Remove current database
if [ -d "${DB_DIR}" ]; then
    info "Removing current database..."
    rm -rf "${DB_DIR}"
    if [ $? -ne 0 ]; then
        error "Failed to remove current database"
        exit 1
    fi
fi

# Restore from backup
info "Restoring database backup..."
cp -rp "${BACKUP_DIR}/postgres" "${DB_DIR}"
if [ $? -ne 0 ]; then
    error "Failed to restore database backup"
    error "Your current database has been removed. Please restore manually from: ${EMERGENCY_BACKUP_DIR}"
    exit 1
fi
success "Database restored successfully"

# Load Docker images
info "Loading Docker images from ${DOCKER_IMAGES_ARCHIVE}"
docker load -i "${DOCKER_IMAGES_ARCHIVE}"
if [ $? -ne 0 ]; then
    error "Failed to load Docker images"
    exit 1
fi
success "Docker images loaded successfully"

# Start containers with old version
info "Starting containers with version ${VERSION}..."
docker-compose --env-file ${BACKUP_DIR}/.env-prod -f ${HERE}/../docker-compose-prod.yml up -d

if [ $? -ne 0 ]; then
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

        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' ${container} 2>/dev/null || echo "no-healthcheck")

        if [ "$HEALTH" = "healthy" ]; then
            CONTAINER_STATUS="${CONTAINER_STATUS}\n  ${container}: ✓ healthy"
        elif [ "$HEALTH" = "no-healthcheck" ]; then
            STATE=$(docker inspect --format='{{.State.Status}}' ${container})
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

# Final success message
echo ""
success "✅ Rollback to version ${VERSION} completed successfully!"
echo ""
info "Emergency backup of previous state saved at: ${EMERGENCY_BACKUP_DIR}"
info "If everything is working correctly, you can remove it with:"
info "  rm -rf ${EMERGENCY_BACKUP_DIR}"
