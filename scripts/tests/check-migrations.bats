#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../check-migrations.sh"

make_migration() {
    local name="$1"
    local sql="$2"
    local dir="${BATS_TMPDIR}/migrations/${name}"
    mkdir -p "${dir}"
    printf '%s\n' "${sql}" >"${dir}/migration.sql"
}

@test "migration risk check passes safe migrations" {
    make_migration "20260101000000_safe" 'ALTER TABLE "customer" ADD COLUMN "nickname" TEXT;'

    run env MIGRATION_ROOT="${BATS_TMPDIR}/migrations" "$SCRIPT_PATH"

    assert_equal "$status" 0
    assert_output --partial "Migration risk summary: scanned=1 destructive=0 marked_destructive=0 failures=0"
    assert_output --partial "Migration risk checks passed"
}

@test "migration risk check blocks destructive SQL without review marker" {
    make_migration "20260101000000_drop_column" 'ALTER TABLE "customer" DROP COLUMN "nickname";'

    run env MIGRATION_ROOT="${BATS_TMPDIR}/migrations" "$SCRIPT_PATH"

    assert_equal "$status" 1
    assert_output --partial "Potentially destructive migration SQL"
    assert_output --partial "DROP COLUMN"
    assert_output --partial "Migration risk summary: scanned=1 destructive=1 marked_destructive=0 failures=1"
}

@test "migration risk check allows destructive SQL with explicit marker" {
    make_migration "20260101000000_reviewed_drop" '-- deploy-safe: allow-destructive-migration: reviewed with backup and rollback plan
ALTER TABLE "customer" DROP COLUMN "nickname";'

    run env MIGRATION_ROOT="${BATS_TMPDIR}/migrations" "$SCRIPT_PATH"

    assert_equal "$status" 0
    assert_output --partial "Allowed destructive migration marker"
    assert_output --partial "Destructive migration still requires release notes/runbook sign-off"
    assert_output --partial "Migration risk summary: scanned=1 destructive=1 marked_destructive=1 failures=0"
}
