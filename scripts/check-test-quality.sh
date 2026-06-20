#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

failures=0

report_matches() {
    local label="$1"
    shift
    local matches
    matches=$("$@" || true)
    if [ -n "${matches}" ]; then
        echo "${label}" >&2
        echo "${matches}" >&2
        failures=$((failures + 1))
    fi
}

cd "${ROOT_DIR}"

report_matches "Focused tests found; remove .only before committing:" \
    grep -RInE --exclude-dir=node_modules --exclude-dir=dist \
        '\b(describe|it|test)\.only\b' packages e2e

report_matches "Disabled unit tests found; prefer fixing, deleting, or documenting through an explicit legacy suite:" \
    grep -RInE --exclude-dir=node_modules --exclude-dir=dist \
        --include='*.test.ts' --include='*.test.tsx' \
        '\b(describe|it|test)\.skip\b' packages

report_matches "Merge-gated E2E specs/support should not use fixed sleeps; wait for locators, URLs, responses, or app state:" \
    grep -RIn --exclude-dir=legacy --exclude-dir=node_modules \
        'waitForTimeout' e2e

report_matches "Merge-gated E2E specs/support should avoid broad networkidle waits; wait for visible UI or specific responses instead:" \
    grep -RIn --exclude-dir=legacy --exclude-dir=node_modules \
        'waitForLoadState("networkidle' e2e

report_matches "Merge-gated E2E specs/support should not skip at runtime; move data-dependent coverage to legacy or integration tests:" \
    grep -RInE --exclude-dir=legacy --exclude-dir=node_modules \
        '\btest\.skip\b' e2e

report_matches "Merge-gated E2E specs/support should avoid parent-traversal selectors; add accessible labels or data-testid seams:" \
    grep -RInE --exclude-dir=legacy --exclude-dir=node_modules \
        "\\.locator\\(['\"]\\.\\.['\"]\\)" e2e

report_matches "Stable E2E specs should use guarded fixtures instead of importing Playwright's base test:" \
    grep -RInE --include='*.spec.ts' \
        'import[[:space:]]+.*\{[^}]*\btest\b[^}]*\}[[:space:]]+from[[:space:]]+["@'"'"']@playwright/test["@'"'"']' \
        e2e/admin/stable

if [ "${failures}" -gt 0 ]; then
    exit 1
fi

echo "Test quality checks passed."
