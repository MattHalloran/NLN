#!/bin/bash
# Shared deployment lock helpers.

deploy_lock_metadata() {
    local command_name="$1"
    local version="${2:-unknown}"
    local repo_root="${3:-}"
    local commit="unknown"

    if [ -n "${repo_root}" ] && command -v git >/dev/null 2>&1; then
        commit=$(git -C "${repo_root}" rev-parse HEAD 2>/dev/null || echo unknown)
    fi

    cat <<EOF
command=${command_name}
version=${version}
started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
commit=${commit}
user=${USER:-unknown}
host=$(hostname 2>/dev/null || echo unknown)
pid=$$
EOF
}

deploy_lock_acquire() {
    local lock_path="$1"
    local command_name="$2"
    local version="${3:-unknown}"
    local repo_root="${4:-}"
    local lock_dir

    if [ "${DEPLOY_LOCK_DISABLED:-false}" = "true" ]; then
        warning "Deployment lock disabled by DEPLOY_LOCK_DISABLED=true."
        return 0
    fi

    if ! command -v flock >/dev/null 2>&1; then
        error "flock is required for deployment locking but was not found."
        return 1
    fi

    lock_dir=$(dirname "${lock_path}")
    mkdir -p "${lock_dir}"

    exec {DEPLOY_LOCK_FD}>"${lock_path}"
    if ! flock -n "${DEPLOY_LOCK_FD}"; then
        error "Another deployment operation is already holding the lock: ${lock_path}"
        if [ -s "${lock_path}" ]; then
            error "Current lock details:"
            sed 's/^/  /' "${lock_path}" >&2 || true
        fi
        if [ "${DEPLOY_FORCE_LOCK:-false}" = "true" ]; then
            error "DEPLOY_FORCE_LOCK=true cannot override an actively held flock lock."
            error "Confirm the other process has exited before retrying."
        else
            error "Failing closed. If this is only stale metadata, confirm no process is running and retry."
        fi
        return 1
    fi

    if [ "${DEPLOY_FORCE_LOCK:-false}" = "true" ]; then
        warning "DEPLOY_FORCE_LOCK=true set; overwriting previous lock metadata after acquiring flock."
    fi

    deploy_lock_metadata "${command_name}" "${version}" "${repo_root}" >"${lock_path}"
    chmod 600 "${lock_path}" 2>/dev/null || true
    info "Deployment lock acquired: ${lock_path}"
}
