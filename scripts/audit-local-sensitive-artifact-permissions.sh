#!/bin/bash
# Read-only audit for ignored local secrets, backup data, and validation evidence.

set -euo pipefail

ROOT="${SENSITIVE_ARTIFACT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
failures=0

fail() {
    printf 'Local sensitive-artifact audit rejected: %s\n' "$1" >&2
    failures=$((failures + 1))
}

for file in .env .env-prod; do
    target="${ROOT}/${file}"
    [ -e "${target}" ] || continue
    if [ -L "${target}" ] || [ ! -f "${target}" ]; then
        fail "${file} must be a regular non-symlink file"
    elif [ "$(stat -c %a "${target}")" != "600" ]; then
        fail "${file} must have mode 0600"
    fi
done

for relative in backups .validation data/migration-backups; do
    directory="${ROOT}/${relative}"
    [ -e "${directory}" ] || continue
    if [ -L "${directory}" ] || [ ! -d "${directory}" ]; then
        fail "${relative} must be a real directory"
        continue
    fi
    while IFS= read -r -d '' target; do
        mode=$(stat -c %a "${target}")
        if [ -L "${target}" ]; then
            fail "${relative} contains a link or special filesystem object"
        elif [ -d "${target}" ]; then
            [ "${mode}" = "700" ] || fail "${relative} contains a directory broader than 0700"
        elif [ -f "${target}" ]; then
            [ "${mode}" = "600" ] || fail "${relative} contains a file broader than 0600"
        else
            fail "${relative} contains a link or special filesystem object"
        fi
    done < <(find "${directory}" -xdev -print0)
done

if [ "${failures}" -ne 0 ]; then
    printf 'Local sensitive-artifact audit failed with %s finding(s). Values were not printed.\n' "${failures}" >&2
    exit 1
fi

printf 'Local sensitive-artifact permissions passed. Values were not printed.\n'
