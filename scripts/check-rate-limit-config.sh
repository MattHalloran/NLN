#!/bin/bash
# Read-only production proxy/rate-limit configuration checks.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"

COMPOSE_FILE="${1:-${HERE}/../docker-compose-prod.yml}"

if [ ! -f "${COMPOSE_FILE}" ]; then
    error "Compose file not found: ${COMPOSE_FILE}"
    exit 1
fi

extract_service_block() {
    local service="$1"
    awk -v service="${service}" '
        $0 ~ "^  " service ":" { in_service=1; print; next }
        in_service && $0 ~ "^  [A-Za-z0-9_-]+:" { exit }
        in_service { print }
    ' "${COMPOSE_FILE}"
}

SERVER_BLOCK=$(extract_service_block "server")
REDIS_BLOCK=$(extract_service_block "redis")

if [ -z "${SERVER_BLOCK}" ]; then
    error "docker-compose production file must define a server service"
    exit 1
fi

if [ -z "${REDIS_BLOCK}" ]; then
    error "docker-compose production file must define a redis service for rate-limit storage"
    exit 1
fi

VALIDATION_FAILED=0

fail_check() {
    error "$1"
    VALIDATION_FAILED=1
}

pass_check() {
    info "✓ $1"
}

if printf '%s\n' "${SERVER_BLOCK}" | grep -q '^    ports:'; then
    fail_check "server service must not publish public ports in production; use the proxy network instead"
else
    pass_check "server service does not publish public ports"
fi

if printf '%s\n' "${SERVER_BLOCK}" | grep -q '^      - proxy$'; then
    pass_check "server service is attached to the proxy network"
else
    fail_check "server service must be attached to the proxy network"
fi

if printf '%s\n' "${SERVER_BLOCK}" | grep -q '^      - app$'; then
    pass_check "server service is attached to the app network"
else
    fail_check "server service must be attached to the app network"
fi

if printf '%s\n' "${SERVER_BLOCK}" | grep -q 'REDIS_CONN:'; then
    pass_check "server service defines REDIS_CONN"
else
    fail_check "server service must define REDIS_CONN for shared rate-limit counters"
fi

if printf '%s\n' "${SERVER_BLOCK}" | grep -q 'VIRTUAL_PATH: "/api"'; then
    pass_check "server service is routed through the API proxy path"
else
    fail_check "server service must define VIRTUAL_PATH: \"/api\""
fi

if printf '%s\n' "${SERVER_BLOCK}" | grep -q 'TRUST_PROXY_HOPS:'; then
    pass_check "server service defines TRUST_PROXY_HOPS"
else
    fail_check "server service must define TRUST_PROXY_HOPS so Express trusts the intended proxy hop count"
fi

if printf '%s\n' "${REDIS_BLOCK}" | grep -q '^    expose:'; then
    pass_check "redis service exposes its port only to Docker networks"
else
    fail_check "redis service must expose its port to Docker networks"
fi

if printf '%s\n' "${REDIS_BLOCK}" | grep -q '^    ports:'; then
    fail_check "redis service must not publish public ports in production"
else
    pass_check "redis service does not publish public ports"
fi

if [ "${VALIDATION_FAILED}" -eq 0 ]; then
    success "Rate-limit proxy configuration checks passed."
    exit 0
fi

error "Rate-limit proxy configuration checks failed."
exit 1
