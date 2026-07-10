#!/bin/bash
# Verifies a runtime-state backup against a local production-style stack.
#
# Default mode never connects to production. Provide a local backup directory or
# archive. If --create-backup is passed, this script delegates to backup.sh,
# which may read/copy production runtime state but must not mutate the VPS.

set -euo pipefail
umask 077

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "${HERE}/.." && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"
# shellcheck source=scripts/runtime-state.sh
. "${HERE}/runtime-state.sh"

BACKUP_INPUT=""
CREATE_BACKUP=false
ENV_FILE="${ROOT_DIR}/.env-prod"
KEEP=false
REPLACE_EXISTING_LOCAL=false
VERSION="local-backup-$(date -u +%Y%m%d%H%M%S)"
PORT_UI="${PORT_UI:-3101}"
PORT_SERVER="${PORT_SERVER:-5331}"
PORT_DB="${PORT_DB:-5433}"
PORT_REDIS="${PORT_REDIS:-6380}"
REST_VERSION="${REST_VERSION:-v1}"
REST_API_PREFIX="/api/rest/${REST_VERSION}"
CSRF_ROUTE="${REST_API_PREFIX}/csrf-token"
RECEIPT_DIR="${LOCAL_PRODUCTION_BACKUP_RECEIPT_DIR:-${ROOT_DIR}/.validation/local-production-backup}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-${HERE}/backup.sh}"
BUILD_SCRIPT="${BUILD_SCRIPT:-}"

WORK_DIR=""
PROJECT_DIR_LOCAL=""
EXTRACT_DIR=""
BACKUP_DIR=""
RECEIPT_PATH=""
CREATED_PROXY_NETWORK=false
STARTED_STACK=false

usage() {
    cat <<EOF
Usage: $0 --backup PATH [options]
       $0 --create-backup -e ENV_FILE [options]
      --backup PATH              Local runtime-state backup directory, timestamp dir, or .tar.gz archive
      --create-backup            Create a fresh read/copy backup first using backup.sh --verify-restore
  -e, --env-file FILE            Env file for --create-backup (default: .env-prod)
      --port-ui PORT             Local UI port (default: ${PORT_UI})
      --port-server PORT         Local API port (default: ${PORT_SERVER})
      --port-db PORT             Local Postgres port inside compose (default: ${PORT_DB})
      --port-redis PORT          Local Redis port inside compose (default: ${PORT_REDIS})
  -v, --version VERSION          Local build version/tag
      --replace-existing-local   Allow replacing existing local nln_* containers
      --keep                     Keep disposable project and local containers for debugging
  -h, --help                     Show this help message

The verifier sanitizes the backup env for localhost, restores the logical SQL
dump into disposable local Postgres, starts the production compose stack with
docker-compose.local-production.yml, runs localhost smoke checks, and writes a
receipt under .validation/local-production-backup/.
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
    --backup)
        BACKUP_INPUT="$2"
        shift 2
        ;;
    --create-backup)
        CREATE_BACKUP=true
        shift
        ;;
    -e | --env-file)
        ENV_FILE="$2"
        shift 2
        ;;
    --port-ui)
        PORT_UI="$2"
        shift 2
        ;;
    --port-server)
        PORT_SERVER="$2"
        shift 2
        ;;
    --port-db)
        PORT_DB="$2"
        shift 2
        ;;
    --port-redis)
        PORT_REDIS="$2"
        shift 2
        ;;
    -v | --version)
        VERSION="$2"
        shift 2
        ;;
    --replace-existing-local)
        REPLACE_EXISTING_LOCAL=true
        shift
        ;;
    --keep)
        KEEP=true
        shift
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

if [ "${CREATE_BACKUP}" = true ] && [ -n "${BACKUP_INPUT}" ]; then
    error "Use either --backup PATH or --create-backup, not both."
    exit 1
fi

if [ "${CREATE_BACKUP}" != true ] && [ -z "${BACKUP_INPUT}" ]; then
    error "Backup path is required unless --create-backup is used."
    usage
    exit 1
fi

require_port() {
    local name="$1"
    local value="$2"
    if ! [[ "${value}" =~ ^[0-9]+$ ]] || [ "${value}" -lt 1 ] || [ "${value}" -gt 65535 ]; then
        error "${name} must be a valid port, got: ${value}"
        exit 1
    fi
}

require_port "--port-ui" "${PORT_UI}"
require_port "--port-server" "${PORT_SERVER}"
require_port "--port-db" "${PORT_DB}"
require_port "--port-redis" "${PORT_REDIS}"
validate_deploy_version "${VERSION}"

if [ "${CREATE_BACKUP}" = true ]; then
    header "Creating verified runtime-state backup"
    backup_output=$("${BACKUP_SCRIPT}" -e "${ENV_FILE}" --verify-restore --print-backup-dir)
    printf '%s\n' "${backup_output}"
    BACKUP_INPUT=$(printf '%s\n' "${backup_output}" | sed -n 's/^backup_dir=//p' | tail -n 1)
    if [ -z "${BACKUP_INPUT}" ]; then
        error "Could not determine backup directory from backup.sh output."
        exit 1
    fi
fi

if [ ! -e "${BACKUP_INPUT}" ]; then
    error "Backup path does not exist: ${BACKUP_INPUT}"
    exit 1
fi

WORK_DIR=$(mktemp -d /tmp/nln-local-production-backup.XXXXXX)
PROJECT_DIR_LOCAL="${WORK_DIR}/project"
EXTRACT_DIR="${WORK_DIR}/backup"

compose_cmd() {
    docker compose \
        --env-file "${PROJECT_DIR_LOCAL}/.env-prod" \
        -f "${PROJECT_DIR_LOCAL}/docker-compose-prod.yml" \
        -f "${PROJECT_DIR_LOCAL}/docker-compose.local-production.yml" \
        "$@"
}

cleanup() {
    local exit_code=$?
    if [ "${KEEP}" != true ]; then
        if [ "${STARTED_STACK}" = true ] && [ -d "${PROJECT_DIR_LOCAL}" ]; then
            compose_cmd down -v --remove-orphans >/dev/null 2>&1 || true
        fi
        if [ "${CREATED_PROXY_NETWORK}" = true ]; then
            docker network rm nginx-proxy >/dev/null 2>&1 || true
        fi
        rm -rf "${WORK_DIR}"
    else
        warning "Keeping disposable local verification resources: ${WORK_DIR}"
    fi
    exit "${exit_code}"
}
trap cleanup EXIT

resolve_backup_dir() {
    local input="$1"

    if [ -d "${input}/runtime-state" ]; then
        printf '%s\n' "${input}/runtime-state"
        return 0
    fi

    if [ -d "${input}" ] && [ -f "${input}/manifest.txt" ]; then
        printf '%s\n' "${input}"
        return 0
    fi

    if [ -f "${input}" ]; then
        mkdir -p "${EXTRACT_DIR}"
        tar -xzf "${input}" -C "${EXTRACT_DIR}"
        if [ -d "${EXTRACT_DIR}/runtime-state" ]; then
            printf '%s\n' "${EXTRACT_DIR}/runtime-state"
            return 0
        fi
        if [ -f "${EXTRACT_DIR}/manifest.txt" ]; then
            printf '%s\n' "${EXTRACT_DIR}"
            return 0
        fi
    fi

    error "Could not find a runtime-state backup in: ${input}"
    return 1
}

set_env_value() {
    local file="$1"
    local key="$2"
    local value="$3"
    local tmp
    tmp=$(mktemp "${WORK_DIR}/env.XXXXXX")
    if grep -q "^${key}=" "${file}"; then
        awk -v key="${key}" -v value="${value}" '
            BEGIN { replaced = 0 }
            $0 ~ "^" key "=" {
                print key "=" value
                replaced = 1
                next
            }
            { print }
            END {
                if (replaced == 0) {
                    print key "=" value
                }
            }
        ' "${file}" >"${tmp}"
    else
        cp "${file}" "${tmp}"
        printf '%s=%s\n' "${key}" "${value}" >>"${tmp}"
    fi
    mv "${tmp}" "${file}"
}

sanitize_env_file() {
    local source_file="$1"
    local target_file="$2"

    if [ ! -f "${source_file}" ]; then
        error "Backup is missing .env-prod, required for local verification env generation."
        return 1
    fi

    cp "${source_file}" "${target_file}"
    chmod 600 "${target_file}"

    set_env_value "${target_file}" "SERVER_LOCATION" "dns"
    set_env_value "${target_file}" "CREATE_MOCK_DATA" "false"
    set_env_value "${target_file}" "DB_PULL" "false"
    set_env_value "${target_file}" "PORT_UI" "${PORT_UI}"
    set_env_value "${target_file}" "PORT_SERVER" "${PORT_SERVER}"
    set_env_value "${target_file}" "PORT_DB" "${PORT_DB}"
    set_env_value "${target_file}" "PORT_REDIS" "${PORT_REDIS}"
    set_env_value "${target_file}" "PROJECT_DIR" "/srv/app"
    set_env_value "${target_file}" "SITE_IP" "127.0.0.1"
    set_env_value "${target_file}" "UI_URL" "http://localhost:${PORT_UI}"
    set_env_value "${target_file}" "SERVER_URL" "http://localhost:${PORT_UI}/api"
    set_env_value "${target_file}" "VIRTUAL_HOST" "localhost"
    set_env_value "${target_file}" "LETSENCRYPT_HOST" "localhost"
    set_env_value "${target_file}" "LETSENCRYPT_EMAIL" "local-production@example.test"
    set_env_value "${target_file}" "SITE_EMAIL_FROM" "local-production@example.test"
    set_env_value "${target_file}" "SITE_EMAIL_USERNAME" "local-production@example.test"
    set_env_value "${target_file}" "SITE_EMAIL_PASSWORD" "local-production-email-disabled"
    set_env_value "${target_file}" "SITE_EMAIL_ALIAS" "local-production@example.test"
    set_env_value "${target_file}" "COOKIE_SECURE" "false"
    set_env_value "${target_file}" "TRUST_PROXY_HOPS" "1"
    set_env_value "${target_file}" "E2E_DISABLE_RATE_LIMITS" "false"
    set_env_value "${target_file}" "RATE_LIMIT_DIAGNOSTICS" "false"
    set_env_value "${target_file}" "VITE_API_BASE_URL" "/api"
}

prepare_disposable_project() {
    header "Preparing disposable local project"
    mkdir -p "${PROJECT_DIR_LOCAL}"
    (
        cd "${ROOT_DIR}"
        tar \
            --exclude='./.git' \
            --exclude='./node_modules' \
            --exclude='./backups' \
            --exclude='./.validation' \
            --exclude='./data' \
            --exclude='./scripts/tests/tmp*' \
            --exclude='./test-results' \
            -czf - .
    ) | tar -xzf - -C "${PROJECT_DIR_LOCAL}"

    if [ -d "${ROOT_DIR}/node_modules" ]; then
        ln -s "${ROOT_DIR}/node_modules" "${PROJECT_DIR_LOCAL}/node_modules"
    fi

    mkdir -p \
        "${PROJECT_DIR_LOCAL}/data/uploads" \
        "${PROJECT_DIR_LOCAL}/assets" \
        "${PROJECT_DIR_LOCAL}/data/redis" \
        "${PROJECT_DIR_LOCAL}/data/migration-backups" \
        "${PROJECT_DIR_LOCAL}/data/logs" \
        "${PROJECT_DIR_LOCAL}/data/postgres"

    rsync_or_copy "${BACKUP_DIR}/data/uploads/" "${PROJECT_DIR_LOCAL}/data/uploads/"
    rsync_or_copy "${BACKUP_DIR}/assets/" "${PROJECT_DIR_LOCAL}/assets/"
    rsync_or_copy "${BACKUP_DIR}/data/redis/" "${PROJECT_DIR_LOCAL}/data/redis/"
    rsync_or_copy "${BACKUP_DIR}/data/migration-backups/" "${PROJECT_DIR_LOCAL}/data/migration-backups/"
    if [ -f "${BACKUP_DIR}/.env" ]; then
        cp -p "${BACKUP_DIR}/.env" "${PROJECT_DIR_LOCAL}/.env"
    fi
    find "${BACKUP_DIR}" -maxdepth 1 -name 'jwt_*' -type f -exec cp -p {} "${PROJECT_DIR_LOCAL}/" \;

    sanitize_env_file "${BACKUP_DIR}/.env-prod" "${PROJECT_DIR_LOCAL}/.env-prod"
}

rsync_or_copy() {
    local source="$1"
    local target="$2"
    mkdir -p "${target}"
    if command -v rsync >/dev/null 2>&1; then
        rsync -a --delete "${source}" "${target}"
    else
        find "${target}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
        cp -a "${source}/." "${target}/"
    fi
}

ensure_no_existing_local_containers() {
    local existing
    existing=$(docker ps -a --format '{{.Names}}' 2>/dev/null | grep -E '^nln_(ui|server|db|redis)$' || true)
    if [ -n "${existing}" ] && [ "${REPLACE_EXISTING_LOCAL}" != true ]; then
        error "Existing local nln_* containers found. Stop them yourself or pass --replace-existing-local."
        printf '%s\n' "${existing}" >&2
        exit 1
    fi
}

ensure_local_proxy_network() {
    if ! docker network inspect nginx-proxy >/dev/null 2>&1; then
        docker network create nginx-proxy >/dev/null
        CREATED_PROXY_NETWORK=true
    fi
}

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
            compose_cmd ps >&2 || true
            compose_cmd logs --tail=80 ui server db redis >&2 || true
            return 1
        fi

        printf "."
        sleep 2
    done
}

wait_for_db() {
    local started_at
    started_at=$(date +%s)
    printf "Waiting for local Postgres"

    while true; do
        if compose_cmd exec -T db pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
            printf "\nLocal Postgres is ready.\n"
            return 0
        fi

        if [ $(( $(date +%s) - started_at )) -ge 120 ]; then
            printf "\nTimed out waiting for local Postgres\n" >&2
            compose_cmd logs --tail=80 db >&2 || true
            return 1
        fi

        printf "."
        sleep 2
    done
}

restore_sql_dump() {
    header "Restoring backup SQL dump into local Postgres"
    # shellcheck disable=SC1090
    . "${PROJECT_DIR_LOCAL}/.env-prod"
    compose_cmd exec -T db sh -c \
        'PGPASSWORD="${POSTGRES_PASSWORD:-${DB_PASSWORD}}" psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-${DB_USER}}" -d "${POSTGRES_DB:-${DB_NAME}}"' \
        <"${BACKUP_DIR}/$(runtime_state_database_dump_path)"
}

write_receipt() {
    local result="$1"
    mkdir -p "${RECEIPT_DIR}"
    chmod 700 "${RECEIPT_DIR}"
    RECEIPT_PATH="${RECEIPT_DIR}/local-production-backup-$(date -u +%Y%m%d%H%M%S).receipt"
    {
        echo "result=${result}"
        echo "backup_input=${BACKUP_INPUT}"
        echo "resolved_backup_dir=${BACKUP_DIR}"
        echo "commit=$(git -C "${ROOT_DIR}" rev-parse HEAD 2>/dev/null || echo unknown)"
        echo "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo "version=${VERSION}"
        echo "work_dir=${WORK_DIR}"
        echo "project_dir=${PROJECT_DIR_LOCAL}"
        echo "ui_url=http://localhost:${PORT_UI}"
        echo "api_health_url=http://localhost:${PORT_SERVER}/healthcheck"
        echo "same_origin_api_url=http://localhost:${PORT_UI}${CSRF_ROUTE}"
        echo "checks=backup-validated,env-sanitized,sql-restored,api-health,ui-root,same-origin-api"
    } >"${RECEIPT_PATH}"
    chmod 600 "${RECEIPT_PATH}"
}

BACKUP_DIR=$(resolve_backup_dir "${BACKUP_INPUT}")

header "Validating runtime-state backup"
runtime_state_validate_backup "${BACKUP_DIR}"

ensure_no_existing_local_containers
prepare_disposable_project

header "Validating sanitized local environment"
"${PROJECT_DIR_LOCAL}/scripts/validate-env.sh" "${PROJECT_DIR_LOCAL}/.env-prod"
set -a
# shellcheck disable=SC1090
. "${PROJECT_DIR_LOCAL}/.env-prod"
set +a

ensure_local_proxy_network

header "Starting local database and Redis"
(
    cd "${PROJECT_DIR_LOCAL}"
    compose_cmd up -d db redis
)
STARTED_STACK=true
wait_for_db
restore_sql_dump

header "Building local production artifacts"
(
    cd "${PROJECT_DIR_LOCAL}"
    BUILD_ALLOW_DIRTY_WORKTREE=true \
        BUILD_SKIP_PACKAGE_VERSION_UPDATE=true \
        TEST=false \
        VITE_API_BASE_URL=/api \
        "${BUILD_SCRIPT:-${PROJECT_DIR_LOCAL}/scripts/build.sh}" -v "${VERSION}" -d n -e "${PROJECT_DIR_LOCAL}/.env-prod"
)

header "Starting local production stack"
(
    cd "${PROJECT_DIR_LOCAL}"
    compose_cmd up -d
)

wait_for_url "API healthcheck" "http://localhost:${PORT_SERVER}/healthcheck" 240
wait_for_url "production UI" "http://localhost:${PORT_UI}/" 180
wait_for_url "same-origin CSRF endpoint" "http://localhost:${PORT_UI}${CSRF_ROUTE}" 120

write_receipt "passed"
success "Local production backup verification passed"
info "Verification receipt written: ${RECEIPT_PATH}"
