#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

minimal_coverage_summary='{"total":{"statements":{"pct":100},"branches":{"pct":100},"functions":{"pct":100},"lines":{"pct":100}}}'
minimal_playwright_result='{"suites":[{"specs":[{"tests":[{"status":"expected","results":[{"status":"passed"}]}]}]}]}'

write_required_release_artifacts() {
    mkdir -p \
        packages/shared/coverage \
        packages/ui/coverage \
        packages/server/coverage \
        packages/server/coverage-integration \
        test-results \
        .lighthouseci

    printf '%s\n' "$minimal_coverage_summary" > packages/shared/coverage/coverage-summary.json
    printf '%s\n' "$minimal_coverage_summary" > packages/ui/coverage/coverage-summary.json
    printf '%s\n' "$minimal_coverage_summary" > packages/server/coverage/coverage-summary.json
    printf '%s\n' "$minimal_coverage_summary" > packages/server/coverage-integration/coverage-summary.json
    printf '%s\n' "$minimal_playwright_result" > test-results/admin.json
    printf '%s\n' "$minimal_playwright_result" > test-results/accessibility.json
    printf '%s\n' "$minimal_playwright_result" > test-results/pwa.json
    printf '{"results":[]}\n' > .lighthouseci/assertion-results.json
    printf '{"links":{}}\n' > .lighthouseci/links.json
}

@test "validation receipt fails release gate when required artifacts are missing" {
    local work_dir="${BATS_TMPDIR}/receipt-missing"
    mkdir -p "$work_dir"
    cd "$work_dir"

    run env VALIDATION_COMMAND="yarn validate:release" \
        node "$BATS_TEST_DIRNAME/../../scripts/validation-receipt.mjs"

    [ "$status" -ne 0 ]
    [[ "$output" == *"missing required artifact"* ]]
}

@test "validation receipt accepts fresh release artifacts" {
    local work_dir="${BATS_TMPDIR}/receipt-fresh"
    mkdir -p "$work_dir"
    cd "$work_dir"
    write_required_release_artifacts

    run env VALIDATION_COMMAND="yarn validate:release" \
        VALIDATION_ARTIFACT_MAX_AGE_MINUTES=60 \
        node "$BATS_TEST_DIRNAME/../../scripts/validation-receipt.mjs"

    [ "$status" -eq 0 ]
    [[ "$output" == *"Validation receipt written"* ]]
    grep -Fq "All required artifacts" .validation/latest-receipt.md
}
