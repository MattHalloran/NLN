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
    git grep -nE '\b(describe|it|test)\.only\b' -- \
        'packages/**' \
        'e2e/**' \
        ':!**/node_modules/**' \
        ':!**/dist/**'

report_matches "Disabled unit tests found; prefer fixing, deleting, or documenting through an explicit legacy suite:" \
    git grep -nE '\b(describe|it|test)\.skip\b' -- \
        'packages/**/*.test.ts' \
        'packages/**/*.test.tsx' \
        ':!**/node_modules/**' \
        ':!**/dist/**'

report_matches "Merge-gated E2E specs/support should not use fixed sleeps; wait for locators, URLs, responses, or app state:" \
    git grep -n 'waitForTimeout' -- \
        'e2e/**' \
        ':!e2e/admin/legacy/**' \
        ':!**/node_modules/**'

report_matches "Merge-gated E2E specs/support should avoid broad networkidle waits; wait for visible UI or specific responses instead:" \
    git grep -n 'waitForLoadState("networkidle' -- \
        'e2e/**' \
        ':!e2e/admin/legacy/**' \
        ':!**/node_modules/**'

report_matches "Merge-gated E2E specs/support should not skip at runtime; move data-dependent coverage to legacy or integration tests:" \
    git grep -nE '\btest\.skip\b' -- \
        'e2e/**' \
        ':!e2e/admin/legacy/**' \
        ':!**/node_modules/**'

report_matches "Merge-gated E2E specs/support should avoid parent-traversal selectors; add accessible labels or data-testid seams:" \
    git grep -nE "\\.locator\\(['\"]\\.\\.['\"]\\)" -- \
        'e2e/**' \
        ':!e2e/admin/legacy/**' \
        ':!**/node_modules/**'

if [ "${failures}" -gt 0 ]; then
    exit 1
fi

echo "Test quality checks passed."
