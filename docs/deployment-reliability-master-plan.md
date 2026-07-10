# Deployment Reliability Master Implementation Plan

## Purpose

This plan defines how to implement and validate the complete deployment reliability improvement program without changing, interrupting, or depending on the current production deployment.

The existing production deployment remains the supported production path until every prerequisite for an explicitly approved cutover has passed. New behavior must be developed behind new commands, feature flags, fixture environments, or disposable local infrastructure. Merely merging a phase must not change what the current production command does.

## Target Outcome

The completed release system must provide:

- a clean, reproducible, reviewed release built from an exact commit;
- a required trusted validation gate covering static checks, unit, integration, browser, script, deployment, and recovery tests;
- encrypted, durable, independently restorable backups of all irreplaceable runtime state;
- an optional production-style local verification using a fresh production backup, with external side effects technically impossible;
- a read-only production health gate and a separate, explicitly approved maintenance workflow;
- fast, immutable application-only rollback that preserves the live database;
- deliberate full data restore procedures with clear data-loss warnings and emergency salvage backups;
- migration compatibility classification and expand/contract migration practices;
- shorter planned downtime without requiring zero-downtime or multi-node infrastructure;
- concise operator commands, receipts, measured SLOs, and an auditable release history.

## Absolute Production Safety Boundary

### Default rule

No phase in this plan authorizes production mutation. Implementation and validation must use fixture data, stubbed commands, temporary directories, disposable Docker networks/volumes, and local or CI environments.

Do not connect to production merely to make a test more realistic. Tests must be designed so that they pass without `.env-prod`, production SSH access, production DNS, or production credentials.

### Forbidden until a separately approved production action

- `./scripts/deploy-production.sh`
- remote `./scripts/deploy.sh`
- `./scripts/rollback.sh` against production
- `./scripts/restore-runtime-state.sh --execute` against production
- production migration execution or database restore
- `docker compose down`, `up`, `restart`, `rm`, or equivalent production container mutation
- package updates, reboots, cleanup, pruning, deletion, firewall changes, or service changes on the VPS
- modifying the production checkout, environment files, runtime data, locks, timers, cron jobs, or system configuration
- testing email, SMS, webhooks, or other integrations with production credentials

### Read-only or read/copy activity

Even existing read-only health checks and read/copy backups are outside the implementation test loop. They may only be run later when the operator explicitly requests that production-facing validation. Local fixtures and stubbed SSH must be the default throughout this plan.

### Current deployment preservation rule

Until the cutover phase:

1. Do not change the behavior or ordering of the existing normal production command.
2. Add new orchestration under new command names or require an explicit non-production feature flag.
3. Do not silently redirect old commands to new implementations.
4. Do not delete old backups, scripts, images, or documented recovery paths.
5. Every proposed production mutation command must support a fixture/stub mode and fail closed when its safety context is ambiguous.

## Program Conventions

### Phase states

Each phase moves through:

1. **Designed**: interfaces, threats, failure behavior, and acceptance criteria reviewed.
2. **Implemented locally**: code exists but is not used by production.
3. **Fixture validated**: deterministic unit/script/integration tests pass.
4. **Rehearsed**: disposable end-to-end rehearsal passes, including failure injection.
5. **Merge ready**: clean checkout passes the trusted validation gate.
6. **Production eligible**: explicitly approved for a later production observation, shadow run, or cutover.

No phase becomes production eligible solely because its code was merged.

### Required evidence

Every phase must produce machine-readable receipts under `.validation/` and human-readable test output. Receipts must contain at least:

- schema version;
- command/tool version;
- Git commit;
- start and finish timestamps;
- inputs identified by safe paths, versions, and hashes;
- checks performed and their results;
- skipped checks and the explicit reason;
- output artifacts and hashes;
- final status.

Receipts and extracted production data must remain ignored by Git and use owner-only permissions.

### Failure behavior

- Fail closed before mutation.
- Never transform a warning into an implicit approval.
- Cleanup of disposable local resources must be idempotent.
- Failed validation must preserve enough local evidence for diagnosis without preserving secrets in logs.
- Recovery commands must be separate from diagnosis commands.
- Destructive recovery must never be selected automatically when application-only recovery is possible.

## Phase 0: Inventory, Baseline, and Change Isolation

### Goal

Create a trusted baseline and prevent the current uncommitted deployment-hardening work from becoming an undocumented production dependency.

### Work

1. Inventory all release-related scripts, workflows, Compose files, documentation, environment variables, runtime paths, external integrations, and recovery commands.
2. Classify every current working-tree deployment change as:
   - already reviewed and ready to commit;
   - requires additional tests;
   - superseded by this plan;
   - experimental and should remain out of the production path.
3. Split the current hardening work into reviewable commits by concern: backup, readiness, locking, migration safety, restore drill, local verification, documentation, and observability.
4. Record the current supported production command and its exact call order as a contract test.
5. Add a deployment-change ownership map identifying the scripts that are public entry points versus internal helpers.
6. Confirm `.env-prod`, backups, receipts, extracted data, keys, and JWT files are ignored and owner-readable only.
7. Add a test that committed documentation contains no concrete production host, domain, credential, token, database URL, or `.env-prod` value.

### Validation

- `git diff --check`
- secret scanning over tracked content and proposed commits
- documentation safety tests
- current deployment-order contract tests with all external commands stubbed
- full test execution from a fresh clone or clean worktree

### Exit criteria

- The hardening baseline is committed, reviewable, and reproducible.
- A clean checkout contains every script and document required by the described process.
- No new command can reach production during tests.
- The current production entry point has not changed behavior.

## Phase 1: Trusted Validation and Release Qualification

### Goal

Prove that the exact commit intended for release passed all required checks, and remove dependence on one developer machine's uncommitted state.

### Work

1. Define one versioned trusted validation manifest containing required jobs:
   - dependency lock consistency;
   - type checks for source and tests;
   - lint and formatting checks;
   - unit tests and coverage thresholds;
   - integration tests;
   - script/Bats tests;
   - migration risk checks;
   - public, admin, accessibility, visual, PWA, and production-build browser tests;
   - disposable deploy rehearsal;
   - disposable app-only rollback rehearsal;
   - fixture restore drill.
2. Make the CI trusted gate a required branch-protection check.
3. Pin or digest-pin release-critical CI actions and container images where practical.
4. Make local readiness accept only a successful trusted-gate receipt for the exact commit, while retaining a fully logged emergency override that cannot be used accidentally.
5. Fix the aggregate script test runner and the hanging local-backup-verifier test. Add per-file timeouts and always print the test filename currently running.
6. Ensure tests clean up child processes, containers, temporary networks, and volumes on success, failure, timeout, and interruption.
7. Add mutation/negative tests proving gates reject stale receipts, dirty worktrees, ahead/behind branches, wrong commits, missing artifacts, corrupt checksums, and skipped required jobs.

### Validation

```bash
yarn validate:quick
yarn test:integration
yarn validate:browser
yarn test:scripts
./scripts/deploy-rehearsal.sh -v rehearsal-<VERSION>
```

Run the same gate twice from a clean checkout to detect hidden state or order dependence.

### Exit criteria

- The complete suite terminates reliably and passes from a clean checkout.
- Required CI checks are documented and branch protection is ready to enable separately.
- A release receipt is cryptographically bound to the exact commit and artifacts.
- The existing production deploy remains unchanged.

## Phase 2: Backup Format, Integrity, and Data Inventory

### Goal

Define exactly what must be protected and produce a self-describing, integrity-checked backup format.

### Work

1. Maintain a versioned runtime-state inventory with classification:
   - PostgreSQL business data: irreplaceable, transaction-consistent logical dump required;
   - uploads and managed assets: irreplaceable, per-file integrity required;
   - `.env-prod`, optional `.env`, and `jwt_*`: irreplaceable secrets/configuration, encrypted handling required;
   - Redis queues: operationally important but not the source of record;
   - migration backups: useful recovery evidence;
   - logs: optional diagnostic data with separate retention.
2. Replace existence-only validation with a backup schema containing:
   - backup format version;
   - source application commit and release version;
   - start/end timestamps;
   - PostgreSQL server and `pg_dump` versions;
   - migration status and applied migration list;
   - every included path, file type, size, mode, and SHA-256 hash;
   - aggregate archive hash;
   - database structural facts and safe row-count invariants;
   - Redis backup semantics and queue metadata;
   - restore-verification status and verifier version.
3. Generate the manifest in staging and verify it after archive creation and extraction.
4. Validate SQL with a real disposable restore, migration status, representative queries, and critical table invariants—not merely a nonempty file.
5. Validate referenced uploads/assets against database references and sample file readability.
6. Detect files changing during copy. Either retry to a stable snapshot or mark the backup unverified and block release qualification.
7. Define explicit maximum backup duration, maximum age, RPO, retention, and restore-test cadence.
8. Retain compatibility readers for the current backup format; do not rewrite or delete existing backups.

### Validation

- fixtures for missing, extra, truncated, changed, unreadable, wrong-mode, and hash-mismatched files
- corrupt tar and corrupt SQL fixtures
- PostgreSQL version compatibility matrix
- missing upload/database-reference fixtures
- backup interrupted at each stage
- restore verification proves representative data and migrations
- legacy backup read compatibility tests

### Exit criteria

- One manifest completely describes and authenticates the backup contents.
- A single corrupt or missing critical file causes validation failure.
- Database restore verification checks useful application invariants.
- Existing backups remain readable.

## Phase 3: Durable, Encrypted, Independent Backup Storage

### Goal

Protect backups from VPS loss, workstation loss, accidental deletion, and unauthorized access.

### Work

1. Introduce a storage-provider-neutral backup publishing interface.
2. Require client-side encryption before upload. Keep encryption keys outside the repository, VPS backup, and uploaded object metadata.
3. Publish to durable object storage with:
   - TLS transport;
   - versioning or object lock where available;
   - retention/lifecycle policy;
   - least-privilege write credentials;
   - separate restore/read credentials where practical;
   - server-side encryption as an additional layer.
4. Upload archive, checksum, safe manifest metadata, and receipt atomically through a staging/finalization convention.
5. Verify the uploaded object by downloading it into a disposable environment and rechecking its cryptographic hash.
6. Define a 3-2-1-oriented policy: production copy, encrypted local/off-VPS copy, and durable remote copy on independent storage.
7. Add backup freshness monitoring and alerting without exposing backup contents or credentials.
8. Add retention cleanup as a separate dry-run-first command. Never invoke deletion from the deployment command.

### Validation

- use a local S3-compatible fixture or provider emulator
- wrong key, expired credential, interrupted upload, partial object, corrupt download, duplicate version, and retention-policy tests
- confirm logs and receipts never expose secrets
- restore exclusively from the downloaded encrypted object

### Exit criteria

- Loss of either the VPS or operator workstation does not eliminate the latest qualified backup.
- Backup content is unreadable without the separately held key.
- A downloaded remote object passes full restore verification.
- Retention deletion is not coupled to deployment.

## Phase 4: Side-Effect-Proof Local Production Verification

### Goal

Safely run a production-style build against copied production data without any possibility of contacting production or external recipients.

### Threat model

Assume the backup contains real credentials, public URLs, webhooks, queued Redis jobs, user email addresses, phone numbers, and scheduled work. Environment string replacement alone is insufficient.

### Work

1. Preserve `--backup PATH` as the default. `--create-backup` remains an explicit read/copy operation and is not used in automated tests.
2. Build a new environment from an allowlist of required safe values instead of copying `.env-prod` and editing selected keys.
3. Use generated local-only secrets and test administrator credentials. Do not reuse production JWT, CSRF, admin, database, SMTP, Twilio, webhook, or API credentials.
4. Force all delivery/integration modes to sinks:
   - email console/file sink;
   - SMS fake adapter;
   - webhook recorder;
   - object-storage/local filesystem adapter;
   - analytics disabled;
   - callbacks and OAuth disabled unless backed by local fakes.
5. Do not restore actionable Redis queues by default. Preserve a copy for inspection, then start with empty disposable Redis. Add a separate queue-compatibility test using scrubbed fixture jobs and fake workers.
6. Create an isolated Docker network with no external egress. If Docker cannot enforce this reliably on the supported host, run an explicit egress-deny proxy/firewall fixture and fail when isolation cannot be proven.
7. Add DNS poisoning/hosts guards so known production domains resolve nowhere inside the disposable stack.
8. Scan the generated environment and Compose rendering for production-looking hostnames, IPs, credentials, delivery modes, and host-mounted production paths.
9. Minimize copied PII where full fidelity is unnecessary. Document when real production data is required, who may access it, retention, cleanup, and incident response.
10. Start disposable PostgreSQL and empty Redis, restore SQL, build the exact release commit, apply migrations, and start the production Compose definition with a local override.
11. Run public, same-origin API, migration-status, representative read, admin reversible-write, upload-read, and queue-sink checks.
12. Verify cleanup removed containers, volumes, networks, extracted data, generated secrets, and temporary receipts unless `--keep` was explicitly requested.

### Mandatory safety tests

- fail if `TWILIO_*`, SMTP credentials, production phone numbers, external webhook URLs, or production admin credentials survive
- fail if any container can reach a controlled external canary endpoint
- seed email/SMS/webhook/queue work and prove only local fake sinks receive it
- prove `--backup` performs no SSH or network backup call
- prove production Redis queue files are not mounted into active Redis
- interrupt at each stage and verify cleanup
- verify owner-only permissions for extracted data

### Exit criteria

- External delivery is impossible even if production data contains queued work.
- The runtime environment is allowlist-generated and contains no production credentials.
- The production build operates successfully against restored data and migrated schema.
- The command produces a useful receipt and cleans up deterministically.

## Phase 5: Immutable Release Bundles and App-Only Rollback

### Goal

Make each release self-contained and enable fast rollback of application code without replacing the live database.

### Work

1. Define an immutable release bundle containing:
   - release schema version and application version;
   - exact Git commit;
   - exact Compose definition and deployment helpers;
   - built artifacts and hashes;
   - Docker image digests and optional image archive;
   - readiness/trusted-gate receipt;
   - migration list and compatibility classification;
   - environment schema fingerprint, never secret values;
   - backup receipt references;
   - public endpoint and health contract.
2. Reject version reuse and bundle overwrites.
3. Verify the complete bundle before any live mutation.
4. Add a dedicated app-only rollback command that:
   - selects an immutable known-good bundle;
   - validates database compatibility;
   - creates no database replacement;
   - restores exact app images, artifacts, Compose definition, and safe release metadata;
   - verifies health and public endpoints;
   - records timing and outcome.
5. Keep database/runtime restore as a separate destructive command with explicit confirmation.
6. Record the last-known-good release only after the full post-deploy smoke gate passes.
7. Ensure failed post-wrapper smoke checks print and optionally invoke the safe app-only rollback path only when compatibility evidence permits it.

### Validation

- rollback across Compose changes, image tag changes, removed artifacts, and changed environment schema
- wrong/corrupt bundle and wrong commit rejection
- failed startup, failed health, failed public endpoint, and failed post-deploy smoke injection
- rollback must preserve database writes made after deploy
- app-only rollback timing must meet the proposed RTO in repeated rehearsals

### Exit criteria

- A known-good application release can be restored without Git network access and without touching the database.
- The exact old Compose/release definition is used.
- App-only rollback refuses incompatible database states.
- Rehearsed RTO is measured and documented.

## Phase 6: Migration Compatibility and Controlled Migration Execution

### Goal

Make migration risk explicit and keep application-only rollback safe whenever possible.

### Work

1. Require every release to classify migrations as:
   - none;
   - backward-compatible/app rollback safe;
   - backward-compatible for a bounded window;
   - non-backward-compatible/destructive.
2. Require a structured migration metadata file, not only an SQL comment, recording rationale, data volume expectations, lock risk, estimated duration, rollback strategy, and tested database versions.
3. Adopt expand/contract migrations:
   - add nullable/new structures;
   - deploy code that supports old and new schema;
   - backfill separately and resumably;
   - switch reads/writes;
   - remove old structures in a later release.
4. Move migration execution from incidental server startup into a one-shot migration service/command with an advisory lock and a clear receipt.
5. Add migration timeouts, lock monitoring, transaction strategy, disk-space checks, and failure diagnostics.
6. Rehearse migrations against a recent restored backup and a scaled synthetic dataset.
7. Block automatic app-only rollback for releases explicitly classified incompatible; require a reviewed forward-fix or data recovery decision.
8. Do not pretend down migrations are safe when they would discard new data. Prefer forward fixes and expand/contract compatibility.

### Validation

- compatibility tests run old app/new schema and new app/old-or-transition schema where supported
- large-table migration timing and lock tests
- interruption, retry, advisory-lock contention, and partially applied migration tests
- destructive migration cannot pass without structured approval evidence
- app-only rollback compatibility gate tests

### Exit criteria

- Migration execution is observable and independent from normal server startup.
- Every release declares rollback compatibility.
- Routine releases preserve app-only rollback safety.
- High-risk migrations require an explicit special deployment plan.

## Phase 7: Reduced-Downtime Deployment Path

### Goal

Shorten routine downtime without introducing multi-node orchestration or claiming zero downtime.

### Design

Keep PostgreSQL and Redis running during ordinary application releases. Recreate only the UI/server services after all artifacts, images, backups, migrations, and release checks are ready.

### Work

1. Add a new local/rehearsal-only deployment mode; do not alter the existing `down`/`up` production path yet.
2. Separate Compose service lifecycle operations:
   - validate DB and Redis health;
   - run the one-shot migration service;
   - stop/recreate server and UI only;
   - leave DB and Redis containers and volumes untouched.
3. Establish start order and readiness:
   - server must be healthy before UI/proxy declares readiness;
   - public checks must confirm real dependency connectivity;
   - migrations must finish successfully before new app activation.
4. Measure downtime from first failed public request through restored public health, not merely from command timestamps.
5. Preserve the full-stop mode as an explicit exceptional path for changes that genuinely require it.
6. Add automatic app-only rollback using the immutable prior release if activation fails and migration compatibility permits it.
7. Avoid destructive Compose commands such as `down -v` in all deployment and rollback paths.

### Failure-injection matrix

- new UI fails to start
- new server fails to start
- health remains `starting`
- DB or Redis becomes unavailable
- migration fails before activation
- public proxy route fails while internal health passes
- artifact swap is interrupted
- disk fills during image load
- rollback image or bundle is missing/corrupt

### Exit criteria

- Routine rehearsal never stops or recreates PostgreSQL or Redis.
- Failure before app recreation causes no user-visible downtime.
- Repeated measured routine downtime is materially below the existing baseline.
- All injected activation failures either recover automatically or stop with precise safe recovery instructions.

## Phase 8: VPS Health Gate and Separate Maintenance Workflow

### Goal

Improve production readiness checks while keeping maintenance deliberate and independent from application deployment.

### Read-only health work

Expand the health report to check:

- actual container health and restart counts, not only running state;
- PostgreSQL readiness, connectivity, migration state, and a read-only query;
- Redis connectivity, persistence configuration, memory, and queue backlog metadata;
- disk bytes and inode availability for project, Docker, backup, and database paths;
- memory, swap, load, recent OOM events, and filesystem errors;
- Docker daemon state and abnormal disk growth;
- failed systemd units and pending reboot;
- time synchronization;
- backup age, last qualified remote copy, and last restore-drill receipt;
- TLS certificate expiry and public endpoint reachability where appropriate;
- package-update information clearly labeled stale unless indexes were refreshed during separate maintenance.

Each result must be classified as blocking, warning, or informational with an explanation and non-executing recommendation.

### Separate maintenance workflow

Create a dry-run-first maintenance planner that can report proposed actions without changing the VPS. A future execute mode must require separate approval and include:

1. fresh qualified backup and recovery evidence;
2. maintenance lock;
3. exact package/update preview;
4. capacity cleanup inventory with explicit selections;
5. controlled update/reboot steps;
6. service, database, Redis, and public health verification;
7. maintenance receipt and recovery instructions.

Never automatically bundle OS updates, reboot, Docker pruning, or backup deletion into an application deployment.

### Validation

- stub every remote command and test classification thresholds
- fixtures for low bytes, low inodes, OOM, restart loop, failed DB query, stale backup, expiring certificate, pending reboot, and stale apt metadata
- assert read-only mode contains no remediation command execution
- maintenance execute tests run only against disposable VM/container fixtures

### Exit criteria

- Health checks detect the principal resource and dependency failure modes.
- Read-only mode is mechanically prevented from mutating state.
- Maintenance remains a separately authorized operation with its own backup and validation gates.

## Phase 9: Restore, Disaster Recovery, and Data-Salvage Qualification

### Goal

Prove recovery rather than assuming backup success implies recoverability.

### Work

1. Define three distinct recovery commands and documentation paths:
   - app-only rollback, no database replacement;
   - database restore, with explicit RPO/data-loss analysis;
   - full runtime/disaster restore to a clean host.
2. Add dry-run planning output listing exact inputs, hashes, affected services/data, expected downtime, and data-loss boundary.
3. Before destructive restore, require an emergency logical dump and copies of current critical runtime files unless an explicit disaster override is recorded.
4. Restore into a disposable clean-host fixture using only:
   - immutable release bundle;
   - encrypted remote backup;
   - separately supplied recovery keys/configuration.
5. Verify database invariants, assets/uploads, authentication/session behavior as appropriate, queues, migrations, public pages, admin reads/writes, and application logs.
6. Exercise salvage of writes from the emergency dump into a restored database using a documented manual reconciliation workflow.
7. Schedule fixture restore drills frequently and controlled real-backup drills at an approved cadence. CI fixture drills do not substitute for real-backup drills.

### Validation

- clean-host restore with no repository network access
- missing/corrupt release, backup, key, env, upload, and JWT fixtures
- restore interruption at every destructive boundary
- PostgreSQL major-version compatibility test
- emergency dump creation failure blocks destructive restore
- measured RTO/RPO and retained receipts

### Exit criteria

- A clean disposable host can be rebuilt from independently stored artifacts.
- Full recovery meets the documented RTO in repeated drills.
- Operators can explain exactly which writes a selected restore would lose.
- Emergency salvage evidence is retained until recovery is formally closed.

## Phase 10: Operator Interface, Documentation, and Observability

### Goal

Make the safe path obvious and the dangerous paths difficult to confuse with routine deployment.

### Proposed operator interface

```bash
./scripts/release-prepare.sh -v <VERSION> -e .env-prod
./scripts/release-verify-backup-locally.sh -v <VERSION> --backup <PATH>  # optional
./scripts/release-deploy.sh -v <VERSION> -e .env-prod
```

These wrappers should delegate to small testable helpers. Lower-level deploy, rollback, restore, backup, and maintenance commands remain available but are clearly advanced/recovery operations.

### Work

1. Create one short release runbook with preflight checklist, stop conditions, expected prompts, success evidence, and failure decision tree.
2. Move historical implementation narratives to an archive or clearly mark them as plans rather than current instructions.
3. Generate command help and documentation from shared terminology where practical.
4. At successful completion, print:
   - release version and commit;
   - trusted-gate receipt;
   - immutable bundle hash;
   - backup and remote-copy receipt;
   - restore/local-verification evidence;
   - migration classification and result;
   - health and smoke results;
   - measured downtime;
   - exact safe app-only rollback command;
   - clearly labeled destructive recovery commands.
5. Store structured deployment receipts and summarize trends: duration by phase, downtime, backup duration/size, restore duration, rollback rehearsal duration, and failure cause.
6. Define alerts for missed backups, failed drills, stale receipts, repeated deploy failures, and SLO violations.

### Exit criteria

- A routine operator can identify prepare, optional local verification, deploy, and app rollback in under two minutes.
- Documentation has one authoritative normal path.
- Every release has an auditable evidence chain.
- Dangerous commands are clearly labeled and require deliberate confirmation.

## Phase 11: Shadow Adoption and Explicit Production Cutover

### Goal

Adopt the new system without replacing the proven path prematurely.

### Stage A: local-only

- All new commands run solely with fixtures and disposable infrastructure.
- Complete failure-injection matrix passes.
- Clean-checkout trusted gate passes repeatedly.

### Stage B: CI rehearsal

- Scheduled deploy, rollback, encrypted backup, and clean-host restore rehearsals run with synthetic data.
- Flaky or hanging tests block advancement.

### Stage C: production-facing observation, separately approved

- Run only approved read-only health checks and backup preflight.
- Compare new reports with the existing reports.
- No production files, services, containers, packages, or data are changed.

### Stage D: production read/copy backup qualification, separately approved

- Create a fresh off-VPS backup using the approved read/copy path.
- Publish encrypted copy to durable storage.
- Restore and verify it locally with egress isolation.
- Do not deploy.

### Stage E: approved canary use of evidence only

- Use new readiness receipts, bundle generation, and reporting around the existing deployment without changing the existing remote mutation sequence.
- Confirm output, timing, and recovery artifacts.

### Stage F: approved deployment cutover

- Select a low-risk release with no destructive migration.
- Record a go/no-go review, owners, maintenance window, backup evidence, compatibility classification, rollback command, and stop conditions.
- Enable the new reduced-downtime/app-only rollback path explicitly for that release.
- Keep the old path and artifacts available during the defined rollback window.

### Stage G: stabilization

- Review receipts and measured SLOs.
- Fix gaps before broader adoption.
- Deprecate the old path only after multiple successful releases and recovery rehearsals; do not immediately delete it.

### Cutover exit criteria

- Explicit human approval exists for the production mutation.
- Latest encrypted remote backup has passed a real restore verification.
- App-only rollback is rehearsed for the exact release transition.
- Migration compatibility permits rollback.
- Health and capacity gates pass.
- Named operators understand stop conditions and recovery choices.

## Cross-Phase Validation Matrix

| Risk | Required proof |
| --- | --- |
| Bad code reaches deployment | Required trusted CI gate bound to exact commit |
| Artifact differs from tested code | Immutable bundle and checksum/digest verification |
| Backup is incomplete | Per-file manifest plus database/application invariants |
| Backup exists but cannot restore | Disposable SQL, app, and clean-host restore drills |
| VPS and workstation both fail | Encrypted independent durable remote copy |
| Local production test sends real messages | Allowlist env, fake adapters, empty Redis, blocked egress, canary test |
| Migration breaks old app | Compatibility classification and old-app/new-schema test |
| Failed app deploy loses new writes | App-only rollback without database replacement |
| Rollback uses new Compose definition | Immutable release includes exact Compose and helpers |
| Routine deploy stops DB unnecessarily | Service-scoped lifecycle rehearsal proves DB/Redis remain running |
| Maintenance causes surprise outage | Separate approval, preview, backup, receipt, and post-checks |
| Operator selects wrong path | Three-command interface and concise decision-oriented runbook |
| Recovery is too slow | Repeated measured RTO drills and SLO review |

## Definition of Done for the Program

The program is complete only when all of the following are true:

- all deployment improvements are committed and pass from a clean checkout;
- CI trusted gate is required and bound to the exact release commit;
- the aggregate test suite finishes reliably with no hangs;
- runtime backups have versioned per-file integrity manifests and restore-tested database invariants;
- qualified backups are encrypted and replicated to independent durable storage;
- restored-production local verification has proven egress isolation and fake external adapters;
- immutable release bundles support exact application-only rollback;
- migration compatibility is structured, tested, and enforced;
- routine deployment rehearsals keep PostgreSQL and Redis running;
- health checks cover dependencies, resources, backup freshness, and system state without mutation;
- maintenance is separate, dry-run-first, and separately authorized;
- clean-host disaster restore and emergency salvage drills meet measured RTO/RPO targets;
- the release runbook has one authoritative normal path;
- production cutover was separately approved and completed only after shadow qualification;
- the legacy path remains available until multiple new-path deployments and rollback rehearsals have succeeded.

## Recommended Implementation Order

Execute phases in this dependency order:

1. Phase 0: baseline and isolation.
2. Phase 1: trusted validation and test stability.
3. Phase 2: backup format and integrity.
4. Phase 4: side-effect-proof local verification.
5. Phase 3: encrypted durable storage.
6. Phase 6: migration compatibility.
7. Phase 5: immutable release/app rollback.
8. Phase 7: reduced downtime.
9. Phase 8: health and maintenance.
10. Phase 9: disaster recovery qualification.
11. Phase 10: operator interface and documentation.
12. Phase 11: shadow adoption and approved cutover.

Phases may be developed on separate branches, but production adoption must follow the dependency order. In particular, reduced-downtime deployment must not precede migration compatibility and immutable app-only rollback, and real-production local verification must not precede side-effect isolation.

