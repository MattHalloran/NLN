#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT="$BATS_TEST_DIRNAME/../validate-runtime-state-remote-storage-policy.mjs"
SOURCE="$BATS_TEST_DIRNAME/../../config/runtime-state-remote-storage-policy.json"

setup() {
    mkdir -p "$BATS_TMPDIR"
    POLICY="$BATS_TMPDIR/remote-storage-policy-$BATS_TEST_NUMBER.json"
    cp "$SOURCE" "$POLICY"
}
mutate() {
    node -e 'const fs=require("fs"),p=process.argv[1],v=require(p); Function("v",process.argv[2])(v); fs.writeFileSync(p,JSON.stringify(v))' "$POLICY" "$1"
}
run_validator() { run node "$SCRIPT" --policy "$POLICY"; }

@test "provider-neutral encrypted remote storage policy passes" {
    run_validator
    [ "$status" -eq 0 ]
    assert_output --partial "remote storage policy passed"
    assert_output --partial "Production integration remains disabled"
}

@test "production integration and legacy qualification remain disabled" {
    mutate 'v.scope.productionIntegrationEnabled=true'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "disconnected from production"
    cp "$SOURCE" "$POLICY"
    mutate 'v.scope.legacyRemoteQualificationAllowed=true'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "v2-only"
}

@test "client-side encryption and external key separation cannot be weakened" {
    mutate 'v.encryption.plaintextArchiveUploadAllowed=true'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "plaintextArchiveUploadAllowed"
    cp "$SOURCE" "$POLICY"
    mutate 'v.encryption.privateKeyAllowedInBackup=true'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "privateKeyAllowedInBackup"
}

@test "provider transport credentials and capabilities fail closed" {
    mutate 'v.providerInterface.minimumTransport="plaintext"'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "minimum transport"
    cp "$SOURCE" "$POLICY"
    mutate 'v.providerInterface.requiredCapabilities.pop()'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "capabilities"
}

@test "publication cannot overwrite or qualify partial evidence" {
    mutate 'v.publication.overwriteQualifiedObjectAllowed=true'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "overwriteQualifiedObjectAllowed"
    cp "$SOURCE" "$POLICY"
    mutate 'v.publication.requiredObjects=["archive.age"]'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "publication objects"
}

@test "3-2-1 resilience and freshness minimums cannot be weakened" {
    mutate 'v.resilience.minimumIndependentCopies=2'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "3-2-1"
    cp "$SOURCE" "$POLICY"
    mutate 'v.monitoring.maximumFreshnessSeconds=172800'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "24 hours"
}

@test "remote deletion stays separate dry-run-first and outside deployment" {
    mutate 'v.retention.deploymentMayDeleteRemoteObjects=true'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "deploymentMayDeleteRemoteObjects"
    cp "$SOURCE" "$POLICY"
    mutate 'v.retention.cleanupDryRunByDefault=false'
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "cleanupDryRunByDefault"
}

@test "policy files must be regular and cannot be symlinked" {
    rm "$POLICY"
    ln -s "$SOURCE" "$POLICY"
    run_validator
    [ "$status" -ne 0 ]
    assert_output --partial "non-symlink file"
}
