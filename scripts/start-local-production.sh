#!/bin/bash
set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "${HERE}/.." && pwd)
ENV_FILE="${ROOT_DIR}/.env-prod"
VERSION="local-production-$(date +%Y%m%d%H%M%S)"

usage() {
    cat <<USAGE
Usage: $(basename "$0") [-e ENV_FILE] [-v VERSION]

Builds the production artifacts with a local-safe API base URL and starts the
local Docker production stack with docker-compose.local-production.yml.

This script uses local Docker only. It does not run SSH, deploy, backup, prune,
cleanup, restart, or deletion commands against production.
USAGE
}

while getopts ":e:v:h" opt; do
    case "${opt}" in
    e)
        ENV_FILE="${OPTARG}"
        ;;
    v)
        VERSION="${OPTARG}"
        ;;
    h)
        usage
        exit 0
        ;;
    \?)
        echo "Invalid option: -${OPTARG}" >&2
        usage >&2
        exit 1
        ;;
    :)
        echo "Option -${OPTARG} requires an argument." >&2
        usage >&2
        exit 1
        ;;
    esac
done

if [ -f "${ENV_FILE}" ]; then
    set -a
    # shellcheck disable=SC1090
    . "${ENV_FILE}"
    set +a
else
    echo "Environment file not found: ${ENV_FILE}" >&2
    exit 1
fi

export BUILD_ALLOW_DIRTY_WORKTREE="${BUILD_ALLOW_DIRTY_WORKTREE:-true}"
export BUILD_SKIP_PACKAGE_VERSION_UPDATE="${BUILD_SKIP_PACKAGE_VERSION_UPDATE:-true}"
export TEST="${TEST:-false}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api}"

PORT_UI="${PORT_UI:-3001}"
PORT_SERVER="${PORT_SERVER:-5331}"

wait_for_url() {
    local label="$1"
    local url="$2"
    local timeout_seconds="${3:-180}"
    local started_at

    started_at=$(date +%s)
    printf "Waiting for %s at %s" "${label}" "${url}"

    while true; do
        if curl -fsS "${url}" >/dev/null 2>&1; then
            printf "\n%s is reachable.\n" "${label}"
            return 0
        fi

        if [ $(( $(date +%s) - started_at )) -ge "${timeout_seconds}" ]; then
            printf "\nTimed out waiting for %s at %s\n" "${label}" "${url}" >&2
            docker compose \
                --env-file "${ENV_FILE}" \
                -f "${ROOT_DIR}/docker-compose-prod.yml" \
                -f "${ROOT_DIR}/docker-compose.local-production.yml" \
                ps >&2 || true
            docker compose \
                --env-file "${ENV_FILE}" \
                -f "${ROOT_DIR}/docker-compose-prod.yml" \
                -f "${ROOT_DIR}/docker-compose.local-production.yml" \
                logs --tail=80 ui server >&2 || true
            return 1
        fi

        printf "."
        sleep 2
    done
}

"${HERE}/build.sh" -v "${VERSION}" -d n -e "${ENV_FILE}"

docker compose \
    --env-file "${ENV_FILE}" \
    -f "${ROOT_DIR}/docker-compose-prod.yml" \
    -f "${ROOT_DIR}/docker-compose.local-production.yml" \
    up -d

wait_for_url "API healthcheck" "http://localhost:${PORT_SERVER}/healthcheck" 240
wait_for_url "production UI" "http://localhost:${PORT_UI}/" 180
wait_for_url "same-origin CSRF endpoint" "http://localhost:${PORT_UI}/api/rest/v1/csrf-token" 120

echo "Local production stack requested."
echo "UI: http://localhost:${PORT_UI}"
echo "API health: http://localhost:${PORT_SERVER}/healthcheck"
echo "Same-origin CSRF: http://localhost:${PORT_UI}/api/rest/v1/csrf-token"
