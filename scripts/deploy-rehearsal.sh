#!/bin/bash
# Runs a disposable local rehearsal of the production deploy path.
# This script must not connect to production or read .env-prod unless explicitly passed.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
. "${HERE}/utils.sh"

VERSION=""
ENV_FILE=""
KEEP=false
REPLACE_LOCAL_CONTAINERS=false
WORK_ROOT=""
PROJECT_DIR=""
REHEARSAL_PROJECT_DIR=""
RESTORE_CONTAINER=""

usage() {
    cat <<EOF
Usage: $0 -v rehearsal-VERSION [-e ENV_FILE] [--keep] [--replace-local-containers]
  -v, --version VERSION       Rehearsal version slot. Must start with "rehearsal-".
  -e, --env-file ENV_FILE     Optional explicit rehearsal env file. Defaults to a generated local env.
      --keep                  Keep the temp project and /var/tmp rehearsal slot.
      --replace-local-containers
                              Allow stopping/removing existing nln_* local containers.
  -h, --help                  Show this help message.
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
    -v | --version)
        VERSION="$2"
        shift 2
        ;;
    -e | --env-file)
        ENV_FILE="$2"
        shift 2
        ;;
    --keep)
        KEEP=true
        shift
        ;;
    --replace-local-containers)
        REPLACE_LOCAL_CONTAINERS=true
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

if [ -z "${VERSION}" ]; then
    VERSION="rehearsal-$(date +%Y%m%d%H%M%S)"
fi

if [[ ! "${VERSION}" =~ ^rehearsal-[A-Za-z0-9._-]+$ ]]; then
    error "Rehearsal version must start with 'rehearsal-' and contain only letters, numbers, dots, underscores, or hyphens."
    exit 1
fi

REPO_ROOT=$(cd "${HERE}/.." && pwd)
WORK_ROOT=$(mktemp -d "/tmp/nln-deploy-rehearsal.${VERSION}.XXXXXX")
REHEARSAL_PROJECT_DIR="${WORK_ROOT}/project"
PROJECT_DIR="${REHEARSAL_PROJECT_DIR}"
TMP_VERSION_DIR="/var/tmp/${VERSION}"

cleanup() {
    if [ -n "${RESTORE_CONTAINER}" ]; then
        docker rm -f "${RESTORE_CONTAINER}" >/dev/null 2>&1 || true
    fi

    if [ -d "${REHEARSAL_PROJECT_DIR}" ] && [ -f "${REHEARSAL_PROJECT_DIR}/docker-compose-prod.yml" ] && [ -f "${ENV_FILE:-}" ]; then
        (cd "${REHEARSAL_PROJECT_DIR}" && docker-compose --env-file "${ENV_FILE}" -f docker-compose-prod.yml down) >/dev/null 2>&1 || true
    fi

    if [ "${KEEP}" != true ]; then
        rm -rf "${WORK_ROOT}"
        rm -rf "${TMP_VERSION_DIR}"
    else
        info "Kept rehearsal project at: ${REHEARSAL_PROJECT_DIR}"
        info "Kept rehearsal version slot at: ${TMP_VERSION_DIR}"
    fi
}
trap cleanup EXIT

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        error "Required command not found: $1"
        exit 1
    fi
}

choose_port() {
    local base="$1"
    local port
    for offset in $(seq 0 200); do
        port=$((base + offset))
        if command -v ss >/dev/null 2>&1; then
            if ss -ltn | awk '{print $4}' | grep -q ":${port}$"; then
                continue
            fi
        fi
        printf '%s\n' "${port}"
        return 0
    done
    error "Could not find an available local port near ${base}"
    exit 1
}

load_env() {
    set -a
    # shellcheck disable=SC1090
    . "${ENV_FILE}"
    set +a
}

guard_rehearsal_env() {
    load_env

    if [[ "${SITE_IP:-}" != 127.* ]]; then
        error "SITE_IP must be loopback for deploy rehearsal. Got: ${SITE_IP:-unset}"
        exit 1
    fi

    if [[ "${UI_URL:-}" != http://127.* && "${UI_URL:-}" != http://localhost* ]]; then
        error "UI_URL must be a local loopback URL for deploy rehearsal. Got: ${UI_URL:-unset}"
        exit 1
    fi

    if [[ "${SERVER_URL:-}" != http://127.* && "${SERVER_URL:-}" != http://localhost* ]]; then
        error "SERVER_URL must be a local loopback URL for deploy rehearsal. Got: ${SERVER_URL:-unset}"
        exit 1
    fi

    if [ "${PROJECT_DIR:-}" != "${REHEARSAL_PROJECT_DIR}" ]; then
        error "PROJECT_DIR in the rehearsal env must match the disposable project directory."
        error "Expected: ${REHEARSAL_PROJECT_DIR}"
        error "Got:      ${PROJECT_DIR:-unset}"
        exit 1
    fi
}

install_project_env_file() {
    cp -p "${ENV_FILE}" "${REHEARSAL_PROJECT_DIR}/.env-prod"
}

require_clean_worktree() {
    local changes
    changes=$(git -C "${REPO_ROOT}" status --porcelain --untracked-files=no)
    if [ -n "${changes}" ]; then
        error "Deploy rehearsal requires a clean tracked worktree so deploy-commit.txt matches the cloned project."
        git -C "${REPO_ROOT}" status --short --untracked-files=no
        exit 1
    fi
}

write_generated_env() {
    local ui_port server_port db_port redis_port
    ui_port=$(choose_port 3101)
    server_port=$(choose_port 5331)
    db_port=$(choose_port 55433)
    redis_port=$(choose_port 56380)
    ENV_FILE="${WORK_ROOT}/rehearsal.env-prod"

    cat >"${ENV_FILE}" <<EOF
SERVER_LOCATION=dns
CREATE_MOCK_DATA=false
DB_PULL=false
PORT_UI=${ui_port}
PORT_SERVER=${server_port}
PORT_DB=${db_port}
PORT_REDIS=${redis_port}
PROJECT_DIR=${PROJECT_DIR}
SITE_IP=127.0.0.1
SERVER_URL=http://127.0.0.1:${server_port}
UI_URL=http://127.0.0.1:${ui_port}
VIRTUAL_HOST=localhost
CORS_ORIGINS=http://127.0.0.1:${ui_port}
JWT_SECRET=rehearsal-jwt-secret
CSRF_SECRET=rehearsal-csrf-secret
DB_NAME=nln_rehearsal
DB_USER=nln_rehearsal
DB_PASSWORD=rehearsal-db-password
ADMIN_EMAIL=admin@example.test
ADMIN_PASSWORD=rehearsal-admin-password
SITE_EMAIL_USERNAME=mailer@example.test
SITE_EMAIL_FROM="Deploy Rehearsal"
SITE_EMAIL_ALIAS=mailer@example.test
SITE_EMAIL_PASSWORD=rehearsal-email-password
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_MODE=file
LETSENCRYPT_EMAIL=admin@example.test
GENERATE_SOURCEMAP=false
EOF
}

refuse_existing_local_containers() {
    local existing
    existing=$(docker ps -a --format '{{.Names}}' | grep -E '^(nln_ui|nln_server|nln_db|nln_redis)$' || true)
    if [ -z "${existing}" ]; then
        return 0
    fi

    if [ "${REPLACE_LOCAL_CONTAINERS}" != true ]; then
        error "Found existing local nln_* containers:"
        echo "${existing}"
        error "Re-run with --replace-local-containers only if these are disposable local containers."
        exit 1
    fi

    warning "Removing existing local nln_* containers for disposable rehearsal:"
    echo "${existing}"
    echo "${existing}" | xargs docker rm -f >/dev/null
}

wait_for_db() {
    local ready=false
    for _ in $(seq 1 30); do
        if docker exec nln_db pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
            ready=true
            break
        fi
        sleep 2
    done

    if [ "${ready}" != true ]; then
        error "Disposable database did not become ready."
        exit 1
    fi
}

apply_baseline_migrations() {
    header "Applying baseline migrations to disposable database"
    (
        cd "${REHEARSAL_PROJECT_DIR}/packages/server"
        DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${PORT_DB}/${DB_NAME}" \
            yarn prisma migrate deploy --schema=src/db/schema.prisma
    )
}

seed_disposable_database() {
    header "Seeding disposable database"
    docker exec -i -e PGPASSWORD="${DB_PASSWORD}" nln_db psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB_NAME}" <<'SQL'
CREATE TABLE IF NOT EXISTS deploy_rehearsal_probe (
  id integer PRIMARY KEY,
  note text NOT NULL
);
INSERT INTO deploy_rehearsal_probe (id, note)
VALUES (1, 'logical dump restore probe')
ON CONFLICT (id) DO UPDATE SET note = EXCLUDED.note;
SQL
}

verify_dump_restores() {
    local dump_path="${TMP_VERSION_DIR}/runtime-state/data/postgres.sql"

    if [ ! -s "${dump_path}" ]; then
        error "Expected logical dump is missing or empty: ${dump_path}"
        exit 1
    fi

    header "Verifying logical dump restores into disposable Postgres"
    RESTORE_CONTAINER="nln_rehearsal_restore_${VERSION//[^A-Za-z0-9]/_}"
    docker rm -f "${RESTORE_CONTAINER}" >/dev/null 2>&1 || true
    docker run -d --name "${RESTORE_CONTAINER}" \
        -e POSTGRES_DB="${DB_NAME}" \
        -e POSTGRES_USER="${DB_USER}" \
        -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
        postgres:13-alpine >/dev/null

    local ready=false
    for _ in $(seq 1 30); do
        if docker exec "${RESTORE_CONTAINER}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
            ready=true
            break
        fi
        sleep 2
    done
    if [ "${ready}" != true ]; then
        error "Restore verification database did not become ready."
        exit 1
    fi

    docker exec -i -e PGPASSWORD="${DB_PASSWORD}" "${RESTORE_CONTAINER}" \
        psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB_NAME}" <"${dump_path}"

    docker exec -e PGPASSWORD="${DB_PASSWORD}" "${RESTORE_CONTAINER}" \
        psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB_NAME}" \
        -c "SELECT note FROM deploy_rehearsal_probe WHERE id = 1;" >/dev/null

    docker rm -f "${RESTORE_CONTAINER}" >/dev/null
    RESTORE_CONTAINER=""
    success "Logical dump restored successfully in a disposable Postgres container"
}

header "Preparing deploy rehearsal"
if [ -z "${ENV_FILE}" ]; then
    write_generated_env
else
    SOURCE_ENV_FILE=$(cd "$(dirname "${ENV_FILE}")" && pwd)/$(basename "${ENV_FILE}")
    if [ ! -f "${SOURCE_ENV_FILE}" ]; then
        error "Environment file not found: ${SOURCE_ENV_FILE}"
        exit 1
    fi
    ENV_FILE="${WORK_ROOT}/rehearsal.env-prod"
    grep -v '^PROJECT_DIR=' "${SOURCE_ENV_FILE}" >"${ENV_FILE}"
    printf 'PROJECT_DIR=%s\n' "${REHEARSAL_PROJECT_DIR}" >>"${ENV_FILE}"
fi

guard_rehearsal_env

for cmd in git docker docker-compose yarn tar curl; do
    require_command "${cmd}"
done

require_clean_worktree
refuse_existing_local_containers

if [ -e "${TMP_VERSION_DIR}" ]; then
    error "Rehearsal version slot already exists: ${TMP_VERSION_DIR}"
    error "Choose a fresh rehearsal version or remove the old disposable slot."
    exit 1
fi

header "Creating disposable project clone"
git clone --local --no-hardlinks "${REPO_ROOT}" "${REHEARSAL_PROJECT_DIR}" >/dev/null
git -C "${REHEARSAL_PROJECT_DIR}" checkout "$(git -C "${REPO_ROOT}" rev-parse HEAD)" >/dev/null

mkdir -p \
    "${REHEARSAL_PROJECT_DIR}/data/uploads" \
    "${REHEARSAL_PROJECT_DIR}/assets" \
    "${REHEARSAL_PROJECT_DIR}/data/redis" \
    "${REHEARSAL_PROJECT_DIR}/data/migration-backups" \
    "${REHEARSAL_PROJECT_DIR}/data/logs"
printf 'deploy rehearsal upload\n' >"${REHEARSAL_PROJECT_DIR}/data/uploads/rehearsal.txt"
printf 'deploy rehearsal migration backup\n' >"${REHEARSAL_PROJECT_DIR}/data/migration-backups/rehearsal.txt"

header "Installing disposable project dependencies"
(cd "${REHEARSAL_PROJECT_DIR}" && yarn install --frozen-lockfile)

"${REHEARSAL_PROJECT_DIR}/scripts/validate-env.sh" "${ENV_FILE}"
load_env
install_project_env_file

header "Starting disposable baseline database"
docker network create nginx-proxy >/dev/null 2>&1 || true
(cd "${REHEARSAL_PROJECT_DIR}" && docker-compose --env-file "${ENV_FILE}" -f docker-compose-prod.yml up -d db redis)
wait_for_db
apply_baseline_migrations
seed_disposable_database

header "Building deploy artifacts"
(cd "${REHEARSAL_PROJECT_DIR}" && TEST=false BUILD_SKIP_PACKAGE_VERSION_UPDATE=true ./scripts/build.sh -v "${VERSION}" -d n -e "${ENV_FILE}")

header "Running local deploy rehearsal"
(cd "${REHEARSAL_PROJECT_DIR}" && DEPLOY_REHEARSAL=true ./scripts/deploy.sh -v "${VERSION}")

verify_dump_restores

header "Checking runtime-state restore dry run"
RUNTIME_STATE_PROJECT_DIR="${REHEARSAL_PROJECT_DIR}" RUNTIME_STATE_BACKUP_BASE="/var/tmp" \
    "${REHEARSAL_PROJECT_DIR}/scripts/restore-runtime-state.sh" -v "${VERSION}"

success "Deploy rehearsal completed successfully for ${VERSION}"
