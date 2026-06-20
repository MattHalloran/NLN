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

report_matches "Raw REST version strings found outside shared route definitions:" \
    bash -c "grep -RInF --exclude-dir=node_modules --exclude-dir=dist \
        --include='*.ts' --include='*.tsx' --include='*.sh' \
        '/api/rest/v1' packages/server/src packages/ui/src e2e scripts | \
        grep -v 'packages/shared/src/api/routes.ts' | \
        grep -v 'packages/shared/src/api/contracts.ts' | \
        grep -v 'packages/server/src/rest/[^/]*\\.ts' | \
        grep -v 'packages/server/src/rest/[^/]*\\.test\\.ts' | \
        grep -v 'packages/server/src/rest/[^/]*\\.integration\\.test\\.ts' | \
        grep -v 'e2e/fixtures/runtime-guard.ts' | \
        grep -v 'scripts/check-source-drift.sh'"

report_matches "Raw app route literals found in app/stable e2e code; use APP_LINKS instead:" \
    bash -c "grep -RInE --exclude-dir=node_modules --exclude-dir=dist \
        --include='*.ts' --include='*.tsx' \
        '\"(/admin|/login|/gallery|/about)([^\"]*)\"' packages/ui/src e2e/admin/stable e2e/fixtures 2>/dev/null | \
        grep -v '\\.test\\.tsx\\?:' | \
        grep -v 'packages/ui/src/sitemap.ts' | \
        grep -v 'packages/ui/src/sw-template.js' | \
        grep -v 'packages/ui/src/utils/openLink.test.ts'"

report_matches "Direct fetch calls found in UI app code; use api/rest/client unless this is service-worker/bootstrap code:" \
    bash -c "grep -RInE --exclude-dir=node_modules --exclude-dir=dist \
        --include='*.ts' --include='*.tsx' --include='*.js' \
        '\\bfetch\\(' packages/ui/src | \
        grep -v 'packages/ui/src/api/rest/client.ts' | \
        grep -v 'packages/ui/src/utils/csrf.ts' | \
        grep -v 'packages/ui/src/utils/errorMonitoring.ts' | \
        grep -v 'packages/ui/src/serviceWorkerRegistration.ts' | \
        grep -v 'packages/ui/src/sw-template.js'"

if [ "${failures}" -gt 0 ]; then
    exit 1
fi

echo "Source drift checks passed."
