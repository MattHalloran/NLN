#!/bin/sh
HERE=$(dirname $0)
. "${HERE}/prettify.sh"

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
    yarn prisma migrate deploy --schema=${PRISMA_SCHEMA_FILE}
    if [ $? -ne 0 ]; then
        error "Failed to run migrations"
        exit 1
    fi
    success 'Migrations completed'
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
