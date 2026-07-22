# End-to-End Testing

Playwright covers browser-level admin and PWA behavior. The default E2E command is intentionally small; broader suites have explicit names.

## Commands

```bash
# Stable smoke check: one contact-info admin spec
yarn test:e2e
yarn test:e2e:smoke

# Stable browser regression suite: e2e/admin/stable/*-simple.spec.ts
yarn test:e2e:admin
yarn test:e2e:stable

# Public accessibility checks with a dedicated report
yarn test:a11y

# Legacy admin suite only
yarn test:e2e:legacy

# Full admin suite, including legacy/brittle specs
yarn test:e2e:full

# PWA and public-route production-build browser checks
yarn test:pwa

# Representative public/admin smoke checks against the production UI build
yarn test:e2e:production

# Development helpers
yarn test:e2e:ui
yarn test:e2e:headed
yarn test:e2e:debug
yarn test:e2e:report
```

## Config Files

- `playwright.config.ts`: smoke suite.
- `playwright.admin.config.ts`: stable admin suite.
- `playwright.accessibility.config.ts`: public accessibility suite.
- `playwright.legacy.config.ts`: legacy admin suite.
- `playwright.full.config.ts`: all admin specs.
- `playwright.pwa.config.ts`: PWA and public-route smoke tests against the production UI build.
- `playwright.production.config.ts`: representative stable public/admin smoke specs against the production UI build.
- `playwright.shared.ts`: common admin E2E projects, web servers, reporters, retries, and artifact settings.

## Test Data

When Playwright starts the API through `scripts/start-e2e-server.sh`, it sets `E2E_MANAGE_SERVICES=true` and owns disposable PostgreSQL/Redis containers for the run. The server uses `.e2e-runtime` as `PROJECT_DIR` by default, even if `.env` has a different `PROJECT_DIR`. The script copies `packages/server/src/data` into `.e2e-runtime/packages/server/src/data` before booting and points E2E setup/teardown at that runtime copy. Set `E2E_PROJECT_DIR` only when you intentionally want another disposable runtime directory.

That means normal Playwright runs do not mutate source data files. If you reuse an already-running server, Playwright cannot change that server's data location; make sure the server is already using disposable local data before running mutation-heavy specs.

When `E2E_MANAGE_SERVICES=true`, `scripts/start-e2e-server.sh` removes the temporary PostgreSQL/Redis containers after the API process has shut down. The Playwright global teardown only removes those containers when `E2E_TEARDOWN_REMOVE_SERVICES=true` is explicitly set; this avoids stopping Redis while the API is still closing its Bull queues.

## Authentication

`e2e/auth.setup.ts` logs in once with `ADMIN_EMAIL` and `ADMIN_PASSWORD`, then writes browser storage state to `e2e/.auth/admin.json`. Tests that need auth import `test` from `e2e/fixtures/auth.ts` and use `authenticatedPage`.

CI provides non-secret test credentials. Local runs can use values from `.env` or shell exports.

## Current Suite Shape

Stable browser specs live in `e2e/admin/stable`:

- `e2e/admin/stable/contact-info-simple.spec.ts`
- `e2e/admin/stable/about-content-simple.spec.ts`
- `e2e/admin/stable/admin-gallery-simple.spec.ts`
- `e2e/admin/stable/hero-banner-simple.spec.ts`
- `e2e/admin/stable/newsletter-subscribers-simple.spec.ts`
- `e2e/admin/stable/public-account-flows-simple.spec.ts`
- `e2e/admin/stable/public-accessibility-simple.spec.ts`
- `e2e/admin/stable/public-gallery-simple.spec.ts`
- `e2e/admin/stable/public-smoke-simple.spec.ts`
- `e2e/admin/stable/public-visual-simple.spec.ts`
- `e2e/admin/stable/seasonal-content-simple.spec.ts`

The stable browser suite covers public route smoke checks, protected-route redirects, public account signup/login-reset flows, public auth validation and failure paths, public newsletter signup, gallery browsing, first-viewport visual smoke checks, newsletter subscriber administration, admin gallery upload/edit/publish cleanup, and representative browser-driven persistence coverage for contact info, about content, hero banner, and seasonal content saves. It also verifies that an injected contact-info save failure leaves the edited values visible so an admin can retry. These tests assert that the successful save response contains the updated persisted landing page document when that is the least brittle way to prove persistence. The About content spec also verifies the saved story title on the public About page for the active variant/session.

The production-build suite intentionally reuses only the public smoke spec and contact-info admin smoke spec. Its job is to prove that the built UI bundle can load core public pages and perform one authenticated admin persistence workflow against the disposable E2E backend. Keep deeper workflow coverage in the normal stable suites unless a bug only reproduces in the production bundle.

The accessibility suite runs axe-core against the public homepage, about, gallery, contact, register, and login pages and fails on serious or critical violations. The PWA suite runs against the production UI build and checks cache headers, public route rendering, offline app-shell behavior, update prompts, and service-worker activation.

## PWA Update Policy

PWA service workers are production-only by default. Local production-build PWA tests opt in with `VITE_ENABLE_LOCAL_PWA=true`; normal localhost runs clean up service workers and caches so development is not accidentally cache-first.

The intended update behavior is invisible for normal public browsing:

- First service-worker install must not show update UI.
- Safe public updates should activate the waiting service worker, avoid the reload snackbar, and reload silently when the tab is hidden or the user becomes idle.
- Safe visible tabs should defer reload while the user has recent activity or a form element is focused.
- Unsafe updates should show the persistent "A site update is ready." reload action instead of auto-reloading.
- Admin forms mark updates unsafe while they are dirty or saving, so unsaved work is not discarded by a background deploy.

The policy is covered at three levels: `pwaUpdatePolicy.test.ts` exercises the scheduler rules with deterministic clocks and visibility state; `pwaReloadSafety.test.ts` covers the reload-blocker registry; `e2e/pwa.spec.ts` validates production PWA assets, first-install behavior, offline app-shell loading, service-worker activation, and safe/unsafe browser update flows.

Production/CDN header behavior is checked separately with `./scripts/check-pwa-headers.sh -e .env-prod` or `yarn check:pwa-headers`. The script is read-only: it fetches the public UI URL, verifies that app-shell/service-worker files are `no-cache, no-store, must-revalidate`, discovers the current hashed app entry chunk from `/service-worker.js`, and verifies that chunk is served as `public, max-age=31536000, immutable`. `deploy-smoke.sh` runs this check by default after deployment unless `--skip-pwa-headers` is passed.

`public-visual-simple.spec.ts` intentionally keeps screenshot coverage focused on deterministic public pages. It guards homepage, about, contact, gallery, login, and register first viewports plus mobile overflow on the homepage/about routes. Add new screenshots only for pages where visual regressions are expensive to miss and the content is deterministic enough for CI.

Legacy admin specs and their legacy-only page objects live in `e2e/admin/legacy` and remain available through `yarn test:e2e:full`, but they contain more timing and selector coupling. Treat failures there as useful regression signals, not as the primary merge gate until they are hardened.

## Runtime Guard

Stable tests automatically attach `e2e/fixtures/runtime-guard.ts` through `e2e/fixtures/auth.ts` for authenticated tests or `e2e/fixtures/guarded.ts` for public tests. At teardown, the guard fails the test on unexpected browser console warnings/errors, uncaught page errors, and HTTP 4xx/5xx responses.

The allowlist should stay small and explicit. Current response allowances cover the intentionally tested invalid-login response, signed-out session checks, and the injected contact-info save failure. Authenticated login/signup refresh CSRF after the session changes, so stable specs should not need broad stale-CSRF mutation allowances.

## Stable vs Legacy Policy

Stable specs are the merge-gated browser suite. They should stay small, deterministic, and focused on workflows that need a real browser. `scripts/check-test-quality.sh` enforces the most important reliability rules for stable specs and non-legacy E2E support files, including the requirement to use guarded fixtures instead of Playwright's base `test`.

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

Playwright writes HTML reports under `playwright-report/<suite>` and JSON results under `test-results/<suite>.json` for admin, public, visual, accessibility, production, and PWA suites. CI uploads these as artifacts.
