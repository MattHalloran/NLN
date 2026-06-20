#!/bin/bash
# Backs up production runtime state from a remote server without modifying it.
#
# Default mode is targeted runtime state:
#   data/postgres.sql logical dump, data/uploads, assets, data/redis,
#   data/migration-backups, .env-prod, plus optional .env and jwt_* files when
#   present.
#
# Use --include-logs to include data/logs. Use --full for an explicit
# whole-project backup excluding generated and bulky directories.

set -euo pipefail
umask 077

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"
# shellcheck source=scripts/runtime-state.sh
. "${HERE}/runtime-state.sh"

ENV_FILE="${HERE}/../.env-prod"
MODE="runtime-state"
INCLUDE_LOGS=false
PREFLIGHT_ONLY=false
ALLOW_PROVISION=false
BACKUP_COUNT=""
WILL_LOOP=false
INTERVAL=86400
OUTPUT_DIR=""

usage() {
    cat <<EOF
Usage: $0 [options]
  -e, --env-file FILE       Environment file to source (default: .env-prod)
  -c, --count COUNT         Number of most recent backup directories to keep (default: no cleanup)
  -i, --interval SECONDS    Loop interval in seconds (default: 86400)
  -l, --loop y|n            Run continuously (default: n)
  -o, --output-dir DIR      Local backup root (default: backups/\${SITE_IP})
  -f, --full                Create a full project backup instead of runtime-state backup
      --mode MODE           Backup mode: runtime-state or full
      --include-logs        Include data/logs in runtime-state backup
      --preflight-only      Print remote size estimates and exit without creating an archive
      --allow-provision     Allow keylessSsh.sh to create/install SSH keys if needed
  -h, --help                Show this help message
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
    -e | --env-file)
        ENV_FILE="$2"
        shift 2
        ;;
    -c | --count)
        BACKUP_COUNT="$2"
        shift 2
        ;;
    -i | --interval)
        INTERVAL="$2"
        shift 2
        ;;
    -l | --loop)
        WILL_LOOP="$2"
        shift 2
        ;;
    -o | --output-dir)
        OUTPUT_DIR="$2"
        shift 2
        ;;
    -f | --full)
        MODE="full"
        shift
        ;;
    --mode)
        MODE="$2"
        shift 2
        ;;
    --include-logs)
        INCLUDE_LOGS=true
        shift
        ;;
    --preflight-only)
        PREFLIGHT_ONLY=true
        shift
        ;;
    --allow-provision)
        ALLOW_PROVISION=true
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

if [ "$MODE" != "runtime-state" ] && [ "$MODE" != "full" ]; then
    error "Invalid mode: ${MODE}. Expected runtime-state or full."
    exit 1
fi

if [ -f "${ENV_FILE}" ]; then
    # shellcheck disable=SC1090
    . "${ENV_FILE}"
else
    error "Could not find environment file: ${ENV_FILE}"
    exit 1
fi

if [ -z "${SITE_IP:-}" ]; then
    error "SITE_IP is not set in ${ENV_FILE}"
    exit 1
fi

PROJECT_DIR="${PROJECT_DIR:-/root/NLN}"
REMOTE_SERVER="root@${SITE_IP}"
KEY_PATH="${HOME}/.ssh/id_rsa_${SITE_IP}"
BACKUP_ROOT="${OUTPUT_DIR:-${HERE}/../backups/${SITE_IP}}"

ensure_ssh_access() {
    if [ ! -f "${KEY_PATH}" ]; then
        if [ "${ALLOW_PROVISION}" = true ]; then
            "${HERE}/keylessSsh.sh" -e "${ENV_FILE}"
        else
            error "SSH key not found: ${KEY_PATH}"
            error "Run keylessSsh.sh separately, or pass --allow-provision intentionally."
            exit 1
        fi
    fi

    ssh -i "${KEY_PATH}" -o BatchMode=yes -o ConnectTimeout=10 "${REMOTE_SERVER}" "true" >/dev/null
}

remote_runtime_paths_script() {
    local include_logs="$1"
    local critical_paths optional_paths jwt_globs log_paths
    critical_paths=$(runtime_state_shell_words runtime_state_critical_paths)
    optional_paths=$(runtime_state_shell_words runtime_state_optional_paths)
    jwt_globs=$(runtime_state_shell_words runtime_state_jwt_globs)
    log_paths=$(runtime_state_shell_words runtime_state_log_paths)
    cat <<EOF
cd "${PROJECT_DIR}"
critical="${critical_paths}"
optional="${optional_paths} ${jwt_globs}"
[ "${include_logs}" = "true" ] && optional="\${optional} ${log_paths}"
missing=""
for p in \${critical}; do
  if ! ls -d \${p} >/dev/null 2>&1; then
    missing="\${missing} \${p}"
  fi
done
if [ -n "\${missing}" ]; then
  echo "Missing critical runtime paths:\${missing}" >&2
  exit 2
fi
for p in \${critical} \${optional}; do
  if ls -d \${p} >/dev/null 2>&1; then
    ls -d \${p}
  fi
done
EOF
}

remote_postgres_dump_script() {
    cat <<EOF
cd "${PROJECT_DIR}"
set -a
. ./.env-prod
set +a
docker exec -e PGPASSWORD="\${DB_PASSWORD}" nln_db pg_dump -U "\${DB_USER}" -d "\${DB_NAME}" --no-owner --no-privileges
EOF
}

print_runtime_preflight() {
    info "Remote server: ${REMOTE_SERVER}"
    info "Project directory: ${PROJECT_DIR}"
    info "Backup mode: runtime-state"
    info "Include logs: ${INCLUDE_LOGS}"
    info "Database backup: logical pg_dump saved as $(runtime_state_database_dump_path)"
    ssh -i "${KEY_PATH}" -o BatchMode=yes "${REMOTE_SERVER}" "$(remote_runtime_paths_script "${INCLUDE_LOGS}")" |
        ssh -i "${KEY_PATH}" -o BatchMode=yes "${REMOTE_SERVER}" "cd '${PROJECT_DIR}' && xargs -r du -sh"
}

create_runtime_backup() {
    local timestamp="$1"
    local local_dir="${BACKUP_ROOT}/${timestamp}"
    local archive="${local_dir}/runtime-state-${timestamp}.tar.gz"
    local paths_file="${local_dir}/runtime-state-paths.txt"
    local manifest="${local_dir}/manifest.txt"
    local staging_dir="${local_dir}/runtime-state"
    local db_dump
    db_dump="$(runtime_state_database_dump_path)"

    mkdir -p "${local_dir}"
    chmod 700 "${BACKUP_ROOT}" "${local_dir}"

    info "Collecting runtime-state path list..."
    ssh -i "${KEY_PATH}" -o BatchMode=yes "${REMOTE_SERVER}" "$(remote_runtime_paths_script "${INCLUDE_LOGS}")" >"${paths_file}"
    chmod 600 "${paths_file}"

    info "Collecting runtime-state files..."
    mkdir -p "${staging_dir}"
    ssh -i "${KEY_PATH}" -o BatchMode=yes "${REMOTE_SERVER}" "cd '${PROJECT_DIR}' && tar -czf - -T -" <"${paths_file}" |
        tar -xzf - -C "${staging_dir}"

    info "Creating logical Postgres dump..."
    mkdir -p "${staging_dir}/$(dirname "${db_dump}")"
    ssh -i "${KEY_PATH}" -o BatchMode=yes "${REMOTE_SERVER}" "$(remote_postgres_dump_script)" >"${staging_dir}/${db_dump}"

    if [ ! -s "${staging_dir}/${db_dump}" ]; then
        error "Logical Postgres dump is missing or empty: ${db_dump}"
        exit 1
    fi

    {
        echo "backup_type=runtime-state"
        echo "timestamp=${timestamp}"
        echo "site_ip=${SITE_IP}"
        echo "remote_server=${REMOTE_SERVER}"
        echo "project_dir=${PROJECT_DIR}"
        echo "include_logs=${INCLUDE_LOGS}"
        echo "database_dump=${db_dump}"
        echo "paths:"
        echo "- ${db_dump}"
        sed 's/^/- /' "${paths_file}"
    } >"${staging_dir}/manifest.txt"
    chmod 600 "${staging_dir}/manifest.txt"

    if ! runtime_state_validate_backup "${staging_dir}"; then
        error "Runtime-state staging validation failed"
        exit 1
    fi

    info "Creating runtime-state backup archive..."
    tar -czf "${archive}" -C "${staging_dir}" .

    info "Verifying archive can be listed..."
    tar -tzf "${archive}" >/dev/null

    sha256sum "${archive}" >"${archive}.sha256"
    chmod 600 "${archive}" "${archive}.sha256"

    cp -p "${staging_dir}/manifest.txt" "${manifest}"
    {
        echo "archive=$(basename "${archive}")"
        echo "sha256=$(cut -d' ' -f1 "${archive}.sha256")"
    } >>"${manifest}"
    chmod 600 "${manifest}"

    success "Runtime-state backup created: ${archive}"
}

create_full_backup() {
    local timestamp="$1"
    local local_dir="${BACKUP_ROOT}/${timestamp}"
    local archive="${local_dir}/full-backup-${timestamp}.tar.gz"
    local manifest="${local_dir}/manifest.txt"

    mkdir -p "${local_dir}"
    chmod 700 "${BACKUP_ROOT}" "${local_dir}"

    info "Creating full project backup archive..."
    ssh -i "${KEY_PATH}" -o BatchMode=yes "${REMOTE_SERVER}" \
        "cd '${PROJECT_DIR}' && tar --exclude='node_modules' --exclude='.git' --exclude='*.log' --exclude='.DS_Store' --exclude='coverage' --exclude='playwright-report' --exclude='test-results' -czf - ." >"${archive}"

    tar -tzf "${archive}" >/dev/null
    sha256sum "${archive}" >"${archive}.sha256"
    chmod 600 "${archive}" "${archive}.sha256"

    {
        echo "backup_type=full"
        echo "timestamp=${timestamp}"
        echo "site_ip=${SITE_IP}"
        echo "remote_server=${REMOTE_SERVER}"
        echo "project_dir=${PROJECT_DIR}"
        echo "include_logs=false"
        echo "archive=$(basename "${archive}")"
        echo "sha256=$(cut -d' ' -f1 "${archive}.sha256")"
    } >"${manifest}"
    chmod 600 "${manifest}"

    success "Full backup created: ${archive}"
}

cleanup_old_backups() {
    if [ -z "${BACKUP_COUNT}" ]; then
        return 0
    fi

    mkdir -p "${BACKUP_ROOT}"
    chmod 700 "${BACKUP_ROOT}"
    find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' |
        sort -r |
        tail -n +"$((BACKUP_COUNT + 1))" |
        while IFS= read -r backup_dir; do
            rm -r "${BACKUP_ROOT:?}/${backup_dir}"
        done
}

ensure_ssh_access

while true; do
    timestamp=$(date +"%Y%m%d%H%M%S")

    if [ "${MODE}" = "runtime-state" ]; then
        print_runtime_preflight
        if [ "${PREFLIGHT_ONLY}" = true ]; then
            success "Preflight complete. No backup archive was created."
            exit 0
        fi
        create_runtime_backup "${timestamp}"
    else
        if [ "${PREFLIGHT_ONLY}" = true ]; then
            info "Full backup mode selected. Approximate project size:"
            ssh -i "${KEY_PATH}" -o BatchMode=yes "${REMOTE_SERVER}" "du -sh '${PROJECT_DIR}'"
            success "Preflight complete. No backup archive was created."
            exit 0
        fi
        create_full_backup "${timestamp}"
    fi

    cleanup_old_backups

    if ! is_yes "${WILL_LOOP}"; then
        exit 0
    fi

    info "Waiting ${INTERVAL} seconds before creating the next backup..."
    sleep "${INTERVAL}"
done
