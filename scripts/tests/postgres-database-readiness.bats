#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT="$BATS_TEST_DIRNAME/../wait-for-postgres-database.sh"

setup() {
    STATE="$BATS_TMPDIR/postgres-ready-$BATS_TEST_NUMBER"
    mkdir -p "$STATE"
    cat >"$BATS_MOCK_BINDIR/docker" <<'EOF'
#!/usr/bin/env bash
count_file="${POSTGRES_READY_STATE}/count"
count=0
[ ! -f "$count_file" ] || count=$(cat "$count_file")
count=$((count + 1))
printf '%s\n' "$count" >"$count_file"
printf '%s\n' "$*" >>"${POSTGRES_READY_STATE}/docker.log"
[ "$count" -ge "${POSTGRES_READY_AFTER:-1}" ]
EOF
    cat >"$BATS_MOCK_BINDIR/sleep" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"${POSTGRES_READY_STATE}/sleep.log"
EOF
    chmod +x "$BATS_MOCK_BINDIR/docker" "$BATS_MOCK_BINDIR/sleep"
}

@test "waits until the exact configured database accepts a query" {
    run env POSTGRES_READY_STATE="$STATE" POSTGRES_READY_AFTER=3 PGPASSWORD=fixture-secret \
        "$SCRIPT" --container nln_db --user fixture_user --database fixture_db \
        --attempts 4 --delay-seconds 2

    [ "$status" -eq 0 ]
    [ "$(cat "$STATE/count")" -eq 3 ]
    [ "$(wc -l <"$STATE/sleep.log")" -eq 2 ]
    grep -q 'psql -v ON_ERROR_STOP=1 -U fixture_user -d fixture_db -tAc SELECT 1;' "$STATE/docker.log"
    refute_output --partial "fixture-secret"
}

@test "fails after the bounded attempt count when the database never accepts queries" {
    run env POSTGRES_READY_STATE="$STATE" POSTGRES_READY_AFTER=99 \
        "$SCRIPT" --container nln_db --user fixture_user --database fixture_db \
        --attempts 3 --delay-seconds 0

    [ "$status" -eq 1 ]
    [ "$(cat "$STATE/count")" -eq 3 ]
    assert_output --partial "did not accept a query after 3 attempts"
}

@test "invalid or incomplete readiness configuration fails before Docker" {
    run env POSTGRES_READY_STATE="$STATE" "$SCRIPT" --container nln_db --attempts nope
    [ "$status" -eq 2 ]
    [ ! -e "$STATE/count" ]
}
