#!/bin/bash
set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=scripts/env-defaults.sh
. "${HERE}/env-defaults.sh"

ROOT_DIR="${HERE}/.."
CONFIG_FILE="${ROOT_DIR}/packages/shared/src/api/config.ts"

read_ts_port() {
    local key="$1"
    sed -n "/${key}:/s/.*${key}: *\\([0-9][0-9]*\\).*/\\1/p" "${CONFIG_FILE}" | head -1
}

assert_equal() {
    local label="$1"
    local expected="$2"
    local actual="$3"

    if [ "${expected}" != "${actual}" ]; then
        echo "Default drift: ${label} expected ${expected}, got ${actual}" >&2
        exit 1
    fi
}

assert_file_contains() {
    local file="$1"
    local needle="$2"

    if ! grep -Fq "${needle}" "${ROOT_DIR}/${file}"; then
        echo "Default drift: ${file} is missing '${needle}'" >&2
        exit 1
    fi
}

assert_equal "DEFAULT_PORTS.ui" "${DEFAULT_PORT_UI}" "$(read_ts_port ui)"
assert_equal "DEFAULT_PORTS.server" "${DEFAULT_PORT_SERVER}" "$(read_ts_port server)"
assert_equal "DEFAULT_PORTS.db" "${DEFAULT_PORT_DB}" "$(read_ts_port db)"
assert_equal "DEFAULT_PORTS.redis" "${DEFAULT_PORT_REDIS}" "$(read_ts_port redis)"
assert_equal "DEFAULT_PORTS.e2eRedis" "${DEFAULT_E2E_PORT_REDIS}" "$(read_ts_port e2eRedis)"

assert_file_contains "docker-compose.yml" "\${PORT_UI:-${DEFAULT_PORT_UI}}"
assert_file_contains "docker-compose.yml" "\${PORT_SERVER:-${DEFAULT_PORT_SERVER}}"
assert_file_contains "docker-compose.yml" "\${PORT_DB:-${DEFAULT_PORT_DB}}"
assert_file_contains "docker-compose.yml" "\${PORT_REDIS:-${DEFAULT_PORT_REDIS}}"
assert_file_contains "docker-compose-prod.yml" "\${PORT_UI:-${DEFAULT_PORT_UI}}"
assert_file_contains "docker-compose-prod.yml" "\${PORT_SERVER:-${DEFAULT_PORT_SERVER}}"
assert_file_contains "docker-compose-prod.yml" "\${PORT_DB:-${DEFAULT_PORT_DB}}"
assert_file_contains "docker-compose-prod.yml" "\${PORT_REDIS:-${DEFAULT_PORT_REDIS}}"
assert_file_contains ".github/workflows/ci.yml" "PORT_SERVER: ${DEFAULT_PORT_SERVER}"
assert_file_contains ".github/workflows/ci.yml" "PORT_DB: ${DEFAULT_PORT_DB}"
assert_file_contains ".github/workflows/ci.yml" "PORT_REDIS: ${DEFAULT_E2E_PORT_REDIS}"

echo "Environment defaults are aligned."
