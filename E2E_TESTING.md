# End-to-End Testing

Playwright covers browser-level admin and PWA behavior. The default E2E command is intentionally small; broader suites have explicit names.

## Commands

```bash
# Stable smoke check: one contact-info admin spec
yarn test:e2e
yarn test:e2e:smoke

# Stable admin regression suite: e2e/admin/stable/*-simple.spec.ts
yarn test:e2e:admin
yarn test:e2e:stable

# Legacy admin suite only
yarn test:e2e:legacy

# Full admin suite, including legacy/brittle specs
yarn test:e2e:full

# PWA production-build browser checks
yarn test:pwa

# Development helpers
yarn test:e2e:ui
yarn test:e2e:headed
yarn test:e2e:debug
yarn test:e2e:report
```

## Config Files

- `playwright.config.ts`: smoke suite.
- `playwright.admin.config.ts`: stable admin suite.
- `playwright.legacy.config.ts`: legacy admin suite.
- `playwright.full.config.ts`: all admin specs.
- `playwright.pwa.config.ts`: PWA tests against the production UI build.
- `playwright.shared.ts`: common admin E2E projects, web servers, reporters, retries, and artifact settings.

## Test Data

When Playwright starts the API through `scripts/start-e2e-server.sh`, the server uses `.e2e-runtime` as `PROJECT_DIR` by default, even if `.env` has a different `PROJECT_DIR`. The script copies `packages/server/src/data` into `.e2e-runtime/packages/server/src/data` before booting and points E2E setup/teardown at that runtime copy. Set `E2E_PROJECT_DIR` only when you intentionally want another disposable runtime directory.

That means normal Playwright runs do not mutate source data files. If you reuse an already-running server, Playwright cannot change that server's data location; make sure the server is already using disposable local data before running mutation-heavy specs.

## Authentication

`e2e/auth.setup.ts` logs in once with `ADMIN_EMAIL` and `ADMIN_PASSWORD`, then writes browser storage state to `e2e/.auth/admin.json`. Tests that need auth import `test` from `e2e/fixtures/auth.ts` and use `authenticatedPage`.

CI provides non-secret test credentials. Local runs can use values from `.env` or shell exports.

## Current Suite Shape

Stable admin specs live in `e2e/admin/stable`:

- `e2e/admin/stable/contact-info-simple.spec.ts`
- `e2e/admin/stable/hero-banner-simple.spec.ts`
- `e2e/admin/stable/seasonal-content-simple.spec.ts`

Legacy admin specs and their legacy-only page objects live in `e2e/admin/legacy` and remain available through `yarn test:e2e:full`, but they contain more timing and selector coupling. Treat failures there as useful regression signals, not as the primary merge gate until they are hardened.

## Stable vs Legacy Policy

Stable specs are the merge-gated browser suite. They should stay small, deterministic, and focused on workflows that need a real browser. `scripts/check-test-quality.sh` enforces the most important reliability rules for stable specs and non-legacy E2E support files.

Legacy specs are quarantined because they still contain data-dependent skips, fixed waits, broad `networkidle` waits, and DOM-structure selectors. When converting a legacy case to stable:

- Seed or create the data required by the spec.
- Replace fixed sleeps with locator, URL, response, or persisted-state waits.
- Prefer role/label queries and `data-testid` values over CSS classes or parent traversal.
- Move exhaustive CRUD cases to server integration tests when browser coverage adds little value.
- Delete the legacy case once the stable or integration replacement covers the same risk.

## Writing Reliable Specs

- Prefer role, label, text, and `data-testid` locators over CSS classes.
- Wait for visible UI, URL changes, network responses, or persisted API state.
- Avoid `waitForTimeout` except as a last-resort diagnostic.
- Use API/integration tests for exhaustive CRUD edge cases.
- Use E2E tests for critical user journeys and high-value smoke coverage.
- Keep each spec independent; create or isolate the data it needs.

## Reports

Playwright writes HTML reports under `playwright-report/<suite>` and JSON results under `test-results/<suite>.json` for admin and PWA suites. CI uploads these as artifacts.
