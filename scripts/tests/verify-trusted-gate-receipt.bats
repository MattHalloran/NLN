#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

CREATE_SCRIPT="$BATS_TEST_DIRNAME/../trusted-job-receipt.mjs"
AGGREGATE_SCRIPT="$BATS_TEST_DIRNAME/../aggregate-trusted-receipts.mjs"
VERIFY_SCRIPT="$BATS_TEST_DIRNAME/../verify-trusted-gate-receipt.mjs"
MANIFEST_SOURCE="$BATS_TEST_DIRNAME/../../config/trusted-validation-manifest.json"
COMMIT="0123456789abcdef0123456789abcdef01234567"
NOW=1800000000

setup() {
    WORK_DIR="$BATS_TMPDIR/verify-trusted-gate-$BATS_TEST_NUMBER"
    mkdir -p "$WORK_DIR/config" "$WORK_DIR/receipts"
    cp "$MANIFEST_SOURCE" "$WORK_DIR/config/manifest.json"
    node - "$WORK_DIR/config/manifest.json" "$WORK_DIR" <<'NODE'
const fs = require("fs");
const path = require("path");
const manifest = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const job of manifest.requiredJobs) {
  for (const artifact of job.requiredArtifacts) {
    const target = path.join(process.argv[3], artifact);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `fixture for ${job.id}: ${artifact}\n`);
  }
}
NODE
    for job in validate integration e2e deploy-rehearsal; do
        node "$CREATE_SCRIPT" --manifest "$WORK_DIR/config/manifest.json" --root "$WORK_DIR" \
            --job "$job" --output "$WORK_DIR/receipts/$job.json" --commit "$COMMIT" \
            --run-id 1234 --run-attempt 2 --repository example/nln --workflow CI >/dev/null
    done
    node "$AGGREGATE_SCRIPT" --manifest "$WORK_DIR/config/manifest.json" \
        --receipts-dir "$WORK_DIR/receipts" --output "$WORK_DIR/gate.json" --commit "$COMMIT" \
        --run-id 1234 --run-attempt 2 --repository example/nln --workflow CI >/dev/null
    node -e 'const fs=require("fs"),p=process.argv[1],r=require(p); r.generatedAt=new Date(1800000000*1000).toISOString(); fs.writeFileSync(p,JSON.stringify(r))' "$WORK_DIR/gate.json"
}

verify_receipt() {
    node "$VERIFY_SCRIPT" --receipt "$WORK_DIR/gate.json" --manifest "$WORK_DIR/config/manifest.json" \
        --commit "$COMMIT" --now-epoch "$NOW" --max-age-seconds 3600
}

mutate() {
    node -e "const fs=require('fs'),p=process.argv[1],r=require(p); $1; fs.writeFileSync(p,JSON.stringify(r))" "$WORK_DIR/gate.json"
}

@test "exact-commit trusted gate receipt is accepted" {
    mutate 'r.generatedAt="2027-01-15T08:00:00.579Z"'
    run verify_receipt
    [ "$status" -eq 0 ]
    assert_output --partial "Trusted gate receipt passed for commit $COMMIT"
}

@test "help documents exact-commit verification without requiring evidence" {
    run node "$VERIFY_SCRIPT" --help
    [ "$status" -eq 0 ]
    assert_output --partial "local-read-only exact-commit"
}

@test "malformed and future generation timestamps are rejected" {
    mutate 'r.generatedAt="2027-01-15T08:00:00Z"'
    run verify_receipt
    [ "$status" -ne 0 ]
    assert_output --partial "invalid generation timestamp"

    mutate 'r.generatedAt="not-a-timestamp"'
    run verify_receipt
    [ "$status" -ne 0 ]
    assert_output --partial "invalid generation timestamp"

    mutate 'r.generatedAt=new Date((1800000000+1)*1000).toISOString()'
    run verify_receipt
    [ "$status" -ne 0 ]
    assert_output --partial "generation timestamp is in the future"
}

@test "wrong commit, failed status, and stale evidence are rejected" {
    run node "$VERIFY_SCRIPT" --receipt "$WORK_DIR/gate.json" --manifest "$WORK_DIR/config/manifest.json" \
        --commit abcdef0123456789abcdef0123456789abcdef01 --now-epoch "$NOW"
    [ "$status" -ne 0 ]
    assert_output --partial "wrong commit"

    mutate 'r.status="failure"'
    run verify_receipt
    [ "$status" -ne 0 ]
    assert_output --partial "does not record success"

    mutate 'r.status="success"; r.generatedAt=new Date((1800000000-3601)*1000).toISOString()'
    run verify_receipt
    [ "$status" -ne 0 ]
    assert_output --partial "receipt is stale"
}

@test "wrong manifest and incomplete job evidence are rejected" {
    node -e 'const fs=require("fs"),p=process.argv[1],m=require(p); m.manifestId="changed-manifest"; fs.writeFileSync(p,JSON.stringify(m))' "$WORK_DIR/config/manifest.json"
    run verify_receipt
    [ "$status" -ne 0 ]
    assert_output --partial "different trusted validation manifest"

    cp "$MANIFEST_SOURCE" "$WORK_DIR/config/manifest.json"
    mutate 'r.jobs.pop()'
    run verify_receipt
    [ "$status" -ne 0 ]
    assert_output --partial "exactly one result for every required job"
}

@test "duplicate jobs and corrupt artifact hashes are rejected" {
    mutate 'r.jobs.push(r.jobs[0])'
    run verify_receipt
    [ "$status" -ne 0 ]
    assert_output --partial "repeats job evidence"

    mutate 'r.jobs.pop(); r.jobs[0].artifacts[0].sha256="bad"'
    run verify_receipt
    [ "$status" -ne 0 ]
    assert_output --partial "invalid artifact evidence"
}

@test "symlinked receipts and invalid age configuration fail closed" {
    ln -s "$WORK_DIR/gate.json" "$WORK_DIR/gate-link.json"
    run node "$VERIFY_SCRIPT" --receipt "$WORK_DIR/gate-link.json" --manifest "$WORK_DIR/config/manifest.json" \
        --commit "$COMMIT" --now-epoch "$NOW"
    [ "$status" -ne 0 ]
    assert_output --partial "regular, single-link, non-symlink file"

    run node "$VERIFY_SCRIPT" --receipt "$WORK_DIR/gate.json" --manifest "$WORK_DIR/config/manifest.json" \
        --commit "$COMMIT" --max-age-seconds nope
    [ "$status" -ne 0 ]
    assert_output --partial "positive integer"
}

@test "duplicate keys and unknown receipt fields fail closed" {
    cp "$WORK_DIR/gate.json" "$WORK_DIR/gate.original.json"
    node -e 'const fs=require("fs"),p=process.argv[1],s=fs.readFileSync(p,"utf8");fs.writeFileSync(p,s.replace("{", "{\"status\":\"failure\","))' "$WORK_DIR/gate.json"
    run verify_receipt
    [ "$status" -ne 0 ]
    assert_output --partial "duplicate object key"

    cp "$WORK_DIR/gate.original.json" "$WORK_DIR/gate.json"
    chmod 600 "$WORK_DIR/gate.json"
    mutate 'r.unexpected=true'
    run verify_receipt
    [ "$status" -ne 0 ]
    assert_output --partial "unknown field"
}
