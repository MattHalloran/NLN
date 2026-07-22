#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../rehearse-migrations-from-backup.sh"

make_backup() {
    BACKUP_DIR="${BATS_TMPDIR}/backup/runtime-state"
    mkdir -p "${BACKUP_DIR}/data/uploads" \
        "${BACKUP_DIR}/assets" \
        "${BACKUP_DIR}/data/redis" \
        "${BACKUP_DIR}/data/migration-backups"
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
    cat >"${BACKUP_DIR}/.env-prod" <<'EOF'
DB_NAME=nln_rehearsal
DB_USER=nln_rehearsal
DB_PASSWORD=rehearsal-password
EOF
    printf 'select 1;\n' >"${BACKUP_DIR}/data/postgres.sql"
}

setup() {
    mkdir -p "${BATS_MOCK_BINDIR}"
    export MIGRATION_LOG="${BATS_TMPDIR}/migration.log"
    make_backup

    cat >"${BATS_MOCK_BINDIR}/docker" <<'EOF'
#!/usr/bin/env bash
echo "docker:$*" >>"${MIGRATION_LOG}"
case "$*" in
  "info")
    exit 0
    ;;
  exec*"pg_isready"*)
    exit 0
    ;;
esac
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/docker"
}

teardown() {
    rm -rf "${BATS_TMPDIR}"
}

@test "migration rehearsal rejects missing backup path before docker work" {
    run "$SCRIPT_PATH" --backup "${BATS_TMPDIR}/missing"

    assert_equal "$status" 1
    assert_output --partial "Backup path does not exist"
}

@test "migration rehearsal restores dump and runs prisma migrations in disposable container" {
    run env MIGRATION_LOG="${MIGRATION_LOG}" "$SCRIPT_PATH" --backup "${BATS_TMPDIR}/backup"

    assert_equal "$status" 0
    grep -q 'docker:run -d --name nln_migration_rehearsal_' "${MIGRATION_LOG}"
    grep -q 'docker:exec -i -e PGPASSWORD=rehearsal-password' "${MIGRATION_LOG}"
    grep -q 'node:20-bookworm' "${MIGRATION_LOG}"
    ! grep -q 'node:20-alpine' "${MIGRATION_LOG}"
    grep -q 'yarn prisma migrate deploy --schema=src/db/schema.prisma' "${MIGRATION_LOG}"
    assert_output --partial "Migration rehearsal passed"
}

@test "migration rehearsal supports archive input" {
    archive="${BATS_TMPDIR}/runtime-state.tar.gz"
    (cd "${BACKUP_DIR}" && tar -czf "${archive}" .)

    run env MIGRATION_LOG="${MIGRATION_LOG}" "$SCRIPT_PATH" --backup "${archive}"

    assert_equal "$status" 0
    assert_output --partial "Migration rehearsal passed"
}
