#!/bin/bash
# This script syncs production data (database, JSONs, assets) to local development environment
# IMPORTANT: This script performs READ-ONLY operations on the production server

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
. "${HERE}/utils.sh"

# Show help message
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Syncs production data to local development environment."
    echo "This includes: database, landing page JSONs, variants.json, and assets."
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -n, --no-backup         Skip local backup before syncing (not recommended)"
    echo "  -d, --data-only         Only sync database and JSON files, skip assets"
    echo "  -a, --assets-only       Only sync assets, skip database and JSON files"
    echo ""
    echo "Examples:"
    echo "  $0                      # Full sync with local backup"
    echo "  $0 -d                   # Sync only data (database + JSONs)"
    echo "  $0 -a                   # Sync only assets (images)"
    echo ""
    exit 0
}

# Parse command line arguments
SKIP_BACKUP=false
SYNC_DATA=true
SYNC_ASSETS=true

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            ;;
        -n|--no-backup)
            SKIP_BACKUP=true
            shift
            ;;
        -d|--data-only)
            SYNC_ASSETS=false
            shift
            ;;
        -a|--assets-only)
            SYNC_DATA=false
            shift
            ;;
        *)
            error "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Load variables from .env file
if [ -f "${HERE}/../.env" ]; then
    . "${HERE}/../.env"
else
    error "Could not find .env file. Exiting..."
    exit 1
fi

# Validate required environment variables
if [ -z "$SITE_IP" ]; then
    error "SITE_IP not set in .env file. Exiting..."
    exit 1
fi

if [ -z "$DB_NAME" ]; then
    error "DB_NAME not set in .env file. Exiting..."
    exit 1
fi

# Set the remote server location
remote_server="root@${SITE_IP}"
info "Remote server: ${remote_server}"
info "Production project directory: ${PROJECT_DIR:-/root/NLN}"

# Setup SSH keys (read-only script, safe to run)
"${HERE}/keylessSsh.sh" || exit 1

# Create timestamp for backup directory
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_DIR="${HERE}/../backups/local-sync-backup-${TIMESTAMP}"

#############################################
# STEP 1: Detect what services are running
#############################################
info "Detecting running services..."

YARN_UI_RUNNING=false
YARN_SERVER_RUNNING=false
DOCKER_RUNNING=false

# Check if yarn dev processes are running
if pgrep -f "yarn workspace ui start-development" > /dev/null 2>&1; then
    YARN_UI_RUNNING=true
    info "Detected: yarn UI dev server is running"
fi

if pgrep -f "yarn workspace server start-development" > /dev/null 2>&1; then
    YARN_SERVER_RUNNING=true
    info "Detected: yarn server dev server is running"
fi

# Check if docker-compose is running
if docker-compose ps | grep -q "Up"; then
    DOCKER_RUNNING=true
    info "Detected: Docker containers are running"
fi

if [ "$YARN_UI_RUNNING" = false ] && [ "$YARN_SERVER_RUNNING" = false ] && [ "$DOCKER_RUNNING" = false ]; then
    info "No services detected running"
fi

#############################################
# STEP 2: Stop services
#############################################
if [ "$SYNC_DATA" = true ]; then
    info "Stopping services before database sync..."

    if [ "$YARN_UI_RUNNING" = true ]; then
        info "Stopping yarn UI dev server..."
        pkill -f "yarn workspace ui start-development" || warning "Failed to stop yarn UI dev server"
        sleep 2
    fi

    if [ "$YARN_SERVER_RUNNING" = true ]; then
        info "Stopping yarn server dev server..."
        pkill -f "yarn workspace server start-development" || warning "Failed to stop yarn server dev server"
        sleep 2
    fi

    if [ "$DOCKER_RUNNING" = true ]; then
        info "Stopping Docker containers..."
        docker-compose down || warning "Failed to stop Docker containers"
        sleep 2
    fi
fi

#############################################
# STEP 3: Backup local data
#############################################
if [ "$SKIP_BACKUP" = false ]; then
    info "Creating local backup before sync..."
    mkdir -p "${BACKUP_DIR}"

    if [ "$SYNC_DATA" = true ]; then
        # Backup local database
        info "Backing up local database..."
        if docker-compose up -d db 2>/dev/null; then
            sleep 3  # Give database time to start
            docker exec nln_db pg_dump -U ${DB_USER} ${DB_NAME} > "${BACKUP_DIR}/local-database.sql" 2>/dev/null
            if [ $? -eq 0 ]; then
                success "Local database backed up to: ${BACKUP_DIR}/local-database.sql"
            else
                warning "Could not backup local database (may not exist yet)"
            fi
            docker-compose down 2>/dev/null
        else
            warning "Could not start database for backup"
        fi

        # Backup local JSON files
        info "Backing up local JSON files..."
        mkdir -p "${BACKUP_DIR}/data"
        cp -r "${HERE}/../packages/server/src/data/"*.json "${BACKUP_DIR}/data/" 2>/dev/null
        if [ $? -eq 0 ]; then
            success "Local JSON files backed up to: ${BACKUP_DIR}/data/"
        else
            warning "Could not backup local JSON files"
        fi
    fi

    if [ "$SYNC_ASSETS" = true ]; then
        # Backup local assets
        info "Backing up local assets..."
        if [ -d "${HERE}/../assets" ]; then
            tar -czf "${BACKUP_DIR}/local-assets.tar.gz" -C "${HERE}/.." assets 2>/dev/null
            if [ $? -eq 0 ]; then
                success "Local assets backed up to: ${BACKUP_DIR}/local-assets.tar.gz"
            else
                warning "Could not backup local assets"
            fi
        else
            warning "No local assets directory found to backup"
        fi
    fi

    success "Local backup completed: ${BACKUP_DIR}"
else
    warning "Skipping local backup (--no-backup flag set)"
fi

#############################################
# STEP 4: Download from production
#############################################
TEMP_DIR="/tmp/nln-sync-${TIMESTAMP}"
mkdir -p "${TEMP_DIR}"

if [ "$SYNC_DATA" = true ]; then
    # Download database from production
    info "Downloading database from production..."
    # Find the db container name (might have a prefix like dc9d38971f12_nln_db)
    PROD_DB_CONTAINER=$(ssh -i ~/.ssh/id_rsa_${SITE_IP} $remote_server "docker ps --format '{{.Names}}' | grep '_nln_db\|^nln_db'")
    if [ -z "$PROD_DB_CONTAINER" ]; then
        error "Could not find database container on production"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi
    info "Found production database container: ${PROD_DB_CONTAINER}"

    ssh -i ~/.ssh/id_rsa_${SITE_IP} $remote_server \
        "cd ${PROJECT_DIR:-/root/NLN} && docker exec ${PROD_DB_CONTAINER} pg_dump -U ${DB_USER} ${DB_NAME}" \
        > "${TEMP_DIR}/production-database.sql"

    if [ $? -eq 0 ] && [ -s "${TEMP_DIR}/production-database.sql" ]; then
        success "Database downloaded from production"
    else
        error "Failed to download database from production"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi

    # Download JSON files from production
    info "Downloading JSON files from production..."
    mkdir -p "${TEMP_DIR}/data"
    scp -i ~/.ssh/id_rsa_${SITE_IP} \
        "${remote_server}:${PROJECT_DIR:-/root/NLN}/packages/server/src/data/*.json" \
        "${TEMP_DIR}/data/" 2>/dev/null

    if [ $? -eq 0 ]; then
        success "JSON files downloaded from production"
    else
        error "Failed to download JSON files from production"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi
fi

if [ "$SYNC_ASSETS" = true ]; then
    # Download assets from production
    info "Downloading assets from production (this may take a while)..."
    rsync -avz --progress \
        -e "ssh -i ~/.ssh/id_rsa_${SITE_IP}" \
        "${remote_server}:${PROJECT_DIR:-/root/NLN}/assets/" \
        "${TEMP_DIR}/assets/"

    if [ $? -eq 0 ]; then
        success "Assets downloaded from production"
    else
        error "Failed to download assets from production"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi
fi

#############################################
# STEP 5: Import data locally
#############################################
if [ "$SYNC_DATA" = true ]; then
    info "Importing data to local environment..."

    # Start database container
    info "Starting database container..."
    docker-compose up -d db
    sleep 5  # Give database time to fully start

    # Drop and recreate database
    info "Recreating local database..."
    docker exec nln_db psql -U ${DB_USER} postgres \
        -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null
    docker exec nln_db psql -U ${DB_USER} postgres \
        -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null

    if [ $? -ne 0 ]; then
        error "Failed to recreate database"
        docker-compose down
        rm -rf "${TEMP_DIR}"
        exit 1
    fi

    # Import database
    info "Importing database..."
    docker exec -i nln_db psql -U ${DB_USER} ${DB_NAME} \
        < "${TEMP_DIR}/production-database.sql" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        success "Database imported successfully"
    else
        error "Failed to import database"
        docker-compose down
        rm -rf "${TEMP_DIR}"
        exit 1
    fi

    # Stop database container
    docker-compose down

    # Copy JSON files
    info "Copying JSON files..."
    cp "${TEMP_DIR}/data/"*.json "${HERE}/../packages/server/src/data/" 2>/dev/null
    if [ $? -eq 0 ]; then
        success "JSON files copied successfully"
    else
        error "Failed to copy JSON files"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi
fi

if [ "$SYNC_ASSETS" = true ]; then
    # Copy assets
    info "Copying assets..."
    mkdir -p "${HERE}/../assets"
    rsync -av "${TEMP_DIR}/assets/" "${HERE}/../assets/"

    if [ $? -eq 0 ]; then
        success "Assets copied successfully"
    else
        error "Failed to copy assets"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi
fi

# Cleanup temp directory
rm -rf "${TEMP_DIR}"

#############################################
# STEP 6: Restart services that were running
#############################################
if [ "$SYNC_DATA" = true ]; then
    info "Restarting services..."

    # If Docker was running, restart everything with docker-compose
    if [ "$DOCKER_RUNNING" = true ]; then
        info "Restarting Docker containers..."
        docker-compose up -d
        if [ $? -eq 0 ]; then
            success "Docker containers restarted"
        else
            warning "Failed to restart Docker containers"
        fi
    # If yarn dev servers were running, use develop.sh to start the full dev environment
    elif [ "$YARN_SERVER_RUNNING" = true ] || [ "$YARN_UI_RUNNING" = true ]; then
        info "Restarting development environment using develop.sh..."
        # Start database and redis containers first
        docker-compose up -d db redis
        sleep 3

        # Start yarn processes in background
        if [ "$YARN_SERVER_RUNNING" = true ]; then
            info "Starting yarn server..."
            (cd "${HERE}/.." && yarn workspace server start-development > /dev/null 2>&1 &)
        fi

        if [ "$YARN_UI_RUNNING" = true ]; then
            info "Starting yarn UI..."
            (cd "${HERE}/.." && yarn workspace ui start-development > /dev/null 2>&1 &)
        fi

        sleep 2
        success "Development servers restarted in background"
        info "Check logs with: docker-compose logs -f (for db/redis)"
    fi
fi

#############################################
# DONE!
#############################################
echo ""
success "==================================================================="
success "Sync from production completed successfully!"
success "==================================================================="
echo ""

if [ "$SKIP_BACKUP" = false ]; then
    info "Local backup saved to: ${BACKUP_DIR}"
    info "You can restore from this backup if needed."
fi

if [ "$SYNC_DATA" = true ]; then
    info "Database, JSON files synced from production"
fi

if [ "$SYNC_ASSETS" = true ]; then
    info "Assets synced from production"
fi

if [ "$YARN_SERVER_RUNNING" = true ] || [ "$YARN_UI_RUNNING" = true ]; then
    echo ""
    info "Development servers were automatically restarted in the background"
    info "  • Server: http://localhost:5331"
    info "  • UI: http://localhost:3001"
fi

echo ""
