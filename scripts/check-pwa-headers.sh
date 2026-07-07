#!/bin/bash
# Read-only validation that the deployed static/PWA headers match the app contract.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"

ENV_FILE="${HERE}/../.env-prod"
BASE_URL="${PWA_HEADER_BASE_URL:-}"
CURL_TIMEOUT="${PWA_HEADER_TIMEOUT_SECONDS:-20}"

NO_STORE="no-cache, no-store, must-revalidate"
IMMUTABLE="public, max-age=31536000, immutable"

usage() {
    cat <<EOF
Usage: $0 [options]
  -e, --env-file FILE       Environment file to source for UI_URL (default: .env-prod)
  -u, --url URL             Public UI base URL to check; overrides UI_URL from env
      --timeout SECONDS     curl max time per request (default: ${CURL_TIMEOUT})
  -h, --help                Show this help message

This script only performs HTTP GET requests against the public UI URL.
It does not SSH, deploy, restart, prune, clean up, or write to production.
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
    -e | --env-file)
        ENV_FILE="$2"
        shift 2
        ;;
    -u | --url)
        BASE_URL="$2"
        shift 2
        ;;
    --timeout)
        CURL_TIMEOUT="$2"
        shift 2
        ;;
    -h | --help)
        usage
        exit 0
        ;;
    *)
        error "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
done

if [ -z "${BASE_URL}" ]; then
    if [ ! -f "${ENV_FILE}" ]; then
        error "Environment file not found: ${ENV_FILE}"
        exit 1
    fi

    # shellcheck disable=SC1090
    . "${ENV_FILE}"
    BASE_URL="${UI_URL:-}"
fi

if [ -z "${BASE_URL}" ]; then
    error "UI_URL is required. Set it in ${ENV_FILE} or pass --url."
    exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
    error "curl is required to check deployed PWA headers."
    exit 1
fi

BASE_URL="${BASE_URL%/}"

fetch_body() {
    local path="$1"
    local output

    if ! output=$(curl -fsSL --connect-timeout 10 --max-time "${CURL_TIMEOUT}" --max-redirs 5 "${BASE_URL}${path}"); then
        error "Failed to fetch ${BASE_URL}${path}"
        return 1
    fi

    printf '%s' "${output}"
}

fetch_final_headers() {
    local path="$1"
    local output

    if ! output=$(curl -fsSL --connect-timeout 10 --max-time "${CURL_TIMEOUT}" --max-redirs 5 -D - -o /dev/null "${BASE_URL}${path}"); then
        error "Failed to fetch headers for ${BASE_URL}${path}"
        return 1
    fi

    printf '%s\n' "${output}" | tr -d '\r' | awk 'BEGIN { RS=""; ORS="" } { last=$0 } END { print last }'
}

get_header_value() {
    local headers="$1"
    local header_name="$2"
    local lower_name

    lower_name=$(printf '%s' "${header_name}" | tr '[:upper:]' '[:lower:]')
    printf '%s\n' "${headers}" | awk -v wanted="${lower_name}:" '
        {
            lower = tolower($0)
            if (index(lower, wanted) == 1) {
                sub(/^[^:]*:[[:space:]]*/, "")
                print
                exit
            }
        }
    '
}

assert_cache_control() {
    local path="$1"
    local expected="$2"
    local headers
    local actual

    headers=$(fetch_final_headers "${path}")
    actual=$(get_header_value "${headers}" "Cache-Control")

    if [ "${actual}" != "${expected}" ]; then
        error "${path} Cache-Control mismatch"
        error "Expected: ${expected}"
        error "Actual:   ${actual:-<missing>}"
        return 1
    fi

    success "${path} Cache-Control matches: ${expected}"
}

header "Checking deployed PWA/static cache headers at ${BASE_URL}"

assert_cache_control "/" "${NO_STORE}"
assert_cache_control "/index.html" "${NO_STORE}"
assert_cache_control "/service-worker.js" "${NO_STORE}"
assert_cache_control "/manifest.json" "${NO_STORE}"
assert_cache_control "/site.webmanifest" "${NO_STORE}"
assert_cache_control "/workbox/workbox-sw.js" "${NO_STORE}"

service_worker_body=$(fetch_body "/service-worker.js")
entry_chunk=$(
    printf '%s' "${service_worker_body}" |
        grep -m1 -oE '\./assets/index-[A-Za-z0-9_-]+\.js' |
        sed 's#^\./#/#' ||
        true
)

if [ -z "${entry_chunk}" ]; then
    error "Could not find the hashed app entry chunk in /service-worker.js"
    exit 1
fi

assert_cache_control "${entry_chunk}" "${IMMUTABLE}"

success "Deployed PWA/static cache headers match the expected contract."
