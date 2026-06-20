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
    echo "prod-env" >"${FIXTURE_DIR}/.env-prod"
    export FIXTURE_ARCHIVE="${BATS_TMPDIR}/fixture.tar.gz"
    tar -czf "${FIXTURE_ARCHIVE}" -C "${FIXTURE_DIR}" .
}

teardown() {
    rm -rf "${BATS_TMPDIR}/home" "${BATS_TMPDIR}/fixture" "${BATS_TMPDIR}/fixture.tar.gz" "${BATS_TMPDIR}/backups" "${BATS_TMPDIR}/ssh-commands.log"
    rm -f "${BATS_MOCK_BINDIR}/ssh"
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
    grep -q -- "- data/postgres.sql" "$manifest"
    tar -tzf "$archive" | grep -q 'data/postgres.sql'
}
