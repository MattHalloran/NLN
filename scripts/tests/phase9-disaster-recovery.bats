#!/usr/bin/env bats

setup() {
  ROOT="$BATS_TEST_TMPDIR/phase9-$BATS_TEST_NUMBER"
  BUNDLE="$ROOT/release/bundle"
  BACKUP="$ROOT/backup/runtime.age"
  REMOTE="$ROOT/remote/receipt.json"
  IDENTITY="$ROOT/identity/age.key"
  CONFIG="$ROOT/config/recovery.json"
  SALVAGE="$ROOT/evidence/salvage.json"
  RECEIPT="$ROOT/result/qualification.json"
  NOW="2026-07-18T12:00:00.000Z"
  mkdir -p "$BUNDLE" "$(dirname "$BACKUP")" "$(dirname "$REMOTE")" \
    "$(dirname "$IDENTITY")" "$(dirname "$CONFIG")"
  printf '{"fixture":"immutable release"}\n' >"$BUNDLE/release-manifest.json"
  printf '%s\n' '{"integrity":"verified","objects":{"data/postgres.sql":"present","data/uploads/fixture.txt":"present","assets/fixture.txt":"present",".env-prod":"present","jwt_private":"present","jwt_public":"present"}}' >"$BACKUP"
  printf 'AGE-SECRET-KEY-fixture-only\n' >"$IDENTITY"
  chmod 600 "$BUNDLE/release-manifest.json" "$BACKUP" "$IDENTITY"
  node - "$REMOTE" "$BACKUP" <<'EOF'
const fs=require('fs'),crypto=require('crypto'),[out,input]=process.argv.slice(2);fs.writeFileSync(out,JSON.stringify({schemaVersion:1,status:'qualified',encryptedSha256:crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex'),downloadVerified:true}),{mode:0o600});
EOF
  node - "$CONFIG" <<'EOF'
const fs=require('fs');fs.writeFileSync(process.argv[2],JSON.stringify({schemaVersion:1,scope:'fixture',postgresMajor:13,recoveryPointAt:'2026-07-18T11:30:00.000Z',lastKnownWriteAt:'2026-07-18T12:00:00.000Z',repositoryAccessAllowed:false,networkAccessAllowed:false}),{mode:0o600});
EOF
}

rehearse() {
  node scripts/rehearse-disaster-recovery.mjs \
    --drill-id "${DRILL_ID:-fixture-drill-one}" \
    --bundle "$BUNDLE" --encrypted-backup "$BACKUP" --backup-receipt "$REMOTE" \
    --recovery-identity "$IDENTITY" --recovery-config "$CONFIG" \
    --adapter scripts/tests/fixtures/phase9-disaster-recovery-adapter.mjs \
    --salvage-output "$SALVAGE" --receipt "$RECEIPT" --now "$NOW"
}

@test "clean-host recovery produces owner-only RTO RPO and retained salvage evidence" {
  run rehearse
  [ "$status" -eq 0 ]
  [ "$(stat -c %a "$RECEIPT")" = 600 ]
  [ "$(stat -c %a "$SALVAGE")" = 600 ]
  node - "$RECEIPT" "$SALVAGE" <<'EOF'
const [r,s]=process.argv.slice(2).map(require);if(r.status!=='qualified'||r.scope!=='fixture'||r.productionAccessed||r.networkAccessed||r.measurements.rpoMilliseconds!==1800000||r.measurements.rtoMilliseconds>r.measurements.maximumRtoMilliseconds||r.limitations.qualifiesRealBackup||r.limitations.productionCutoverAuthorized||s.automaticDeletionAllowed||s.recoveryClosed||s.reconciliation.automaticMergePerformed)process.exit(1);
EOF
}

@test "every destructive-boundary interruption fails without qualification evidence" {
  for boundary in before-runtime-initialization before-database-restore before-application-activation; do
    rm -f "$RECEIPT" "$SALVAGE"
    run env PHASE9_FAILURE_BOUNDARY="$boundary" bash -c 'rehearse() { node scripts/rehearse-disaster-recovery.mjs --drill-id fixture-failure-drill --bundle "$1" --encrypted-backup "$2" --backup-receipt "$3" --recovery-identity "$4" --recovery-config "$5" --adapter scripts/tests/fixtures/phase9-disaster-recovery-adapter.mjs --salvage-output "$6" --receipt "$7" --now "2026-07-18T12:00:00.000Z"; }; rehearse "$@"' _ "$BUNDLE" "$BACKUP" "$REMOTE" "$IDENTITY" "$CONFIG" "$SALVAGE" "$RECEIPT"
    [ "$status" -ne 0 ]
    [ ! -e "$RECEIPT" ]
    [ ! -e "$SALVAGE" ]
  done
}

@test "emergency dump failure blocks before destructive restore" {
  run env PHASE9_EMERGENCY_DUMP_FAILURE=1 bash -c 'node scripts/rehearse-disaster-recovery.mjs --drill-id fixture-emergency-failure --bundle "$1" --encrypted-backup "$2" --backup-receipt "$3" --recovery-identity "$4" --recovery-config "$5" --adapter scripts/tests/fixtures/phase9-disaster-recovery-adapter.mjs --salvage-output "$6" --receipt "$7"' _ "$BUNDLE" "$BACKUP" "$REMOTE" "$IDENTITY" "$CONFIG" "$SALVAGE" "$RECEIPT"
  [ "$status" -ne 0 ]
  [ ! -e "$RECEIPT" ]
}

@test "missing corrupt or unverified independent artifacts fail closed" {
  rm "$IDENTITY"
  run rehearse
  [ "$status" -ne 0 ]
  printf 'AGE-SECRET-KEY-fixture-only\n' >"$IDENTITY"; chmod 600 "$IDENTITY"
  printf 'corrupt' >>"$BACKUP"
  run rehearse
  [ "$status" -ne 0 ]
  [ ! -e "$RECEIPT" ]
}

@test "missing environment upload asset or JWT content fails clean-host verification" {
  for object in .env-prod data/uploads/fixture.txt assets/fixture.txt jwt_private jwt_public; do
    node -e 'const fs=require("fs"),p=process.argv[1],v=JSON.parse(fs.readFileSync(p));delete v.objects[process.argv[2]];fs.writeFileSync(p,JSON.stringify(v));fs.chmodSync(p,0o600)' "$BACKUP" "$object"
    node - "$REMOTE" "$BACKUP" <<'EOF'
const fs=require('fs'),crypto=require('crypto'),[out,input]=process.argv.slice(2),v=JSON.parse(fs.readFileSync(out));v.encryptedSha256=crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex');fs.writeFileSync(out,JSON.stringify(v));fs.chmodSync(out,0o600);
EOF
    run rehearse
    [ "$status" -ne 0 ]
    [ ! -e "$RECEIPT" ]
    setup
  done
}

@test "wrong recovery key and corrupt release fail before qualification" {
  printf 'wrong fixture key\n' >"$IDENTITY"
  run rehearse
  [ "$status" -ne 0 ]
  setup
  printf '{"fixture":"corrupt"}\n' >"$BUNDLE/release-manifest.json"
  run rehearse
  [ "$status" -ne 0 ]
  [ ! -e "$RECEIPT" ]
}

@test "PostgreSQL mismatch unsafe isolation and excessive RPO fail before adapter" {
  for expression in \
    'v.postgresMajor=14' \
    'v.networkAccessAllowed=true' \
    'v.repositoryAccessAllowed=true' \
    'v.lastKnownWriteAt="2026-07-18T13:00:01.000Z"'; do
    node -e "const fs=require('fs'),p=process.argv[1],v=require(p);$expression;fs.writeFileSync(p,JSON.stringify(v));fs.chmodSync(p,0o600)" "$CONFIG"
    run rehearse
    [ "$status" -ne 0 ]
    setup
  done
}

@test "inputs must be independently stored and owner-only" {
  cp "$IDENTITY" "$(dirname "$BACKUP")/age.key"
  IDENTITY="$(dirname "$BACKUP")/age.key"
  run rehearse
  [ "$status" -ne 0 ]
  IDENTITY="$ROOT/identity/age.key"
  chmod 644 "$CONFIG"
  run rehearse
  [ "$status" -ne 0 ]
}

@test "qualification and salvage evidence are never overwritten" {
  rehearse >/dev/null
  before="$(sha256sum "$RECEIPT" "$SALVAGE")"
  run rehearse
  [ "$status" -ne 0 ]
  [ "$before" = "$(sha256sum "$RECEIPT" "$SALVAGE")" ]
}

@test "policy fails closed when fixture isolation or recovery safeguards weaken" {
  run node scripts/validate-phase9-disaster-recovery-policy.mjs
  [ "$status" -eq 0 ]
  cp config/phase9-disaster-recovery-policy.json "$ROOT/policy.json"
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.networkAccessAllowed=true;fs.writeFileSync(p,JSON.stringify(v))' "$ROOT/policy.json"
  run node scripts/validate-phase9-disaster-recovery-policy.mjs --policy "$ROOT/policy.json"
  [ "$status" -ne 0 ]
}

@test "program qualification requires two distinct drills and complete failure injection" {
  DRILL_ID=fixture-drill-one rehearse >/dev/null
  first="$RECEIPT"
  RECEIPT="$ROOT/result/qualification-two.json"
  SALVAGE="$ROOT/evidence/salvage-two.json"
  DRILL_ID=fixture-drill-two rehearse >/dev/null
  second="$RECEIPT"
  matrix="$ROOT/evidence/failure-matrix.json"
  program="$ROOT/result/program.json"
  node - "$matrix" <<'EOF'
const fs=require('fs'),passed=id=>({id,status:'passed'});fs.writeFileSync(process.argv[2],JSON.stringify({schemaVersion:1,status:'passed',productionAccessed:false,networkAccessed:false,destructiveBoundaries:['before-runtime-initialization','before-database-restore','before-application-activation'].map(passed),missingFixtures:['release','backup','recovery-key','environment','upload','jwt'].map(passed),emergencyDumpFailure:'passed',postgresMismatch:'passed'}),{mode:0o600});
EOF
  run node scripts/qualify-phase9-disaster-recovery.mjs --drill-one "$first" \
    --drill-two "$second" --failure-matrix "$matrix" --output "$program" --now "$NOW"
  [ "$status" -eq 0 ]
  [ "$(stat -c %a "$program")" = 600 ]
  node -e 'const r=require(process.argv[1]);if(r.status!=="qualified"||r.result.successfulDrills!==2||!r.result.failureInjectionComplete||!r.result.fixtureOnly||r.result.qualifiesRealBackup||r.result.productionCutoverAuthorized)process.exit(1)' "$program"

  rm "$program"
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.missingFixtures.pop();fs.writeFileSync(p,JSON.stringify(v));fs.chmodSync(p,0o600)' "$matrix"
  run node scripts/qualify-phase9-disaster-recovery.mjs --drill-one "$first" \
    --drill-two "$second" --failure-matrix "$matrix" --output "$program"
  [ "$status" -ne 0 ]
  [ ! -e "$program" ]
}
