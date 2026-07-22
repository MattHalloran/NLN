#!/usr/bin/env bash
set -euo pipefail

CONTAINER=""
DB_USER=""
DB_NAME=""
ATTEMPTS=30
DELAY_SECONDS=2

while [ $# -gt 0 ]; do
    case "$1" in
    --container) CONTAINER="${2:-}"; shift 2 ;;
    --user) DB_USER="${2:-}"; shift 2 ;;
    --database) DB_NAME="${2:-}"; shift 2 ;;
    --attempts) ATTEMPTS="${2:-}"; shift 2 ;;
    --delay-seconds) DELAY_SECONDS="${2:-}"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
    esac
done

if [ -z "${CONTAINER}" ] || [ -z "${DB_USER}" ] || [ -z "${DB_NAME}" ]; then
    echo "--container, --user, and --database are required" >&2
    exit 2
fi
if ! [[ "${ATTEMPTS}" =~ ^[1-9][0-9]*$ ]] || ! [[ "${DELAY_SECONDS}" =~ ^[0-9]+$ ]]; then
    echo "--attempts must be positive and --delay-seconds must be non-negative" >&2
    exit 2
fi

for ((attempt = 1; attempt <= ATTEMPTS; attempt += 1)); do
    if docker exec -e "PGPASSWORD=${PGPASSWORD:-}" "${CONTAINER}" \
        psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB_NAME}" -tAc "SELECT 1;" \
        >/dev/null 2>&1; then
        exit 0
    fi
    if [ "${attempt}" -lt "${ATTEMPTS}" ]; then
        sleep "${DELAY_SECONDS}"
    fi
done

echo "Database ${DB_NAME} in container ${CONTAINER} did not accept a query after ${ATTEMPTS} attempts" >&2
exit 1
