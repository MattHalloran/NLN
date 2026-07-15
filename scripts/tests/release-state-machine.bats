#!/usr/bin/env bats
setup() {
  WORK="$BATS_TEST_TMPDIR/release-state-$BATS_TEST_NUMBER"
  mkdir -p "$WORK"
  COMMIT=$(printf 'a%.0s' {1..40})
  NOW=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
  node scripts/tests/fixtures/create-release-lifecycle-fixture.mjs \
    --directory "$WORK/components" --version 10.0.0 --commit "$COMMIT" \
    --output "$WORK/lifecycle.json" --index "$WORK/index.json" --now "$NOW"
}

@test "deploy-ready state is derived from the exact evidence graph" {
  run node scripts/release-state.mjs evaluate --index "$WORK/index.json" --target deploy-ready --output "$WORK/state.json" --now "$NOW"
  [ "$status" -eq 0 ]; [ "$(stat -c %a "$WORK/state.json")" = 600 ]
  node -e 'const r=require(process.argv[1]);if(!r.result.targetAchieved||!r.result.achievedStates.includes("deploy-ready")||r.childReceipts.length!==5)process.exit(1)' "$WORK/state.json"
  run node scripts/verify-release-receipt.mjs --receipt "$WORK/state.json" --type release-lifecycle-state --scope fixture --version 10.0.0 --commit "$COMMIT" --now "$NOW"
  [ "$status" -eq 0 ]
}

@test "missing required evidence produces immutable blocked evidence" {
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.components=v.components.filter(x=>x.receiptType!=="vps-health-gate");fs.writeFileSync(p,JSON.stringify(v));fs.chmodSync(p,0o600)' "$WORK/index.json"
  run node scripts/release-state.mjs evaluate --index "$WORK/index.json" --target deploy-ready --output "$WORK/blocked.json" --now "$NOW"
  [ "$status" -ne 0 ]; [ -e "$WORK/blocked.json" ]; grep -q 'MISSING_REQUIRED_EVIDENCE' "$WORK/blocked.json"; grep -q 'vps-health-gate' "$WORK/blocked.json"
}

@test "changed mixed and duplicate evidence cannot advance state" {
  HEALTH=$(node -e 'const v=require(process.argv[1]);process.stdout.write(v.components.find(x=>x.receiptType==="vps-health-gate").path)' "$WORK/index.json")
  printf 'tamper' >>"$HEALTH"
  run node scripts/release-state.mjs evaluate --index "$WORK/index.json" --output "$WORK/tampered.json" --now "$NOW"
  [ "$status" -ne 0 ]; [ ! -e "$WORK/tampered.json" ]
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.components[0].scope="local";fs.writeFileSync(p,JSON.stringify(v));fs.chmodSync(p,0o600)' "$WORK/index.json"
  run node scripts/release-state.mjs evaluate --index "$WORK/index.json" --output "$WORK/mixed.json" --now "$NOW"
  [ "$status" -ne 0 ]; [ ! -e "$WORK/mixed.json" ]
}

@test "typed look-alike bundle and health evidence cannot advance state" {
  cp "$WORK/index.json" "$WORK/original-index.json"
  node - "$WORK/index.json" "$WORK/fake-bundle.json" <<'EOF'
const fs=require('fs'),crypto=require('crypto'),[indexPath,fakePath]=process.argv.slice(2),index=require(indexPath),component=index.components.find(x=>x.receiptType==='immutable-release-bundle');fs.writeFileSync(fakePath,JSON.stringify({schemaVersion:1,receiptType:'immutable-release-bundle',status:'qualified',release:index.release}),{mode:0o600});component.path=fakePath;component.sha256=crypto.createHash('sha256').update(fs.readFileSync(fakePath)).digest('hex');fs.writeFileSync(indexPath,JSON.stringify(index),{mode:0o600});
EOF
  run node scripts/release-state.mjs evaluate --index "$WORK/index.json" --output "$WORK/fake-bundle-state.json" --now "$NOW"
  [ "$status" -ne 0 ]; [ ! -e "$WORK/fake-bundle-state.json" ]

  cp "$WORK/original-index.json" "$WORK/index.json"; chmod 600 "$WORK/index.json"
  node - "$WORK/index.json" "$WORK/fake-health.json" <<'EOF'
const fs=require('fs'),crypto=require('crypto'),[indexPath,fakePath]=process.argv.slice(2),index=require(indexPath),component=index.components.find(x=>x.receiptType==='vps-health-gate');fs.writeFileSync(fakePath,JSON.stringify({schemaVersion:1,receiptType:'vps-health-gate',status:'passed',adapterMode:'read-only',observedAt:index.createdAt,summary:{blocking:0},checks:[]}),{mode:0o600});component.path=fakePath;component.sha256=crypto.createHash('sha256').update(fs.readFileSync(fakePath)).digest('hex');fs.writeFileSync(indexPath,JSON.stringify(index),{mode:0o600});
EOF
  run node scripts/release-state.mjs evaluate --index "$WORK/index.json" --output "$WORK/fake-health-state.json" --now "$NOW"
  [ "$status" -ne 0 ]; [ ! -e "$WORK/fake-health-state.json" ]
}
