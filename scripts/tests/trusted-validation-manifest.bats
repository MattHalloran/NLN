#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../validate-trusted-manifest.mjs"
MANIFEST_PATH="$BATS_TEST_DIRNAME/../../config/trusted-validation-manifest.json"
WORKFLOW_PATH="$BATS_TEST_DIRNAME/../../.github/workflows/ci.yml"

setup() {
    mkdir -p "$BATS_TMPDIR"
}

@test "trusted validation manifest matches the CI trusted gate" {
    run node "$SCRIPT_PATH" --manifest "$MANIFEST_PATH" --workflow "$WORKFLOW_PATH"

    assert_success
    assert_output --partial "Trusted validation manifest passed"
    assert_output --regexp 'Manifest SHA-256: [a-f0-9]{64}'
}

@test "trusted validation manifest rejects a skipped receipt requirement" {
    fixture="${BATS_TMPDIR}/manifest.json"
    sed '0,/"receiptRequired": true/s//"receiptRequired": false/' "$MANIFEST_PATH" >"$fixture"

    run node "$SCRIPT_PATH" --manifest "$fixture" --workflow "$WORKFLOW_PATH"

    assert_failure
    assert_output --partial "must require a receipt"
}

@test "trusted validation manifest rejects a job missing from the trusted gate" {
    fixture="${BATS_TMPDIR}/workflow.yml"
    sed '/^      - deploy-rehearsal$/d' "$WORKFLOW_PATH" >"$fixture"

    run node "$SCRIPT_PATH" --manifest "$MANIFEST_PATH" --workflow "$fixture"

    assert_failure
    assert_output --partial "trusted gate does not depend on required job deploy-rehearsal"
}

@test "trusted validation manifest rejects unsafe artifact paths" {
    fixture="${BATS_TMPDIR}/manifest.json"
    sed '0,/"test-results\/pwa.json"/s//"..\/copied-secret"/' "$MANIFEST_PATH" >"$fixture"

    run node "$SCRIPT_PATH" --manifest "$fixture" --workflow "$WORKFLOW_PATH"

    assert_failure
    assert_output --partial "unsafe artifact path"
}

@test "trusted validation manifest rejects a workflow that omits job receipt creation" {
    fixture="$BATS_TMPDIR/workflow-no-job-receipt.yml"
    sed '/node scripts\/trusted-job-receipt.mjs --job integration/d' "$WORKFLOW_PATH" >"$fixture"

    run node "$SCRIPT_PATH" --manifest "$MANIFEST_PATH" --workflow "$fixture"

    [ "$status" -ne 0 ]
    assert_output --partial "workflow does not create a trusted receipt for integration"
}

@test "trusted validation manifest rejects a trusted gate without aggregation" {
    fixture="$BATS_TMPDIR/workflow-no-aggregate.yml"
    sed '/node scripts\/aggregate-trusted-receipts.mjs/d' "$WORKFLOW_PATH" >"$fixture"

    run node "$SCRIPT_PATH" --manifest "$MANIFEST_PATH" --workflow "$fixture"

    [ "$status" -ne 0 ]
    assert_output --partial "trusted gate does not aggregate trusted job receipts"
}

@test "trusted validation manifest rejects floating action tags" {
    fixture="$BATS_TMPDIR/workflow-floating-action.yml"
    sed '0,/actions\/checkout@[0-9a-f]\{40\}/s//actions\/checkout@v4/' "$WORKFLOW_PATH" >"$fixture"

    run node "$SCRIPT_PATH" --manifest "$MANIFEST_PATH" --workflow "$fixture"

    [ "$status" -ne 0 ]
    assert_output --partial "release-critical action is not pinned to a full commit SHA"
}

@test "trusted validation manifest rejects default pull-request merge checkout" {
    fixture="$BATS_TMPDIR/workflow-merge-checkout.yml"
    awk 'index($0, "ref: ${{ github.event.pull_request.head.sha || github.sha }}") && !removed { removed=1; next } { print }' \
        "$WORKFLOW_PATH" >"$fixture"

    run node "$SCRIPT_PATH" --manifest "$MANIFEST_PATH" --workflow "$fixture"

    [ "$status" -ne 0 ]
    assert_output --partial "exact pull-request head or push commit"
}
