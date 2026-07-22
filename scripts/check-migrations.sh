#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
MIGRATION_ROOT="${MIGRATION_ROOT:-${ROOT_DIR}/packages/server/src/db/migrations}"
ALLOW_MARKER="deploy-safe: allow-destructive-migration"

if [ ! -d "${MIGRATION_ROOT}" ]; then
    echo "Migration directory not found: ${MIGRATION_ROOT}" >&2
    exit 1
fi

scanned_files=0
destructive_files=0
marked_destructive_files=0
failures=0

while IFS= read -r migration_file; do
    scanned_files=$((scanned_files + 1))
    risky_lines=$(grep -nEi \
        '(^|[[:space:];])(DROP[[:space:]]+(TABLE|COLUMN|SCHEMA|DATABASE)|TRUNCATE[[:space:]]+TABLE|DELETE[[:space:]]+FROM|ALTER[[:space:]]+TABLE.*ALTER[[:space:]]+COLUMN.*(TYPE|SET[[:space:]]+NOT[[:space:]]+NULL)|ALTER[[:space:]]+TABLE.*RENAME[[:space:]]+COLUMN)' \
        "${migration_file}" || true)

    if [ -z "${risky_lines}" ]; then
        continue
    fi

    destructive_files=$((destructive_files + 1))

    if grep -Fq "${ALLOW_MARKER}" "${migration_file}"; then
        marked_destructive_files=$((marked_destructive_files + 1))
        echo "Allowed destructive migration marker found in ${migration_file}"
        echo "Destructive migration still requires release notes/runbook sign-off and rollback implications review."
        continue
    fi

    echo "Potentially destructive migration SQL requires an explicit review marker: ${migration_file}" >&2
    echo "Add '-- ${ALLOW_MARKER}: <reason>' only after backup/rollback implications are reviewed." >&2
    echo "${risky_lines}" >&2
    failures=$((failures + 1))
done < <(find "${MIGRATION_ROOT}" -mindepth 2 -maxdepth 2 -name migration.sql -print | sort)

if [ "${failures}" -gt 0 ]; then
    echo "Migration risk summary: scanned=${scanned_files} destructive=${destructive_files} marked_destructive=${marked_destructive_files} failures=${failures}" >&2
    exit 1
fi

echo "Migration risk summary: scanned=${scanned_files} destructive=${destructive_files} marked_destructive=${marked_destructive_files} failures=${failures}"
echo "Migration risk checks passed."
