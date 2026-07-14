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
ACKNOWLEDGE_SENSITIVE_DATA_RETENTION=false
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
ADMIN_SMOKE_SCRIPT="${ADMIN_SMOKE_SCRIPT:-}"
INSTALL_SCRIPT="${INSTALL_SCRIPT:-}"

WORK_DIR=""
PROJECT_DIR_LOCAL=""
EXTRACT_DIR=""
BACKUP_DIR=""
RECEIPT_PATH=""
STARTED_STACK=false
LOCAL_NETWORK_NAME=""
LOCAL_CONTAINER_PREFIX=""

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
      --acknowledge-sensitive-data-retention
                                 Required with --keep; acknowledges retained copied data and secrets
  -h, --help                     Show this help message

The verifier generates an allowlisted local-only env, starts with empty active
Redis, restores the logical SQL dump into disposable local Postgres, runs the
production compose stack on internal networks, proves outbound egress is
blocked, runs localhost smoke checks, and writes a receipt under
.validation/local-production-backup/.
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
    --acknowledge-sensitive-data-retention)
        ACKNOWLEDGE_SENSITIVE_DATA_RETENTION=true
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
if [ "${KEEP}" = true ] && [ "${ACKNOWLEDGE_SENSITIVE_DATA_RETENTION}" != true ]; then
    error "--keep requires --acknowledge-sensitive-data-retention."
    exit 1
fi
if [ "${KEEP}" != true ] && [ "${ACKNOWLEDGE_SENSITIVE_DATA_RETENTION}" = true ]; then
    error "--acknowledge-sensitive-data-retention is only valid with --keep."
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
LOCAL_NETWORK_NAME="nln-local-verify-${VERSION//[^a-zA-Z0-9_-]/-}"
LOCAL_CONTAINER_PREFIX="${LOCAL_NETWORK_NAME}"
if ! command -v openssl >/dev/null 2>&1; then
    error "openssl is required to generate disposable local secrets."
    exit 1
fi

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
# Docker service users need traversal to their explicit bind mounts. The
# working tree itself is not listable, while copied data/secrets remain 0700/0600.
chmod 711 "${WORK_DIR}"
PROJECT_DIR_LOCAL="${WORK_DIR}/project"
EXTRACT_DIR="${WORK_DIR}/backup"

compose_cmd() {
    docker compose \
        --env-file "${PROJECT_DIR_LOCAL}/.env-prod" \
        -f "${PROJECT_DIR_LOCAL}/docker-compose-prod.yml" \
        -f "${PROJECT_DIR_LOCAL}/docker-compose.local-production.yml" \
        -f "${PROJECT_DIR_LOCAL}/docker-compose.local-production-isolated.yml" \
        "$@"
}

cleanup() {
    local exit_code=$?
    if [ "${KEEP}" != true ]; then
        if [ "${STARTED_STACK}" = true ] && [ -d "${PROJECT_DIR_LOCAL}" ]; then
            compose_cmd down -v --remove-orphans >/dev/null 2>&1 || true
        fi
        rm -rf "${WORK_DIR}"
    else
        warning "Keeping disposable local verification resources: ${WORK_DIR}"
    fi
    exit "${exit_code}"
}
trap cleanup EXIT

test_failure_point() {
    local stage="$1"
    if [ "${LOCAL_VERIFY_TEST_MODE:-false}" = true ] && [ "${LOCAL_VERIFY_FAIL_AFTER:-}" = "${stage}" ]; then
        error "Injected local verification failure after ${stage}."
        return 1
    fi
}

use_project_node() {
    local required current
    required=$(tr -d '[:space:]' <"${ROOT_DIR}/.nvmrc")
    current="v$(node -v 2>/dev/null | sed 's/^v//' || true)"
    if [ "${current}" = "${required}" ]; then return 0; fi
    if [ -s "${NVM_DIR:-${HOME}/.nvm}/nvm.sh" ]; then
        # shellcheck disable=SC1091
        . "${NVM_DIR:-${HOME}/.nvm}/nvm.sh"
        nvm install "${required}"
        nvm use "${required}"
        return 0
    fi
    error "Node ${required} from .nvmrc is required for clean dependency installation."
    return 1
}

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

sanitize_env_file() {
    local source_file="$1"
    local target_file="$2"

    if [ ! -f "${source_file}" ]; then
        error "Backup is missing .env-prod, required for local verification env generation."
        return 1
    fi

    local jwt_secret csrf_secret db_password admin_password
    jwt_secret=$(openssl rand -hex 32)
    csrf_secret=$(openssl rand -hex 32)
    db_password=$(openssl rand -hex 24)
    admin_password=$(openssl rand -hex 24)
    cat >"${target_file}" <<EOF
SERVER_LOCATION=dns
CREATE_MOCK_DATA=false
DB_PULL=false
PORT_UI=${PORT_UI}
PORT_SERVER=${PORT_SERVER}
PORT_DB=${PORT_DB}
PORT_REDIS=${PORT_REDIS}
PROJECT_DIR=/srv/app
SITE_IP=127.0.0.1
UI_URL=http://localhost:${PORT_UI}
SERVER_URL=http://localhost:${PORT_UI}/api
VIRTUAL_HOST=localhost
CORS_ORIGINS=http://localhost:${PORT_UI},http://127.0.0.1:${PORT_UI}
TRUST_PROXY_HOPS=1
JWT_SECRET=${jwt_secret}
CSRF_SECRET=${csrf_secret}
DB_NAME=nln_local_verification
DB_USER=nln_local_verification
DB_PASSWORD=${db_password}
ADMIN_EMAIL=local-admin@example.test
ADMIN_PASSWORD=${admin_password}
SITE_EMAIL_FROM=Local-verification
SITE_EMAIL_USERNAME=disabled@example.test
SITE_EMAIL_PASSWORD=disabled-local-only
SITE_EMAIL_ALIAS=disabled@example.test
EMAIL_MODE=disabled
SMS_MODE=disabled
LETSENCRYPT_HOST=localhost
LETSENCRYPT_EMAIL=disabled@example.test
COOKIE_SECURE=false
E2E_DISABLE_RATE_LIMITS=false
RATE_LIMIT_DIAGNOSTICS=false
VITE_API_BASE_URL=/api
APP_RUNTIME=local-production
EOF
    chmod 600 "${target_file}"
}

validate_local_env_allowlist() {
    local file="$1" key
    while IFS='=' read -r key _; do
        case "${key}" in
        SERVER_LOCATION | CREATE_MOCK_DATA | DB_PULL | PORT_UI | PORT_SERVER | PORT_DB | PORT_REDIS | PROJECT_DIR | SITE_IP | UI_URL | SERVER_URL | VIRTUAL_HOST | CORS_ORIGINS | TRUST_PROXY_HOPS | JWT_SECRET | CSRF_SECRET | DB_NAME | DB_USER | DB_PASSWORD | ADMIN_EMAIL | ADMIN_PASSWORD | SITE_EMAIL_FROM | SITE_EMAIL_USERNAME | SITE_EMAIL_PASSWORD | SITE_EMAIL_ALIAS | EMAIL_MODE | SMS_MODE | LETSENCRYPT_HOST | LETSENCRYPT_EMAIL | COOKIE_SECURE | E2E_DISABLE_RATE_LIMITS | RATE_LIMIT_DIAGNOSTICS | VITE_API_BASE_URL | APP_RUNTIME) ;;
        *)
            error "Generated local environment contains a non-allowlisted key: ${key}"
            return 1
            ;;
        esac
    done <"${file}"
    grep -q '^EMAIL_MODE=disabled$' "${file}" || return 1
    grep -q '^SMS_MODE=disabled$' "${file}" || return 1
    if grep -Eq '^(TWILIO_|PHONE_NUMBER=|SMTP_|AWS_|S3_|.*WEBHOOK|.*OAUTH)' "${file}"; then
        error "Generated local environment contains a forbidden integration setting."
        return 1
    fi
}

prepare_disposable_project() {
    header "Preparing disposable local project"
    mkdir -p "${PROJECT_DIR_LOCAL}"
    chmod 711 "${PROJECT_DIR_LOCAL}"
    (
        cd "${ROOT_DIR}"
        # Copy the source under review, including intentional uncommitted files,
        # without traversing ignored backups, secrets, dependencies, or local
        # test artifacts. Packaging the whole working directory made this step
        # depend on unrelated machine state and could make fixture tests hang.
        git ls-files -z --cached --others --exclude-standard |
            while IFS= read -r -d '' source_path; do
                if [ -e "${source_path}" ] || [ -L "${source_path}" ]; then
                    printf '%s\0' "${source_path}"
                fi
            done |
            tar --null --files-from=- -czf -
    ) | tar -xzf - -C "${PROJECT_DIR_LOCAL}"

    # PostgreSQL drops privileges before reading its initialization bind mount.
    # Open only this tracked, non-sensitive code path for traversal/read; copied
    # runtime data and generated secrets remain owner-only.
    chmod 755 "${PROJECT_DIR_LOCAL}/packages" "${PROJECT_DIR_LOCAL}/packages/db" \
        "${PROJECT_DIR_LOCAL}/packages/db/entrypoint"
    find "${PROJECT_DIR_LOCAL}/packages/db/entrypoint" -type f -exec chmod 644 {} +

    mkdir -p \
        "${PROJECT_DIR_LOCAL}/data/uploads" \
        "${PROJECT_DIR_LOCAL}/assets" \
        "${PROJECT_DIR_LOCAL}/data/redis" \
        "${PROJECT_DIR_LOCAL}/data/redis-backup-inspection" \
        "${PROJECT_DIR_LOCAL}/data/migration-backups" \
        "${PROJECT_DIR_LOCAL}/data/logs" \
        "${PROJECT_DIR_LOCAL}/data/postgres"

    rsync_or_copy "${BACKUP_DIR}/data/uploads/" "${PROJECT_DIR_LOCAL}/data/uploads/"
    rsync_or_copy "${BACKUP_DIR}/assets/" "${PROJECT_DIR_LOCAL}/assets/"
    # Retain copied queue state only for offline inspection. Active local Redis
    # starts empty so production jobs cannot execute.
    rsync_or_copy "${BACKUP_DIR}/data/redis/" "${PROJECT_DIR_LOCAL}/data/redis-backup-inspection/"
    rsync_or_copy "${BACKUP_DIR}/data/migration-backups/" "${PROJECT_DIR_LOCAL}/data/migration-backups/"
    sanitize_env_file "${BACKUP_DIR}/.env-prod" "${PROJECT_DIR_LOCAL}/.env-prod"
    validate_local_env_allowlist "${PROJECT_DIR_LOCAL}/.env-prod"
    cat >"${PROJECT_DIR_LOCAL}/docker-compose.local-production-isolated.yml" <<EOF
services:
  ui:
    container_name: ${LOCAL_CONTAINER_PREFIX}-ui
  server:
    container_name: ${LOCAL_CONTAINER_PREFIX}-server
  db:
    container_name: ${LOCAL_CONTAINER_PREFIX}-db
  redis:
    container_name: ${LOCAL_CONTAINER_PREFIX}-redis
networks:
  proxy:
    name: ${LOCAL_NETWORK_NAME}-proxy
    external: false
    internal: true
  app:
    name: ${LOCAL_NETWORK_NAME}-app
    internal: true
EOF
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
    existing=$(docker ps -a --format '{{.Names}}' 2>/dev/null | grep -E "^${LOCAL_CONTAINER_PREFIX}-(ui|server|db|redis)$" || true)
    if [ -n "${existing}" ] && [ "${REPLACE_EXISTING_LOCAL}" != true ]; then
        error "Containers for this local verification version already exist. Stop them yourself or pass --replace-existing-local."
        printf '%s\n' "${existing}" >&2
        exit 1
    fi
}

verify_network_isolation() {
    local network
    for network in "${LOCAL_NETWORK_NAME}-proxy" "${LOCAL_NETWORK_NAME}-app"; do
        if [ "$(docker network inspect --format '{{.Internal}}' "${network}")" != true ]; then
            error "Disposable network is not internal: ${network}"
            return 1
        fi
    done
    if compose_cmd exec -T server node -e 'const net=require("net");const s=net.connect({host:"1.1.1.1",port:443});s.setTimeout(3000);s.on("connect",()=>process.exit(0));s.on("timeout",()=>process.exit(1));s.on("error",()=>process.exit(1));' >/dev/null 2>&1; then
        error "EGRESS_CANARY unexpectedly reached an external address."
        return 1
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

wait_for_container_url() {
    local label="$1"
    local service="$2"
    local url="$3"
    local timeout_seconds="${4:-180}"
    local started_at
    started_at=$(date +%s)
    printf "Waiting for %s at %s" "${label}" "${url}"

    while true; do
        if compose_cmd exec -T "${service}" node -e \
            'fetch(process.argv[1]).then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))' \
            "${url}" >/dev/null 2>&1; then
            printf "\n%s is reachable.\n" "${label}"
            return 0
        fi
        if [ "$(( $(date +%s) - started_at ))" -ge "${timeout_seconds}" ]; then
            printf "\n" >&2
            error "Timed out waiting for ${label}: ${url}"
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
        echo "sensitive_data_retained=${KEEP}"
        echo "checks=backup-validated,allowlist-env,delivery-sink-canaries,empty-active-redis,internal-networks,egress-denied,sql-restored,api-health,ui-root,same-origin-api,reversible-admin-writes"
    } >"${RECEIPT_PATH}"
    chmod 600 "${RECEIPT_PATH}"
}

BACKUP_DIR=$(resolve_backup_dir "${BACKUP_INPUT}")

header "Validating runtime-state backup"
runtime_state_validate_backup "${BACKUP_DIR}"

ensure_no_existing_local_containers
prepare_disposable_project
test_failure_point "project-preparation"

header "Installing clean disposable dependencies"
if [ -n "${INSTALL_SCRIPT}" ]; then
    "${INSTALL_SCRIPT}" "${PROJECT_DIR_LOCAL}"
else
    use_project_node
    (cd "${PROJECT_DIR_LOCAL}" && yarn install --frozen-lockfile)
    # The production image intentionally omits development-only tsx. Bundle the
    # reversible smoke test while dependencies are available, then execute the
    # self-contained artifact inside the isolated server container.
    (
        cd "${PROJECT_DIR_LOCAL}"
        yarn workspace @local/shared build
        npx --no-install esbuild scripts/smoke-test-admin.ts \
            --bundle --platform=node --format=cjs \
            --outfile=scripts/smoke-test-admin.cjs
    )
fi
test_failure_point "dependency-install"

header "Validating allowlisted local environment"
"${PROJECT_DIR_LOCAL}/scripts/validate-env.sh" "${PROJECT_DIR_LOCAL}/.env-prod"
set -a
# shellcheck disable=SC1090
. "${PROJECT_DIR_LOCAL}/.env-prod"
set +a

# Fail before creating containers if the production definition and isolation
# override cannot be rendered together.
compose_cmd config >/dev/null

header "Starting local database and Redis"
(
    cd "${PROJECT_DIR_LOCAL}"
    compose_cmd up -d db redis
)
STARTED_STACK=true
wait_for_db
test_failure_point "database-start"
restore_sql_dump
test_failure_point "database-restore"

header "Building local production artifacts"
(
    cd "${PROJECT_DIR_LOCAL}"
    BUILD_ALLOW_DIRTY_WORKTREE=true \
        BUILD_SKIP_PACKAGE_VERSION_UPDATE=true \
        BUILD_SOURCE_COMMIT="$(git -C "${ROOT_DIR}" rev-parse HEAD)" \
        TEST=false \
        VITE_API_BASE_URL=/api \
        "${BUILD_SCRIPT:-${PROJECT_DIR_LOCAL}/scripts/build.sh}" -v "${VERSION}" -d n -e "${PROJECT_DIR_LOCAL}/.env-prod"
)

header "Starting local production stack"
(
    cd "${PROJECT_DIR_LOCAL}"
    compose_cmd up -d
)

verify_network_isolation
test_failure_point "application-start"

header "Executing local delivery sink canaries"
compose_cmd exec -T server node "${PROJECT_DIR}/scripts/local-delivery-sink-canary.mjs" "${PROJECT_DIR}"
test_failure_point "delivery-sinks"

# Internal Docker networks deliberately reject host-published connections on
# some engines. Probe from the actual application containers so isolation is
# retained while still exercising the production listeners and UI proxy.
wait_for_container_url "API healthcheck" server "http://localhost:5331/healthcheck" 240
wait_for_container_url "production UI" ui "http://localhost:${PORT_UI}/" 180
wait_for_container_url "same-origin CSRF endpoint" ui "http://localhost:${PORT_UI}${CSRF_ROUTE}" 120

header "Running reversible administrator write checks"
if [ -n "${ADMIN_SMOKE_SCRIPT}" ]; then
    API_URL="http://localhost:${PORT_SERVER}" ADMIN_EMAIL="${ADMIN_EMAIL}" ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
        "${ADMIN_SMOKE_SCRIPT}"
else
    compose_cmd exec -T \
        -e API_URL=http://localhost:5331 \
        -e ADMIN_EMAIL="${ADMIN_EMAIL}" \
        -e ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
        server node "${PROJECT_DIR}/scripts/smoke-test-admin.cjs"
fi
test_failure_point "admin-smoke"

write_receipt "passed"
success "Local production backup verification passed"
info "Verification receipt written: ${RECEIPT_PATH}"
