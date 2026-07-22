#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../rate-limit-proxy-smoke.mjs"

start_fixture_server() {
    local mode="$1"
    SERVER_LOG="${BATS_TMPDIR}/server.log"
    SERVER_INFO="${BATS_TMPDIR}/server-info"
    SERVER_SCRIPT="${BATS_TMPDIR}/rate-limit-fixture.mjs"

    cat >"${SERVER_SCRIPT}" <<'NODE'
import http from "node:http";
import fs from "node:fs";

const mode = process.argv[2];
const infoPath = process.argv[3];
const buckets = new Map();

const server = http.createServer((req, res) => {
    const identity =
        mode === "collapsed" ? "proxy" : req.headers["x-test-client-ip"] || "unknown";
    const used = (buckets.get(identity) || 0) + 1;
    buckets.set(identity, used);
    res.writeHead(200, {
        "Content-Type": "application/json",
        "RateLimit-Limit": "600",
        "RateLimit-Remaining": String(600 - used),
    });
    res.end(JSON.stringify({ identity, used }));
});

server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    fs.writeFileSync(infoPath, String(address.port));
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
NODE

    node "${SERVER_SCRIPT}" "${mode}" "${SERVER_INFO}" >"${SERVER_LOG}" 2>&1 &
    SERVER_PID="$!"

    for _ in {1..50}; do
        if [ -s "${SERVER_INFO}" ]; then
            SERVER_PORT=$(cat "${SERVER_INFO}")
            return 0
        fi
        sleep 0.1
    done

    cat "${SERVER_LOG}" >&2 || true
    return 1
}

teardown() {
    if [ -n "${SERVER_PID:-}" ]; then
        kill "${SERVER_PID}" >/dev/null 2>&1 || true
        wait "${SERVER_PID}" >/dev/null 2>&1 || true
    fi
    rm -rf "${BATS_TMPDIR}"
}

@test "rate-limit proxy smoke check passes when identities have independent buckets" {
    start_fixture_server independent

    run node "${SCRIPT_PATH}" --url "http://127.0.0.1:${SERVER_PORT}/limited"

    assert_equal "$status" 0
    assert_output --partial "Rate-limit proxy smoke check passed"
    assert_output --partial '"clientAFirst": 599'
    assert_output --partial '"clientASecond": 598'
    assert_output --partial '"clientBFirst": 599'
}

@test "rate-limit proxy smoke check fails when identities collapse" {
    start_fixture_server collapsed

    run node "${SCRIPT_PATH}" --url "http://127.0.0.1:${SERVER_PORT}/limited"

    assert_equal "$status" 1
    assert_output --partial "Rate-limit identity appears collapsed"
}
