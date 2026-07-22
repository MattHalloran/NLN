#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'
SCRIPT="$BATS_TEST_DIRNAME/../verify-runtime-state-database-invariants.mjs"
CONTRACT="$BATS_TEST_DIRNAME/../../config/runtime-state-database-invariants.json"
setup() {
    EXPECTED="$BATS_TMPDIR/expected-$BATS_TEST_NUMBER.json"
    OBSERVED="$BATS_TMPDIR/observed-$BATS_TEST_NUMBER.json"
    RECEIPT="$BATS_TMPDIR/receipt-$BATS_TEST_NUMBER/result.json"
    printf '%s\n' '{"schemaVersion":1,"factsType":"nln-runtime-state-database-facts","postgresServerVersion":"16.4","appliedMigrations":["001_init","002_uploads"],"tables":["migrations","uploads","users"],"safeRowCounts":{"uploads":3,"users":2},"checks":{"foreign_keys_valid":true,"upload_references_valid":true}}' >"$EXPECTED"
    cp "$EXPECTED" "$OBSERVED"
    chmod 600 "$EXPECTED" "$OBSERVED"
}
verify_facts() { node "$SCRIPT" --expected "$EXPECTED" --observed "$OBSERVED" --contract "$CONTRACT" --receipt "$RECEIPT"; }
mutate() {
    node -e 'const fs=require("fs"),p=process.argv[1],v=require(p); eval(process.argv[2]); fs.writeFileSync(p,JSON.stringify(v))' "$OBSERVED" "$1"
    chmod 600 "$OBSERVED"
}
@test "matching restored database facts produce owner-only hash-bound evidence" {
    run verify_facts
    [ "$status" -eq 0 ]
    assert_output --partial "invariants verified"
    [ "$(stat -c %a "$RECEIPT")" = 600 ]
    [ "$(stat -c %a "$(dirname "$RECEIPT")")" = 700 ]
    run node -e 'const r=require(process.argv[1]); if(r.status!=="passed" || !/^[a-f0-9]{64}$/.test(r.expectedSha256)) process.exit(1)' "$RECEIPT"
    [ "$status" -eq 0 ]
}
@test "wrong PostgreSQL major and migrations fail closed" {
    mutate 'v.postgresServerVersion="15.9"'
    run verify_facts
    [ "$status" -ne 0 ]
    assert_output --partial "major version does not match"
    [ ! -e "$RECEIPT" ]
    cp "$EXPECTED" "$OBSERVED"; chmod 600 "$OBSERVED"
    mutate 'v.appliedMigrations=["001_init"]'
    run verify_facts
    [ "$status" -ne 0 ]
    assert_output --partial "migrations do not match"
}
@test "missing or unexpected restored tables fail closed" {
    mutate 'v.tables=["migrations","users"]'
    run verify_facts
    [ "$status" -ne 0 ]
    assert_output --partial "required table is missing: uploads"
    cp "$EXPECTED" "$OBSERVED"; chmod 600 "$OBSERVED"
    mutate 'v.tables.push("zzz_unexpected")'
    run verify_facts
    [ "$status" -ne 0 ]
    assert_output --partial "unexpected facts"
}
@test "changed row counts and failed integrity checks fail closed" {
    mutate 'v.safeRowCounts.users=1'
    run verify_facts
    [ "$status" -ne 0 ]
    assert_output --partial "row-count invariants do not match"
    cp "$EXPECTED" "$OBSERVED"; chmod 600 "$OBSERVED"
    mutate 'v.checks.foreign_keys_valid=false'
    run verify_facts
    [ "$status" -ne 0 ]
    assert_output --partial "integrity check failed: foreign_keys_valid"
}
@test "malformed insecure symlinked and weakened evidence is rejected" {
    chmod 644 "$OBSERVED"
    run verify_facts
    [ "$status" -ne 0 ]
    assert_output --partial "must be owner-only"
    chmod 600 "$OBSERVED"
    ln -s "$OBSERVED" "$BATS_TMPDIR/link-$BATS_TEST_NUMBER.json"
    run node "$SCRIPT" --expected "$EXPECTED" --observed "$BATS_TMPDIR/link-$BATS_TEST_NUMBER.json" --contract "$CONTRACT"
    [ "$status" -ne 0 ]
    assert_output --partial "must be a regular file"
    WEAK="$BATS_TMPDIR/weak-$BATS_TEST_NUMBER.json"; cp "$CONTRACT" "$WEAK"
    node -e 'const fs=require("fs"),p=process.argv[1],v=require(p); v.comparison.allChecksMustBeTrue=false; fs.writeFileSync(p,JSON.stringify(v))' "$WEAK"
    run node "$SCRIPT" --expected "$EXPECTED" --observed "$OBSERVED" --contract "$WEAK"
    [ "$status" -ne 0 ]
    assert_output --partial "weakened invariant contract"
}
@test "receipts are never overwritten" {
    mkdir -p "$(dirname "$RECEIPT")"; printf 'existing\n' >"$RECEIPT"
    run verify_facts
    [ "$status" -ne 0 ]
    [ "$(cat "$RECEIPT")" = existing ]
}
