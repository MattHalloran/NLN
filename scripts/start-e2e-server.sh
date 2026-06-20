#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
DEFAULT_E2E_PROJECT_DIR="${ROOT_DIR}/.e2e-runtime"
# shellcheck source=scripts/env-defaults.sh
. "${ROOT_DIR}/scripts/env-defaults.sh"

if [ -f "${ROOT_DIR}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${ROOT_DIR}/.env"
    set +a
fi

default_env_apply_e2e

export NODE_ENV="${NODE_ENV:-development}"
export PROJECT_DIR="${E2E_PROJECT_DIR:-${DEFAULT_E2E_PROJECT_DIR}}"
export E2E_DATA_DIR="${E2E_DATA_DIR:-${PROJECT_DIR}/packages/server/src/data}"
export E2E_DATA_BACKUP_DIR="${E2E_DATA_BACKUP_DIR:-${PROJECT_DIR}/.e2e-backup}"
export JWT_SECRET="${JWT_SECRET:-e2e-jwt-secret}"
export CSRF_SECRET="${CSRF_SECRET:-e2e-csrf-secret}"
export ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.test}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin-password}"
export PORT_SERVER
export PORT_DB
export PORT_REDIS
export DB_NAME="${DB_NAME:-nln_e2e}"
export DB_USER="${DB_USER:-nln_e2e}"
export DB_PASSWORD="${DB_PASSWORD:-nln_e2e}"
export E2E_MANAGE_SERVICES="${E2E_MANAGE_SERVICES:-false}"
if [ "${E2E_MANAGE_SERVICES}" = "true" ]; then
    export DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${PORT_DB}/${DB_NAME}"
    export DATABASE_URL="${DB_URL}"
    export REDIS_CONN="localhost:${PORT_REDIS}"
else
    export DB_URL="${DB_URL:-postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${PORT_DB}/${DB_NAME}}"
    export DATABASE_URL="${DATABASE_URL:-${DB_URL}}"
    export REDIS_CONN="${REDIS_CONN:-localhost:${PORT_REDIS}}"
fi
export SERVER_LOCATION="${SERVER_LOCATION:-local}"
export VITE_SERVER_LOCATION="${VITE_SERVER_LOCATION:-local}"
export VITE_PORT_SERVER="${VITE_PORT_SERVER:-${PORT_SERVER}}"
export ALLOW_MIGRATION_WITHOUT_BACKUP="${ALLOW_MIGRATION_WITHOUT_BACKUP:-true}"
export CREATE_MOCK_DATA="${CREATE_MOCK_DATA:-true}"
export DB_PULL="${DB_PULL:-false}"
export EMAIL_MODE="${EMAIL_MODE:-console}"
export E2E_DB_CONTAINER="${E2E_DB_CONTAINER:-nln_e2e_db_${PORT_DB}}"
export E2E_REDIS_CONTAINER="${E2E_REDIS_CONTAINER:-nln_e2e_redis_${PORT_REDIS}}"

SERVER_PID=""

cleanup() {
    if [ -n "${SERVER_PID}" ]; then
        if kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
            kill -TERM "${SERVER_PID}" >/dev/null 2>&1 || true
            for _ in $(seq 1 20); do
                if ! kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
                    break
                fi
                sleep 0.25
            done
            kill -KILL "${SERVER_PID}" >/dev/null 2>&1 || true
        fi
        wait "${SERVER_PID}" >/dev/null 2>&1 || true
    fi

    if [ "${E2E_MANAGE_SERVICES}" = "true" ]; then
        docker rm -f "${E2E_DB_CONTAINER}" "${E2E_REDIS_CONTAINER}" >/dev/null 2>&1 || true
    fi
}

trap cleanup EXIT INT TERM

wait_for_e2e_services() {
    local _
    for _ in $(seq 1 60); do
        if docker exec "${E2E_DB_CONTAINER}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1 &&
            docker exec "${E2E_REDIS_CONTAINER}" redis-cli ping >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done

    echo "Timed out waiting for e2e Postgres and Redis services" >&2
    docker logs "${E2E_DB_CONTAINER}" >&2 || true
    docker logs "${E2E_REDIS_CONTAINER}" >&2 || true
    return 1
}

start_e2e_services() {
    if ! command -v docker >/dev/null 2>&1; then
        echo "Docker is required when E2E_MANAGE_SERVICES=true" >&2
        return 1
    fi
    if ! docker info >/dev/null 2>&1; then
        echo "Docker is not reachable when E2E_MANAGE_SERVICES=true" >&2
        return 1
    fi

    docker rm -f "${E2E_DB_CONTAINER}" "${E2E_REDIS_CONTAINER}" >/dev/null 2>&1 || true
    docker run -d \
        --name "${E2E_DB_CONTAINER}" \
        -e POSTGRES_DB="${DB_NAME}" \
        -e POSTGRES_USER="${DB_USER}" \
        -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
        -p "127.0.0.1:${PORT_DB}:5432" \
        postgres:13-alpine >/dev/null
    docker run -d \
        --name "${E2E_REDIS_CONTAINER}" \
        -p "127.0.0.1:${PORT_REDIS}:6379" \
        redis:7-alpine >/dev/null

    wait_for_e2e_services
}

if [ "${PROJECT_DIR}" = "${DEFAULT_E2E_PROJECT_DIR}" ]; then
    rm -rf "${PROJECT_DIR}"
    mkdir -p "${PROJECT_DIR}/packages/server/src"
    cp -R "${ROOT_DIR}/packages/server/src/data" "${PROJECT_DIR}/packages/server/src/data"
    mkdir -p "${PROJECT_DIR}/data/logs"
    ln -s "${ROOT_DIR}/assets" "${PROJECT_DIR}/assets"
fi

if [ "${E2E_MANAGE_SERVICES}" = "true" ]; then
    start_e2e_services
fi

cd "${ROOT_DIR}/packages/server"
yarn pre-build
yarn build
node dist/index.js &
SERVER_PID="$!"
wait "${SERVER_PID}"
