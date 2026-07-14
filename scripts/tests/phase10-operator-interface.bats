#!/usr/bin/env bats
setup() {
  ROOT="$BATS_TEST_TMPDIR/p10-$BATS_TEST_NUMBER"; mkdir -p "$ROOT/evidence"; NOW=$(date -u +%Y-%m-%dT%H:%M:%S.000Z); COMMIT=$(printf 'a%.0s' {1..40}); H=$(printf 'b%.0s' {1..64})
  node --input-type=module - "$ROOT/identity.json" "$COMMIT" "$H" <<'EOF'
import fs from 'node:fs';import {createReleaseIdentity} from './scripts/lib/release-identity.mjs';const [out,commit,h]=process.argv.slice(2);fs.writeFileSync(out,JSON.stringify(createReleaseIdentity({releaseVersion:'10.0.0',commitSha:commit,trustedManifestId:'trusted-v1',trustedManifestSha256:h,bundleManifestSha256:h,environmentSchemaSha256:h,migrationMetadataSha256:h})));
EOF
  cat > "$ROOT/migration.json" <<'EOF'
{"schemaVersion":1,"releaseVersion":"10.0.0","classification":"backward-compatible","rationale":"additive fixture migration","rollbackStrategy":"retain expanded schema safely","testedPostgresMajors":[13],"expectedDurationSeconds":5,"expectedAffectedRows":{"maximum":10,"basis":"fixture limit"},"lockRisk":"low","transactionStrategy":"single transaction","diskSpaceRequiredBytes":100,"specialDeploymentPlan":null,"migrations":[{"id":"20260101000000_expand","phase":"expand","classification":"backward-compatible","rationale":"adds fixture column safely","backfill":null}]}
EOF
  cat > "$ROOT/evidence/trusted.json" <<EOF
{"schemaVersion":1,"receiptType":"trusted-validation-gate","status":"success","scope":"fixture","release":{"version":"10.0.0","commit":"$COMMIT"},"finishedAt":"$NOW"}
EOF
  cat > "$ROOT/components.json" <<EOF
{"schemaVersion":1,"components":[{"receiptType":"trusted-validation-gate","path":"$ROOT/evidence/trusted.json","stage":"trusted","maximumAgeSeconds":86400}]}
EOF
  cat > "$ROOT/context.json" <<'EOF'
{"fixture":true,"production":false,"releaseVersion":"10.0.0"}
EOF
  export REDUCED_DOWNTIME_FIXTURE_STATE="$ROOT/state.json"
  cat > "$REDUCED_DOWNTIME_FIXTURE_STATE" <<'EOF'
{"services":{"db":{"containerId":"db-1","volumeIds":["db-volume"],"healthy":true},"redis":{"containerId":"redis-1","volumeIds":["redis-volume"],"healthy":true}},"writeSentinel":"preserve-me","log":[]}
EOF
}
prepare_release(){ run node scripts/release.mjs prepare --identity "$ROOT/identity.json" --components "$ROOT/components.json" --migration-metadata "$ROOT/migration.json" --index "$ROOT/evidence/release.index.json" --receipt "$ROOT/evidence/prepare.json" --now "$NOW"; }
@test "all candidate help paths are side-effect free" { before=$(find "$ROOT" -type f | sort); for args in "--help" "prepare --help" "verify-backup --help" "deploy --help" "rollback-app --help" "status --help" "evidence verify --help"; do run node scripts/release.mjs $args; [ "$status" -eq 0 ]; done; after=$(find "$ROOT" -type f | sort); [ "$before" = "$after" ]; }
@test "prepare creates immutable recursively verifiable evidence" { prepare_release; [ "$status" -eq 0 ]; [ "$(stat -c %a "$ROOT/evidence/prepare.json")" = 600 ]; run node scripts/release.mjs evidence verify --index "$ROOT/evidence/release.index.json" --now "$NOW"; [ "$status" -eq 0 ]; }
@test "component swapping is rejected" { prepare_release; echo '{}' > "$ROOT/evidence/trusted.json"; run node scripts/release.mjs evidence verify --index "$ROOT/evidence/release.index.json" --now "$NOW"; [ "$status" -ne 0 ]; [[ "$output" == *"hash mismatch"* ]]; }
@test "deploy defaults to a zero-mutation plan bound to prepare" { prepare_release; run node scripts/release.mjs deploy --prepare "$ROOT/evidence/prepare.json" --index "$ROOT/evidence/release.index.json" --receipt "$ROOT/evidence/deploy.json" --now "$NOW"; [ "$status" -eq 0 ]; node -e 'const r=require(process.argv[1]);if(r.status!=="planned"||r.productionMutation||r.databaseMutationOccurred)process.exit(1)' "$ROOT/evidence/deploy.json"; }
@test "full fixture prepare deploy and evidence workflow succeeds" { prepare_release;ID=$(node -e 'process.stdout.write(require(process.argv[1]).release.releaseId)' "$ROOT/evidence/prepare.json");run node scripts/release.mjs deploy --prepare "$ROOT/evidence/prepare.json" --index "$ROOT/evidence/release.index.json" --receipt "$ROOT/evidence/deploy.json" --execute --fixture --confirm "DEPLOY-FIXTURE-$ID" --adapter scripts/tests/fixtures/reduced-downtime-adapter.mjs --context "$ROOT/context.json" --now "$NOW";[ "$status" -eq 0 ];node -e 'const r=require(process.argv[1]);if(r.status!=="success"||r.productionMutation||r.databaseMutationOccurred||r.failure)process.exit(1)' "$ROOT/evidence/deploy.json";run node scripts/release.mjs evidence verify --index "$ROOT/evidence/release.index.json" --now "$NOW";[ "$status" -eq 0 ]; }
@test "post-activation failure emits actionable top-level diagnostic evidence" { prepare_release;ID=$(node -e 'process.stdout.write(require(process.argv[1]).release.releaseId)' "$ROOT/evidence/prepare.json");node -e 'const fs=require("fs"),p=process.argv[1],s=require(p);s.failOperation="health";fs.writeFileSync(p,JSON.stringify(s))' "$REDUCED_DOWNTIME_FIXTURE_STATE";run node scripts/release.mjs deploy --prepare "$ROOT/evidence/prepare.json" --index "$ROOT/evidence/release.index.json" --receipt "$ROOT/evidence/deploy-failed.json" --execute --fixture --confirm "DEPLOY-FIXTURE-$ID" --adapter scripts/tests/fixtures/reduced-downtime-adapter.mjs --context "$ROOT/context.json" --now "$NOW";[ "$status" -ne 0 ];node -e 'const r=require(process.argv[1]);if(r.status!=="failed"||!r.failure.applicationMutationBegan||r.failure.databaseMutationOccurred||!r.failure.safestNextAction)process.exit(1)' "$ROOT/evidence/deploy-failed.json";[[ "$output" == *"Application mutation began: yes"* ]];[[ "$output" == *"Evidence:"* ]]; }
@test "candidate production execution fails closed" { run node scripts/release.mjs deploy --production --prepare x --index x --receipt x; [ "$status" -ne 0 ]; [[ "$output" == *"Phase 11 cutover has not occurred"* ]]; [ ! -e x ]; }
@test "wrong release and stale evidence are rejected" { sed -i 's/10.0.0/9.0.0/' "$ROOT/evidence/trusted.json"; prepare_release; [ "$status" -ne 0 ]; sed -i 's/9.0.0/10.0.0/' "$ROOT/evidence/trusted.json"; run node scripts/release.mjs prepare --identity "$ROOT/identity.json" --components "$ROOT/components.json" --migration-metadata "$ROOT/migration.json" --index "$ROOT/evidence/old.index.json" --receipt "$ROOT/evidence/old.prepare.json" --now 2030-01-01T00:00:00.000Z; [ "$status" -ne 0 ]; }
@test "registries are strict and generated reference has no drift" { run node scripts/validate-phase10-contracts.mjs; [ "$status" -eq 0 ]; run node scripts/generate-operator-reference.mjs --check; [ "$status" -eq 0 ]; }
