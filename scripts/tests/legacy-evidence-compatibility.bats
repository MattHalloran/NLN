#!/usr/bin/env bats
setup() {
  WORK="$BATS_TEST_TMPDIR/legacy-evidence-$BATS_TEST_NUMBER"; mkdir -p "$WORK"; COMMIT=$(printf 'a%.0s' {1..40}); H=$(printf 'b%.0s' {1..64})
  node --input-type=module - "$WORK/identity.json" "$COMMIT" "$H" <<'EOF'
import fs from'node:fs';import{createReleaseIdentity}from'./scripts/lib/release-identity.mjs';const[o,c,h]=process.argv.slice(2);fs.writeFileSync(o,JSON.stringify(createReleaseIdentity({releaseVersion:'10.0.0',commitSha:c,repositoryId:'nln/fixture',trustedManifestId:'trusted-v1',trustedManifestSha256:h,immutablePolicyId:'immutable-v1',immutablePolicySha256:h,bundleManifestSha256:h,environmentSchemaSha256:h,migrationMetadataSha256:h,createdAt:'2026-01-01T00:00:00.000Z',scope:'fixture'})),{mode:0o600});
EOF
}

@test "legacy key-value evidence stays unmodified and non-qualifying" {
  printf 'status=passed\ncommit=legacy\n' >"$WORK/legacy.receipt"; before=$(sha256sum "$WORK/legacy.receipt")
  run node scripts/verify-legacy-release-evidence.mjs --format key-value --receipt "$WORK/legacy.receipt" --identity "$WORK/identity.json" --output "$WORK/verified.json" --now 2026-01-01T00:00:00.000Z
  [ "$status" -eq 0 ]; [ "$before" = "$(sha256sum "$WORK/legacy.receipt")" ]; node -e 'const r=require(process.argv[1]);if(r.result.qualifying||!r.result.assuranceLimit.includes("cannot qualify")||!r.result.originalUnmodified)process.exit(1)' "$WORK/verified.json"
  run node scripts/verify-release-receipt.mjs --receipt "$WORK/verified.json" --type legacy-evidence-compatibility-verification --scope fixture --version 10.0.0 --commit "$COMMIT"
  [ "$status" -eq 0 ]
}

@test "legacy JSON duplicate keys and output overwrite fail closed" {
  printf '{"status":"passed","status":"failed"}' >"$WORK/legacy.json"
  run node scripts/verify-legacy-release-evidence.mjs --format json --receipt "$WORK/legacy.json" --identity "$WORK/identity.json" --output "$WORK/no.json"
  [ "$status" -ne 0 ]; [ ! -e "$WORK/no.json" ]
  printf '{"status":"passed"}' >"$WORK/legacy.json"; echo keep >"$WORK/no.json"
  run node scripts/verify-legacy-release-evidence.mjs --format json --receipt "$WORK/legacy.json" --identity "$WORK/identity.json" --output "$WORK/no.json"
  [ "$status" -ne 0 ]; [ "$(cat "$WORK/no.json")" = keep ]
}
