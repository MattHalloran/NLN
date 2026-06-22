#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PORT_UI="${PORT_UI:-3001}"

if [ -z "${CHROME_PATH:-}" ]; then
    CHROME_PATH=$(node -e "console.log(require('playwright').chromium.executablePath())")
    export CHROME_PATH
fi

cd "${ROOT_DIR}/packages/ui"
PORT_UI="${PORT_UI}" node scripts/serve-production.js &
server_pid=$!

cleanup() {
    kill "${server_pid}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

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
