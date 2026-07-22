#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../check-rate-limit-config.sh"
COMPOSE_PATH="$BATS_TEST_DIRNAME/../../docker-compose-prod.yml"

setup() {
    TEST_COMPOSE="${BATS_TMPDIR}/docker-compose-prod.yml"
    cp "${COMPOSE_PATH}" "${TEST_COMPOSE}"
}

teardown() {
    rm -rf "${BATS_TMPDIR}"
}

@test "rate-limit config check accepts production compose without public server ports" {
    run "$SCRIPT_PATH" "${TEST_COMPOSE}"

    assert_equal "$status" 0
    assert_output --partial "server service does not publish public ports"
    assert_output --partial "server service defines TRUST_PROXY_HOPS"
    assert_output --partial "Rate-limit proxy configuration checks passed"
}

@test "rate-limit config check rejects public server ports" {
    awk '
        /^    expose:/ && in_server {
            print "    ports:"
            print "      - ${PORT_SERVER:-5331}:${PORT_SERVER:-5331}"
            next
        }
        /^  server:/ { in_server=1 }
        in_server && /^  [A-Za-z0-9_-]+:/ && $0 !~ /^  server:/ { in_server=0 }
        { print }
    ' "${COMPOSE_PATH}" >"${TEST_COMPOSE}"

    run "$SCRIPT_PATH" "${TEST_COMPOSE}"

    assert_equal "$status" 1
    assert_output --partial "server service must not publish public ports"
}

@test "rate-limit config check rejects missing Redis connection" {
    grep -v 'REDIS_CONN:' "${COMPOSE_PATH}" >"${TEST_COMPOSE}"

    run "$SCRIPT_PATH" "${TEST_COMPOSE}"

    assert_equal "$status" 1
    assert_output --partial "server service must define REDIS_CONN"
}

@test "rate-limit config check rejects missing trust proxy hop setting" {
    grep -v 'TRUST_PROXY_HOPS:' "${COMPOSE_PATH}" >"${TEST_COMPOSE}"

    run "$SCRIPT_PATH" "${TEST_COMPOSE}"

    assert_equal "$status" 1
    assert_output --partial "server service must define TRUST_PROXY_HOPS"
}
