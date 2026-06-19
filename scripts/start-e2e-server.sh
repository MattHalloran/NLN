#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
DEFAULT_E2E_PROJECT_DIR="${ROOT_DIR}/.e2e-runtime"

if [ -f "${ROOT_DIR}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${ROOT_DIR}/.env"
    set +a
fi

export NODE_ENV="${NODE_ENV:-development}"
export PROJECT_DIR="${E2E_PROJECT_DIR:-${DEFAULT_E2E_PROJECT_DIR}}"
export E2E_DATA_DIR="${E2E_DATA_DIR:-${PROJECT_DIR}/packages/server/src/data}"
export E2E_DATA_BACKUP_DIR="${E2E_DATA_BACKUP_DIR:-${PROJECT_DIR}/.e2e-backup}"
export JWT_SECRET="${JWT_SECRET:-e2e-jwt-secret}"
export CSRF_SECRET="${CSRF_SECRET:-e2e-csrf-secret}"
export ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.test}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin-password}"
export PORT_SERVER="${PORT_SERVER:-5331}"
export PORT_DB="${PORT_DB:-5433}"
export PORT_REDIS="${PORT_REDIS:-6379}"
export DB_NAME="${DB_NAME:-nln_e2e}"
export DB_USER="${DB_USER:-nln_e2e}"
export DB_PASSWORD="${DB_PASSWORD:-nln_e2e}"
export DB_URL="${DB_URL:-postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${PORT_DB}/${DB_NAME}}"
export DATABASE_URL="${DATABASE_URL:-${DB_URL}}"
export REDIS_CONN="${REDIS_CONN:-localhost:${PORT_REDIS}}"
export SERVER_LOCATION="${SERVER_LOCATION:-local}"
export VITE_SERVER_LOCATION="${VITE_SERVER_LOCATION:-local}"
export VITE_PORT_SERVER="${VITE_PORT_SERVER:-${PORT_SERVER}}"
export ALLOW_MIGRATION_WITHOUT_BACKUP="${ALLOW_MIGRATION_WITHOUT_BACKUP:-true}"
export CREATE_MOCK_DATA="${CREATE_MOCK_DATA:-true}"
export DB_PULL="${DB_PULL:-false}"
export EMAIL_MODE="${EMAIL_MODE:-console}"

if [ "${PROJECT_DIR}" = "${DEFAULT_E2E_PROJECT_DIR}" ]; then
    rm -rf "${PROJECT_DIR}"
    mkdir -p "${PROJECT_DIR}/packages/server/src"
    cp -R "${ROOT_DIR}/packages/server/src/data" "${PROJECT_DIR}/packages/server/src/data"
    mkdir -p "${PROJECT_DIR}/data/logs"
    ln -s "${ROOT_DIR}/assets" "${PROJECT_DIR}/assets"
fi

cd "${ROOT_DIR}/packages/server"
exec yarn start-development
