#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
# shellcheck source=scripts/env-defaults.sh
. "${ROOT_DIR}/scripts/env-defaults.sh"

if [ "${LIGHTHOUSE_LOAD_DOTENV:-false}" = true ] && [ -f "${ROOT_DIR}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${ROOT_DIR}/.env"
    set +a
fi

default_env_apply_e2e

# The trusted Lighthouse gate must coexist with ordinary local development and
# the browser matrix. Use a dedicated fixture namespace unless the caller
# explicitly selects another isolated range.
export PORT_UI="${LIGHTHOUSE_PORT_UI:-14001}"
export PORT_SERVER="${LIGHTHOUSE_PORT_SERVER:-15332}"
export PORT_DB="${LIGHTHOUSE_PORT_DB:-15434}"
export PORT_REDIS="${LIGHTHOUSE_PORT_REDIS:-16380}"
export VITE_PORT_SERVER="${PORT_SERVER}"
export UI_URL="http://localhost:${PORT_UI}"
export SERVER_URL="http://localhost:${PORT_SERVER}"
export CORS_ORIGINS="${UI_URL}"
export E2E_IGNORE_DOTENV=true
export E2E_TEARDOWN_REMOVE_SERVICES=true
export E2E_DB_CONTAINER="nln_lighthouse_db_${PORT_DB}"
export E2E_REDIS_CONTAINER="nln_lighthouse_redis_${PORT_REDIS}"
export LIGHTHOUSE_BASE_URL="${UI_URL}"
export NODE_ENV=development
export APP_RUNTIME=development
export SERVER_LOCATION=local
export VITE_SERVER_LOCATION=local
export JWT_SECRET=lighthouse-fixture-jwt-secret
export CSRF_SECRET=lighthouse-fixture-csrf-secret
export ADMIN_EMAIL=admin@example.test
export ADMIN_PASSWORD=admin-password
export DB_NAME=nln_lighthouse_fixture
export DB_USER=nln_lighthouse_fixture
export DB_PASSWORD=nln_lighthouse_fixture
export CREATE_MOCK_DATA=true
export DB_PULL=false
export EMAIL_MODE=console
export ALLOW_MIGRATION_WITHOUT_BACKUP=true

api_pid=""
ui_pid=""

if [ -z "${CHROME_PATH:-}" ]; then
    CHROME_PATH=$(node -e "console.log(require('playwright').chromium.executablePath())")
    export CHROME_PATH
fi

cd "${ROOT_DIR}"
yarn workspace @local/shared build
yarn workspace ui build

cleanup() {
    if [ -n "${ui_pid}" ]; then
        kill "${ui_pid}" >/dev/null 2>&1 || true
        wait "${ui_pid}" >/dev/null 2>&1 || true
    fi
    if [ -n "${api_pid}" ]; then
        kill -TERM "${api_pid}" >/dev/null 2>&1 || true
        wait "${api_pid}" >/dev/null 2>&1 || true
    fi
    docker rm -f "${E2E_DB_CONTAINER}" "${E2E_REDIS_CONTAINER}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

E2E_MANAGE_SERVICES=true bash "${ROOT_DIR}/scripts/start-e2e-server.sh" &
api_pid=$!

for _ in $(seq 1 30); do
    if curl -fsS "http://localhost:${PORT_SERVER}/healthcheck" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

curl -fsS "http://localhost:${PORT_SERVER}/healthcheck" >/dev/null

cd "${ROOT_DIR}/packages/ui"
PORT_UI="${PORT_UI}" node scripts/serve-production.js &
ui_pid=$!

for _ in $(seq 1 30); do
    if curl -fsS "http://localhost:${PORT_UI}/" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

curl -fsS "http://localhost:${PORT_UI}/" >/dev/null

cd "${ROOT_DIR}"
yarn lighthouse:collect
yarn lighthouse:assert
