#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../validate-env.sh"
EXAMPLE_ENV="$BATS_TEST_DIRNAME/../../.env-example"

write_prod_env() {
    TEST_ENV="${BATS_TMPDIR}/.env-prod"
    cp "${EXAMPLE_ENV}" "${TEST_ENV}"
    {
        echo "UI_URL=https://www.example.com"
    } >>"${TEST_ENV}"
    sed -i \
        -e 's/^SERVER_LOCATION=.*/SERVER_LOCATION=dns/' \
        -e 's/^CREATE_MOCK_DATA=.*/CREATE_MOCK_DATA=false/' \
        "${TEST_ENV}"
}

setup() {
    mkdir -p "${BATS_TMPDIR}"
}

teardown() {
    rm -rf "${BATS_TMPDIR}"
}

@test "validate-env accepts the example environment file" {
    run "$SCRIPT_PATH" "${EXAMPLE_ENV}"

    assert_equal "$status" 0
    assert_output --partial "All environment variables are valid"
}

@test "validate-env requires TRUST_PROXY_HOPS for production env files" {
    write_prod_env
    grep -v '^TRUST_PROXY_HOPS=' "${TEST_ENV}" >"${TEST_ENV}.missing-trust-proxy"

    run "$SCRIPT_PATH" "${TEST_ENV}.missing-trust-proxy"

    assert_equal "$status" 1
    assert_output --partial "Required variable TRUST_PROXY_HOPS is not set or is empty"
}

@test "validate-env rejects disabled rate limits in production env files" {
    write_prod_env
    sed -i 's/^E2E_DISABLE_RATE_LIMITS=.*/E2E_DISABLE_RATE_LIMITS=true/' "${TEST_ENV}"

    run "$SCRIPT_PATH" "${TEST_ENV}"

    assert_equal "$status" 1
    assert_output --partial "E2E_DISABLE_RATE_LIMITS must not be 'true' for production"
}

@test "validate-env rejects enabled rate-limit diagnostics in production env files" {
    write_prod_env
    sed -i 's/^RATE_LIMIT_DIAGNOSTICS=.*/RATE_LIMIT_DIAGNOSTICS=true/' "${TEST_ENV}"

    run "$SCRIPT_PATH" "${TEST_ENV}"

    assert_equal "$status" 1
    assert_output --partial "RATE_LIMIT_DIAGNOSTICS must not be 'true' for production"
}
