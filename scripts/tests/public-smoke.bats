#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../public-smoke.mjs"
SERVER_PATH="$BATS_TEST_DIRNAME/fixtures/public-smoke-server.mjs"

start_server() {
    local mode="$1"
    PORT=$((20000 + (BASHPID % 20000)))
    node "$SERVER_PATH" "$PORT" "$mode" &
    SERVER_PID=$!
    for _ in $(seq 1 30); do
        if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
            return 0
        fi
        sleep 0.1
    done
    return 1
}

teardown() {
    if [ -n "${SERVER_PID:-}" ]; then
        kill "$SERVER_PID" >/dev/null 2>&1 || true
        wait "$SERVER_PID" >/dev/null 2>&1 || true
    fi
}

@test "public smoke accepts routed SPA application shells" {
    start_server valid

    run env PUBLIC_SMOKE_BASE_URL="http://127.0.0.1:${PORT}" node "$SCRIPT_PATH"

    assert_equal "$status" 0
    assert_output --partial "Public smoke passed: 6/6"
}

@test "public smoke rejects HTTP 200 pages without the application shell" {
    start_server invalid

    run env PUBLIC_SMOKE_BASE_URL="http://127.0.0.1:${PORT}" node "$SCRIPT_PATH"

    assert_equal "$status" 1
    assert_output --partial "missing production application shell"
}
