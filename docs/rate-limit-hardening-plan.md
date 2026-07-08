# Rate Limit Hardening And Local Validation Plan

This document captures a phased plan for making API rate limiting explicit, maintainable, and programmatically verifiable without a staging VPS or manual production checks. It is a plan only. Do not run real production deploy, backup, cleanup, update, restart, prune, rollback, restore, or deletion commands while implementing this work unless explicitly approved.

## Goals

1. Ensure rate limits are keyed by the real client identity in production behind the reverse proxy.
2. Prove that behavior locally and automatically with deterministic tests.
3. Avoid global singleton middleware state that makes tests brittle.
4. Move production counters to shared storage so behavior is stable across restarts and future horizontal scaling.
5. Prevent upload abuse before expensive parsing or disk writes whenever possible.
6. Make proxy assumptions visible in code, environment validation, and deploy readiness checks.

## Implementation Progress

Completed in the first pass:

- Phase 1 client identity helper extraction and diagnostics reuse.
- Phase 2 configurable trust-proxy parsing, validation, and production env guardrails.
- Initial Phase 3 limiter factory extraction.
- Phase 5 request-count upload limiter ordering before multipart parsing.

Completed in the second pass:

- Finished Phase 3 router dependency injection for auth, newsletter, images, and the REST router.
- Implemented Phase 4 Redis-backed standard `express-rate-limit` stores with explicit `rl:<limiter-id>:<identity>` prefixes, memory-store injection for local tests, and local fake-Redis coverage.
- Moved the custom image file-count limiter to the shared Redis key namespace and atomic Redis increment/decrement commands.
- Added Phase 6 local proxy topology integration coverage using disposable local HTTP servers, including a broken-proxy identity-collapse regression test.
- Implemented Phase 7 static production compose/readiness checks and removed the production server service public port mapping in favor of Docker-network `expose`.

Completed in the third pass:

- Added explicit Redis store failure-policy coverage:
  - public read/general mutation/newsletter-style limiters fail open on store outage.
  - strict auth and image upload request limiters fail closed on store outage.
- Added real Redis integration coverage for the standard rate-limit store using a disposable `redis:7-alpine` Testcontainers service.
- Updated API, architecture, security, and release coverage documentation to describe the implemented rate-limit/proxy model.
- Added an operational diagnostics workflow to `ENVIRONMENT.md` documenting sanitized fields, production defaults, and local validation commands.

Completed in the fourth pass:

- Made the custom image file-count limiter factory-created and injectable through the same dependency boundary as the standard limiters.
- Added file-count limiter coverage for Redis outage behavior; file-count limiting remains fail-open because it runs after multipart parsing.
- Routed remaining CSRF, audit, and asset-security log IP metadata through the centralized client identity helper.
- Preserved the compatibility singleton limiter set for the default REST router while keeping `createRestRouter(...)` and `createRateLimiters(...)` fresh and injectable for tests.
- Removed the stable E2E `networkidle` wait that blocked the local test-quality gate.
- Ran the full local completion gates successfully:
  - `yarn validate:quick`
  - `yarn workspace server test:integration`
  - `git diff --check`

Remaining work:

- None for this plan. Production deploy, SSH, backup, cleanup, restart, prune, and VPS commands were not run.

## Current State

Relevant implementation:

- `packages/server/src/index.ts`
  - Applies validated trust-proxy configuration from `TRUST_PROXY_HOPS`.
  - Mounts global REST rate limiters before CSRF and before REST routes.
- `packages/server/src/middleware/rateLimiter.ts`
  - Creates `express-rate-limit` middleware through `createRateLimiters(...)`.
  - Uses explicit client identity keys from `clientIdentity.ts`.
  - Uses Redis-backed stores by default in production and injectable memory stores in local/unit tests.
  - Keeps public/general limits fail-open on Redis errors while strict auth and image upload request limits fail closed.
  - Implements a custom Redis-backed image file-count limiter keyed through the shared rate-limit namespace.
- `packages/server/src/middleware/clientIdentity.ts`
  - Centralizes Express-derived client identity, rate-limit key generation, and optional sanitized diagnostics.
- `packages/server/src/middleware/rateLimitStores.ts`
  - Provides memory and Redis `express-rate-limit` stores with explicit `rl:<limiter-id>:<identity>` keys.
- `packages/shared/src/api/rateLimits.ts`
  - Defines the limit values and windows.
- `packages/server/src/rest/auth.ts`
  - Receives limiter dependencies through `createAuthRouter(...)` and applies login, signup, and password-reset limiters at route level.
- `packages/server/src/rest/images.ts`
  - Receives limiter dependencies through `createImagesRouter(...)`.
  - Applies request-count limiting before multipart parsing and file-count limiting after parsing.
- `packages/server/src/rest/index.ts`
  - Threads one limiter set through the REST route tree.
- `docker-compose-prod.yml`
  - Connects `nln_server` to the external `nginx-proxy` network.
  - Uses Docker-network `expose` instead of public server port publishing.

Current effective limits:

| Bucket | Scope | Limit |
| --- | --- | --- |
| Public REST reads | `GET` and `HEAD` under REST root | 600 per 15 minutes per client IP |
| General REST mutations | State-changing methods, except stricter special routes | 100 per 15 minutes per client IP |
| Login | Credential login attempts | 5 per 15 minutes in production, 20 in development |
| Password reset request | Reset-link requests | 3 per hour |
| Signup | Account signups | 3 per hour |
| Image upload request | Image upload requests | 25 per 15 minutes |
| Image file count | Number of files uploaded | 100 files per 15 minutes |
| Newsletter subscribe | Public newsletter submissions | 5 per hour |

## Main Risks To Remove

1. **Proxy identity collapse**
   - If nginx or another proxy does not forward the original client IP, Express can see every request as the proxy/container IP.
   - Result: all users share the same rate-limit bucket.

2. **Wrong trust-proxy topology**
   - `trust proxy = 1` is correct only when exactly one trusted proxy hop sits in front of Express.
   - If another layer is added, such as Cloudflare, a load balancer, or another nginx hop, Express may select the wrong address.

3. **Spoofable direct server access**
   - If the server port is reachable directly from the internet, clients may bypass nginx and send forged forwarding headers.
   - `trust proxy = 1` is only safe when untrusted clients cannot connect directly to the Express server.

4. **In-memory rate-limit stores**
   - Most `express-rate-limit` counters are process-local.
   - Counters reset on restart and are not shared if the app ever runs multiple server processes or replicas.

5. **Multipart parsing before upload-specific limits**
   - Image uploads are parsed by `multer` before `imageUploadLimiter` and `imageFileCountLimiter` run.
   - That means rejected image uploads may already have consumed temp disk and parser work.

6. **Global singleton test brittleness**
   - Existing tests reset hard-coded keys like `"::/56"` and `"127.0.0.1"`.
   - This couples tests to implementation details and makes proxy behavior hard to test cleanly.

## Target Architecture

Request identity and rate-limit storage should become explicit dependencies.

```text
Browser
  |
  v
Trusted reverse proxy
  |
  | X-Forwarded-For: <client ip>, <proxy chain...>
  | X-Real-IP: <client ip or nearest peer>
  v
Express
  |
  | configured trust proxy policy
  v
clientIdentity(req)
  |
  +--> diagnostics/logging
  +--> CSRF anonymous session identity
  +--> express-rate-limit keyGenerator
  +--> custom file-count limiter key
  v
Redis-backed rate-limit stores
```

Target module boundaries:

```text
packages/server/src/config/
  proxyTrust.ts
    parseTrustProxyConfig()
    validateTrustProxyConfig()
    applyTrustProxy(app, env)

packages/server/src/middleware/
  clientIdentity.ts
    getClientIdentity(req)
    createClientIdentityKey(req)
    requestIdentityDiagnostics(...)

  rateLimitStores.ts
    createRateLimitStore(...)
    createMemoryRateLimitStoreForTests(...)
    createRedisRateLimitStore(...)

  rateLimiter.ts
    createRateLimiters(deps)
    exported production defaults if needed during migration

packages/server/src/rest/
  imageUploadMiddleware.ts or images.ts route-local upload stack
```

## Phase 0: Baseline And Guardrails

Purpose: document and freeze the existing behavior before refactoring.

Tasks:

1. Add a small baseline test file for current proxy identity behavior using `supertest`.
2. Cover at least:
   - `trust proxy = 1` with `X-Forwarded-For: 203.0.113.10` produces a request identity of `203.0.113.10`.
   - Two different forwarded client IPs receive independent `RateLimit-Remaining` changes.
   - Missing or disabled trust proxy would cause forwarded requests to collapse to the socket/proxy address.
3. Add a short note to the test names explaining that `203.0.113.0/24` is documentation/test-net address space, not production infrastructure.
4. Confirm no production secrets or real `.env-prod` values appear in tests or fixtures.

Suggested files:

- `packages/server/src/middleware/clientIdentity.test.ts`
- Temporary baseline additions to `packages/server/src/middleware/rateLimiter.test.ts`

Validation:

```bash
yarn workspace server test:unit -- rateLimiter
```

Acceptance criteria:

- Existing behavior is captured before deeper edits.
- Tests use reserved documentation IPs only.
- No production commands are involved.

## Phase 1: Extract Client Identity

Purpose: make identity resolution explicit and reusable.

Tasks:

1. Create `packages/server/src/middleware/clientIdentity.ts`.
2. Add types:

   ```ts
   export type ClientIdentity = {
       ip: string;
       ips: string[];
       forwardedFor?: string | string[];
       realIp?: string | string[];
       source: "express";
   };
   ```

3. Add functions:
   - `getClientIdentity(req: Request): ClientIdentity`
   - `getClientIp(req: Request): string`
   - `getClientRateLimitKey(req: Request): string`
4. Use `express-rate-limit`'s `ipKeyGenerator` helper for IP fallback keys so IPv6 subnet grouping remains safe.
5. Move `requestIdentityDiagnostics` from `rateLimiter.ts` to `clientIdentity.ts`, or make it call `getClientIdentity`.
6. Replace direct `req.ip` usage in:
   - `rateLimiter.ts`
   - `csrf.ts` anonymous session fallback
   - `auditLogger.ts`
   - route-specific logs where appropriate

Design notes:

- Keep Express as the source of truth for parsing forwarding headers.
- Do not parse `X-Forwarded-For` manually in ordinary application code.
- If manual parsing is ever needed for a special test helper, isolate it in tests.

Tests:

- Unit tests for `getClientIdentity`.
- Regression tests for IPv6 key grouping.
- CSRF test proving anonymous identity remains stable for forwarded requests.

Acceptance criteria:

- Application code no longer constructs rate-limit keys directly from `req.ip`.
- Diagnostics and custom file-count limiter use the same identity helper.
- Existing tests still pass.

## Phase 2: Make Trust Proxy Configurable And Validated

Purpose: remove the hardcoded production topology assumption from `index.ts`.

Tasks:

1. Add `packages/server/src/config/proxyTrust.ts`.
2. Support an environment variable such as:

   ```text
   TRUST_PROXY_HOPS=1
   ```

3. Parse supported values:
   - Positive integer hop count, initially preferred.
   - Optional future support for explicit trusted subnet/IP list if needed.
4. Reject unsafe values in production:
   - Missing value.
   - `true`.
   - `0` when `SERVER_LOCATION` or production deploy config expects a reverse proxy.
   - Non-numeric values unless explicitly supported.
5. Replace `app.set("trust proxy", 1)` with:

   ```ts
   applyTrustProxy(app, process.env);
   ```

6. Log the configured trust policy without printing secrets.
7. Update:
   - `.env-example`
   - `scripts/.env.example`
   - `ENVIRONMENT.md`
   - `scripts/validate-env.sh`

Tests:

- `proxyTrust.test.ts` for parsing and validation.
- `runtimePolicy` or env-validation shell tests for missing/invalid production config.
- An integration test proving `TRUST_PROXY_HOPS=1` selects the expected forwarded client IP.

Acceptance criteria:

- Production startup refuses unsafe proxy trust settings.
- Test and local development defaults remain ergonomic.
- The deployed topology assumption is visible in env docs and validation scripts.

## Phase 3: Refactor Rate Limiters Into A Factory

Purpose: remove brittle global singleton state and make limiter dependencies injectable.

Tasks:

1. Change `rateLimiter.ts` to expose:

   ```ts
   export type RateLimiterDeps = {
       env: NodeJS.ProcessEnv;
       storeFactory: RateLimitStoreFactory;
       getKey: (req: Request) => string;
       logger: LoggerLike;
   };

   export function createRateLimiters(deps: RateLimiterDeps): RateLimiters;
   ```

2. Define `RateLimiters`:

   ```ts
   export type RateLimiters = {
       publicReadApiLimiter: RequestHandler;
       generalMutationApiLimiter: RequestHandler;
       loginLimiter: RequestHandler;
       passwordResetLimiter: RequestHandler;
       signupLimiter: RequestHandler;
       imageUploadLimiter: RequestHandler;
       newsletterSubscribeLimiter: RequestHandler;
       imageFileCountLimiter: RequestHandler;
   };
   ```

3. Keep compatibility exports during migration if needed, but have them be created from a production/default factory.
4. Change route modules that currently import singleton limiters to receive limiters during router construction, for example:
   - `createAuthRouter({ limiters })`
   - `createImagesRouter({ limiters, upload })`
   - `createNewsletterRouter({ limiters })`
5. Update `rest/index.ts` to create a router from dependencies:

   ```ts
   createRestRouter({ limiters, upload })
   ```

6. Update `createRestTestApp` in `integrationUtils.ts` to accept limiter dependencies and avoid global resets.

Tests:

- Unit tests create fresh limiter instances per test.
- Remove tests that require hard-coded `resetKey("::/56")` where possible.
- Add a test proving two apps with separate injected stores do not share counters.

Acceptance criteria:

- Tests can instantiate a fresh rate-limited app without mutating module-level singleton state.
- Route modules are still simple and readable.
- No production behavior change is intended in this phase except cleaner construction.

## Phase 4: Add Shared Redis-Backed Stores

Purpose: make all rate-limit counters production-grade and easier to inspect in integration tests.

Tasks:

1. Add a Redis store implementation compatible with `express-rate-limit`.
2. Prefer a maintained package if compatible with the current dependency set and TypeScript version; otherwise implement the small store interface locally against the existing `redis` client.
3. Use explicit key prefixes:

   ```text
   rl:public-read:<identity>
   rl:general-mutation:<identity>
   rl:login:<identity>
   rl:password-reset:<identity>
   rl:signup:<identity>
   rl:image-upload:<identity>
   rl:newsletter-subscribe:<identity>
   rl:image-file-count:<identity>
   ```

4. Keep test memory store support for fast unit tests.
5. Use Redis store in production/default app construction.
6. Ensure Redis failures have an explicit policy:
   - Recommended for public/read/general routes: fail open with error log if Redis is temporarily unavailable.
   - Recommended for auth and uploads: consider fail closed or fail open with clear risk note. Pick one policy and encode it in tests.
7. Update image file-count limiter to share key construction and Redis helper code with the standard store.
8. Add structured logs that include limiter id and sanitized identity metadata.

Tests:

- Unit tests against memory store.
- Integration tests against a disposable Redis container or existing Redis test helper.
- Tests for TTL behavior, counter reset, and per-limiter prefix isolation.
- Test that restart/recreated app instances share counters when pointed at the same Redis.

Acceptance criteria:

- All production rate-limit counters are backed by Redis.
- No limiter shares accidental keys with another limiter.
- Redis-backed tests prove counters survive app recreation within the same TTL window.

## Phase 5: Reorder Image Upload Middleware

Purpose: reject excessive upload requests before multipart parsing when possible.

Current flow:

```text
REST /images mount
  -> multer parses files
  -> images router
  -> imageUploadLimiter
  -> imageFileCountLimiter
  -> handler
```

Target flow:

```text
POST /images
  -> imageUploadLimiter
  -> multer parses files
  -> imageFileCountLimiter
  -> handler
```

Tasks:

1. Stop mounting `upload.array("files")` for the entire images router in `rest/index.ts`.
2. Mount upload parsing only for routes that need it.
3. Put request-count limiting before `multer`.
4. Keep file-count limiting after `multer`, because it needs `req.files`.
5. Ensure non-upload image routes are unaffected.
6. Audit `assets` routes separately because they also use `upload.array("files")`.

Tests:

- Unit or integration test with a mocked upload middleware proving request limiter runs before upload parser.
- Test that over-limit image upload requests do not invoke upload parsing.
- Test normal image upload still parses files and enforces file-count limits.

Acceptance criteria:

- Request-count limits protect temp disk and parser work.
- File-count limits still count actual parsed files.
- Route wiring is local and easy to inspect.

## Phase 6: Local Proxy Topology Test Harness

Purpose: prove production-like forwarded identity locally without a VPS.

Tasks:

1. Add a local test harness under one of:
   - `scripts/rate-limit-proxy-smoke.mjs`
   - `scripts/tests/rate-limit-proxy.bats`
   - `packages/server/src/middleware/proxyTopology.integration.test.ts`
2. Use disposable local services only:
   - Express test server.
   - Optional Redis test container.
   - nginx container with a minimal generated config.
3. Generate nginx config in a temp directory during the test:

   ```nginx
   server {
       listen 8080;
       location / {
           proxy_pass http://host.docker.internal:<server-port>;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

4. If `host.docker.internal` is not reliable on Linux in this setup, run both nginx and the test app in a disposable Docker network, or use Testcontainers to wire the network aliases.
5. Expose a test-only endpoint that returns sanitized identity diagnostics:

   ```json
   {
     "ip": "203.0.113.10",
     "ips": ["203.0.113.10"],
     "rateLimitKey": "203.0.113.10"
   }
   ```

6. Simulate distinct clients safely:
   - For pure Express/supertest tests, send `X-Forwarded-For` directly.
   - For nginx topology tests, use controlled generated configs or requests from separate local client containers if distinct source addresses are needed.
7. Assert:
   - The app sees a client address, not only the nginx container address, when the proxy sends forwarding headers.
   - Two test identities get independent rate-limit counters.
   - A deliberately broken nginx config causes the test to fail in the expected way.

Validation command:

```bash
yarn workspace server test:integration -- proxyTopology
```

Acceptance criteria:

- CI/local tests prove forwarded identity behavior without connecting to production or staging.
- The harness includes a negative test for a broken proxy header configuration.
- The test output clearly explains whether identity collapsed.

## Phase 7: Static Production Exposure And Config Gates

Purpose: prevent deploys with unsafe proxy/rate-limit configuration.

Tasks:

1. Add shell/static tests for `docker-compose-prod.yml`.
2. Validate one of the following production-safe postures:
   - Preferred: `nln_server` has no public `ports` mapping and is reachable only over Docker networks.
   - Acceptable with explicit justification: public port is firewall-restricted to trusted proxy only, and validation checks document that assumption.
3. Update `scripts/validate-env.sh` to require production-safe rate-limit/proxy settings:
   - `TRUST_PROXY_HOPS`.
   - `E2E_DISABLE_RATE_LIMITS` must not be `true`.
   - `RATE_LIMIT_DIAGNOSTICS` must not be `true` unless an explicit temporary override is set.
4. Add `scripts/check-rate-limit-config.sh` or extend `scripts/deploy-readiness.sh`.
5. Check that production compose includes Redis and server has `REDIS_CONN`.
6. Add static tests in `scripts/tests`.

Acceptance criteria:

- `yarn test:scripts` fails if production config would expose unsafe defaults.
- Deploy readiness includes rate-limit/proxy checks before any production mutation.
- Checks are local/read-only and safe.

## Phase 8: Observability And Diagnostics

Purpose: make failures understandable without leaking sensitive data.

Tasks:

1. Keep `RATE_LIMIT_DIAGNOSTICS` disabled by default.
2. When enabled, log:
   - limiter id
   - method
   - route path
   - `req.ip`
   - `req.ips`
   - presence/value of `x-forwarded-for` and `x-real-ip`
   - rate-limit key if safe
   - remaining/used/reset when available
3. Ensure diagnostics do not log:
   - cookies
   - authorization headers
   - request bodies
   - production secrets or raw env values
4. Add a test that diagnostics emit the expected fields and omit sensitive headers.
5. Add short operational docs explaining how to temporarily enable diagnostics during deploy validation.

Acceptance criteria:

- Diagnostics are useful enough to debug proxy identity collapse.
- Diagnostics cannot accidentally dump credentials or secrets.

## Phase 9: Documentation And Developer Workflow

Purpose: make the design easy for future maintainers to reason about.

Tasks:

1. Update `docs/api/rest-api.md` to remove or revise any stale statement that no rate limiting is enforced.
2. Add a short section to `SECURITY_ARCHITECTURE.md` or `docs/architecture/overview.md` covering:
   - trusted proxy model
   - per-client identity resolution
   - Redis-backed counters
   - local validation strategy
3. Update `TEST_COVERAGE_MATRIX.md` with:
   - identity resolver unit tests
   - limiter factory unit tests
   - Redis store integration tests
   - local proxy topology tests
   - deploy config shell tests
4. Add developer commands:

   ```bash
   yarn workspace server test:unit -- clientIdentity rateLimiter proxyTrust
   yarn workspace server test:integration -- proxyTopology
   yarn test:scripts
   ```

Acceptance criteria:

- Docs match the implemented behavior.
- A new contributor can understand how to validate rate limiting locally.

## Suggested Implementation Order

1. Phase 0: Baseline tests.
2. Phase 1: Client identity helper.
3. Phase 2: Configurable trust proxy.
4. Phase 3: Limiter factory.
5. Phase 5: Image upload middleware ordering.
6. Phase 4: Redis-backed stores.
7. Phase 6: Local proxy topology harness.
8. Phase 7: Static deploy/config gates.
9. Phase 8: Diagnostics polish.
10. Phase 9: Docs and coverage matrix.

This order gets quick safety wins early while delaying the broader Redis store migration until the construction and test boundaries are clean.

## Test Matrix

| Concern | Test Type | Example |
| --- | --- | --- |
| Express proxy identity | Unit/integration | `X-Forwarded-For` with `TRUST_PROXY_HOPS=1` resolves to expected client |
| Identity collapse | Negative integration | Broken/missing forwarded header causes shared bucket and fails expected assertion |
| Per-IP read bucket | Middleware unit | IP A and IP B have independent `RateLimit-Remaining` |
| Per-IP mutation bucket | Middleware unit | POSTs decrement mutation bucket only |
| Strict route buckets | Route integration | Login/signup/password reset excluded from general mutation and use strict limits |
| E2E disable flag | Unit | `E2E_DISABLE_RATE_LIMITS=true` removes rate-limit headers only in allowed test mode |
| Production env guard | Shell | `E2E_DISABLE_RATE_LIMITS=true` in `.env-prod` fails validation |
| Redis store TTL | Integration | Counter expires after configured window |
| Redis store sharing | Integration | New app instance sees existing counter in Redis |
| Image upload order | Unit/integration | Over-limit upload does not invoke multer |
| File-count limit | Integration | Multiple files count toward `image-file-count` key |
| Direct server exposure | Static shell | Production compose/server port exposure is absent or explicitly gated |
| Diagnostics safety | Unit | Logs identity fields but not cookies, auth headers, or body |

## Code Quality Expectations

1. Prefer small modules with single responsibilities.
2. Keep environment parsing and validation out of request middleware.
3. Keep test-only helpers out of production routes.
4. Keep route wiring readable; avoid hiding all behavior behind large generic middleware arrays.
5. Use structured APIs for Redis and Express middleware rather than string-parsing request headers throughout the app.
6. Maintain backward-compatible route behavior unless a phase explicitly changes it.
7. Avoid real production data, IPs, hostnames, and `.env-prod` values in tests and docs.

## Rollback Plan For Implementation

Each phase should be independently revertible:

1. Identity helper can be reverted to direct `req.ip` usage if tests reveal regressions.
2. Trust proxy config should default to the current behavior in non-production while being strict in production.
3. Limiter factory can keep compatibility exports until all routers are migrated.
4. Redis store can initially be enabled behind an env flag if needed, then made default after tests pass.
5. Image upload middleware reordering should include explicit route tests before merging.

## Definition Of Done

This work is complete when:

1. `yarn validate:quick` passes.
2. `yarn workspace server test:integration` passes, including Redis and proxy topology coverage.
3. `yarn test:scripts` passes, including production config safety checks.
4. Local automated tests prove distinct forwarded clients receive distinct buckets.
5. Local automated tests prove broken proxy forwarding is detected.
6. Production env validation rejects unsafe proxy/rate-limit settings.
7. Image upload request limiting runs before multipart parsing.
8. All production limiter counters are backed by Redis, or any exception is documented and tested.
9. Documentation accurately describes limits, proxy assumptions, diagnostics, and local validation commands.
