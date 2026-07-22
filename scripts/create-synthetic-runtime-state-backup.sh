#!/bin/bash
# Creates a migration-complete, synthetic runtime-state backup for local-only
# restore rehearsals. It never reads .env-prod and never connects to a remote host.
set -euo pipefail
umask 077

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "${HERE}/.." && pwd)
OUTPUT=""
CONTAINER="nln-synthetic-backup-$RANDOM-$$"
DB_NAME="nln_synthetic"
DB_USER="nln_synthetic"
DB_PASSWORD="synthetic-local-only-password"
NETWORK=""

usage() {
    echo "Usage: $0 --output PATH"
}
while [ $# -gt 0 ]; do
    case "$1" in
    --output) OUTPUT="$2"; shift 2 ;;
    -h | --help) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
    esac
done
[ -n "${OUTPUT}" ] || { usage >&2; exit 2; }
OUTPUT=$(realpath -m "${OUTPUT}")
[ ! -e "${OUTPUT}" ] || { echo "Synthetic backup output already exists: ${OUTPUT}" >&2; exit 1; }
case "${OUTPUT}" in
"${ROOT_DIR}"/* | /tmp/*) ;;
*) echo "Synthetic backup output must be under the repository or /tmp" >&2; exit 1 ;;
esac
for command in docker yarn; do
    command -v "${command}" >/dev/null || { echo "Required command missing: ${command}" >&2; exit 1; }
done
docker info >/dev/null 2>&1 || { echo "Docker daemon is unavailable" >&2; exit 1; }

cleanup() {
    docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
    [ -z "${NETWORK}" ] || docker network rm "${NETWORK}" >/dev/null 2>&1 || true
    if [ "${completed:-false}" != true ]; then rm -rf "${OUTPUT}"; fi
}
trap cleanup EXIT INT TERM

mkdir -p "${OUTPUT}/runtime-state/data/uploads" \
    "${OUTPUT}/runtime-state/assets" \
    "${OUTPUT}/runtime-state/data/redis" \
    "${OUTPUT}/runtime-state/data/migration-backups"
chmod 700 "${OUTPUT}" "${OUTPUT}/runtime-state"

NETWORK="${CONTAINER}-network"
docker network create --internal "${NETWORK}" >/dev/null
docker run -d --name "${CONTAINER}" --network "${NETWORK}" --network-alias db \
    --tmpfs /var/lib/postgresql/data:rw,noexec,nosuid,size=512m \
    -e POSTGRES_DB="${DB_NAME}" -e POSTGRES_USER="${DB_USER}" -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
    postgres:13-alpine >/dev/null
ready=false
for _ in $(seq 1 60); do
    if docker exec "${CONTAINER}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then ready=true; break; fi
    sleep 1
done
[ "${ready}" = true ] || { echo "Synthetic PostgreSQL did not become ready" >&2; exit 1; }

# Run the repository-pinned Prisma CLI in a tool container on the same unique,
# internal-only network.
docker run --rm --network "${NETWORK}" \
    -v "${ROOT_DIR}:/workspace:ro" -w /workspace/packages/server \
    -e "DB_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}" \
    node:20 sh -c '/workspace/node_modules/.bin/prisma migrate deploy --schema=src/db/schema.prisma'

docker exec -i "${CONTAINER}" psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB_NAME}" <<'SQL'
CREATE TABLE IF NOT EXISTS phase4_synthetic_probe (
  id integer PRIMARY KEY,
  note text NOT NULL
);
INSERT INTO phase4_synthetic_probe (id, note) VALUES (1, 'synthetic-only')
ON CONFLICT (id) DO UPDATE SET note = EXCLUDED.note;
SQL
docker exec "${CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-privileges >"${OUTPUT}/runtime-state/data/postgres.sql"

printf 'synthetic upload fixture\n' >"${OUTPUT}/runtime-state/data/uploads/phase4.txt"
printf 'synthetic asset fixture\n' >"${OUTPUT}/runtime-state/assets/phase4.txt"
printf 'active Redis must start empty; this file is inspection-only\n' >"${OUTPUT}/runtime-state/data/redis/phase4-queued-job.fixture"
printf 'synthetic migration evidence\n' >"${OUTPUT}/runtime-state/data/migration-backups/phase4.txt"
cat >"${OUTPUT}/runtime-state/.env-prod" <<'EOF'
SYNTHETIC_BACKUP_MARKER=true
TWILIO_AUTH_TOKEN=must-not-survive
SMTP_HOST=must-not-survive.invalid
EOF
cat >"${OUTPUT}/runtime-state/manifest.txt" <<'EOF'
backup_type=runtime-state
source=synthetic-local-only
paths:
- data/postgres.sql
- data/uploads
- assets
- data/redis
- data/migration-backups
- .env-prod
EOF
find "${OUTPUT}" -type d -exec chmod 700 {} +
find "${OUTPUT}" -type f -exec chmod 600 {} +
completed=true
echo "synthetic_backup=${OUTPUT}"
