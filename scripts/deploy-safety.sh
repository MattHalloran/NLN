#!/bin/bash
# Shared deploy readiness gates and receipt helpers.

deploy_repo_root() {
    local here="$1"
    cd "${here}/.." && pwd
}

deploy_current_commit() {
    local repo_root="$1"
    git -C "${repo_root}" rev-parse HEAD
}

deploy_require_clean_synced_worktree() {
    local repo_root="$1"
    local changes upstream counts behind ahead

    header "Checking git readiness"

    changes=$(git -C "${repo_root}" status --porcelain --untracked-files=no)
    if [ -n "${changes}" ]; then
        error "Tracked worktree changes are present. Commit or stash them before readiness/deploy."
        git -C "${repo_root}" status --short --untracked-files=no
        return 1
    fi

    if ! upstream=$(git -C "${repo_root}" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null); then
        error "Current branch has no upstream. Push and set upstream before production deploy."
        return 1
    fi

    git -C "${repo_root}" fetch --quiet
    counts=$(git -C "${repo_root}" rev-list --left-right --count "${upstream}...HEAD")
    behind=$(echo "${counts}" | awk '{print $1}')
    ahead=$(echo "${counts}" | awk '{print $2}')

    if [ "${behind}" != "0" ] || [ "${ahead}" != "0" ]; then
        error "Branch is not synchronized with ${upstream}: ahead=${ahead}, behind=${behind}."
        error "Push/pull until ahead=0 and behind=0 before production deploy."
        return 1
    fi

    success "Git branch is clean and synchronized with ${upstream}"
}

deploy_receipt_dir() {
    local repo_root="$1"
    printf '%s\n' "${DEPLOY_READINESS_RECEIPT_DIR:-${repo_root}/.deploy-readiness}"
}

deploy_receipt_path() {
    local repo_root="$1"
    local version="$2"
    printf '%s/%s.receipt\n' "$(deploy_receipt_dir "${repo_root}")" "${version}"
}

deploy_write_readiness_receipt() {
    local repo_root="$1"
    local version="$2"
    local validation_cmd="$3"
    local validation_skipped="$4"
    local rehearsal_skipped="$5"
    local vps_skipped="$6"
    local receipt_dir receipt_path commit created_at

    receipt_dir=$(deploy_receipt_dir "${repo_root}")
    receipt_path=$(deploy_receipt_path "${repo_root}" "${version}")
    commit=$(deploy_current_commit "${repo_root}")
    created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    mkdir -p "${receipt_dir}"
    chmod 700 "${receipt_dir}"
    {
        echo "version=${version}"
        echo "commit=${commit}"
        echo "validation_command=${validation_cmd}"
        echo "validation_skipped=${validation_skipped}"
        echo "rehearsal_skipped=${rehearsal_skipped}"
        echo "vps_skipped=${vps_skipped}"
        echo "created_at=${created_at}"
        echo "created_epoch=$(date -u +%s)"
    } >"${receipt_path}"
    chmod 600 "${receipt_path}"

    success "Deploy readiness receipt written: ${receipt_path}"
}

deploy_receipt_value() {
    local receipt_path="$1"
    local key="$2"
    sed -n "s/^${key}=//p" "${receipt_path}" | tail -n 1
}

deploy_verify_readiness_receipt() {
    local repo_root="$1"
    local version="$2"
    local validation_cmd="$3"
    local max_age_seconds="$4"
    local receipt_path now created_epoch age commit receipt_commit

    header "Verifying deploy readiness receipt"
    receipt_path=$(deploy_receipt_path "${repo_root}" "${version}")

    if [ ! -f "${receipt_path}" ]; then
        error "Deploy readiness receipt not found: ${receipt_path}"
        error "Run ./scripts/deploy-readiness.sh -v ${version} -e .env-prod before production deploy."
        return 1
    fi

    if [ "$(deploy_receipt_value "${receipt_path}" version)" != "${version}" ]; then
        error "Deploy readiness receipt version does not match ${version}: ${receipt_path}"
        return 1
    fi

    commit=$(deploy_current_commit "${repo_root}")
    receipt_commit=$(deploy_receipt_value "${receipt_path}" commit)
    if [ "${receipt_commit}" != "${commit}" ]; then
        error "Deploy readiness receipt was created for a different commit."
        error "Receipt: ${receipt_commit}"
        error "Current:  ${commit}"
        return 1
    fi

    if [ "$(deploy_receipt_value "${receipt_path}" validation_command)" != "${validation_cmd}" ]; then
        error "Deploy readiness receipt used a different validation command."
        error "Receipt: $(deploy_receipt_value "${receipt_path}" validation_command)"
        error "Current:  ${validation_cmd}"
        return 1
    fi

    if [ "$(deploy_receipt_value "${receipt_path}" validation_skipped)" != "false" ] ||
        [ "$(deploy_receipt_value "${receipt_path}" rehearsal_skipped)" != "false" ] ||
        [ "$(deploy_receipt_value "${receipt_path}" vps_skipped)" != "false" ]; then
        error "Deploy readiness receipt is incomplete because one or more gates were skipped."
        return 1
    fi

    created_epoch=$(deploy_receipt_value "${receipt_path}" created_epoch)
    if ! [[ "${created_epoch}" =~ ^[0-9]+$ ]]; then
        error "Deploy readiness receipt has an invalid timestamp: ${receipt_path}"
        return 1
    fi

    now=$(date -u +%s)
    age=$((now - created_epoch))
    if [ "${age}" -lt 0 ] || [ "${age}" -gt "${max_age_seconds}" ]; then
        error "Deploy readiness receipt is stale: age=${age}s, max=${max_age_seconds}s."
        error "Run deploy-readiness again before production deploy."
        return 1
    fi

    success "Deploy readiness receipt is fresh for ${version} at commit ${commit}"
}
