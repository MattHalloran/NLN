# Testing and Validation

This project uses layered validation. Pick the narrowest command that covers the change you made, and use the CI command before merging broad changes.

For release readiness, use the workflow-level checklist in [TEST_COVERAGE_MATRIX.md](./TEST_COVERAGE_MATRIX.md). That matrix is the source of truth for what the automated suite is expected to prove before production deployment.

## Command Tiers

```bash
# Fast local default: shared + UI + server unit tests
yarn test

# Local quality gate without browser or service dependencies
yarn validate

# Full local gate; CI runs these layers in parallel jobs
yarn validate:full

# Full local release gate plus validation receipt
yarn validate:release

# Backward-compatible alias
yarn validate:ci
```

Individual layers:

```bash
yarn typecheck
yarn lint
yarn test:unit
yarn test:integration
yarn test:scripts
yarn test:e2e:smoke
yarn test:e2e:stable
yarn test:e2e:admin
yarn test:e2e:legacy
yarn test:e2e:full
yarn test:pwa
yarn lighthouse:local
yarn validation:receipt
```

## Test Types

- Unit tests use Vitest in `packages/shared`, `packages/ui`, and `packages/server`.
- Server integration tests use Vitest with Testcontainers-managed PostgreSQL and Redis dependencies.
- Script tests use top-level Bats files in `scripts/tests`; helper library tests under `scripts/tests/helpers` are vendored and not part of project validation.
- E2E tests use Playwright.
- PWA tests use a separate Playwright config against the production UI build and include core public-route rendering checks.
- Lighthouse checks are available through `yarn lighthouse:local` for the local production UI build and `yarn lighthouse:prod` for production. CI runs local Lighthouse assertions as a blocking gate for public accessibility, SEO, best-practices, and performance drift.

## Test Architecture

Use the narrowest layer that proves the behavior:

| Layer                    | Owns                                                                          | Preferred seams                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Shared unit tests        | Cross-package contracts, route builders, content schemas, pure utilities      | `packages/shared/src/api/testFixtures.ts` builders                                                                            |
| UI unit tests            | Component behavior, hooks, stores, REST client behavior                       | Testing Library role/label queries, `packages/ui/src/setupTests.ts`, fetch/CSRF test doubles                                  |
| Server unit tests        | Middleware, auth helpers, pure service logic, queue behavior with mocks       | Vitest mocks and focused request objects                                                                                      |
| Server integration tests | Prisma, REST endpoints, auth cookies, file-backed runtime state, Redis/queues | `packages/server/src/__tests__/integrationUtils.ts` for Testcontainers, temp project dirs, REST app wiring, and login cookies |
| Stable E2E tests         | Critical admin journeys, browser runtime errors, and persisted admin saves    | Playwright role/label/test-id locators, seeded runtime data, explicit UI/response waits, `e2e/fixtures/runtime-guard.ts`      |
| Legacy E2E tests         | Useful regression signals while being hardened                                | Quarantined behind `yarn test:e2e:legacy` and `yarn test:e2e:full`                                                            |
| Bats script tests        | Deployment and VPS safety wrappers                                            | Stubbed shell commands and temp directories; no production mutation                                                           |

## Playwright Suites

- `yarn test:e2e:smoke` runs one stable admin smoke spec in `e2e/admin/stable`.
- `yarn test:e2e:admin` and `yarn test:e2e:stable` run the current stable browser suite in `e2e/admin/stable`.
- `yarn test:e2e:legacy` runs only `e2e/admin/legacy`.
- `yarn test:e2e:full` runs all admin Playwright specs, including `e2e/admin/legacy`.
- `yarn test:pwa` runs PWA/browser-cache checks against a production build.

Playwright-started API servers use `.e2e-runtime` as `PROJECT_DIR` by default. The server copies `packages/server/src/data` into that generated runtime directory before booting, so normal Playwright runs do not write back to source data files. Set `E2E_PROJECT_DIR` only when you intentionally want a different disposable runtime directory. If you run against an already-running local API server, that server's own `PROJECT_DIR` controls where data is read and written.

The stable browser suite covers public route smoke coverage, public newsletter signup, visual smoke coverage, newsletter subscriber administration, contact info, hero banner, and seasonal content. It includes browser-driven save assertions for representative persisted edits in each admin area. Those tests verify the successful save response contains the updated persisted landing page document, which catches failed writes without depending on post-save accordion/card visibility.

Stable specs attach a runtime guard from `e2e/fixtures/runtime-guard.ts` through either `e2e/fixtures/auth.ts` or `e2e/fixtures/guarded.ts`. The guard fails tests on unexpected browser console warnings/errors, uncaught page errors, and HTTP 4xx/5xx responses. The only allowed failures are documented known development-noise cases such as the stale-CSRF retry during first authenticated mutation and the analytics tracking retry after login.

## Quality Gates

`yarn check:drift` runs three cheap policy checks:

- `scripts/check-env-defaults.sh` keeps shared default ports aligned with Docker and CI.
- `scripts/check-source-drift.sh` prevents raw API routes, raw app routes, and unapproved UI `fetch` calls from drifting away from shared seams.
- `scripts/check-test-quality.sh` blocks focused tests, disabled unit tests, brittle patterns in stable E2E specs and non-legacy E2E support files, and stable specs that import Playwright's unguarded base `test`.

Stable E2E specs and non-legacy E2E support files may not use fixed sleeps, broad `networkidle` waits, runtime `test.skip`, or parent-traversal selectors. Legacy E2E specs and their legacy-only page objects are exempt while they are being hardened or retired.

`yarn validation:receipt` writes `.validation/latest-receipt.md` with the current commit, worktree state, declared validation command, CI run/job metadata when available, available coverage totals, Playwright expected/failed/flaky/skipped counts, Lighthouse artifact freshness, and required-artifact checks. For declared full/release/CI commands, the receipt fails if expected artifacts are missing or older than `VALIDATION_ARTIFACT_MAX_AGE_MINUTES` (default: 120).

## Release Gate

Use `yarn validate:release` as the local pre-deploy gate. It runs typechecks, lint, unit tests with coverage thresholds, script safety tests, drift checks, server integration tests, the production UI build, PWA browser checks, the stable guarded E2E suite, blocking Lighthouse checks for the local production UI build, and then writes `.validation/latest-receipt.md`.

A release should not be considered ready until the matching CI jobs are also green and their validation receipts are attached as artifacts. Local success is useful for fast feedback, but CI is the shared trust boundary.

## Coverage Policy

Coverage thresholds should ratchet around meaningful assertions, not incidental line hits. Shared code has high package-level thresholds because it is mostly pure contract logic. UI and server have lower global thresholds plus targeted per-file or per-directory thresholds for seams with existing meaningful coverage.

When adding coverage:

- Prefer raising thresholds for a focused file or directory after adding assertions for behavior that matters.
- Add or extend builders in shared/server test helpers instead of duplicating large payloads.
- Keep browser tests small; move exhaustive CRUD and permission edges into server integration tests.
- Use `yarn coverage:summary` locally or from CI job summaries to see package-level totals.

Server integration coverage thresholds are package-wide. Running one integration file directly can pass its assertions but fail the process because the full package coverage threshold is not met; use `yarn test:integration` for a coverage-valid integration run.

## CI Outputs

GitHub Actions uploads:

- Vitest coverage from server and UI unit tests.
- Server integration coverage.
- Playwright HTML/JSON reports for admin E2E.
- Playwright HTML/JSON reports for PWA tests.
- Lighthouse CI results for public pages.
- Validation receipts that fail when required evidence for the declared command is missing or stale.

## Validation Matrix

| Command                   | Scope                                                | Runtime dependencies                                                          | Mutates local data                                                            |
| ------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `yarn test`               | Shared, UI, and server unit tests                    | Node only                                                                     | No                                                                            |
| `yarn validate`           | Typecheck, lint, unit tests, script tests            | Node + Bats                                                                   | No production mutation; script tests use stubs/temp dirs                      |
| `yarn test:integration`   | Server integration tests                             | Docker/Testcontainers                                                         | No; tests use disposable containers and temp project dirs                     |
| `yarn test:e2e:smoke`     | One stable admin Playwright spec                     | Local or CI PostgreSQL/Redis services, browser install                        | Uses `.e2e-runtime` by default                                                |
| `yarn test:e2e:admin`     | Stable admin Playwright suite                        | Local or CI PostgreSQL/Redis services, browser install                        | Uses `.e2e-runtime` by default                                                |
| `yarn test:e2e:legacy`    | Legacy admin Playwright suite                        | Local or CI PostgreSQL/Redis services, browser install                        | Uses `.e2e-runtime` by default                                                |
| `yarn test:e2e:full`      | Stable + legacy admin Playwright specs               | Local or CI PostgreSQL/Redis services, browser install                        | Uses `.e2e-runtime` by default                                                |
| `yarn test:pwa`           | Production-build PWA and public-route browser checks | Browser install                                                               | Writes Playwright reports only                                                |
| `yarn lighthouse:local`   | Local production-build Lighthouse checks             | Built UI assets, Chrome/Lighthouse                                            | Writes `.lighthouseci/` artifacts                                             |
| `yarn validate:full`      | Full local merge gate                                | Docker, PostgreSQL/Redis services for E2E, browser install                    | Uses disposable test/runtime state                                            |
| `yarn validate:release`   | Full local release gate plus Lighthouse and receipt  | Docker, PostgreSQL/Redis services for E2E, browser install, Chrome/Lighthouse | Uses disposable test/runtime state and writes `.validation/latest-receipt.md` |
| `yarn validation:receipt` | Local validation evidence summary                    | Existing coverage/results files                                               | Writes `.validation/latest-receipt.md`                                        |

## What To Run

| Change type                                      | Minimum useful command                                       |
| ------------------------------------------------ | ------------------------------------------------------------ |
| Shared route constants, schemas, or pure helpers | `yarn workspace @local/shared test && yarn typecheck:test`   |
| UI hooks, stores, REST client, or pure utilities | `yarn workspace ui test && yarn workspace ui typecheck:test` |
| Server middleware, auth helpers, queues, utils   | `yarn workspace server test:unit`                            |
| Prisma schema, REST endpoints, Redis, queues     | `yarn test:integration`                                      |
| Deployment, backup, healthcheck shell scripts    | `yarn test:scripts && yarn check:drift`                      |
| Admin browser workflow or locator/test-id seam   | `yarn test:e2e:smoke` or `yarn test:e2e:admin`               |
| PWA, service worker, or production UI build      | `yarn workspace ui build && yarn test:pwa`                   |
| Cross-package or release-boundary change         | `yarn validate:full`                                         |
| Pre-deploy release readiness                     | `yarn validate:release`                                      |

## Reliability Rules

- Prefer Testing Library role/label queries or explicit `data-testid` values.
- Avoid fixed sleeps. Wait for URLs, locators, responses, or observable app state.
- Keep mutation-heavy workflows in API/integration tests when possible; use browser tests for critical user journeys.
- Keep test data isolated through databases, temp directories, or generated runtime folders.
- Raise coverage thresholds only when the suite has meaningful assertions for the covered behavior.
