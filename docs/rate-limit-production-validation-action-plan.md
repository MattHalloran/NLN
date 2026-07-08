# Rate Limit Production Validation Action Plan

This is an implementation plan only. Do not run production deploys, production SSH commands, backups, cleanup, restarts, pruning, updates, restores, or destructive commands while executing this plan unless the user explicitly approves that production action.

## Purpose

Make rate limiting locally and automatically provable before production. The final state should let CI prove that:

1. Requests are bucketed by the real client identity behind the expected reverse proxy topology.
2. A broken or changed proxy topology fails local tests or deploy-readiness checks before production.
3. Rate-limit counters are shared in production through Redis and isolated in unit tests.
4. Security-sensitive limiters fail closed when shared storage is unavailable.
5. The code is organized around explicit dependencies, not import-time singleton middleware state.

## Execution Status

Last updated: 2026-07-07.

Completed in the current implementation pass:

1. Phase 1 baseline audit:
   - Focused unit tests passed for client identity, rate limiters, Redis store factory, and proxy trust config.
   - Disposable integration tests passed for proxy topology and Redis-backed rate-limit stores.
   - `scripts/check-rate-limit-config.sh docker-compose-prod.yml` passed.
   - `scripts/validate-env.sh .env-example` initially failed because `.env-example` contained the invalid placeholder IP `192.81.123.456`; this has been updated to the reserved documentation IP `192.0.2.10`.
   - The command shown in the original baseline as `bash scripts/validate-env.sh -e .env-example` did not match the current script interface; this plan now uses `bash scripts/validate-env.sh .env-example`.
2. Phase 2 app factory refactor:
   - Added `packages/server/src/app.ts` with `createApp(...)`.
   - Kept database setup, listener startup, health self-check, watchers, shutdown, and process-level error handlers in `packages/server/src/index.ts`.
   - Added `packages/server/src/app.test.ts` to prove trust proxy is configured before REST rate-limit key generation and to verify injected middleware/limiter dependencies.
3. Phase 3 singleton cleanup:
   - Removed import-time default rate-limiter exports and default REST/auth/images/newsletter router instances from the rate-limit path.
   - Updated tests and integration helpers to create routers and limiters at app construction time.
4. Phase 4 policy registry:
   - Added `packages/server/src/middleware/rateLimitPolicies.ts`.
   - Added `packages/server/src/middleware/rateLimitPolicies.test.ts` to enumerate policies, production login strictness, failure modes, and stricter-route exclusions from the general mutation bucket.
5. Phase 5 proxy topology contract:
   - Expanded local proxy integration coverage for forwarding success, missing-forwarding identity collapse, spoofed `X-Forwarded-For` with correct one-hop trust, over-trusting hop counts, and direct-reachability spoofing.
6. Phase 6 static production configuration gate:
   - Added explicit `TRUST_PROXY_HOPS` environment wiring to the production server service.
   - Expanded `scripts/check-rate-limit-config.sh` and its Bats tests to fail when `TRUST_PROXY_HOPS` is missing from the server service.
7. Phase 8 upload parser hardening:
   - Added multipart parser limits for image file count and text field count in `createUploadFilesMiddleware(...)`.
   - Added REST router tests proving over-file-count and over-field-count multipart requests are rejected before image processing.
8. Phase 7 Redis store robustness:
   - Added enumerated middleware tests proving fail-open behavior for public read, general mutation, and newsletter subscribe policies.
   - Added enumerated middleware tests proving fail-closed behavior for login, password reset, signup, and image upload request policies.
   - Added image file-count coverage for rollback failure after an over-limit increment; the request still returns `429`.
9. Phase 9 diagnostics:
   - Extended diagnostics coverage to prove cookie and authorization header secrets are not logged.
10. Phase 10 documentation:
   - Updated environment, security architecture, API, architecture overview, and coverage matrix documentation for proxy/rate-limit validation and upload parser hardening.

Validation completed in this pass:

```bash
yarn workspace server vitest run --config vitest.config.mts \
  src/app.test.ts \
  src/middleware/rateLimitPolicies.test.ts \
  src/middleware/rateLimiter.test.ts \
  src/middleware/clientIdentity.test.ts \
  src/middleware/rateLimitStores.test.ts \
  src/config/proxyTrust.test.ts \
  src/rest/index.test.ts \
  --coverage.enabled=false

yarn workspace server vitest run --config vitest.integration.config.mts \
  src/rest/api.integration.test.ts \
  src/rest/newsletter.integration.test.ts \
  src/rest/dashboard.integration.test.ts \
  src/middleware/proxyTopology.integration.test.ts \
  src/middleware/rateLimitStores.integration.test.ts \
  --coverage.enabled=false

yarn workspace server typecheck
bash scripts/check-rate-limit-config.sh docker-compose-prod.yml
bats scripts/tests/check-rate-limit-config.bats
bats scripts/tests/validate-env.bats
yarn validate:quick
git diff --check
```

Final validation results from this continuation:

- Focused rate-limit/app/upload unit suite passed: 52 tests across app, proxy trust, client identity, rate limiter, policy registry, Redis store, image file-count, REST router, and image router tests.
- Focused proxy/Redis integration suite passed: 7 tests across proxy topology and Redis-backed rate-limit stores.
- `bash scripts/check-rate-limit-config.sh docker-compose-prod.yml` passed.
- `bash scripts/validate-env.sh .env-example` passed.
- `bats scripts/tests/check-rate-limit-config.bats` passed when run serially.
- `bats scripts/tests/validate-env.bats` passed.
- `yarn validate:quick` passed, including workspace typechecks, test typechecks, lint, unit tests, Bats script tests, and drift checks.
- `git diff --check` passed.
- No production deploy, SSH, backup, cleanup, restart, prune, update, restore, or destructive production command was run.

Remaining work:

1. None for this action plan. Future proxy topology changes should update the topology tests, static checks, and documentation together.

## Current Behavior Summary

### Request Identity Flow

```text
Browser
  |
  | client IP
  v
nginx-proxy or another trusted reverse proxy
  |
  | X-Forwarded-For / X-Real-IP
  v
Express app
  |
  | app.set("trust proxy", TRUST_PROXY_HOPS)
  v
req.ip / req.ips
  |
  v
getClientRateLimitKey(req)
  |
  v
express-rate-limit or custom image file-count limiter
  |
  v
Redis or memory store bucket
```

Relevant files:

- `packages/server/src/config/proxyTrust.ts`
- `packages/server/src/middleware/clientIdentity.ts`
- `packages/server/src/middleware/rateLimiter.ts`
- `packages/server/src/middleware/rateLimitStores.ts`
- `packages/server/src/rest/index.ts`
- `packages/server/src/rest/auth.ts`
- `packages/server/src/rest/images.ts`
- `packages/server/src/rest/newsletter.ts`
- `packages/shared/src/api/rateLimits.ts`
- `docker-compose-prod.yml`
- `scripts/check-rate-limit-config.sh`
- `scripts/validate-env.sh`

### Effective Limit Buckets

| Bucket | Scope | Limit | Storage expectation |
| --- | --- | --- | --- |
| `public-read` | `GET` and `HEAD` REST API requests | 600 per 15 minutes | Redis in production, memory in local tests |
| `general-mutation` | State-changing REST API requests except stricter routes | 100 per 15 minutes | Redis in production, memory in local tests |
| `login` | Credential login attempts only | 5 per 15 minutes in production, 20 in development | Redis in production |
| `password-reset` | Password reset requests | 3 per hour | Redis in production |
| `signup` | Signup requests | 3 per hour | Redis in production |
| `image-upload` | Image upload requests | 25 per 15 minutes | Redis in production |
| `image-file-count` | Uploaded file count | 100 files per 15 minutes | Redis in production |
| `newsletter-subscribe` | Newsletter subscription requests | 5 per hour | Redis in production |

### Critical Production Failure Modes

#### Identity Collapse

```text
Browser A ----\
Browser B ----- proxy does not forward client IP ---> Express
Browser C ----/                                      |
                                                     v
                                             req.ip = proxy/container IP
                                             all clients share one bucket
```

Impact: legitimate users throttle each other, and monitoring may misidentify normal traffic as abuse.

#### Spoofable Identity

```text
Attacker
  |
  | forged X-Forwarded-For
  v
Express directly reachable or trusts too many hops
  |
  v
attacker controls req.ip
```

Impact: rate limits can be bypassed by rotating forged forwarding headers.

#### Process-Local Counters

```text
Server process A: user has 4 login attempts
Server process B: user has 0 login attempts
Restart: counters reset
```

Impact: limits are weaker after restarts or horizontal scaling unless Redis-backed stores are used.

## Target Architecture

### Application Factory Boundary

Introduce a testable app factory so the real middleware order can be tested without starting long-running workers, watchers, database setup, or a fixed port listener.

```text
packages/server/src/app.ts
  createApp({
    env,
    deps: {
      prisma?,
      redis?,
      rateLimitStoreFactory?,
      uploadFilesMiddleware?,
      logger?,
      startWatchers?: false,
    }
  })

packages/server/src/index.ts
  load env
  setup database
  const app = createApp({ env: process.env, deps: productionDeps })
  listen()
  start watchers/workers
```

Design rule: tests should use `createApp(...)` or focused factories, not import production singleton middleware.

### Explicit Rate-Limit Policy Registry

Move route-neutral rate-limit definitions into one server-side registry that references shared numeric limits.

```text
rateLimitPolicies.ts
  publicRead:
    shared config id/window/max
    methods: GET, HEAD
    storeErrorMode: fail-open

  login:
    shared config id/window/max
    route: credential login only
    storeErrorMode: fail-closed
```

The goal is not more abstraction for its own sake. The goal is to make tests able to enumerate every limiter and verify:

- key source
- storage backend
- fail-open/fail-closed behavior
- headers
- route mounting
- production limits

### Proxy Topology Contract

Represent the expected topology as a testable contract:

```text
Expected standard topology:

Internet
  -> nginx-proxy, one trusted hop
  -> nln_server container

Required server config:
  TRUST_PROXY_HOPS=1
  server service has no public ports
  server service is on proxy network
  proxy forwards X-Forwarded-For or equivalent client identity headers
```

If another public proxy or CDN is added, the contract changes and tests must be updated intentionally.

## Phase 1: Baseline Audit

Goal: verify the current repo state and capture gaps before changing implementation.

Tasks:

1. Confirm all rate-limit and proxy-related files are either tracked or intentionally staged as part of the current branch.
2. Run focused current tests locally:

   ```bash
   yarn workspace server vitest run --config vitest.config.mts \
     src/middleware/clientIdentity.test.ts \
     src/middleware/rateLimiter.test.ts \
     src/middleware/rateLimitStores.test.ts \
     src/config/proxyTrust.test.ts \
     --coverage.enabled=false
   ```

3. Run integration tests that require disposable local services:

   ```bash
   yarn workspace server vitest run --config vitest.integration.config.mts \
     src/middleware/proxyTopology.integration.test.ts \
     src/middleware/rateLimitStores.integration.test.ts \
     --coverage.enabled=false
   ```

4. Run static config checks:

   ```bash
   bash scripts/check-rate-limit-config.sh docker-compose-prod.yml
   bash scripts/validate-env.sh .env-example
   ```

5. Record which tests fail before implementation begins.

Acceptance criteria:

- Current behavior is understood before refactoring.
- No production commands are run.
- Any failing tests are categorized as pre-existing, refactor-induced, or environment/tooling issues.

## Phase 2: App Factory Refactor

Goal: make the real Express middleware stack testable without starting production side effects.

Tasks:

1. Create `packages/server/src/app.ts`.
2. Move Express app construction from `packages/server/src/index.ts` into `createApp(...)`.
3. Keep listener startup, database setup, shutdown handling, workers, and watchers in `index.ts`.
4. Make `createApp(...)` accept explicit `env` and dependency options.
5. Ensure `applyTrustProxy(app, env)` happens before any middleware that reads `req.ip`.
6. Ensure auth still runs before CSRF and before route handlers.
7. Preserve existing route order:

   ```text
   helmet
   body parsing
   cookies
   prisma attachment
   healthcheck
   cors
   auth
   request identity diagnostics
   public read limiter
   general mutation limiter
   csrf
   static routes
   REST router
   csrf error handler
   ```

Tests:

1. Add `packages/server/src/app.test.ts`.
2. Assert middleware order behavior through observable endpoints:
   - trust proxy affects identity before rate limiting.
   - `GET` receives public read headers.
   - state-changing route receives general mutation headers.
   - CSRF still rejects protected mutations after rate-limit middleware.
3. Use dependency injection to avoid a real database where possible.

Acceptance criteria:

- `index.ts` is mostly startup orchestration.
- App tests can exercise the real middleware stack with `supertest`.
- No test imports production singleton limiter instances unless specifically testing backward compatibility.

## Phase 3: Remove Import-Time Singleton Coupling

Goal: prevent environment and store state from being captured at module import time in tests.

Tasks:

1. Prefer `createRateLimiters({ env, storeFactory, getRedisClient, getKey })` everywhere new code is tested.
2. Update `createRestRouter(...)` to receive limiters from `createApp(...)` by default instead of constructing them internally where practical.
3. Keep exported singleton limiters only as a temporary compatibility layer if needed.
4. Add a migration note in code comments if singleton exports remain.
5. Remove tests that rely on hard-coded reset keys like `127.0.0.1` or `::/56`; use fresh limiter instances instead.

Tests:

1. Add a test proving two apps created with fresh memory-backed limiter sets do not share counters.
2. Add a test proving two apps created with the same Redis-backed fake store do share counters.
3. Add a test proving changing `env.NODE_ENV` in one app factory call does not leak into another.

Acceptance criteria:

- Test isolation does not require resetting global rate-limit keys.
- Production startup still constructs exactly one intended limiter set.
- Development and production login limits are selected from explicit env, not ambient import timing.

## Phase 4: Policy Registry And Mounting Tests

Goal: make it impossible to add or move a limiter without tests noticing.

Tasks:

1. Create `packages/server/src/middleware/rateLimitPolicies.ts`.
2. Define typed policies for all standard `express-rate-limit` limiters.
3. Include:
   - `id`
   - `windowMs`
   - `max`
   - `message`
   - `storeErrorMode`
   - route or method scope notes
4. Refactor `rateLimiter.ts` to build middleware from those policies.
5. Keep custom image file-count limiter separate but reference the same shared identity and Redis key namespace.

Tests:

1. Add table-driven tests over every policy.
2. For each policy, verify:
   - `RateLimit-Limit` header matches the configured max.
   - separate forwarded IPs get separate buckets.
   - same forwarded IP consumes the same bucket.
   - expected fail-open/fail-closed behavior when the store throws.
3. Add route mounting tests:
   - login limiter applies only when credentials are submitted, not session validation.
   - signup route uses signup limiter.
   - password reset route uses password reset limiter.
   - newsletter route uses newsletter limiter.
   - image upload request limiter runs before upload parsing.
   - image file-count limiter runs after upload parsing.

Acceptance criteria:

- One test suite enumerates every standard limiter.
- Adding a new limiter without a policy test is visibly incomplete.
- Route-specific limiters are verified through route behavior, not just implementation inspection.

## Phase 5: Production Proxy Contract Tests

Goal: prove locally that production-style proxy identity survives the expected topology and fails loudly when the topology is wrong.

Tasks:

1. Expand `packages/server/src/middleware/proxyTopology.integration.test.ts` or move it to `packages/server/src/app/proxyTopology.integration.test.ts` after the app factory exists.
2. Use disposable local HTTP proxy servers only.
3. Model at least these scenarios:

   ```text
   one forwarding proxy + TRUST_PROXY_HOPS=1 -> independent buckets
   one non-forwarding proxy + TRUST_PROXY_HOPS=1 -> identity collapse is detected
   two forwarding proxies + TRUST_PROXY_HOPS=1 -> wrong identity selected
   two forwarding proxies + TRUST_PROXY_HOPS=2 -> independent buckets
   direct request + TRUST_PROXY_HOPS=1 + forged X-Forwarded-For -> document expected behavior
   ```

4. For the direct-request spoofing case, pair the test with static production config checks proving the server has no public port mapping.
5. Use reserved documentation IP ranges only, such as `203.0.113.0/24`.

Tests:

```bash
yarn workspace server vitest run --config vitest.integration.config.mts \
  src/middleware/proxyTopology.integration.test.ts \
  --coverage.enabled=false
```

Acceptance criteria:

- Local tests prove the expected topology.
- Local tests demonstrate the broken topology.
- The broken topology test is not just documentation; it should fail if identity collapse is accidentally treated as acceptable in production validation.

## Phase 6: Static Production Configuration Gates

Goal: catch production deployment misconfiguration without touching the VPS.

Tasks:

1. Expand `scripts/check-rate-limit-config.sh`.
2. Validate:
   - `server` service has no `ports:` section.
   - `server` service has `expose:`.
   - `server` service joins the proxy network.
   - `server` service joins the app network.
   - `server` service has `REDIS_CONN`.
   - `server` service routes `VIRTUAL_PATH: "/api"`.
   - `redis` has no public `ports:`.
   - `redis` is reachable only on Docker networks.
   - `TRUST_PROXY_HOPS` is explicitly available to the server service through either `env_file` plus `.env-prod` validation or an explicit compose environment entry.
3. Expand `scripts/validate-env.sh`.
4. Validate production env:
   - `TRUST_PROXY_HOPS` exists and is a positive integer.
   - `E2E_DISABLE_RATE_LIMITS` is not `true`.
   - `RATE_LIMIT_DIAGNOSTICS` is not `true` unless a dedicated temporary override is added.
5. Add Bats tests for every static failure mode.
6. Wire the static check into `scripts/deploy-readiness.sh`.

Acceptance criteria:

- `deploy-readiness` fails locally if production compose would expose the server directly.
- `deploy-readiness` fails locally if production env omits `TRUST_PROXY_HOPS`.
- `deploy-readiness` fails locally if rate limits are disabled for production.
- All checks remain read-only.

## Phase 7: Redis Store Robustness

Goal: prove Redis-backed counters behave correctly under realistic local conditions.

Tasks:

1. Keep fast fake Redis unit tests for standard store behavior.
2. Keep Testcontainers Redis integration tests for real TTL behavior.
3. Add coverage for:
   - key prefix isolation between policies.
   - counter expiry after window.
   - shared counters across two app instances.
   - store outage fail-open for low-risk public/general/newsletter policies.
   - store outage fail-closed for login/password-reset/signup/image-upload request policies.
4. Review the custom image file-count limiter:
   - atomic `INCRBY`/rollback behavior.
   - TTL assignment on first increment.
   - fail-open behavior on Redis outage.
   - behavior when rollback fails after an over-limit attempt.

Acceptance criteria:

- Real Redis integration tests prove TTL and sharing.
- Fake Redis unit tests cover edge cases quickly.
- Security-sensitive policies fail closed by explicit test, not convention.

## Phase 8: Upload Abuse Hardening Review

Goal: reduce expensive upload work before request rejection.

Current stack:

```text
POST /images
  |
  v
image upload request limiter
  |
  v
multer parses multipart and writes temp files
  |
  v
image file-count limiter
  |
  v
image handler
```

Tasks:

1. Keep the request-count limiter before `multer`.
2. Confirm `multer` has:
   - max file size.
   - max file count.
   - field count limits if appropriate.
3. Evaluate whether file-count limiting can happen earlier:
   - option A: keep current post-parse count limiter because reliable file counts require parser output.
   - option B: add a cheap pre-parse request-size limiter.
   - option C: add upload-specific proxy body-size limits in production config.
4. Add tests for over-file-count requests using injected upload middleware where possible.
5. Add operational notes for temp-file cleanup after rejected uploads.

Acceptance criteria:

- Rejected upload requests are stopped as early as practical.
- Tests prove upload request limiter runs before parsing.
- Tests prove file-count limiter blocks after parsing without invoking image processing.

## Phase 9: Diagnostics And Observability

Goal: make production investigation possible without leaking secrets.

Tasks:

1. Keep `RATE_LIMIT_DIAGNOSTICS=false` by default.
2. Ensure diagnostics log only sanitized fields:
   - method
   - path
   - `req.ip`
   - `req.ips`
   - `X-Forwarded-For`
   - `X-Real-IP`
   - rate-limit key
3. Ensure diagnostics never log:
   - cookies
   - authorization headers
   - request bodies
   - tokens
   - secrets
4. Add a test that enables diagnostics and asserts no cookie/header secret appears in logged metadata.
5. Document a temporary diagnostic workflow:

   ```text
   enable diagnostics intentionally
   reproduce with two known client IPs through proxy
   compare req.ip/rateLimitKey
   disable diagnostics immediately
   ```

Acceptance criteria:

- Diagnostics are safe enough for short production investigations.
- Production validation blocks diagnostics from being left enabled accidentally.

## Phase 10: Documentation Refresh

Goal: keep operational docs aligned with implementation and tests.

Tasks:

1. Update `ENVIRONMENT.md`:
   - `TRUST_PROXY_HOPS`
   - `E2E_DISABLE_RATE_LIMITS`
   - `RATE_LIMIT_DIAGNOSTICS`
   - local validation commands
2. Update `SECURITY_ARCHITECTURE.md`:
   - identity source
   - proxy trust model
   - Redis-backed counters
   - fail-open/fail-closed policy
3. Update `TEST_COVERAGE_MATRIX.md`:
   - unit tests
   - integration tests
   - Bats static config tests
4. Update API docs only if response behavior or error bodies change.
5. Avoid documenting real production IPs, domains, keys, or `.env-prod` values.

Acceptance criteria:

- Docs explain both correct and broken proxy behavior.
- Docs include commands that are safe to run locally.
- Docs do not contain secrets or concrete production infrastructure values.

## Final Validation Gate

Before considering the implementation complete, run:

```bash
yarn workspace server vitest run --config vitest.config.mts \
  src/app.test.ts \
  src/config/proxyTrust.test.ts \
  src/middleware/clientIdentity.test.ts \
  src/middleware/rateLimiter.test.ts \
  src/middleware/rateLimitStores.test.ts \
  --coverage.enabled=false

yarn workspace server vitest run --config vitest.integration.config.mts \
  src/middleware/proxyTopology.integration.test.ts \
  src/middleware/rateLimitStores.integration.test.ts \
  --coverage.enabled=false

bash scripts/check-rate-limit-config.sh docker-compose-prod.yml
bash scripts/validate-env.sh .env-example
bats scripts/tests/check-rate-limit-config.bats
bats scripts/tests/validate-env.bats
yarn validate:quick
git diff --check
```

If Testcontainers is unavailable in a local environment, the Redis integration test failure should be reported separately. Do not replace it with a fake Redis test; fake Redis and real Redis cover different risks.

## Definition Of Done

The work is done when:

1. The real app can be constructed in tests without production side effects.
2. No rate-limit test depends on import-time singleton state.
3. Local tests prove correct proxy identity and detect identity collapse.
4. Local tests prove Redis counter sharing and TTL behavior.
5. Static checks fail on unsafe production compose/env changes.
6. Documentation describes the model and local validation workflow.
7. No production commands were run without explicit user approval.

## Suggested Implementation Order

1. App factory refactor.
2. Singleton decoupling.
3. Policy registry and table-driven tests.
4. Proxy topology contract expansion.
5. Static production config gates.
6. Redis robustness tests.
7. Upload hardening tests.
8. Diagnostics and documentation.

This order minimizes risk because it creates the main test seam before reorganizing the rate-limit internals.
