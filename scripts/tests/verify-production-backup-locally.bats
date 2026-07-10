#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../verify-production-backup-locally.sh"

write_executable() {
    local path="$1"
    local body="$2"
    printf '%s\n' "${body}" >"${path}"
    chmod +x "${path}"
}

make_backup() {
    BACKUP_INPUT="${BATS_TMPDIR}/backup"
    BACKUP_DIR="${BACKUP_INPUT}/runtime-state"
    mkdir -p "${BACKUP_DIR}/data/uploads" \
        "${BACKUP_DIR}/assets" \
        "${BACKUP_DIR}/data/redis" \
        "${BACKUP_DIR}/data/migration-backups"
    printf 'upload\n' >"${BACKUP_DIR}/data/uploads/README"
    printf 'asset\n' >"${BACKUP_DIR}/assets/README"
    printf 'redis\n' >"${BACKUP_DIR}/data/redis/README"
    printf 'migration\n' >"${BACKUP_DIR}/data/migration-backups/README"
    printf 'select 1;\n' >"${BACKUP_DIR}/data/postgres.sql"
    cat >"${BACKUP_DIR}/.env-prod" <<'EOF'
SERVER_LOCATION=dns
CREATE_MOCK_DATA=false
DB_PULL=false
PORT_UI=3001
PORT_SERVER=5331
PORT_DB=5433
PORT_REDIS=6380
PROJECT_DIR=/srv/prod
SITE_IP=203.0.113.10
SERVER_URL=https://api.example.test
UI_URL=https://example.test
VIRTUAL_HOST=example.test
TRUST_PROXY_HOPS=2
JWT_SECRET=production-like-jwt-secret
CSRF_SECRET=production-like-csrf-secret
DB_NAME=nln_backup_local
DB_USER=nln_backup_local
DB_PASSWORD=backup-local-password
ADMIN_EMAIL=admin@example.test
ADMIN_PASSWORD=admin-password
SITE_EMAIL_FROM=prod@example.test
SITE_EMAIL_USERNAME=prod@example.test
SITE_EMAIL_PASSWORD=prod-email-password
SITE_EMAIL_ALIAS=prod@example.test
LETSENCRYPT_EMAIL=admin@example.test
E2E_DISABLE_RATE_LIMITS=false
RATE_LIMIT_DIAGNOSTICS=false
EOF
    cat >"${BACKUP_DIR}/manifest.txt" <<'EOF'
backup_type=runtime-state
paths:
- data/postgres.sql
- data/uploads
- assets
- data/redis
- data/migration-backups
- .env-prod
EOF
}

install_docker_stub() {
    cat >"${BATS_MOCK_BINDIR}/docker" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"${VERIFY_LOCAL_LOG}"
if [ "$1" = "ps" ]; then
  exit 0
fi
if [ "$1" = "network" ]; then
  if [ "$2" = "inspect" ]; then
    exit 0
  fi
  exit 0
fi
if [ "$1" = "compose" ]; then
  if [[ "$*" == *" exec -T db pg_isready"* ]]; then
    exit 0
  fi
  if [[ "$*" == *" exec -T db sh -c"* ]]; then
    cat >/dev/null
    exit 0
  fi
  exit 0
fi
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/docker"
}

install_curl_stub() {
    cat >"${BATS_MOCK_BINDIR}/curl" <<'EOF'
#!/usr/bin/env bash
echo "curl:$*" >>"${VERIFY_LOCAL_LOG}"
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/curl"
}

install_ssh_fail_stub() {
    cat >"${BATS_MOCK_BINDIR}/ssh" <<'EOF'
#!/usr/bin/env bash
echo "ssh-called:$*" >>"${VERIFY_LOCAL_LOG}"
exit 99
EOF
    chmod +x "${BATS_MOCK_BINDIR}/ssh"
}

setup() {
    rm -rf "${BATS_TMPDIR}"
    mkdir -p "${BATS_MOCK_BINDIR}"
    export VERIFY_LOCAL_LOG="${BATS_TMPDIR}/verify-local.log"
    export LOCAL_PRODUCTION_BACKUP_RECEIPT_DIR="${BATS_TMPDIR}/receipts"
    make_backup
    install_docker_stub
    install_curl_stub
    install_ssh_fail_stub

    BUILD_SCRIPT="${BATS_TMPDIR}/build-script"
    BACKUP_SCRIPT="${BATS_TMPDIR}/backup-script"
    write_executable "${BUILD_SCRIPT}" '#!/usr/bin/env bash
echo "build:$*" >>"${VERIFY_LOCAL_LOG}"
echo "env-file:${*: -1}" >>"${VERIFY_LOCAL_LOG}"'
    export VERIFIED_BACKUP="${BACKUP_INPUT}"
    write_executable "${BACKUP_SCRIPT}" '#!/usr/bin/env bash
echo "backup:$*" >>"${VERIFY_LOCAL_LOG}"
echo "backup_dir=${VERIFIED_BACKUP}"'
}

teardown() {
    rm -rf "${BATS_TMPDIR}"
}

run_verify_local() {
    run env \
        BUILD_SCRIPT="${BUILD_SCRIPT}" \
        BACKUP_SCRIPT="${BACKUP_SCRIPT}" \
        VERIFIED_BACKUP="${VERIFIED_BACKUP}" \
        VERIFY_LOCAL_LOG="${VERIFY_LOCAL_LOG}" \
        LOCAL_PRODUCTION_BACKUP_RECEIPT_DIR="${LOCAL_PRODUCTION_BACKUP_RECEIPT_DIR}" \
        "$SCRIPT_PATH" "$@"
}

@test "local production backup verification validates backup, sanitizes env, and runs local checks" {
    run_verify_local --backup "${BACKUP_INPUT}" --port-ui 3201 --replace-existing-local

    assert_equal "$status" 0
    assert_output --partial "Local production backup verification passed"
    grep -q '^build:-v local-backup-' "${VERIFY_LOCAL_LOG}"
    grep -q 'compose .* up -d db redis' "${VERIFY_LOCAL_LOG}"
    grep -q 'compose .* exec -T db sh -c' "${VERIFY_LOCAL_LOG}"
    grep -q 'curl:.*http://localhost:3201/' "${VERIFY_LOCAL_LOG}"
    refute_output --partial "https://example.test"
    [ ! -s "${VERIFY_LOCAL_LOG}.ssh" ]
    ! grep -q '^ssh-called:' "${VERIFY_LOCAL_LOG}"

    receipt=$(find "${LOCAL_PRODUCTION_BACKUP_RECEIPT_DIR}" -name 'local-production-backup-*.receipt' | head -1)
    [ -f "${receipt}" ]
    grep -q '^result=passed$' "${receipt}"
    grep -q '^ui_url=http://localhost:3201$' "${receipt}"
}

@test "create-backup mode delegates only to verified backup creation" {
    run_verify_local --create-backup -e "${BATS_TMPDIR}/.env-prod" --replace-existing-local

    assert_equal "$status" 0
    grep -q '^backup:-e '"${BATS_TMPDIR}/.env-prod"' --verify-restore --print-backup-dir$' "${VERIFY_LOCAL_LOG}"
    ! grep -q '^ssh-called:' "${VERIFY_LOCAL_LOG}"
}

@test "backup mode rejects missing path before docker work" {
    run_verify_local --backup "${BATS_TMPDIR}/missing"

    assert_equal "$status" 1
    assert_output --partial "Backup path does not exist"
    [ ! -f "${VERIFY_LOCAL_LOG}" ]
}

@test "backup mode rejects production env values after sanitization cannot be generated" {
    rm -f "${BACKUP_DIR}/.env-prod"

    run_verify_local --backup "${BACKUP_INPUT}" --replace-existing-local

    assert_equal "$status" 1
    assert_output --partial "Runtime-state backup is missing critical path: .env-prod"
}
