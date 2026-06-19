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
    git grep -n "/api/rest/v1" -- packages/server/src packages/ui/src e2e scripts \
        ':!packages/shared/src/api/routes.ts' \
        ':!packages/shared/src/api/contracts.ts' \
        ':!packages/server/src/rest/*.ts' \
        ':!packages/server/src/rest/*.test.ts' \
        ':!packages/server/src/rest/*.integration.test.ts' \
        ':!scripts/check-source-drift.sh'

report_matches "Raw app route literals found in app/stable e2e code; use APP_LINKS instead:" \
    git grep -nE '"(/admin|/login|/gallery|/about)([^"]*)"' -- \
        packages/ui/src \
        e2e/admin/stable \
        e2e/fixtures \
        e2e/pages \
        ':!*.test.ts' \
        ':!*.test.tsx' \
        ':!packages/ui/src/sitemap.ts' \
        ':!packages/ui/src/sw-template.js' \
        ':!packages/ui/src/utils/openLink.test.ts'

report_matches "Direct fetch calls found in UI app code; use api/rest/client unless this is service-worker/bootstrap code:" \
    git grep -nE '\bfetch\(' -- packages/ui/src \
        ':!packages/ui/src/api/rest/client.ts' \
        ':!packages/ui/src/utils/csrf.ts' \
        ':!packages/ui/src/utils/errorMonitoring.ts' \
        ':!packages/ui/src/serviceWorkerRegistration.ts' \
        ':!packages/ui/src/sw-template.js'

if [ "${failures}" -gt 0 ]; then
    exit 1
fi

echo "Source drift checks passed."
