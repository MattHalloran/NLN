#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT="$BATS_TEST_DIRNAME/../validate-runtime-state-inventory.mjs"
SOURCE="$BATS_TEST_DIRNAME/../../config/runtime-state-inventory.json"

setup() {
    mkdir -p "$BATS_TMPDIR"
    INVENTORY="$BATS_TMPDIR/runtime-state-inventory-$BATS_TEST_NUMBER.json"
    cp "$SOURCE" "$INVENTORY"
}

mutate() {
    node -e "const fs=require('fs'),p=process.argv[1],i=require(p); $1; fs.writeFileSync(p,JSON.stringify(i))" "$INVENTORY"
}

@test "versioned runtime-state inventory passes" {
    run node "$SCRIPT" --inventory "$INVENTORY"
    [ "$status" -eq 0 ]
    assert_output --partial "Runtime-state inventory passed"
}

@test "unsafe and duplicate paths fail closed" {
    mutate 'i.entries[0].path="../escape"'
    run node "$SCRIPT" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "unsafe path"

    cp "$SOURCE" "$INVENTORY"
    mutate 'i.entries[1].path=i.entries[0].path'
    run node "$SCRIPT" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "duplicate path"
}

@test "critical data cannot silently become optional" {
    mutate 'i.entries.find(e=>e.path==="data/postgres.sql").required=false'
    run node "$SCRIPT" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "required runtime-state path is absent or optional"
}

@test "secret handling must remain encrypted and owner-only" {
    mutate 'i.entries.find(e=>e.path===".env-prod").integrity="sha256"'
    run node "$SCRIPT" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "secret path lacks encrypted owner-only handling"
}

@test "integrity and legacy preservation requirements cannot be disabled" {
    mutate 'i.objectRequirements.recordSha256=false'
    run node "$SCRIPT" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "object requirement must fail closed"

    cp "$SOURCE" "$INVENTORY"
    mutate 'i.compatibility.rewriteLegacyBackups=true'
    run node "$SCRIPT" --inventory "$INVENTORY"
    [ "$status" -ne 0 ]
    assert_output --partial "preserve existing backups"
}
