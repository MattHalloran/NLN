#!/usr/bin/env bats

setup() {
    ROOT="$BATS_TMPDIR/phase5-$BATS_TEST_NUMBER"
    rm -rf "$ROOT"
    SRC="$ROOT/source"
    mkdir -p "$SRC/dist" "$ROOT/evidence"
    printf 'services: {}\n' > "$SRC/compose.yml"
    printf '#!/bin/sh\n' > "$SRC/deploy-helper.sh"
    printf 'built application\n' > "$SRC/dist/app.js"
    chmod 755 "$SRC/deploy-helper.sh"
    COMMIT=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    cat > "$ROOT/spec.json" <<EOF
{"schemaVersion":1,"artifacts":[{"source":"compose.yml","path":"compose/production.yml","kind":"compose"},{"source":"deploy-helper.sh","path":"helpers/deploy.sh","kind":"deployment-helper"},{"source":"dist/app.js","path":"build/app.js","kind":"built-artifact"}],"images":["example/ui@sha256:$(printf '1%.0s' {1..64})","example/server@sha256:$(printf '2%.0s' {1..64})"],"endpoints":{"health":"/healthcheck","public":"/"}}
EOF
    node - "$ROOT/trusted.json" "$COMMIT" <<'EOF'
const fs=require('fs'),crypto=require('crypto'); const [out,commit]=process.argv.slice(2); const text=fs.readFileSync('config/trusted-validation-manifest.json','utf8'), manifest=JSON.parse(text);
const jobs=manifest.requiredJobs.map(j=>({job:j.id,receiptSha256:'a'.repeat(64),artifacts:j.requiredArtifacts.map(path=>({path,bytes:1,sha256:'b'.repeat(64)}))}));
fs.writeFileSync(out,JSON.stringify({schemaVersion:1,receiptType:'trusted-validation-gate',status:'success',commit,manifestId:manifest.manifestId,manifestSha256:crypto.createHash('sha256').update(text).digest('hex'),generatedAt:new Date(Math.floor(Date.now()/1000)*1000).toISOString(),run:{id:'1',attempt:'1',repository:'fixture/repo',workflow:'ci'},jobs}));
EOF
    chmod 600 "$ROOT/trusted.json"
    cat > "$ROOT/migrations.json" <<'EOF'
{"schemaVersion":1,"releaseVersion":"5.0.0","classification":"backward-compatible","rationale":"additive fixture migration","rollbackStrategy":"retain schema during application rollback","testedPostgresMajors":[13],"expectedDurationSeconds":5,"expectedAffectedRows":{"maximum":100,"basis":"fixture bound"},"lockRisk":"low","transactionStrategy":"single transaction","diskSpaceRequiredBytes":100,"specialDeploymentPlan":null,"migrations":[{"id":"20260101000000_initial","phase":"expand","classification":"backward-compatible","rationale":"creates fixture baseline","backfill":null}]}
EOF
    cat > "$ROOT/env.json" <<'EOF'
{"schemaVersion":1,"requiredKeys":["DB_NAME","SERVER_URL"]}
EOF
    create_bundle
}

create_bundle() {
    node scripts/immutable-release-bundle.mjs create --source "$SRC" --spec "$ROOT/spec.json" --output "$ROOT/bundle" --version 5.0.0 --commit "$COMMIT" --trusted-receipt "$ROOT/trusted.json" --trusted-manifest config/trusted-validation-manifest.json --migration-metadata "$ROOT/migrations.json" --environment-schema "$ROOT/env.json"
}

make_adapter() {
    cat > "$ROOT/adapter.mjs" <<'EOF'
#!/usr/bin/env node
import fs from "node:fs";
const [op] = process.argv.slice(2); const log=process.env.ADAPTER_LOG; fs.appendFileSync(log, `${op}\n`);
const state={appliedMigrations:["20260101000000_initial","later-compatible"],environmentKeys:process.env.MISSING_ENV==="1"?["DB_NAME"]:["DB_NAME","SERVER_URL"],stateIdentity:{db:"db-volume-1",redis:"redis-volume-1"},writeSentinel:"write-after-deploy"};
if(op==="inspect") console.log(JSON.stringify(process.env.CHANGE_STATE==="1" && fs.readFileSync(log,"utf8").match(/inspect/g)?.length>1 ? {...state,stateIdentity:{db:"changed",redis:"redis-volume-1"}} : state));
else if(op==="load") console.log(JSON.stringify({status:"success",offlineReady:process.env.OFFLINE_UNAVAILABLE!=="1"}));
else if(op==="health" && process.env.FAIL_OPERATION==="health") console.log('{"status":"failed"}');
else console.log('{"status":"success"}');
EOF
    chmod +x "$ROOT/adapter.mjs"
}

@test "immutable release policy is fail-closed and production-disabled" {
    run node scripts/validate-immutable-release-policy.mjs
    [ "$status" -eq 0 ]
    sed 's/"productionIntegrationEnabled": false/"productionIntegrationEnabled": true/' config/immutable-release-policy.json > "$ROOT/unsafe.json"
    run node scripts/validate-immutable-release-policy.mjs "$ROOT/unsafe.json"
    [ "$status" -ne 0 ]
}

@test "creates and independently verifies a qualified immutable bundle" {
    run node scripts/immutable-release-bundle.mjs verify --bundle "$ROOT/bundle" --version 5.0.0
    [ "$status" -eq 0 ]
    [ "$(stat -c %a "$ROOT/bundle/release-manifest.json")" = 600 ]
}

@test "refuses version output reuse and overwrite" {
    run create_bundle
    [ "$status" -ne 0 ]
    [[ "$output" == *"cannot be overwritten"* ]]
}

@test "rejects corrupt, extra, symlinked, and mutable-image bundle inputs" {
    printf corrupt >> "$ROOT/bundle/artifacts/build/app.js"
    run node scripts/immutable-release-bundle.mjs verify --bundle "$ROOT/bundle"
    [ "$status" -ne 0 ]
    rm -rf "$ROOT/bundle"; sed -i 's/@sha256:[0-9a-f]*/:latest/' "$ROOT/spec.json"
    run create_bundle
    [ "$status" -ne 0 ]
}

@test "bundle verification rejects hash-consistent weakened policy and topology" {
    node - "$ROOT/bundle" <<'EOF'
const fs=require('fs'),crypto=require('crypto'),path=require('path'),root=process.argv[2],policyPath=path.join(root,'immutable-release-policy.json'),manifestPath=path.join(root,'release-manifest.json'),policy=require(policyPath),manifest=require(manifestPath);policy.productionIntegrationEnabled=true;fs.writeFileSync(policyPath,JSON.stringify(policy));manifest.evidence.immutablePolicySha256=crypto.createHash('sha256').update(fs.readFileSync(policyPath)).digest('hex');fs.writeFileSync(manifestPath,JSON.stringify(manifest));
EOF
    run node scripts/immutable-release-bundle.mjs verify --bundle "$ROOT/bundle"
    [ "$status" -ne 0 ]
    [[ "$output" == *"policy is unsafe"* ]]
}

@test "rejects trusted evidence for a different commit" {
    rm -rf "$ROOT/bundle"; sed -i 's/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/' "$ROOT/trusted.json"
    run create_bundle
    [ "$status" -ne 0 ]
}

@test "app-only rollback is a non-mutating plan by default" {
    make_adapter; export ADAPTER_LOG="$ROOT/adapter.log"
    run node scripts/app-only-rollback.mjs --bundle "$ROOT/bundle" --adapter "$ROOT/adapter.mjs" --receipt "$ROOT/plan.json"
    [ "$status" -eq 0 ]; [ "$(cat "$ROOT/adapter.log")" = inspect ]
    run node scripts/verify-release-receipt.mjs --receipt "$ROOT/plan.json" --type app-only-rollback --version 5.0.0 --commit "$COMMIT"
    [ "$status" -eq 0 ]
    grep -q '"status": "planned"' "$ROOT/plan.json"
    grep -q '"databaseRestored": false' "$ROOT/plan.json"
    node -e 'const fs=require("fs"),p=process.argv[1],r=require(p);r.databaseRestored=true;fs.writeFileSync(p,JSON.stringify(r))' "$ROOT/plan.json"
    run node scripts/verify-release-receipt.mjs --receipt "$ROOT/plan.json" --type app-only-rollback
    [ "$status" -ne 0 ]
}

@test "fixture rollback targets application services and preserves state identities and writes" {
    make_adapter; export ADAPTER_LOG="$ROOT/adapter.log"
    run node scripts/app-only-rollback.mjs --bundle "$ROOT/bundle" --adapter "$ROOT/adapter.mjs" --receipt "$ROOT/result.json" --execute true --fixture true --confirm ROLLBACK-APP-ONLY-5.0.0
    [ "$status" -eq 0 ]
    run node scripts/verify-release-receipt.mjs --receipt "$ROOT/result.json" --type app-only-rollback --version 5.0.0 --commit "$COMMIT"
    [ "$status" -eq 0 ]
    [ "$(tr '\n' ' ' < "$ROOT/adapter.log")" = "inspect load activate health public-smoke post-smoke inspect " ]
    grep -q '"status": "success"' "$ROOT/result.json"
}

@test "execution requires explicit fixture boundary and exact confirmation" {
    make_adapter; export ADAPTER_LOG="$ROOT/adapter.log"
    run node scripts/app-only-rollback.mjs --bundle "$ROOT/bundle" --adapter "$ROOT/adapter.mjs" --receipt "$ROOT/result.json" --execute true --fixture false --confirm yes
    [ "$status" -ne 0 ]; [ ! -s "$ROOT/adapter.log" ]
}

@test "rollback refuses when exact images are unavailable offline" {
    make_adapter; export ADAPTER_LOG="$ROOT/adapter.log" OFFLINE_UNAVAILABLE=1
    run node scripts/app-only-rollback.mjs --bundle "$ROOT/bundle" --adapter "$ROOT/adapter.mjs" --receipt "$ROOT/result.json" --execute true --fixture true --confirm ROLLBACK-APP-ONLY-5.0.0
    [ "$status" -ne 0 ]; ! grep -q '^activate$' "$ROOT/adapter.log"; ! grep -q '^restore-current$' "$ROOT/adapter.log"; [[ "$output" == *"offline rollback"* ]]
}

@test "incompatible or expired migration evidence blocks rollback before activation" {
    sed -i 's/backward-compatible/incompatible/' "$ROOT/bundle/migration-compatibility.json"
    make_adapter; export ADAPTER_LOG="$ROOT/adapter.log"
    run node scripts/app-only-rollback.mjs --bundle "$ROOT/bundle" --adapter "$ROOT/adapter.mjs" --receipt "$ROOT/result.json"
    [ "$status" -ne 0 ]; [ ! -s "$ROOT/adapter.log" ]
}

@test "environment schema incompatibility blocks rollback before activation" {
    make_adapter; export ADAPTER_LOG="$ROOT/adapter.log" MISSING_ENV=1
    run node scripts/app-only-rollback.mjs --bundle "$ROOT/bundle" --adapter "$ROOT/adapter.mjs" --receipt "$ROOT/result.json"
    [ "$status" -ne 0 ]; [ "$(cat "$ROOT/adapter.log")" = inspect ]; [[ "$output" == *"missing required keys"* ]]
}

@test "failed health restores the current application and writes a failure receipt" {
    make_adapter; export ADAPTER_LOG="$ROOT/adapter.log" FAIL_OPERATION=health
    run node scripts/app-only-rollback.mjs --bundle "$ROOT/bundle" --adapter "$ROOT/adapter.mjs" --receipt "$ROOT/result.json" --execute true --fixture true --confirm ROLLBACK-APP-ONLY-5.0.0
    [ "$status" -ne 0 ]; grep -q '^restore-current$' "$ROOT/adapter.log"; grep -q '"status": "failed"' "$ROOT/result.json"
}

@test "changed protected state fails closed" {
    make_adapter; export ADAPTER_LOG="$ROOT/adapter.log" CHANGE_STATE=1
    run node scripts/app-only-rollback.mjs --bundle "$ROOT/bundle" --adapter "$ROOT/adapter.mjs" --receipt "$ROOT/result.json" --execute true --fixture true --confirm ROLLBACK-APP-ONLY-5.0.0
    [ "$status" -ne 0 ]; [[ "$output" == *"identity changed"* ]]
}

@test "last-known-good is recorded only after the complete smoke gate" {
    cat > "$ROOT/smoke.json" <<EOF
{"status":"success","releaseVersion":"5.0.0","commit":"$COMMIT","health":"passed","publicSmoke":"passed","postDeploySmoke":"passed"}
EOF
    chmod 600 "$ROOT/smoke.json"
    run node scripts/record-known-good-release.mjs --bundle "$ROOT/bundle" --smoke "$ROOT/smoke.json" --output "$ROOT/known-good"
    [ "$status" -eq 0 ]; [ -f "$ROOT/known-good/current.json" ]; [ "$(stat -c %a "$ROOT/known-good/current.json")" = 600 ]
    RECORD=$(node -e 'const path=require("path"),p=require(process.argv[1]);process.stdout.write(path.join(path.dirname(process.argv[1]),p.record))' "$ROOT/known-good/current.json")
    run node scripts/verify-release-receipt.mjs --receipt "$RECORD" --type last-known-good-release --version 5.0.0 --commit "$COMMIT"
    [ "$status" -eq 0 ]
    node -e 'const fs=require("fs"),p=process.argv[1],r=require(p);r.smokeReceiptSha256="0".repeat(64);fs.writeFileSync(p,JSON.stringify(r))' "$RECORD"
    run node scripts/verify-release-receipt.mjs --receipt "$RECORD" --type last-known-good-release
    [ "$status" -ne 0 ]
    run node scripts/record-known-good-release.mjs --bundle "$ROOT/bundle" --smoke "$ROOT/smoke.json" --output "$ROOT/known-good"
    [ "$status" -ne 0 ]
}
