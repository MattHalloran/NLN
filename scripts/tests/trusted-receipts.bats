#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

CREATE_SCRIPT="$BATS_TEST_DIRNAME/../trusted-job-receipt.mjs"
AGGREGATE_SCRIPT="$BATS_TEST_DIRNAME/../aggregate-trusted-receipts.mjs"
MANIFEST_SOURCE="$BATS_TEST_DIRNAME/../../config/trusted-validation-manifest.json"
COMMIT="0123456789abcdef0123456789abcdef01234567"

setup() {
    WORK_DIR="$BATS_TMPDIR/trusted-receipts-$BATS_TEST_NUMBER"
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
    fs.writeFileSync(target, `fixture evidence for ${job.id}: ${artifact}\n`);
  }
}
NODE
}

create_receipt() {
    local job="$1"
    node "$CREATE_SCRIPT" \
        --manifest "$WORK_DIR/config/manifest.json" \
        --root "$WORK_DIR" \
        --job "$job" \
        --output "$WORK_DIR/receipts/$job.json" \
        --commit "$COMMIT" \
        --run-id 1234 \
        --run-attempt 2 \
        --repository example/nln \
        --workflow CI
}

create_all_receipts() {
    create_receipt validate
    create_receipt integration
    create_receipt e2e
    create_receipt deploy-rehearsal
}

aggregate_receipts() {
    node "$AGGREGATE_SCRIPT" \
        --manifest "$WORK_DIR/config/manifest.json" \
        --receipts-dir "$WORK_DIR/receipts" \
        --output "$WORK_DIR/trusted-gate.json" \
        --commit "$COMMIT" \
        --run-id 1234 \
        --run-attempt 2 \
        --repository example/nln \
        --workflow CI
}

@test "trusted job receipts hash every required artifact with owner-only permissions" {
    run create_receipt validate
    [ "$status" -eq 0 ]
    [ "$(stat -c '%a' "$WORK_DIR/receipts")" = "700" ]
    [ "$(stat -c '%a' "$WORK_DIR/receipts/validate.json")" = "600" ]
    node -e 'const r=require(process.argv[1]); if(r.status!=="success" || r.artifacts.length!==5 || r.artifacts.some(a=>!/^[0-9a-f]{64}$/.test(a.sha256))) process.exit(1)' "$WORK_DIR/receipts/validate.json"
}

@test "trusted job receipt binds checked-out HEAD instead of pull-request merge SHA" {
    actual_head=$(git -C "$BATS_TEST_DIRNAME/../.." rev-parse HEAD)
    receipt_path="$WORK_DIR/receipts/checked-out-head.json"

    run env GITHUB_SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
        GITHUB_JOB=validate GITHUB_RUN_ID=1234 GITHUB_RUN_ATTEMPT=2 \
        GITHUB_REPOSITORY=example/nln GITHUB_WORKFLOW=CI \
        node "$CREATE_SCRIPT" --manifest "$WORK_DIR/config/manifest.json" \
        --root "$WORK_DIR" --output "$receipt_path"

    [ "$status" -eq 0 ]
    recorded_head=$(node -e 'process.stdout.write(require(process.argv[1]).commit)' "$receipt_path")
    [ "$recorded_head" = "$actual_head" ]
}

@test "trusted job receipt rejects missing required evidence" {
    rm "$WORK_DIR/test-results/pwa.json"
    run create_receipt validate
    [ "$status" -ne 0 ]
    assert_output --partial "required artifact is missing: test-results/pwa.json"
}

@test "aggregate receipt accepts one exact successful receipt per required job" {
    create_all_receipts
    run aggregate_receipts
    [ "$status" -eq 0 ]
    node -e 'const r=require(process.argv[1]); if(r.status!=="success" || r.jobs.length!==4) process.exit(1)' "$WORK_DIR/trusted-gate.json"
    [ "$(stat -c '%a' "$WORK_DIR/trusted-gate.json")" = "600" ]
}

@test "aggregate receipt rejects stale evidence from another workflow run" {
    create_all_receipts
    node -e 'const fs=require("fs"),p=process.argv[1],r=require(p); r.run.id="1220"; fs.writeFileSync(p,JSON.stringify(r))' "$WORK_DIR/receipts/integration.json"
    run aggregate_receipts
    [ "$status" -ne 0 ]
    assert_output --partial "integration receipt is for the wrong run id"
}

@test "aggregate receipt rejects evidence for a different commit" {
    create_all_receipts
    node -e 'const fs=require("fs"),p=process.argv[1],r=require(p); r.commit="abcdef0123456789abcdef0123456789abcdef01"; fs.writeFileSync(p,JSON.stringify(r))' "$WORK_DIR/receipts/e2e.json"
    run aggregate_receipts
    [ "$status" -ne 0 ]
    assert_output --partial "e2e receipt is for the wrong commit"
}

@test "aggregate receipt rejects skipped jobs and corrupt artifact hashes" {
    create_all_receipts
    node -e 'const fs=require("fs"),p=process.argv[1],r=require(p); r.status="skipped"; fs.writeFileSync(p,JSON.stringify(r))' "$WORK_DIR/receipts/deploy-rehearsal.json"
    run aggregate_receipts
    [ "$status" -ne 0 ]
    assert_output --partial "deploy-rehearsal did not record success"

    create_receipt deploy-rehearsal
    node -e 'const fs=require("fs"),p=process.argv[1],r=require(p); r.artifacts[0].sha256="bad"; fs.writeFileSync(p,JSON.stringify(r))' "$WORK_DIR/receipts/validate.json"
    run aggregate_receipts
    [ "$status" -ne 0 ]
    assert_output --partial "invalid artifact evidence"
}
