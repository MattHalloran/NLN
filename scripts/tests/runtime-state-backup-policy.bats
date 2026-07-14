#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT="$BATS_TEST_DIRNAME/../validate-runtime-state-backup-policy.mjs"
POLICY_SOURCE="$BATS_TEST_DIRNAME/../../config/runtime-state-backup-policy.json"
MATRIX_SOURCE="$BATS_TEST_DIRNAME/../../config/runtime-state-postgres-compatibility.json"

setup() {
    mkdir -p "$BATS_TMPDIR"
    POLICY="$BATS_TMPDIR/backup-policy-$BATS_TEST_NUMBER.json"
    MATRIX="$BATS_TMPDIR/postgres-matrix-$BATS_TEST_NUMBER.json"
    cp "$POLICY_SOURCE" "$POLICY"
    cp "$MATRIX_SOURCE" "$MATRIX"
}
mutate() {
    local file=$1 expression=$2
    node -e "const fs=require('fs'),p=process.argv[1],v=require(p); $expression; fs.writeFileSync(p,JSON.stringify(v))" "$file"
}
run_validator() { run node "$SCRIPT" --policy "$POLICY" --matrix "$MATRIX"; }

@test "versioned backup policy and PostgreSQL matrix pass" {
    run_validator
    [ "$status" -eq 0 ]
    assert_output --partial "Runtime-state backup policy passed"
    assert_output --partial "PostgreSQL compatibility matrix passed"
}
@test "backup age duration and RPO must remain bounded" {
    mutate "$POLICY" 'v.qualification.maximumCaptureDurationSeconds=0'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "maximumCaptureDurationSeconds"
    cp "$POLICY_SOURCE" "$POLICY"
    mutate "$POLICY" 'v.recoveryPointObjectives.maximumRoutineDataExposureSeconds=7200'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "routine RPO"
}
@test "qualification and approved restore-drill safeguards fail closed" {
    mutate "$POLICY" 'v.qualification.requireDatabaseRestoreVerification=false'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "qualification must fail closed"
    cp "$POLICY_SOURCE" "$POLICY"
    mutate "$POLICY" 'v.restoreVerificationCadence.qualifiedBackupRequiresExplicitApproval=false'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "explicit approval"
}
@test "retention cannot be coupled to deployment or implicit deletion" {
    mutate "$POLICY" 'v.retention.deploymentMayDeleteBackups=true'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "retention deletion safeguards"
    cp "$POLICY_SOURCE" "$POLICY"
    mutate "$POLICY" 'v.retention.deletionDryRunByDefault=false'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "retention deletion safeguards"
}
@test "matrix requires an evidenced current-production restore case" {
    mutate "$MATRIX" 'v.cases[0].evidence="pending"'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "required but lacks evidence"
    cp "$MATRIX_SOURCE" "$MATRIX"
    mutate "$MATRIX" 'v.cases[0].required=false'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "current-production restore case"
}
@test "matrix rejects incompatible tool and image declarations" {
    mutate "$MATRIX" 'v.cases[0].dumpToolMajor=12'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "dump tool older"
    cp "$MATRIX_SOURCE" "$MATRIX"
    mutate "$MATRIX" 'v.cases[1].fixtureImage="postgres:15-alpine"'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "fixture image does not match"
}
