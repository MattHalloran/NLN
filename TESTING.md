# Testing and Validation

This project uses layered validation. Pick the narrowest command that covers the change you made, and use the CI command before merging broad changes.

## Command Tiers

```bash
# Fast local default: shared + UI + server unit tests
yarn test

# Local quality gate without browser or service dependencies
yarn validate

# Full local gate; CI runs these layers in parallel jobs
yarn validate:full

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
```

## Test Types

- Unit tests use Vitest in `packages/shared`, `packages/ui`, and `packages/server`.
- Server integration tests use Vitest with Testcontainers-managed PostgreSQL and Redis dependencies.
- Script tests use top-level Bats files in `scripts/tests`; helper library tests under `scripts/tests/helpers` are vendored and not part of project validation.
- E2E tests use Playwright.
- PWA tests use a separate Playwright config against the production UI build.
- Lighthouse checks are available through `yarn lighthouse:prod` but are not part of the default CI gate.

## Test Architecture

Use the narrowest layer that proves the behavior:

| Layer                    | Owns                                                                          | Preferred seams                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Shared unit tests        | Cross-package contracts, route builders, content schemas, pure utilities      | `packages/shared/src/api/testFixtures.ts` builders                                                                            |
| UI unit tests            | Component behavior, hooks, stores, REST client behavior                       | Testing Library role/label queries, `packages/ui/src/setupTests.ts`, fetch/CSRF test doubles                                  |
| Server unit tests        | Middleware, auth helpers, pure service logic, queue behavior with mocks       | Vitest mocks and focused request objects                                                                                      |
| Server integration tests | Prisma, REST endpoints, auth cookies, file-backed runtime state, Redis/queues | `packages/server/src/__tests__/integrationUtils.ts` for Testcontainers, temp project dirs, REST app wiring, and login cookies |
| Stable E2E tests         | Critical admin journeys and browser-only confidence                           | Playwright role/label/test-id locators, seeded runtime data, explicit UI/response waits                                       |
| Legacy E2E tests         | Useful regression signals while being hardened                                | Quarantined behind `yarn test:e2e:legacy` and `yarn test:e2e:full`                                                            |
| Bats script tests        | Deployment and VPS safety wrappers                                            | Stubbed shell commands and temp directories; no production mutation                                                           |

## Playwright Suites

- `yarn test:e2e:smoke` runs one stable admin smoke spec in `e2e/admin/stable`.
- `yarn test:e2e:admin` and `yarn test:e2e:stable` run the current stable admin suite in `e2e/admin/stable`.
- `yarn test:e2e:legacy` runs only `e2e/admin/legacy`.
- `yarn test:e2e:full` runs all admin Playwright specs, including `e2e/admin/legacy`.
- `yarn test:pwa` runs PWA/browser-cache checks against a production build.

Playwright-started API servers use `.e2e-runtime` as `PROJECT_DIR` by default. The server copies `packages/server/src/data` into that generated runtime directory before booting, so normal Playwright runs do not write back to source data files. Set `E2E_PROJECT_DIR` only when you intentionally want a different disposable runtime directory. If you run against an already-running local API server, that server's own `PROJECT_DIR` controls where data is read and written.

## Quality Gates

`yarn check:drift` runs three cheap policy checks:

- `scripts/check-env-defaults.sh` keeps shared default ports aligned with Docker and CI.
- `scripts/check-source-drift.sh` prevents raw API routes, raw app routes, and unapproved UI `fetch` calls from drifting away from shared seams.
- `scripts/check-test-quality.sh` blocks focused tests, disabled unit tests, and brittle patterns in stable E2E specs and non-legacy E2E support files.

Stable E2E specs and non-legacy E2E support files may not use fixed sleeps, broad `networkidle` waits, runtime `test.skip`, or parent-traversal selectors. Legacy E2E specs and their legacy-only page objects are exempt while they are being hardened or retired.

## Coverage Policy

Coverage thresholds should ratchet around meaningful assertions, not incidental line hits. Shared code has high package-level thresholds because it is mostly pure contract logic. UI and server have lower global thresholds plus targeted per-file or per-directory thresholds for seams with existing meaningful coverage.

When adding coverage:

- Prefer raising thresholds for a focused file or directory after adding assertions for behavior that matters.
- Add or extend builders in shared/server test helpers instead of duplicating large payloads.
- Keep browser tests small; move exhaustive CRUD and permission edges into server integration tests.
- Use `yarn coverage:summary` locally or from CI job summaries to see package-level totals.

## CI Outputs

GitHub Actions uploads:

- Vitest coverage from server and UI unit tests.
- Server integration coverage.
- Playwright HTML/JSON reports for admin E2E.
- Playwright HTML/JSON reports for PWA tests.

## Validation Matrix

| Command                 | Scope                                     | Runtime dependencies                                       | Mutates local data                                        |
| ----------------------- | ----------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| `yarn test`             | Shared, UI, and server unit tests         | Node only                                                  | No                                                        |
| `yarn validate`         | Typecheck, lint, unit tests, script tests | Node + Bats                                                | No production mutation; script tests use stubs/temp dirs  |
| `yarn test:integration` | Server integration tests                  | Docker/Testcontainers                                      | No; tests use disposable containers and temp project dirs |
| `yarn test:e2e:smoke`   | One stable admin Playwright spec          | Local or CI PostgreSQL/Redis services, browser install     | Uses `.e2e-runtime` by default                            |
| `yarn test:e2e:admin`   | Stable admin Playwright suite             | Local or CI PostgreSQL/Redis services, browser install     | Uses `.e2e-runtime` by default                            |
| `yarn test:e2e:legacy`  | Legacy admin Playwright suite             | Local or CI PostgreSQL/Redis services, browser install     | Uses `.e2e-runtime` by default                            |
| `yarn test:e2e:full`    | Stable + legacy admin Playwright specs    | Local or CI PostgreSQL/Redis services, browser install     | Uses `.e2e-runtime` by default                            |
| `yarn test:pwa`         | Production-build PWA browser checks       | Browser install                                            | Writes Playwright reports only                            |
| `yarn validate:full`    | Full local merge gate                     | Docker, PostgreSQL/Redis services for E2E, browser install | Uses disposable test/runtime state                        |

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

## Reliability Rules

- Prefer Testing Library role/label queries or explicit `data-testid` values.
- Avoid fixed sleeps. Wait for URLs, locators, responses, or observable app state.
- Keep mutation-heavy workflows in API/integration tests when possible; use browser tests for critical user journeys.
- Keep test data isolated through databases, temp directories, or generated runtime folders.
- Raise coverage thresholds only when the suite has meaningful assertions for the covered behavior.
