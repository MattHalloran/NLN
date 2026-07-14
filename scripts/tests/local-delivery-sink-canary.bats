#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

CANARY="$BATS_TEST_DIRNAME/../local-delivery-sink-canary.mjs"

setup() {
    ROOT="$BATS_TMPDIR/delivery-sink-$BATS_TEST_NUMBER"
    mkdir -p "$ROOT/packages/server/dist/worker/email" "$ROOT/packages/server/dist/worker/sms"
    printf '%s\n' 'export const emailProcess = async () => ({success:true,devInfo:{mode:"disabled"}});' >"$ROOT/packages/server/dist/worker/email/process.js"
    printf '%s\n' 'export const smsProcess = async () => true;' >"$ROOT/packages/server/dist/worker/sms/process.js"
}

@test "local delivery canary executes disabled email and SMS sinks" {
    run env APP_RUNTIME=local-production EMAIL_MODE=disabled SMS_MODE=disabled node "$CANARY" "$ROOT"
    [ "$status" -eq 0 ]
    assert_output --partial "email=disabled sms=disabled"
}

@test "local delivery canary rejects credentials and unsafe modes" {
    run env APP_RUNTIME=local-production EMAIL_MODE=disabled SMS_MODE=disabled TWILIO_AUTH_TOKEN=fixture-secret node "$CANARY" "$ROOT"
    [ "$status" -ne 0 ]
    assert_output --partial "forbidden delivery setting"
    refute_output --partial "fixture-secret"

    run env APP_RUNTIME=local-production EMAIL_MODE=production SMS_MODE=disabled node "$CANARY" "$ROOT"
    [ "$status" -ne 0 ]
    assert_output --partial "delivery modes are not disabled"
}
