#!/usr/bin/env bats
setup() { WORK="$BATS_TEST_TMPDIR/trace-$BATS_TEST_NUMBER"; mkdir -p "$WORK"; }

@test "deployment traceability covers receipts and freezes production entrypoints" {
  run node scripts/validate-deployment-traceability.mjs
  [ "$status" -eq 0 ]
  [[ "$output" == *"receipt flows"* ]]
}

@test "deployment traceability rejects a changed production entrypoint identity" {
  cp config/deployment-traceability.json "$WORK/inventory.json"
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.frozenProductionEntrypoints[0].sha256="0".repeat(64);fs.writeFileSync(p,JSON.stringify(v))' "$WORK/inventory.json"
  run node scripts/validate-deployment-traceability.mjs --inventory "$WORK/inventory.json"
  [ "$status" -ne 0 ]
  [[ "$output" == *"production entrypoint changed outside Phase 11"* ]]
}

@test "traceability validator help is side-effect free" {
  before=$(sha256sum config/deployment-traceability.json)
  run node scripts/validate-deployment-traceability.mjs --help
  [ "$status" -eq 0 ]
  [ "$before" = "$(sha256sum config/deployment-traceability.json)" ]
}
