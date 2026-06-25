#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
# shellcheck source=scripts/env-defaults.sh
. "${ROOT_DIR}/scripts/env-defaults.sh"

if [ -f "${ROOT_DIR}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${ROOT_DIR}/.env"
    set +a
fi

default_env_apply_e2e

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
