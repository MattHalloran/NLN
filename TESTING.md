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

## Playwright Suites

- `yarn test:e2e:smoke` runs one stable admin smoke spec in `e2e/admin/stable`.
- `yarn test:e2e:admin` and `yarn test:e2e:stable` run the current stable admin suite in `e2e/admin/stable`.
- `yarn test:e2e:legacy` runs only `e2e/admin/legacy`.
- `yarn test:e2e:full` runs all admin Playwright specs, including `e2e/admin/legacy`.
- `yarn test:pwa` runs PWA/browser-cache checks against a production build.

Playwright-started API servers use `.e2e-runtime` as `PROJECT_DIR` by default. The server copies `packages/server/src/data` into that generated runtime directory before booting, so normal Playwright runs do not write back to source data files. Set `E2E_PROJECT_DIR` only when you intentionally want a different disposable runtime directory. If you run against an already-running local API server, that server's own `PROJECT_DIR` controls where data is read and written.

## CI Outputs

GitHub Actions uploads:

- Vitest coverage from server and UI unit tests.
- Server integration coverage.
- Playwright HTML/JSON reports for admin E2E.
- Playwright HTML reports for PWA tests.

## Validation Matrix

| Command | Scope | Runtime dependencies | Mutates local data |
| --- | --- | --- | --- |
| `yarn test` | Shared, UI, and server unit tests | Node only | No |
| `yarn validate` | Typecheck, lint, unit tests, script tests | Node + Bats | No production mutation; script tests use stubs/temp dirs |
| `yarn test:integration` | Server integration tests | Docker/Testcontainers | No; tests use disposable containers and temp project dirs |
| `yarn test:e2e:smoke` | One stable admin Playwright spec | Local or CI PostgreSQL/Redis services, browser install | Uses `.e2e-runtime` by default |
| `yarn test:e2e:admin` | Stable admin Playwright suite | Local or CI PostgreSQL/Redis services, browser install | Uses `.e2e-runtime` by default |
| `yarn test:e2e:legacy` | Legacy admin Playwright suite | Local or CI PostgreSQL/Redis services, browser install | Uses `.e2e-runtime` by default |
| `yarn test:e2e:full` | Stable + legacy admin Playwright specs | Local or CI PostgreSQL/Redis services, browser install | Uses `.e2e-runtime` by default |
| `yarn test:pwa` | Production-build PWA browser checks | Browser install | Writes Playwright reports only |
| `yarn validate:full` | Full local merge gate | Docker, PostgreSQL/Redis services for E2E, browser install | Uses disposable test/runtime state |

## Reliability Rules

- Prefer Testing Library role/label queries or explicit `data-testid` values.
- Avoid fixed sleeps. Wait for URLs, locators, responses, or observable app state.
- Keep mutation-heavy workflows in API/integration tests when possible; use browser tests for critical user journeys.
- Keep test data isolated through databases, temp directories, or generated runtime folders.
- Raise coverage thresholds only when the suite has meaningful assertions for the covered behavior.
