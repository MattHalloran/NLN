#!/usr/bin/env bash
# Read-only audit for tracked production-sensitive artifacts and accidental
# copies of selected local production values. Never prints the values.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "${HERE}/.." && pwd)
ENV_FILE=""

usage() {
    cat <<EOF
Usage: $0 [--env-file PATH]

Audits tracked filenames and required ignore rules. When --env-file is given,
also checks that selected non-empty production values do not occur in tracked
content. Values are never printed.
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
    --env-file)
        ENV_FILE="$2"
        shift 2
        ;;
    -h | --help)
        usage
        exit 0
        ;;
    *)
        echo "Unknown option: $1" >&2
        usage >&2
        exit 2
        ;;
    esac
done

cd "${REPO_ROOT}"
failed=false

# Keep these fragments split so the scanner does not report its own pattern
# definitions. These intentionally target only high-confidence credential
# formats; broader entropy scanning belongs in a dedicated reviewed tool.
private_key_pattern='-----BEGIN [A-Z0-9 ]*PRIVATE'" KEY-----"
github_token_pattern='gh[pousr]_[A-Za-z0-9_]'"{30,}"
aws_access_key_pattern='AKIA[0-9A-Z]'"{16}"
slack_token_pattern='xox[baprs]-[A-Za-z0-9-]'"{20,}"
jwt_pattern='eyJ[A-Za-z0-9_-]'"{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"

scan_tracked_pattern() {
    local label="$1"
    local pattern="$2"
    local matches

    matches=$(git grep -E -l -- "$pattern" -- . \
        ':(exclude)AGENTS.md' \
        ':(exclude)scripts/audit-public-repository-safety.sh' \
        ':(exclude)scripts/tests/repository-safety.bats' 2>/dev/null || true)
    if [ -n "${matches}" ]; then
        echo "ERROR: tracked content matches high-confidence secret pattern (${label}):" >&2
        printf '%s\n' "${matches}" >&2
        failed=true
    fi
}

scan_tracked_pattern "private key" "${private_key_pattern}"
scan_tracked_pattern "GitHub token" "${github_token_pattern}"
scan_tracked_pattern "AWS access key" "${aws_access_key_pattern}"
scan_tracked_pattern "Slack token" "${slack_token_pattern}"
scan_tracked_pattern "JWT" "${jwt_pattern}"

sensitive_tracked=$(git ls-files | grep -E '(^|/)(\.env-prod|\.env|jwt_(pub|priv)\.pem)(/|$)' || true)
if [ -n "${sensitive_tracked}" ]; then
    echo "ERROR: production-sensitive filenames are tracked:" >&2
    printf '%s\n' "${sensitive_tracked}" >&2
    failed=true
fi

required_ignored_paths=(
    ".env-prod"
    ".env"
    "backups/audit-placeholder"
    ".validation/audit-placeholder"
    "data/migration-backups/audit-placeholder"
    "jwt_pub.pem"
    "jwt_priv.pem"
)

for path in "${required_ignored_paths[@]}"; do
    if ! git check-ignore -q --no-index "${path}"; then
        echo "ERROR: required sensitive path is not ignored: ${path}" >&2
        failed=true
    fi
done

if [ -n "${ENV_FILE}" ]; then
    if [ ! -f "${ENV_FILE}" ]; then
        echo "ERROR: environment file not found: ${ENV_FILE}" >&2
        exit 2
    fi

    env_mode=$(stat -c '%a' "${ENV_FILE}")
    if [ "${env_mode}" != "600" ]; then
        echo "ERROR: environment file must be owner-only (mode 0600): ${ENV_FILE}" >&2
        failed=true
    fi

    checked_keys=(
        DATABASE_URL DB_URL
        JWT_SECRET CSRF_SECRET DB_PASSWORD ADMIN_PASSWORD
        SITE_EMAIL_PASSWORD TWILIO_AUTH_TOKEN
    )

    for key in "${checked_keys[@]}"; do
        value=$(awk -F= -v key="${key}" '$1 == key {sub(/^[^=]*=/, ""); print; exit}' "${ENV_FILE}")
        value=${value%$'\r'}
        value=${value#\"}
        value=${value%\"}
        value=${value#\'}
        value=${value%\'}
        if [ ${#value} -lt 7 ]; then
            continue
        fi

        # A value deliberately published in the example environment is a
        # placeholder, not a unique local credential.
        if [ -f ".env-example" ] && grep -F -q -- "${value}" .env-example; then
            continue
        fi

        matches=$(git grep -F -l -- "${value}" -- . ':(exclude)AGENTS.md' 2>/dev/null || true)
        if [ -n "${matches}" ]; then
            echo "ERROR: tracked content contains the local value for ${key}:" >&2
            printf '%s\n' "${matches}" >&2
            failed=true
        fi
    done
fi

if [ "${failed}" = true ]; then
    exit 1
fi

echo "Repository safety audit passed."
