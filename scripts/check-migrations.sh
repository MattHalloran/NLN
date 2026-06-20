#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
MIGRATION_ROOT="${MIGRATION_ROOT:-${ROOT_DIR}/packages/server/src/db/migrations}"
ALLOW_MARKER="deploy-safe: allow-destructive-migration"

if [ ! -d "${MIGRATION_ROOT}" ]; then
    echo "Migration directory not found: ${MIGRATION_ROOT}" >&2
    exit 1
fi

failures=0

while IFS= read -r migration_file; do
    risky_lines=$(grep -nEi \
        '(^|[[:space:];])(DROP[[:space:]]+(TABLE|COLUMN|SCHEMA|DATABASE)|TRUNCATE[[:space:]]+TABLE|DELETE[[:space:]]+FROM|ALTER[[:space:]]+TABLE.*ALTER[[:space:]]+COLUMN.*(TYPE|SET[[:space:]]+NOT[[:space:]]+NULL)|ALTER[[:space:]]+TABLE.*RENAME[[:space:]]+COLUMN)' \
        "${migration_file}" || true)

    if [ -z "${risky_lines}" ]; then
        continue
    fi

    if grep -Fq "${ALLOW_MARKER}" "${migration_file}"; then
        echo "Allowed destructive migration marker found in ${migration_file}"
        continue
    fi

    echo "Potentially destructive migration SQL requires an explicit review marker: ${migration_file}" >&2
    echo "Add '-- ${ALLOW_MARKER}: <reason>' only after backup/rollback implications are reviewed." >&2
    echo "${risky_lines}" >&2
    failures=$((failures + 1))
done < <(find "${MIGRATION_ROOT}" -mindepth 2 -maxdepth 2 -name migration.sql -print | sort)

if [ "${failures}" -gt 0 ]; then
    exit 1
fi

echo "Migration risk checks passed."
