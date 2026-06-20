#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

@test "check-test-quality passes for committed stable test surfaces" {
    run "$BATS_TEST_DIRNAME/../check-test-quality.sh"

    [ "$status" -eq 0 ]
    [[ "$output" == *"Test quality checks passed."* ]]
}
