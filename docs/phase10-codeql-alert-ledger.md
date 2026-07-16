# Phase 10 CodeQL Alert Ledger

> Scope: the 12 annotations reported by the CodeQL pull-request gate for PR #34 at
> `56adb3e94414372a296327c025fce2f7dcc8ca91`. The first remediation rerun at
> `ecd59875d03ef07a5ec703120f608263e3e3fc6e` cleared seven annotations and retained
> five file-array type-confusion annotations. This file contains no production values
> or vulnerability secrets. GitHub must rerun CodeQL on the eventual candidate commit
> before the ledger can close.

## Disposition rules

- `resolved-at-dbe026d` means the remediation and regression test exist and the PR
  CodeQL gate passed at `dbe026d87f5e` without the annotation.
- Test-only findings are fixed in the harness instead of dismissed. That keeps
  synthetic applications representative of the production middleware contract.
- No query, severity, workflow, or branch-protection rule is suppressed or weakened.

## Alert ledger

| Alert | Severity | Query                                           | Location                                                          | Reachability and impact                                                                                                                               | Remediation and regression evidence                                                                                                                                                               | Status              |
| ----- | -------- | ----------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 20    | high     | `js/missing-rate-limiting`                      | `packages/server/src/app.ts:103`                                  | Production authentication was mounted before coarse API limits, allowing unbounded authorization work.                                                | Coarse read/mutation limiters now run before authentication; `app.test.ts` asserts middleware order.                                                                                              | resolved-at-dbe026d |
| 21    | high     | `js/missing-rate-limiting`                      | `packages/server/src/middleware/imageFileCountLimiter.test.ts:73` | Test-only synthetic upload route. It exercised a custom file limiter but did not declare a CodeQL-recognized request limiter.                         | The test app now mounts `express-rate-limit`; custom limiter behavior remains covered, including malformed `files`.                                                                               | resolved-at-dbe026d |
| 22    | high     | `js/missing-rate-limiting`                      | `packages/server/src/rest/index.test.ts:182`                      | Test-only disk-backed upload route performs filesystem work.                                                                                          | The synthetic app now mounts `express-rate-limit` before the upload route.                                                                                                                        | resolved-at-dbe026d |
| 23    | critical | `js/type-confusion-through-parameter-tampering` | `packages/server/src/middleware/rateLimiter.ts:161`               | Production upload metadata could supply a non-array `files` value whose polymorphic `length` affected Redis accounting.                               | Runtime array validation and explicit iteration avoid polymorphic length semantics; adversarial object coverage added.                                                                            | resolved-at-dbe026d |
| 24    | critical | `js/type-confusion-through-parameter-tampering` | `packages/server/src/rest/images.ts:171`                          | Production multipart `label` could be an array/object despite its TypeScript annotation.                                                              | Central runtime parser accepts only a scalar string and rejects ambiguous values; unit tests cover array tampering.                                                                               | resolved-at-dbe026d |
| 25    | critical | `js/type-confusion-through-parameter-tampering` | `packages/server/src/rest/images.ts:174`                          | Production `alts` could contain non-string array entries or objects.                                                                                  | Runtime parser accepts a string or all-string array only; adversarial object-array coverage added.                                                                                                | resolved-at-dbe026d |
| 26    | critical | `js/type-confusion-through-parameter-tampering` | `packages/server/src/rest/images.ts:178`                          | Production `descriptions` had the same ambiguous scalar/array behavior.                                                                               | Runtime parser accepts a string or all-string array only; object tampering coverage added.                                                                                                        | resolved-at-dbe026d |
| 27    | critical | `js/type-confusion-through-parameter-tampering` | `packages/server/src/rest/images.ts:221`                          | Parsed upload values flowed into image persistence after annotation-only checks.                                                                      | The persistence loop consumes strict parser output and iterates the validated Multer array without polymorphic length reads.                                                                      | resolved-at-dbe026d |
| 1     | high     | `js/polynomial-redos`                           | `packages/server/src/rest/newsletter.ts:36`                       | Public newsletter input reached an ambiguous email regex with potentially polynomial rejection time.                                                  | Replaced with bounded, linear string operations; a 200,000-character adversarial case is tested.                                                                                                  | resolved-at-dbe026d |
| 19    | critical | `js/request-forgery`                            | `packages/ui/scripts/serve-production.js:91`                      | An absolute-form request URL could replace the configured proxy authority and send a local validation request to an attacker-selected host.           | Configuration is restricted to credential-free HTTP(S) origins; request authority is discarded and only `/api/` path/query are copied. Bats tests cover absolute-form and unsafe configured URLs. | resolved-at-dbe026d |
| 29    | high     | `js/clear-text-logging`                         | `scripts/tests/fixtures/migration-adapter-stub.mjs:10`            | Test-only injected failure printed an environment-derived sentinel. The parent currently redacted it, but the fixture itself was unsafe in isolation. | Fixture now emits a fixed redacted failure; existing Bats coverage proves the sentinel is absent.                                                                                                 | resolved-at-dbe026d |
| 30    | high     | `js/clear-text-logging`                         | `scripts/verify-runtime-state-database-restore.mjs:263`           | Local disposable restore errors could contain the generated database password through child-process diagnostics.                                      | Public output is selected from constant safe messages; unknown diagnostics are withheld. Restore failure/redaction Bats coverage remains fail-closed.                                             | resolved-at-dbe026d |

## Additional hardening outside the 12 annotations

The integration-test Express application now declares an explicit request limiter as
well. GitHub alert 28 currently points to that synthetic authorization handler but was
not one of the 12 gate annotations. This change avoids leaving a parallel test harness
with the same implicit middleware assumption.

## First remediation rerun

GitHub analyzed `ecd59875d03ef07a5ec703120f608263e3e3fc6e`. Alerts 1, 19, 20,
21, 22, 29, and 30 no longer appeared in the PR gate. Alerts 23 through 27 were
reported again, now exclusively on uses of `.length` from the request-derived Multer
file array. The follow-up retains the runtime `Array.isArray` rejection and removes
all polymorphic `.length` reads by counting and processing files through explicit
iteration. Its status remains `implemented-awaiting-CodeQL` until GitHub analyzes the
follow-up commit. GitHub then analyzed `dbe026d87f5e`; both language analyses and the
separate PR CodeQL gate passed, with zero PR-gate annotations.

## Required closure evidence

Before Phase B exits:

1. focused unit and Bats tests must pass;
2. `yarn validate:quick`, repository safety, formatting, and the 37 unchanged
   production deployment-order tests must pass;
3. the changes must be committed and pushed normally;
4. CodeQL must rerun for the exact pushed commit; and
5. this ledger must be updated with the analyzed commit and final GitHub state.
