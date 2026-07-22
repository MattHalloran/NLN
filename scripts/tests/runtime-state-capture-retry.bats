#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT="$BATS_TEST_DIRNAME/../capture-runtime-state-manifest-v2.mjs"

setup() {
    ROOT="$BATS_TMPDIR/capture-root-$BATS_TEST_NUMBER"
    MANIFEST="$BATS_TMPDIR/capture-manifest-$BATS_TEST_NUMBER.json"
    INVENTORY="$BATS_TMPDIR/capture-inventory-$BATS_TEST_NUMBER.json"
    TOOL="$BATS_TMPDIR/capture-tool-$BATS_TEST_NUMBER.mjs"
    STATE="$BATS_TMPDIR/capture-state-$BATS_TEST_NUMBER"
    mkdir -p "$ROOT"
    printf '{}\n' >"$INVENTORY"
    chmod 600 "$INVENTORY"
}

write_tool() {
    printf '%s\n' "$1" >"$TOOL"
    chmod 700 "$TOOL"
}

capture() {
    CAPTURE_TEST_STATE="$STATE" node "$SCRIPT" --root "$ROOT" --manifest "$MANIFEST" \
        --inventory "$INVENTORY" --manifest-tool "$TOOL" --retry-delay-ms 0 "$@"
}

@test "capture retries bounded stability failures and then succeeds" {
    write_tool 'import fs from "node:fs";
const state=process.env.CAPTURE_TEST_STATE;
const attempt=fs.existsSync(state) ? Number(fs.readFileSync(state,"utf8"))+1 : 1;
fs.writeFileSync(state,String(attempt));
if(attempt<3){ console.error("Runtime-state v2 manifest rejected: file changed during capture: assets/file"); process.exit(1); }
const manifest=process.argv[process.argv.indexOf("--manifest")+1];
fs.writeFileSync(manifest,"fixture manifest\n",{mode:0o600,flag:"wx"});'
    run capture --max-attempts 3
    [ "$status" -eq 0 ]
    assert_output --partial "stabilized on attempt 3/3"
    [ "$(cat "$STATE")" = 3 ]
    [ "$(cat "$MANIFEST")" = "fixture manifest" ]
}

@test "capture exhausts bounded retries without publishing a manifest" {
    write_tool 'console.error("Runtime-state v2 manifest rejected: directory changed during capture: assets"); process.exit(1);'
    run capture --max-attempts 2
    [ "$status" -ne 0 ]
    assert_output --partial "did not stabilize after 2 capture attempts"
    [ ! -e "$MANIFEST" ]
}

@test "capture does not retry non-stability failures" {
    write_tool 'import fs from "node:fs";
const state=process.env.CAPTURE_TEST_STATE;
const attempt=fs.existsSync(state) ? Number(fs.readFileSync(state,"utf8"))+1 : 1;
fs.writeFileSync(state,String(attempt));
console.error("Runtime-state v2 manifest rejected: required inventory path is missing: assets"); process.exit(1);'
    run capture --max-attempts 3
    [ "$status" -ne 0 ]
    assert_output --partial "without a retryable stability error"
    [ "$(cat "$STATE")" = 1 ]
    [ ! -e "$MANIFEST" ]
}

@test "capture rejects unsafe retry policy and existing evidence" {
    write_tool 'process.exit(0);'
    run capture --max-attempts 0
    [ "$status" -ne 0 ]
    assert_output --partial "--max-attempts must be an integer"
    printf 'existing\n' >"$MANIFEST"
    run capture
    [ "$status" -ne 0 ]
    assert_output --partial "manifest destination already exists"
    [ "$(cat "$MANIFEST")" = existing ]
}
