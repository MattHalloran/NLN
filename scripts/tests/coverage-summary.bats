#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

minimal_coverage_summary='{"total":{"statements":{"pct":91.234},"branches":{"pct":82},"functions":{"pct":73},"lines":{"pct":91.234}}}'

write_coverage_summary() {
    local relative_path="$1"
    mkdir -p "$(dirname "$relative_path")"
    printf '%s\n' "$minimal_coverage_summary" > "$relative_path"
}

@test "coverage summary skips stale artifacts by default" {
    local work_dir="${BATS_TMPDIR}/coverage-summary-stale"
    mkdir -p "$work_dir"
    cd "$work_dir"

    write_coverage_summary packages/shared/coverage/coverage-summary.json
    write_coverage_summary packages/server/coverage-integration/coverage-summary.json
    touch -d "4 hours ago" packages/server/coverage-integration/coverage-summary.json

    run env COVERAGE_SUMMARY_MAX_AGE_MINUTES=60 \
        node "$BATS_TEST_DIRNAME/../../scripts/coverage-summary.mjs"

    [ "$status" -eq 0 ]
    [[ "$output" == *"shared unit statements=91.23%"* ]]
    [[ "$output" == *"server integration skipped stale coverage artifact"* ]]
    [[ "$output" != *"server integration statements=91.23%"* ]]
}

@test "coverage summary can include stale artifacts explicitly" {
    local work_dir="${BATS_TMPDIR}/coverage-summary-include-stale"
    mkdir -p "$work_dir"
    cd "$work_dir"

    write_coverage_summary packages/server/coverage-integration/coverage-summary.json
    touch -d "4 hours ago" packages/server/coverage-integration/coverage-summary.json

    run env COVERAGE_SUMMARY_MAX_AGE_MINUTES=60 \
        COVERAGE_SUMMARY_INCLUDE_STALE=true \
        node "$BATS_TEST_DIRNAME/../../scripts/coverage-summary.mjs"

    [ "$status" -eq 0 ]
    [[ "$output" == *"server integration statements=91.23%"* ]]
    [[ "$output" == *"stale=true"* ]]
}
