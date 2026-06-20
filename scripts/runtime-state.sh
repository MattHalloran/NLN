#!/bin/bash
# Shared runtime-state backup/restore helpers.

runtime_state_critical_paths() {
    printf '%s\n' \
        "data/uploads" \
        "assets" \
        "data/redis" \
        "data/migration-backups" \
        ".env-prod"
}

runtime_state_database_dump_path() {
    printf '%s\n' "data/postgres.sql"
}

runtime_state_cold_database_paths() {
    printf '%s\n' "data/postgres"
}

runtime_state_optional_paths() {
    printf '%s\n' ".env"
}

runtime_state_jwt_globs() {
    printf '%s\n' "jwt_*"
}

runtime_state_log_paths() {
    printf '%s\n' "data/logs"
}

runtime_state_healthcheck_paths() {
    printf '%s\n' "data/postgres"
    runtime_state_critical_paths
    printf '%s\n' "docker-compose-prod.yml"
}

runtime_state_shell_words() {
    "$@" | paste -sd ' ' -
}

runtime_state_validate_backup() {
    local backup_dir="$1"
    local db_dump
    db_dump="$(runtime_state_database_dump_path)"

    if [ ! -f "${backup_dir}/manifest.txt" ]; then
        error "Runtime-state manifest not found: ${backup_dir}/manifest.txt"
        return 1
    fi

    if ! grep -q "^backup_type=runtime-state$" "${backup_dir}/manifest.txt"; then
        error "Runtime-state manifest is invalid: ${backup_dir}/manifest.txt"
        return 1
    fi

    local path
    while IFS= read -r path; do
        if [ ! -e "${backup_dir}/${path}" ]; then
            error "Runtime-state backup is missing critical path: ${path}"
            return 1
        fi
    done <<EOF
$(runtime_state_critical_paths)
EOF

    if [ ! -s "${backup_dir}/${db_dump}" ]; then
        error "Runtime-state backup is missing required database dump: ${db_dump}"
        return 1
    fi

    return 0
}

runtime_state_require_backup_before_container_change() {
    local backup_dir="$1"

    if ! runtime_state_validate_backup "${backup_dir}"; then
        error "Runtime-state backup is missing or incomplete. Refusing to stop containers."
        return 1
    fi

    return 0
}

runtime_state_select_db_backup() {
    local version_dir="$1"
    local db_dump
    db_dump="$(runtime_state_database_dump_path)"

    if [ -d "${version_dir}/runtime-state" ]; then
        runtime_state_validate_backup "${version_dir}/runtime-state" || return 1
        printf '%s\n' "${version_dir}/runtime-state/${db_dump}"
        return 0
    fi

    if [ -f "${version_dir}/${db_dump}" ]; then
        printf '%s\n' "${version_dir}/${db_dump}"
        return 0
    fi

    if [ -d "${version_dir}/postgres" ]; then
        printf '%s\n' "${version_dir}/postgres"
        return 0
    fi

    error "Database backup not found at ${version_dir}/runtime-state/${db_dump}, ${version_dir}/${db_dump}, or ${version_dir}/postgres"
    return 1
}
