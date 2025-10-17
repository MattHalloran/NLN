#!/bin/sh
HERE=$(dirname $0)
. "${HERE}/utils.sh"

# If in development mode, convert shared packages to typescript
# In production, this should already be done
if [ "${NODE_ENV}" = "development" ]; then
    sh "${HERE}/shared.sh"
fi

PRISMA_SCHEMA_FILE="src/db/schema.prisma"

cd ${PROJECT_DIR}/packages/server
if [ "${DB_PULL}" = true ]; then
    info 'Generating schema.prisma file from database...'
    yarn prisma db pull --schema=${PRISMA_SCHEMA_FILE}
    if [ $? -ne 0 ]; then
        error "Failed to generate schema.prisma file from database"
        exit 1
    fi
    success 'Schema.prisma file generated'
else
    info 'Running migrations...'

    # Create backup directory if it doesn't exist
    BACKUP_DIR="${PROJECT_DIR}/data/migration-backups"
    mkdir -p "${BACKUP_DIR}"

    # Create pre-migration backup
    BACKUP_FILE="${BACKUP_DIR}/pre-migration-$(date +%Y%m%d-%H%M%S).sql"
    info "Creating pre-migration database backup: ${BACKUP_FILE}"

    # Extract connection details from DB_URL (format: postgresql://user:password@host:port/dbname)
    # Use pg_dump via docker exec to the db container, or via network if available
    if [ -n "${DB_URL}" ]; then
        # Try to create backup using pg_dump
        # First, check if we can connect to the database
        if echo "SELECT 1;" | yarn prisma db execute --stdin --schema=${PRISMA_SCHEMA_FILE} >/dev/null 2>&1; then
            info "Database is accessible, creating backup..."
            # Use pg_dump through the db container
            # Extract db connection details
            DB_HOST=$(echo $DB_URL | sed -n 's/.*@\(.*\):.*/\1/p')
            DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
            DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\(.*\)/\1/p')
            DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\(.*\):.*/\1/p')
            DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/.*:\(.*\)@.*/\1/p')

            # Create backup using pg_dump
            PGPASSWORD="${DB_PASS}" pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -F p -f "${BACKUP_FILE}" 2>/dev/null

            if [ $? -eq 0 ]; then
                success "✓ Pre-migration backup created successfully"
                # Keep only the last 10 backups
                ls -t ${BACKUP_DIR}/pre-migration-*.sql 2>/dev/null | tail -n +11 | xargs -r rm
                info "Old backups cleaned up (keeping last 10)"
            else
                warning "Could not create pre-migration backup with pg_dump, attempting alternative method..."
                # Alternative: Use prisma db execute to dump via SQL
                # This is a fallback and won't be as comprehensive
                rm -f "${BACKUP_FILE}"
                warning "Skipping backup - pg_dump not available in container"
            fi
        else
            warning "Database not yet accessible, skipping pre-migration backup"
        fi
    else
        warning "DB_URL not set, skipping pre-migration backup"
    fi

    # Run migrations
    if yarn prisma migrate deploy --schema=${PRISMA_SCHEMA_FILE}; then
        success 'Migrations completed'
    else
        error 'Migrations failed!'
        if [ -f "${BACKUP_FILE}" ]; then
            error "Migration failed! You can restore from backup: ${BACKUP_FILE}"
            error "To restore: PGPASSWORD=\$DB_PASS psql -h \$DB_HOST -p \$DB_PORT -U \$DB_USER -d \$DB_NAME -f ${BACKUP_FILE}"
        fi
        error "Exiting due to migration failure. Container will restart."
        exit 1
    fi
fi

info 'Generating Prisma schema...'
yarn prisma generate --schema=${PRISMA_SCHEMA_FILE}
if [ $? -ne 0 ]; then
    error "Failed to generate Prisma schema"
    exit 1
fi
success 'Prisma schema generated'

info 'Starting server...'
cd ${PROJECT_DIR}/packages/server
yarn start-${NODE_ENV}
success 'Server started'
