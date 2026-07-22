# Local Production Runtime Plan

## Context

On July 2, 2026, the project was started locally with the production Docker Compose path:

```bash
BUILD_ALLOW_DIRTY_WORKTREE=true BUILD_SKIP_PACKAGE_VERSION_UPDATE=true TEST=false ./scripts/build.sh -v 3.0.4-local -d n -e .env-prod
docker compose --env-file .env-prod -f docker-compose-prod.yml up -d
```

The containers became healthy:

- UI: `http://localhost:3001`
- API health: `http://localhost:5331/healthcheck`
- Containers: `nln_ui`, `nln_server`, `nln_db`, `nln_redis`

The browser console then showed CORS failures when the production-built UI tried to call the API:

```text
Access to fetch at 'http://localhost:5331/api/rest/v1/landing-page?onlyActive=true&variantId=variant-homepage-official'
from origin 'http://localhost:3001' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.

Access to fetch at 'http://localhost:5331/api/rest/v1/csrf-token'
from origin 'http://localhost:3001' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.

[CSRF] Error fetching CSRF token: TypeError: Failed to fetch
[CSRF] Failed to fetch token from server!
```

This document records the root cause and the recommended plan to make development, local production, and remote production runtime behavior reliable and testable.

## Root Cause

The failure is a runtime topology/configuration mismatch, not an isolated CSRF bug.

The production-built UI was served at:

```text
http://localhost:3001
```

`packages/ui/src/utils/serverUrl.ts` detects `localhost:3001` as a split-port local run and returns:

```text
http://localhost:5331/api
```

That is a cross-origin browser request because the port differs.

The server was launched with `.env-prod`, which contains production DNS settings:

```text
SERVER_LOCATION=dns
PORT_UI=3001
PORT_SERVER=5331
SERVER_URL=https://<production-domain>/api
VIRTUAL_HOST=<production-domain>,www.<production-domain>
```

`packages/server/src/index.ts` builds its CORS allowlist from `VIRTUAL_HOST` and only adds local origins when `NODE_ENV=development` or `SERVER_LOCATION=local`. With `.env-prod`, the server allowed:

```text
https://<production-domain>
https://www.<production-domain>
```

It did not allow:

```text
http://localhost:3001
```

So browser requests from the local production UI were rejected by CORS. CSRF token fetching then failed because the browser could not reach the API.

## Additional Risks

After CORS is fixed, local production over plain HTTP may still fail state-changing requests because cookie security is tied directly to `NODE_ENV=production`.

Relevant code:

- `packages/server/src/middleware/csrf.ts`
- `packages/server/src/auth.ts`

Both use:

```ts
secure: process.env.NODE_ENV === "production"
```

That is correct for real HTTPS production, but it is not necessarily correct for a production-built app served locally over plain `http://localhost`. A secure cookie will not be stored/sent by the browser over HTTP.

Helmet/CSP may also need topology-aware treatment. The server currently uses `connect-src 'self'`. In true production this is reasonable if API traffic is same-origin through `/api`; in split-port local modes, cross-origin API traffic must be represented intentionally or avoided.

## Why Existing Tests Missed It

The existing test suite covers several pieces, but not this exact assembled topology.

- `yarn test:e2e:production` builds/serves a production UI, but its server side is `scripts/start-e2e-server.sh`, which defaults to `SERVER_LOCATION=local`. It does not run the production Docker server with `.env-prod`.
- `packages/server/src/rest/api.integration.test.ts` has a CORS test, but it only checks that `response.headers` is defined. It does not assert `Access-Control-Allow-Origin`, credentials, preflight status, or rejection behavior.
- UI tests check server URL calculation, but they do not run a real browser against the production Docker topology.
- CSRF tests focus on token mechanics and mocked fetch behavior, not browser reachability from the served UI origin.
- `e2e/fixtures/runtime-guard.ts` exists and is useful, but it currently allows some `500` landing-page responses, which can hide runtime failures.

## Target Runtime Topologies

The project should explicitly support and test these modes:

| Mode | UI | API | Scheme | Expected API access |
| --- | --- | --- | --- | --- |
| Development | `localhost:3001` Vite | `localhost:5331` Node | HTTP | Split-origin CORS allowed |
| Local production | production-built UI | production-built API | HTTP or local HTTPS | Prefer same-origin proxy; otherwise split-origin CORS allowed |
| Remote production | public domain | same public domain `/api` through proxy | HTTPS | Same-origin, no local CORS needed |
| Staging/future | staging host | staging API/proxy | Usually HTTPS | Explicit configured origins |

`NODE_ENV=production` should mean optimized production behavior. It should not be the only signal for public HTTPS deployment.

## Recommended Implementation Plan

### 1. Define Topology Explicitly

Introduce a clear runtime/deployment mode concept in code and docs.

Possible names:

- `APP_RUNTIME=development`
- `APP_RUNTIME=local-production`
- `APP_RUNTIME=production`
- `APP_RUNTIME=staging`

Alternatively, keep using existing variables but normalize them through helper functions. The important point is that server policy should not infer public HTTPS production from `NODE_ENV` alone.

### 2. Centralize Server Security Policy

Extract policy logic from `packages/server/src/index.ts` into testable helpers.

Candidate helpers:

- `buildAllowedCorsOrigins(env)`
- `buildHelmetOptions(env)`
- `getCookieSecurityOptions(env)`
- `isLocalHttpRuntime(env)`
- `isPublicHttpsRuntime(env)`

Inputs should include:

- `NODE_ENV`
- `SERVER_LOCATION`
- `UI_URL`
- `SERVER_URL`
- `VIRTUAL_HOST`
- `CORS_ORIGINS`
- optional explicit cookie override, such as `COOKIE_SECURE`

Expected behavior:

- Real production allows canonical HTTPS origins only and sets secure cookies.
- Development allows local UI origins and does not set secure cookies.
- Local production over HTTP allows the configured local UI origin and does not set secure cookies.
- Local production behind HTTPS proxy can use same-origin `/api` and secure cookies.

### 3. Fix UI API Base URL Resolution

Update `packages/ui/src/utils/serverUrl.ts` so URL selection has explicit precedence.

Recommended order:

1. Use `VITE_API_BASE_URL` or `VITE_SERVER_URL` when set and appropriate for the runtime.
2. For same-origin production, use `${window.location.origin}/api`.
3. For localhost split-port, use `localhost:${VITE_PORT_SERVER || 5331}/api`.
4. Avoid guessing production behavior from unrelated server-only values.

Important note: `scripts/build.sh` currently writes `VITE_SERVER_URL` into `packages/ui/.env`, but `getServerUrl` does not read it. That mismatch should be resolved.

### 4. Choose Local Production Strategy

There are two viable strategies.

Recommended: make local production same-origin.

- Serve the UI at `http://localhost:3001`.
- Proxy `/api` from that same origin to the server container.
- Have the UI call `/api`.
- CORS becomes irrelevant for normal app traffic.
- CSRF and auth cookies behave like same-origin cookies.
- This better mirrors remote production, where nginx routes `/api`.

Alternative: keep split ports.

- UI calls `http://localhost:5331/api`.
- Server allows `http://localhost:3001`.
- Cookies must be non-secure for HTTP local production.
- Tests must cover credentialed CORS and CSRF cookie round-trips.

Prefer same-origin proxying unless there is a strong operational reason not to.

### 5. Make Helmet/CSP Topology-Aware

Keep strict CSP for real production:

```text
connect-src 'self'
```

For split-origin local modes, either:

- avoid split-origin traffic through a same-origin proxy, or
- include the configured API origin in `connect-src`.

Add tests that assert CSP policy for each supported topology.

### 6. Strengthen Server CORS Tests

Replace the current weak CORS test with assertions against real preflight behavior.

Test cases should include:

- `OPTIONS /api/rest/v1/csrf-token`
- `Origin: http://localhost:3001`
- `Access-Control-Request-Method: GET`
- expected successful preflight status
- expected `Access-Control-Allow-Origin: http://localhost:3001`
- expected `Access-Control-Allow-Credentials: true`

Also test blocked origins:

- no reflected allow-origin header
- controlled rejection behavior
- useful server log message

Add unit tests for `buildAllowedCorsOrigins(env)`:

- `.env-prod` production allows only HTTPS virtual hosts.
- local development allows `http://localhost:3001` and `http://127.0.0.1:3001`.
- local production HTTP allows local UI only when explicitly configured.
- `CORS_ORIGINS` is parsed, trimmed, de-duplicated, and ignores empty entries.

### 7. Strengthen CSRF and Cookie Tests

Add tests for cookie policy:

- production HTTPS mode sets `Secure`.
- local HTTP modes do not set `Secure`.
- `SameSite=Lax`, `path=/`, and max age remain stable.

Add browser/integration coverage:

- browser can fetch `/api/rest/v1/csrf-token` from the served UI origin.
- token response succeeds.
- CSRF cookie is stored/sent when expected.
- a public state-changing request succeeds, such as newsletter signup or homepage variant tracking.
- admin login sets a usable auth cookie in the selected topology.

### 8. Add a Real Production-Local Browser Gate

Create a dedicated validation command separate from the existing `test:e2e:production`.

Possible command name:

```bash
yarn test:e2e:production-local
```

Expected behavior:

1. Build shared/server/ui production artifacts.
2. Start the actual production Docker Compose topology with local-safe env overrides.
3. Wait for `nln_ui` and `nln_server` health.
4. Run Playwright against `http://localhost:3001`.
5. Fail on CORS errors, CSRF token failures, `Failed to fetch`, `/api/` request failures, unexpected `500`s, and page errors.
6. Tear down only local test resources owned by the script.

Do not use real deployment, SSH, cleanup, update, prune, restart, or deletion commands against production. Local validation should use local Docker only.

Also avoid using `.env-prod` directly for browser validation unless local-safe overrides are applied. `.env-prod` may point to real production hostnames and should not be assumed to be a valid localhost browser config.

### 9. Tighten Runtime Guard

Update `e2e/fixtures/runtime-guard.ts`:

- Remove broad allowed `500` landing-page API failures.
- Add per-test allowlists only where a test intentionally injects a failure.
- Treat CORS messages as hard failures.
- Treat `Failed to fetch` as a hard failure.
- Treat CSRF token fetch failures as hard failures.
- Treat request failures to `/api/` as hard failures unless explicitly allowed.

Ensure public smoke and production-local tests use the guarded fixture.

### 10. Update Documentation

Update the relevant docs:

- `README.md`
- `ENVIRONMENT.md`
- deployment docs, if needed

Document:

- how to run development
- how to run local production safely
- what env file/overrides to use
- how CORS, CSRF, cookies, and proxying work in each topology
- why `.env-prod` does not automatically imply a localhost-compatible browser runtime

## Acceptance Criteria

The implementation should be considered complete when all of the following are true:

- `http://localhost:3001` loads with no CORS, CSRF, `requestfailed`, or `pageerror` browser issues.
- `GET /api/rest/v1/csrf-token` succeeds from the browser in local production.
- The CSRF token is usable for at least one state-changing request.
- A public state-changing request, such as newsletter signup or homepage variant tracking, succeeds locally in production mode.
- Admin login works in the chosen local production topology.
- Server CORS tests assert actual allow/deny headers and credentials behavior.
- Cookie policy tests prove secure cookies are only used when the served scheme supports them.
- A release or browser validation gate includes a production-local check that would have caught the original failure.

## Files Most Likely To Change

- `packages/ui/src/utils/serverUrl.ts`
- `packages/ui/src/utils/serverUrl.test.ts`
- `packages/server/src/index.ts`
- `packages/server/src/middleware/csrf.ts`
- `packages/server/src/auth.ts`
- new server policy helper module and tests
- `packages/server/src/rest/api.integration.test.ts`
- `e2e/fixtures/runtime-guard.ts`
- `playwright.production.config.ts` or a new Playwright config
- `scripts/start-e2e-server.sh` or a new production-local compose test script
- `docker-compose-prod.yml` or an additional local production override file
- `README.md`
- `ENVIRONMENT.md`

## Current Practical Workaround

For short-term local use, either:

- run the normal development topology, where `SERVER_LOCATION=local`, or
- start local production with explicit local CORS/cookie-safe overrides, or
- put a same-origin local proxy in front of the UI and API and have the UI call `/api`.

Do not treat this workaround as the final fix. The final fix should make topology selection explicit and covered by automated browser tests.

## Implementation Notes

Initial implementation has begun:

- Server runtime policy is centralized in `packages/server/src/config/runtimePolicy.ts`.
- CSRF and auth cookie security now uses the runtime policy instead of `NODE_ENV === "production"` directly.
- CORS options are generated by the runtime policy and rejected origins no longer become Express 500 errors.
- Helmet CSP/HSTS/CORP settings are topology-aware; local HTTP does not emit `upgrade-insecure-requests`.
- UI API base URL resolution now supports explicit `VITE_API_BASE_URL` and guarded `VITE_SERVER_URL` handling.
- The production UI server can proxy `/api` to the API container when `PROXY_API_TARGET` is set.
- Local production Docker overrides live in `docker-compose.local-production.yml`.
- Local production can be started with:

```bash
bash scripts/start-local-production.sh
```

- A browser validation gate is available:

```bash
yarn test:e2e:production-local
```

On July 2, 2026, the local production stack was rebuilt and verified with:

```bash
bash scripts/start-local-production.sh -v 3.0.4-local-runtime
yarn playwright test --config playwright.production-local.config.ts
```

The Playwright production-local public smoke passed 4/4 tests, including the newsletter signup flow that fetches CSRF state from the running production-local stack.

Follow-up implementation continued by adding the production-local auth cookie gate:

- `playwright.production-local.config.ts` loads local env values from `.env-prod` for Playwright-only credentials.
- `e2e/production-local/auth-cookie.spec.ts` logs in through the production-built UI, verifies `/api/rest/v1/auth/session` from the same browser context, and confirms the admin route is reachable without being redirected back to login.
- `validate:browser` now includes `yarn test:e2e:production-local`, so release/browser validation includes the topology that originally exposed the CORS/CSRF failure.

The local production starter was then tightened so the validation command owns readiness:

- `scripts/start-local-production.sh` now loads the selected env file for local port values, builds with `VITE_API_BASE_URL=/api`, starts the local Docker production stack, and waits for the API healthcheck, production UI, and same-origin CSRF endpoint before Playwright runs.
- On readiness timeout, it prints local Compose service status and recent UI/server logs. This is local Docker diagnostics only; it does not run production SSH, deploy, backup, cleanup, update, prune, restart, or deletion commands.
- On July 2, 2026, `yarn test:e2e:production-local` rebuilt the local production stack and passed 5/5 Playwright tests after these readiness checks.
