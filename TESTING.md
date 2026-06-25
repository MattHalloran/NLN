# Testing and Validation Guide

This project has five validation tiers. Use the cheapest tier that answers the question you are asking, and use the release tier before production work.

## Validation Tiers

| Tier | Command | Purpose | External requirements |
| --- | --- | --- | --- |
| Quick gate | `yarn validate` or `yarn validate:quick` | TypeScript, test typecheck, lint, unit tests, script tests, drift checks, migration risk checks | Node/Yarn, Bats for script tests |
| Server integration | `yarn test:integration` | REST, auth, database, Redis, queue, storage, newsletter, and landing-page behavior against real infrastructure | Docker |
| Browser gate | `yarn validate:browser` | Production UI build, PWA checks, accessibility E2E, public visitor Playwright flows, visual regression snapshots, stable admin Playwright flows | Docker, Playwright Chromium |
| Full gate | `yarn validate:full` | Quick gate, server integration, browser gate | Docker, Playwright Chromium |
| Release gate | `yarn validate:release` | Full gate plus Lighthouse public page checks and a validation receipt | Docker, Playwright Chromium |

CI runs the same core layers as separate jobs: quick validation plus PWA/Lighthouse, server integration tests, public/admin browser E2E, visual regression and accessibility tests, and a final trusted gate that fails unless all required jobs pass. A scheduled Lighthouse workflow also runs weekly to catch public-page performance drift.

## Recommended Local Workflow

During normal development:

```bash
yarn validate
```

Before merging or handing work off:

```bash
yarn validate:full
```

Before production readiness checks:

```bash
yarn validate:release
```

Before a production deployment, use the non-deploying readiness gate with a fresh version:

```bash
./scripts/deploy-readiness.sh -v <VERSION> -e .env-prod
```

After a deployment, run the read-only public smoke check against the deployed base URL:

```bash
PUBLIC_SMOKE_BASE_URL=https://<your-site> yarn smoke:public
```

## What Each Layer Catches

`yarn validate` catches compile errors, broken test types, lint failures, unit regressions, unsafe test patterns, raw route drift, env default drift, risky migrations, and deployment-script regressions.

`yarn test:integration` catches behavior that mocks usually miss: Prisma migrations, PostgreSQL queries, Redis behavior, authentication cookies, CSRF-sensitive REST flows, storage cleanup, newsletter management, landing-page APIs, and queue behavior.

`yarn validate:browser` catches browser-level failures: public and admin navigation, admin content management smoke flows, accessibility smoke coverage, visual regressions on key public pages, PWA/service-worker expectations, unexpected console/page errors, and unexpected failed HTTP responses.

`yarn validate:release` adds Lighthouse checks for homepage, about, and gallery. Lighthouse blocks failed quality categories and homepage-critical performance regressions such as LCP exceeding the configured threshold.

## Test Organization

- Unit tests live next to source as `*.test.ts` or `*.test.tsx`.
- Server integration tests use `*.integration.test.ts`.
- Stable Playwright tests live under `e2e/admin/stable`.
- Public visitor Playwright specs are named `public-*-simple.spec.ts` and run through `yarn test:e2e:public`.
- Visual regression specs run through `yarn test:visual`; update snapshots only after reviewing intentional visual changes with `yarn test:visual --update-snapshots`.
- Stable admin Playwright specs run through `yarn test:e2e:admin`; public specs are excluded from this gate.
- Legacy or broader Playwright tests live under `e2e/admin/legacy`.
- Script tests live under `scripts/tests` and run through Bats.
- Shared route and API contract tests live in `packages/shared/src/api`.

## Quality Rules

The quick gate intentionally blocks common reliability problems:

- Focused tests with `.only`.
- Skipped unit tests.
- Fixed sleeps in merge-gated E2E tests.
- Broad `networkidle` waits in merge-gated E2E tests.
- Runtime skips in merge-gated E2E tests.
- Parent-traversal selectors where accessible labels or `data-testid` seams are better.
- Stable E2E specs that bypass the guarded fixture.
- Raw REST route strings outside the shared route definitions and allowed server route files.
- Potentially destructive migrations without an explicit review marker.

## Current Trust Boundaries

The backend and deployment-script layers are the strongest parts of the suite. They have unit, integration, and script-level coverage with real PostgreSQL/Redis checks and deployment safety tests.

The UI has many useful unit tests and stable browser smoke tests, but page-level unit coverage is still uneven. Treat Playwright as the primary safety net for page workflows until more page/component tests are added.

The browser gate is reliable enough for regression detection, but it is not a substitute for final manual acceptance before production. It should catch broken pages, failed admin/public smoke flows, unexpected runtime errors, and many API contract regressions.

## Adding High-Value Tests

Prefer tests in this order:

1. Pure function or contract tests for shared route, schema, and formatting behavior.
2. Component tests for form validation, loading/error/success states, and routing behavior.
3. Server integration tests for authenticated or database-backed behavior.
4. Playwright tests for workflows that require the real browser, routing, persistence, or public/admin interaction.

For E2E tests, use stable locators such as accessible roles, labels, or `data-testid`, wait on visible UI or specific responses, and keep test data unique per run.
