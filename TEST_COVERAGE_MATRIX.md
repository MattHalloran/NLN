# Release Confidence Matrix

This matrix defines the workflows that should be trustworthy before production deployment. A release is ready when the matching CI jobs are green, the validation receipt is current for the release commit, and any documented gaps are either closed or explicitly accepted.

| Workflow | Primary Risk | Current Gate | Improvement Path |
| --- | --- | --- | --- |
| Public homepage loads and first viewport is usable | Broken landing page, runtime errors, layout overflow | Stable Playwright public smoke and visual specs with runtime guard | Keep screenshots narrow and deterministic; add screenshots only when first-viewport regressions are expensive to miss |
| Public about and gallery pages load on desktop/mobile | Broken public navigation or gallery rendering | Stable Playwright public smoke and visual specs | Add gallery interaction checks when filter/sorting behavior changes |
| Public newsletter signup works | Lost lead capture, bad public POST path, duplicate/reactivation bugs | Stable Playwright newsletter signup plus server newsletter integration tests | Add admin subscriber UI coverage when subscriber management changes |
| Public account entry forms render accessibly | Broken login/signup entry points | Stable Playwright smoke checks for accessible fields and buttons | Add browser submit checks only for critical auth regressions; keep auth edge cases in integration tests |
| Admin login/session reuse works | Admin cannot access management UI | Playwright auth setup plus server auth integration tests | Add session expiry/invalid-cookie integration cases when auth policy changes |
| Admin landing-page edits persist | Admin saves appear successful but do not persist | Stable Playwright save-response checks plus landing-page integration tests | Move exhaustive field validation to integration tests; keep browser cases representative |
| Contact info and business hours persist | Incorrect public business data | Stable Playwright contact save-response check plus landing-page contact integration tests | Add focused UI unit tests for form transforms when field mapping changes |
| Hero banner content persists | Broken homepage hero, inaccessible images/alt text | Stable Playwright hero save-response check plus landing-page integration tests | Add upload-path E2E only when image upload UI changes; otherwise cover image processing in server tests |
| Seasonal plants and tips persist | Broken seasonal merchandising content | Stable Playwright seasonal save-response check plus landing-page integration tests | Replace legacy CRUD browser cases with integration tests plus one stable journey per workflow |
| Newsletter subscriber admin API is protected and usable | Subscriber data exposure or failed export/unsubscribe | Server newsletter integration tests | Add stable admin UI smoke once subscriber table controls are hardened |
| PWA production build and offline app shell work | Installed users get stale or broken assets | Production-build Playwright PWA suite | Keep this in the full/release gate because dev-server behavior is not enough |
| Public accessibility and SEO budgets remain acceptable | Regressions not visible in functional tests | Lighthouse CI collect/assert artifact in CI, currently non-blocking | Promote accessibility/SEO assertions to blocking after baseline stability is confirmed |
| Deployment scripts do not mutate production during validation | Unsafe deploy/backup/readiness changes | Bats script tests with stubs, drift checks, scheduled deploy rehearsal | Add Bats cases for each new production wrapper branch before changing scripts |
| Production deployment path can rehearse locally | Build/deploy/rollback path breaks before production | Scheduled and manual deploy rehearsal workflow | Treat failed scheduled rehearsal as release-blocking until investigated |

## Release Readiness Rule

Use `yarn validate:release` locally for pre-deploy confidence, then require matching green CI jobs for the same commit:

- `Validate`: typecheck, test typecheck, lint, unit tests, script tests, drift checks, UI production build, PWA checks, Lighthouse artifact.
- `Integration Tests`: server integration tests with disposable PostgreSQL/Redis dependencies.
- `E2E`: stable guarded Playwright admin/public suite.
- `Deploy Rehearsal`: scheduled or manual disposable production-path rehearsal for deployment changes.

The validation receipt should show the commit, worktree state, declared validation command, coverage summaries, Playwright counts, skipped/flaky counts, and artifact freshness.
