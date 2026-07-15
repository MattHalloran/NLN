#!/usr/bin/env bats

setup() {
    WORK="$BATS_TEST_TMPDIR/clean-checkout-$BATS_TEST_NUMBER"
    mkdir -p "$WORK"
    COMMIT=$(git rev-parse HEAD)
    NOW_ONE="2026-01-01T00:00:00.000Z"
    NOW_TWO="2026-01-01T00:01:00.000Z"
    for run in one two; do
        now_var="NOW_${run^^}"
        cat >"$WORK/$run.md" <<EOF
# Validation Receipt

Generated: ${!now_var}
Commit: $COMMIT
Branch:
Worktree: clean
Validation command: yarn validate:trusted

## Artifact Check

All required artifacts for the declared validation command are present and fresh.
EOF
        chmod 600 "$WORK/$run.md"
    done
}

qualify() {
    run node scripts/qualify-clean-checkout.mjs \
        --commit "$COMMIT" \
        --receipt-one "$WORK/one.md" \
        --receipt-two "$WORK/two.md" \
        --output "$WORK/qualified.json"
}

@test "two distinct exact-commit trusted validation receipts qualify clean checkouts" {
    qualify
    [ "$status" -eq 0 ]
    [ "$(stat -c %a "$WORK/qualified.json")" = 600 ]
    node -e 'const r=require(process.argv[1]);if(r.status!=="success"||r.commit!==process.argv[2]||r.trustedGateRuns!==2||r.validationReceipts.length!==2||new Set(r.validationReceipts.map(x=>x.sha256)).size!==2)process.exit(1)' "$WORK/qualified.json" "$COMMIT"
}

@test "wrong commit dirty incomplete reused and unsafe receipts fail closed" {
    sed -i "s/$COMMIT/$(printf 'f%.0s' {1..40})/" "$WORK/two.md"
    qualify
    [ "$status" -ne 0 ]
    sed -i "s/$(printf 'f%.0s' {1..40})/$COMMIT/" "$WORK/two.md"
    sed -i 's/Worktree: clean/Worktree: dirty/' "$WORK/two.md"
    qualify
    [ "$status" -ne 0 ]
    sed -i 's/Worktree: dirty/Worktree: clean/' "$WORK/two.md"
    sed -i '/All required artifacts/d' "$WORK/two.md"
    qualify
    [ "$status" -ne 0 ]
    run node scripts/qualify-clean-checkout.mjs --commit "$COMMIT" --receipt-one "$WORK/one.md" --receipt-two "$WORK/one.md" --output "$WORK/reused.json"
    [ "$status" -ne 0 ]
    chmod 644 "$WORK/one.md"
    run node scripts/qualify-clean-checkout.mjs --commit "$COMMIT" --receipt-one "$WORK/one.md" --receipt-two "$WORK/two.md" --output "$WORK/unsafe.json"
    [ "$status" -ne 0 ]
}

@test "qualification output is immutable and help is side-effect free" {
    qualify
    [ "$status" -eq 0 ]
    qualify
    [ "$status" -ne 0 ]
    run node scripts/qualify-clean-checkout.mjs --help
    [ "$status" -eq 0 ]
    [[ "$output" == *"--receipt-one FILE"* ]]
}
