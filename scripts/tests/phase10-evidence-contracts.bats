#!/usr/bin/env bats
setup(){ WORK="$BATS_TEST_TMPDIR/p10-contract-$BATS_TEST_NUMBER";mkdir -p "$WORK";NOW=2026-01-10T00:00:00.000Z;H=$(printf 'a%.0s' {1..64});echo '{"status":"ok"}' >"$WORK/copy1.json";cp "$WORK/copy1.json" "$WORK/copy2.json";cp "$WORK/copy1.json" "$WORK/copy3.json";cat >"$WORK/publication.json" <<EOF
{"schemaVersion":1,"receiptType":"nln-runtime-state-remote-publication","status":"success","sourceArchiveSha256":"$H"}
EOF
cat >"$WORK/capability.json" <<EOF
{"schemaVersion":1,"receiptType":"remote-provider-capability","status":"success","scope":"fixture","providerId":"fixture-provider","policySha256":"$H","observedAt":"2026-01-09T23:00:00.000Z","expiresAt":"2026-01-11T00:00:00.000Z","capabilities":[{"id":"tls","status":"verified","evidenceSha256":"$H"},{"id":"versioning-or-object-lock","status":"verified","evidenceSha256":"$H"},{"id":"server-side-encryption","status":"verified","evidenceSha256":"$H"},{"id":"credential-separation","status":"verified","evidenceSha256":"$H"},{"id":"retention-configuration","status":"verified","evidenceSha256":"$H"}]}
EOF
}
@test "legacy key-value reader preserves explicit assurance limitation" { echo -e 'status=passed\ncommit=abc' >"$WORK/legacy";run node --input-type=module - "$WORK/legacy" <<'EOF'
import {readLegacyKeyValueReceipt}from'./scripts/lib/legacy-receipts.mjs';const r=readLegacyKeyValueReceipt(process.argv[2]);if(r.assurance!=="legacy-discovery-only"||!r.assuranceLimit.includes("cannot qualify"))process.exit(1);
EOF
[ "$status" -eq 0 ]; }
@test "provider assertions require exact capability evidence" { run node scripts/qualify-remote-evidence.mjs publication --publication-receipt "$WORK/publication.json" --capability-receipt "$WORK/capability.json" --output "$WORK/qualified.json" --now "$NOW";[ "$status" -eq 0 ];grep -q '"resilienceQualified": false' "$WORK/qualified.json";sed -i 's/"status":"verified"/"status":"advisory"/' "$WORK/capability.json";run node scripts/qualify-remote-evidence.mjs publication --publication-receipt "$WORK/publication.json" --capability-receipt "$WORK/capability.json" --output "$WORK/bad.json" --now "$NOW";[ "$status" -ne 0 ]; }
@test "publication does not imply resilience and 3-2-1 is separately evidenced" { cat >"$WORK/copies.json" <<EOF
{"schemaVersion":1,"scope":"fixture","copies":[{"copyId":"one","locationId":"host","mediaType":"disk","offsite":false,"archiveSha256":"$H","evidencePath":"$WORK/copy1.json"},{"copyId":"two","locationId":"workstation","mediaType":"disk","offsite":true,"archiveSha256":"$H","evidencePath":"$WORK/copy2.json"},{"copyId":"three","locationId":"provider","mediaType":"object-storage","offsite":true,"archiveSha256":"$H","evidencePath":"$WORK/copy3.json"}]}
EOF
run node scripts/qualify-remote-evidence.mjs resilience --copies "$WORK/copies.json" --output "$WORK/resilience.json" --now "$NOW";[ "$status" -eq 0 ];grep -q 'runtime-state-resilience-qualification' "$WORK/resilience.json"; }
