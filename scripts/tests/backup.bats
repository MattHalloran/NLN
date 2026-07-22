#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../backup.sh"

write_env_file() {
    ENV_FILE="${BATS_TMPDIR}/.env-prod"
    cat >"${ENV_FILE}" <<EOF
SITE_IP=203.0.113.10
PROJECT_DIR=/srv/app
EOF
}

install_ssh_stub() {
    cat >"${BATS_MOCK_BINDIR}/ssh" <<'EOF'
#!/usr/bin/env bash
cmd="${*: -1}"
echo "$cmd" >>"${BATS_TMPDIR}/ssh-commands.log"

if [ "$cmd" = "true" ]; then
  exit 0
fi

if [[ "$cmd" == *"xargs -r du -sh"* ]]; then
  while read -r path; do
    echo "1K	${path}"
  done
  exit 0
fi

if [[ "$cmd" == *"critical="* ]]; then
  echo "data/uploads"
  echo "assets"
  echo "data/redis"
  echo "data/migration-backups"
  echo ".env-prod"
  echo ".env"
  if [[ "$cmd" == *'[ "true" = "true" ]'* ]]; then
    echo "data/logs"
  fi
  exit 0
fi

if [[ "$cmd" == *"tar -czf - -T -"* ]]; then
  cat "${FIXTURE_ARCHIVE}"
  exit 0
fi

if [[ "$cmd" == *"pg_dump"* ]]; then
  echo "-- PostgreSQL database dump"
  echo "CREATE TABLE example (id integer);"
  exit 0
fi

exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/ssh"
}

install_docker_stub() {
    cat >"${BATS_MOCK_BINDIR}/docker" <<'EOF'
#!/usr/bin/env bash
echo "$*" >>"${BATS_TMPDIR}/docker.log"
if [ "$1" = "info" ]; then
  exit 0
fi
if [ "$1" = "rm" ]; then
  exit 0
fi
if [ "$1" = "run" ]; then
  exit 0
fi
if [ "$1" = "exec" ]; then
  if [[ "$*" == *"pg_isready"* ]]; then
    exit 0
  fi
  if [[ "$*" == *"psql"* ]]; then
    cat >/dev/null
    exit 0
  fi
fi
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/docker"
}

setup() {
    mkdir -p "${BATS_MOCK_BINDIR}"
    mkdir -p "${BATS_TMPDIR}/home/.ssh"
    export HOME="${BATS_TMPDIR}/home"
    write_env_file
    FIXTURE_DIR="${BATS_TMPDIR}/fixture"
    mkdir -p \
        "${FIXTURE_DIR}/data/uploads" \
        "${FIXTURE_DIR}/assets" \
        "${FIXTURE_DIR}/data/redis" \
        "${FIXTURE_DIR}/data/migration-backups"
    echo "upload" >"${FIXTURE_DIR}/data/uploads/README"
    echo "asset" >"${FIXTURE_DIR}/assets/README"
    echo "redis" >"${FIXTURE_DIR}/data/redis/README"
    echo "migration" >"${FIXTURE_DIR}/data/migration-backups/README"
    cat >"${FIXTURE_DIR}/.env-prod" <<EOF
DB_NAME=nln_backup_test
DB_USER=nln_backup_test
DB_PASSWORD=nln_backup_password
EOF
    export FIXTURE_ARCHIVE="${BATS_TMPDIR}/fixture.tar.gz"
    tar -czf "${FIXTURE_ARCHIVE}" -C "${FIXTURE_DIR}" .
}

teardown() {
    rm -rf "${BATS_TMPDIR}/home" "${BATS_TMPDIR}/fixture" "${BATS_TMPDIR}/fixture.tar.gz" "${BATS_TMPDIR}/backups" "${BATS_TMPDIR}/ssh-commands.log"
    rm -f "${BATS_MOCK_BINDIR}/ssh"
    rm -f "${BATS_MOCK_BINDIR}/docker" "${BATS_TMPDIR}/docker.log"
}

@test "backup refuses to provision SSH keys by default" {
    run "$SCRIPT_PATH" --preflight-only -e "$ENV_FILE" --output-dir "${BATS_TMPDIR}/backups"

    assert_equal "$status" 1
    assert_output --partial "SSH key not found"
}

@test "runtime-state preflight excludes logs by default" {
    touch "${HOME}/.ssh/id_rsa_203.0.113.10"
    install_ssh_stub

    run "$SCRIPT_PATH" --preflight-only -e "$ENV_FILE" --output-dir "${BATS_TMPDIR}/backups"

    assert_equal "$status" 0
    assert_output --partial "Database backup: logical pg_dump saved as data/postgres.sql"
    assert_output --partial "Redis backup semantics: best-effort file copy"
    refute_output --partial "data/postgres	"
    refute_output --partial "data/logs"
    [ ! -d "${BATS_TMPDIR}/backups" ]
}

@test "runtime-state preflight includes logs when requested" {
    touch "${HOME}/.ssh/id_rsa_203.0.113.10"
    install_ssh_stub

    run "$SCRIPT_PATH" --preflight-only --include-logs -e "$ENV_FILE" --output-dir "${BATS_TMPDIR}/backups"

    assert_equal "$status" 0
    assert_output --partial "data/logs"
}

@test "runtime-state backup writes archive checksum and manifest" {
    touch "${HOME}/.ssh/id_rsa_203.0.113.10"
    install_ssh_stub

    run "$SCRIPT_PATH" -e "$ENV_FILE" --output-dir "${BATS_TMPDIR}/backups"

    assert_equal "$status" 0
    manifest=$(find "${BATS_TMPDIR}/backups" -name manifest.txt | head -1)
    archive=$(find "${BATS_TMPDIR}/backups" -name 'runtime-state-*.tar.gz' | head -1)
    [ -f "$manifest" ]
    [ -f "$archive" ]
    [ -f "${archive}.sha256" ]
    grep -q "backup_type=runtime-state" "$manifest"
    grep -q "include_logs=false" "$manifest"
    grep -q "database_dump=data/postgres.sql" "$manifest"
    grep -q "redis_backup_semantics=best-effort-file-copy" "$manifest"
    grep -q "redis_data_classification=operationally-important-recoverable" "$manifest"
    grep -q -- "- data/postgres.sql" "$manifest"
    tar -tzf "$archive" | grep -q 'data/postgres.sql'
    staging=$(dirname "$archive")/runtime-state
    [ "$(stat -c %a "$staging")" = 700 ]
    [ "$(stat -c %a "$staging/.env-prod")" = 600 ]
    find "$staging" -type d ! -perm 700 | grep . && false || true
    find "$staging" -type f ! -perm 600 | grep . && false || true
}

@test "runtime-state backup can print machine-readable backup directory" {
    touch "${HOME}/.ssh/id_rsa_203.0.113.10"
    install_ssh_stub

    run "$SCRIPT_PATH" -e "$ENV_FILE" --output-dir "${BATS_TMPDIR}/backups" --print-backup-dir

    assert_equal "$status" 0
    backup_dir=$(echo "$output" | sed -n 's/^backup_dir=//p' | tail -n 1)
    [ -n "${backup_dir}" ]
    [ -d "${backup_dir}" ]
    [ -f "${backup_dir}/manifest.txt" ]
}

@test "runtime-state backup can verify logical dump restore with disposable local Postgres" {
    touch "${HOME}/.ssh/id_rsa_203.0.113.10"
    install_ssh_stub
    install_docker_stub

    run "$SCRIPT_PATH" -e "$ENV_FILE" --output-dir "${BATS_TMPDIR}/backups" --verify-restore

    assert_equal "$status" 0
    assert_output --partial "Logical Postgres dump restore verification passed"
    grep -q '^run -d --name nln_backup_restore_' "${BATS_TMPDIR}/docker.log"
    grep -q 'psql -v ON_ERROR_STOP=1' "${BATS_TMPDIR}/docker.log"
}
