# Deployment Surface Inventory

Status: Phase 0 baseline. This document describes the current supported path; it
does not authorize production access or change deployment behavior.

## Supported Production Contract

The only routine production entry point is:

```bash
./scripts/deploy-production.sh -v <VERSION> -e .env-prod
```

Its externally observable order is protected by the stub-only contract test in
`scripts/tests/deploy-production.bats`:

1. validate the local environment;
2. acquire the deployment lock and require a clean, synchronized worktree;
3. verify a fresh readiness receipt for the exact version and commit;
4. run the read-only VPS health check;
5. reject reuse of the remote version backup slot;
6. run offsite-backup preflight;
7. create and restore-verify the mandatory offsite backup;
8. build and transfer artifacts;
9. invoke the lower-level remote deploy;
10. run post-deploy admin smoke checks;
11. report remote container state and write a deployment receipt.

Tests replace validation, health, SSH, backup, build, and deploy calls with
local stubs. They must never require `.env-prod`, an SSH key, or a reachable VPS.

## Ownership Map

### Routine public entry points

| Command                       | Responsibility                                            | Production effect                                          |
| ----------------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| `prepare-deploy-readiness.sh` | Produce release evidence without deploying                | Optional read/copy checks only when explicitly selected    |
| `deploy-readiness.sh`         | Run validation, rehearsal, migration, and preflight gates | May perform approved read-only/read-copy checks            |
| `deploy-production.sh`        | Normal production orchestration                           | Mutating; production use requires explicit operator action |
| `backup.sh`                   | Off-VPS runtime-state backup and verification             | Read/copy; never part of local automated tests             |
| `vps-healthcheck.sh`          | VPS readiness report                                      | Read-only                                                  |

### Local and disposable qualification entry points

| Command                               | Responsibility                                      | Safety boundary                          |
| ------------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| `deploy-rehearsal.sh`                 | Disposable end-to-end deploy and rollback rehearsal | Local fixture infrastructure only        |
| `restore-drill.sh`                    | Restore qualification from a supplied backup        | `--backup` is the automated-test default |
| `verify-production-backup-locally.sh` | Production-style local verification                 | `--backup` must not contact production   |
| `validate-trusted.sh`                 | Aggregate trusted validation                        | Local/CI only                            |
| `validate-release.sh`                 | Release validation orchestration                    | Local/CI only                            |

### Advanced mutation and recovery entry points

| Command                    | Responsibility                | Operator rule                                                |
| -------------------------- | ----------------------------- | ------------------------------------------------------------ |
| `deploy.sh`                | Lower-level remote activation | Called by the supported wrapper; direct use is advanced-only |
| `rollback.sh`              | Older full-state rollback     | Destructive; not routine app rollback                        |
| `restore-runtime-state.sh` | Runtime-state restore         | Dry-run by default; `--execute` is destructive               |
| `applyMigrations.sh`       | Database migration execution  | Never run against production during implementation           |
| `build.sh`                 | Build and artifact transfer   | Production transfer only through approved orchestration      |

### Internal deployment helpers

- `deploy-safety.sh`: worktree, version, and receipt safety primitives.
- `deploy-lock.sh`: shared mutation lock.
- `runtime-state.sh`: runtime backup discovery and compatibility helpers.
- `check-deploy-migration-gate.sh` and `check-migrations.sh`: migration gates.
- `deploy-smoke.sh` and `public-smoke.mjs`: post-activation checks.
- `deploy-receipt.mjs` and `validation-receipt.mjs`: evidence writers.
- `shared.sh`, `utils.sh`, `env-defaults.sh`, and `validate-env.sh`: common
  environment and shell support.

## Release Definitions and Automation

- `docker-compose-prod.yml`: current production service definition.
- `docker-compose.local-production.yml`: local production-style override.
- `docker-compose.yml`: development/default service definition.
- `.github/workflows/ci.yml`: validation, integration, browser, rehearsal, and
  trusted-gate jobs.
- `config/trusted-validation-manifest.json`: versioned machine-readable list of
  required CI jobs, commands, evidence artifacts, and receipt requirements.
- `.github/workflows/deploy-rehearsal.yml`: scheduled disposable rehearsal.
- `.github/workflows/restore-drill.yml`: scheduled synthetic restore drill.
- `.github/workflows/codeql-analysis.yml`: security analysis.
- `.github/workflows/lighthouse.yml`: scheduled performance checks.

## Runtime State and Protection Classification

| State                                 | Classification                                | Current protection expectation         |
| ------------------------------------- | --------------------------------------------- | -------------------------------------- |
| PostgreSQL                            | Irreplaceable source of record                | Logical dump plus restore verification |
| `data/uploads` and `assets`           | Irreplaceable user/application files          | Included in runtime backup             |
| `.env-prod`, optional `.env`, `jwt_*` | Irreplaceable secrets/configuration           | Git-ignored and owner-only             |
| Redis persistence                     | Operationally important, not source of record | Best-effort runtime backup             |
| `data/migration-backups`              | Recovery evidence                             | Included and Git-ignored               |
| Logs                                  | Optional diagnostics                          | Excluded by default                    |
| `.validation` receipts                | Local release evidence                        | Git-ignored and owner-only             |

Sensitive local files must be mode `0600`; sensitive directories must be mode
`0700`. The repository-safety audit checks tracked content, ignore rules, and
the supplied local environment file's mode. Its optional value comparison is
limited to unique credential-bearing values; public endpoints are not treated
as secrets by this heuristic.

## Current Baseline Classification

At the creation of this inventory, the only untracked deployment change was
`docs/deployment-reliability-master-plan.md`. It is planning documentation and
does not alter the production path. Existing deployment hardening scripts and
tests are part of the tracked baseline and require regression validation rather
than reconstruction.

Phase 0 changes introduced alongside this inventory are documentation, a
read-only repository audit, and stubbed/local tests only. No current entry point
is redirected, reordered, or removed.

## Phase 0 Review and Commit Map

The Phase 0 work should be reviewed and committed by concern; this section is a
map, not authorization for an agent to create commits:

1. **Planning baseline:** `docs/deployment-reliability-master-plan.md`.
2. **Inventory and ownership:** this document.
3. **Repository safety gate:** `.gitignore`,
   `scripts/audit-public-repository-safety.sh`, its Bats tests, the package
   command, and the clean-checkout CI invocation.
4. **Phase 1 test reliability:** `scripts/tests/__runTests.sh` adds active-file
   reporting and per-file timeouts; the validation receipt and its tests enforce
   owner-only evidence permissions.

The first two groups are documentation-only. The third and fourth groups are
local/CI-only validation changes. None changes the supported production command,
remote call order, Compose lifecycle, backup behavior, or restore behavior.

## Clean-Checkout Baseline

CI is the authoritative clean-checkout execution environment: it checks out the
candidate commit before dependencies are installed and runs the repository
safety audit before any build or test command. A merge-ready Phase 0 candidate
must show:

- the repository-safety audit and its Bats failure fixtures pass;
- the existing stubbed production deployment-order contract passes unchanged;
- `yarn validate:quick` passes from the CI checkout;
- `git diff --check` passes for the candidate patch; and
- the CI checkout contains every path listed in the ownership map.

A local dirty worktree cannot honestly supply clean-checkout evidence. Until
the changes are committed by an authorized operator, local results are useful
pre-commit evidence but Phase 0 remains short of its merge-ready exit criterion.

## Phase 1 Trusted Gate Contract

`config/trusted-validation-manifest.json` is the authoritative versioned
inventory of release-qualification jobs. `scripts/validate-trusted-manifest.mjs`
fails closed if the manifest is malformed, allows unsafe artifact paths, omits
receipt requirements, names a missing workflow job, or if the CI trusted gate
does not depend on every required job. The validator runs before dependency
installation in CI and as part of `yarn validate:quick`.

Each required job now creates a machine-readable receipt only after its commands
and required evidence exist. `scripts/trusted-job-receipt.mjs` binds the job to
the manifest hash, exact 40-character commit, workflow run and attempt, and the
SHA-256 and size of every required artifact. The trusted-gate job downloads all
four receipts and `scripts/aggregate-trusted-receipts.mjs` rejects missing,
skipped, wrong-commit, wrong-run, wrong-manifest, extra/missing-artifact, and
malformed-hash evidence before writing `.validation/trusted-gate.json`.

Downloaded trusted-gate evidence can be checked locally with
`yarn validate:trusted-receipt --receipt <PATH>`. The additive verifier defaults
to the current `HEAD`, binds the receipt to the exact versioned manifest, requires
exactly one successful result for every required job, validates all recorded
artifact hashes and sizes, and rejects stale, future-dated, malformed, or
symlinked evidence. It is not yet wired into the existing readiness or production
deployment entry points; doing so is reserved for the separately reviewed
cutover, so the current production command contract remains unchanged.

These JSON receipts are additive CI evidence. Existing deployment readiness and
the supported production entry point do not consume them yet; changing that
boundary requires later fixture validation and an explicitly reviewed cutover.
Release-critical actions in the trusted CI workflow are pinned to immutable full
commit SHAs, with their readable major versions retained as comments. The
manifest validator rejects a floating action tag. Branch protection and
container-image digest policy remain administrative and follow-up Phase 1 work.

## Phase 2 runtime-state data contract

`config/runtime-state-inventory.json` is the versioned classification and
integrity contract for the future backup format v2. It distinguishes
irreplaceable PostgreSQL data, uploads, managed assets, secret configuration,
recoverable Redis state, recovery evidence, and optional logs. The contract
requires per-object type, size, mode, and SHA-256 evidence; stable-copy
detection; disposable database restore; and structural and safe row-count
invariants. It also explicitly requires legacy `manifest.txt` readers and
forbids rewriting or deleting legacy backups.

`scripts/validate-runtime-state-inventory.mjs` runs in `validate:quick` and
fails closed if critical data becomes optional, secret handling loses its
encryption/permission requirement, paths become unsafe or duplicated, or a v2
integrity requirement is disabled. This is specification-only in the current
slice: the existing production-facing `backup.sh`, restore commands, archive
format, and deployment ordering are unchanged.

`scripts/runtime-state-manifest-v2.mjs` is the local-only content-manifest
writer and verifier for the future format. It records every inventoried file
and directory with type, byte size, mode, and SHA-256 (for files), rejects
links and special files, and detects objects that change while they are being
captured. Verification rescans the extracted tree and requires an exact match.
The writer refuses to overwrite existing evidence. It is intentionally not
called by `backup.sh`, `deploy.sh`, restore, rollback, or readiness while the
format is developed and reviewed; legacy `manifest.txt` remains the only
production path.

`scripts/capture-runtime-state-manifest-v2.mjs` is the additive stable-capture
orchestrator for that writer. It retries only explicit file or directory
change-during-capture failures, uses a bounded policy (three attempts by
default), immediately rejects every other error, refuses existing evidence,
and requires failed attempts to leave no manifest behind. Exhausted retries
leave the backup unqualified. It is fixture-tested through an injected local
manifest tool and is not called by `backup.sh`, readiness, deployment,
rollback, or restore.

`scripts/runtime-state-archive-v2.mjs` adds the local-only archive envelope for
that content manifest. It creates reproducible gzip-compressed tar archives,
records the aggregate archive hash and size, binds the content-manifest hash to
safe capture metadata (source commit, release, timestamps, PostgreSQL tool and
server versions, migrations, and database facts), and verifies archives through
a disposable extraction. Verification rejects changed receipts, corrupt bytes,
links and special entries, unsafe manifest paths, insecure evidence permissions,
and pre-existing extraction destinations. Creation and receipt publication are
no-overwrite operations; an incomplete receipt publication removes the newly
created archive rather than leaving ambiguous evidence. This command is not
connected to any production-facing backup, deployment, readiness, rollback, or
restore path.

`config/runtime-state-database-invariants.json` and
`scripts/verify-runtime-state-database-invariants.mjs` define the local-only,
fail-closed comparison layer for a future disposable PostgreSQL restore runner.
The verifier requires owner-only expected and observed facts, the PostgreSQL
major version, exact ordered migration identity, the complete expected table
set, exact safe row counts, and named integrity checks that all pass. Successful
evidence is hash-bound to the contract and both fact files and is published with
owner-only permissions without overwriting prior evidence. The verifier accepts
only JSON fact files; it cannot connect to PostgreSQL, Docker, SSH, or production.

`scripts/verify-runtime-state-database-restore.mjs` supplies the separate,
local-only collection step for fixture SQL dumps. It accepts only owner-only
regular input files, starts a randomly named PostgreSQL container with no
published ports or network and with disposable tmpfs storage, restores the SQL,
collects migrations, tables, selected safe row counts, and fixed integrity
checks, and delegates comparison to the invariant verifier. When the expected
facts require `upload_files_present_and_readable`, `--content-root` binds every
safe relative `image_file.src` reference to a readable regular file below the
extracted `assets/images` tree; missing files, traversal paths, links, and an
insecure or linked content root fail verification. It always removes
the disposable container after success or failure, refuses to overwrite
evidence, and supports a stub Docker executable for tests. Neither this runner
nor the invariant verifier is invoked by current backup, readiness, deployment,
rollback, or restore paths.

`scripts/verify-runtime-state-backup.mjs` is the additive compatibility reader
for offline backup qualification. Given a legacy runtime-state backup directory,
it verifies the legacy aggregate archive hash, rejects unsafe archive entries,
extracts into an owner-only disposable directory, and checks the critical legacy
paths and secret permissions. Given a v2 archive and receipt, it delegates to
the strict v2 archive verifier. Its owner-only, no-overwrite receipt labels the
legacy assurance level and its missing guarantees explicitly; a legacy archive
can therefore remain readable without being represented as equivalent to v2
per-object integrity. It does not rewrite backups and is not called by
`backup.sh`, readiness, deployment, rollback, or production restore.

`config/runtime-state-backup-policy.json` turns the remaining Phase 2 time and
retention requirements into a versioned, fail-closed contract. It bounds
capture duration, general qualified-backup age, stricter pre-deploy age and
routine RPO exposure; defines daily, weekly, monthly, failed-evidence, and log
retention; and requires fixture and explicitly approved qualified-backup restore
cadences. Deletion must remain a separate dry-run-first operation, cannot be
called by deployment, and must preserve incident holds. These are initial
policy values to validate with measurements before any production adoption.

`config/runtime-state-postgres-compatibility.json` records PostgreSQL 13 as the
current production major, requires an evidenced disposable 13-to-13 restore,
and lists forward restores separately as exploratory and pending. Pending cases
cannot qualify production use, and images must be digest-pinned before this
matrix can be adopted by a production path. The repository currently records
the successful real disposable synthetic 13-to-13 restore described by the
Phase 2 test evidence; it does not claim that pending forward cases passed.

`scripts/validate-runtime-state-backup-policy.mjs` validates both contracts and
runs in `validate:quick`. It rejects unbounded or weakened age/RPO settings,
implicit retention deletion, unapproved real-backup drills, missing current
PostgreSQL restore evidence, older dump tools, and mismatched restore images.
This remains specification-only: it is not called by `backup.sh`, readiness,
deployment, rollback, retention cleanup, Docker, or production restore.

## Phase 3 remote-storage security contract (additive only)

`config/runtime-state-remote-storage-policy.json` defines the provider-neutral boundary for a future durable remote backup publisher. `scripts/validate-runtime-state-remote-storage-policy.mjs` enforces client-side age encryption, external key custody, TLS and provider capability minimums, staging/finalization without overwrite, downloaded-object verification, 3-2-1 resilience, safe freshness monitoring, and deployment-independent dry-run-first retention.

The contract deliberately contains no provider endpoint, bucket, account, credential, encryption private key, or production value. It also sets `productionIntegrationEnabled` to false and is not consumed by `backup.sh`, deployment, readiness, rollback, restore, or maintenance. Enabling a real provider or connecting publication to an existing production entry point is reserved for a separately reviewed and explicitly approved cutover after the fixture publisher, encryption, failure-injection, download, and restore tests exist.

`scripts/publish-runtime-state-backup.mjs` is the additive, provider-neutral
fixture publisher for this boundary. It first validates the policy and source v2
archive, requires separate owner-only age recipient and identity files, encrypts
before invoking the provider adapter, and uploads the four policy objects under
a unique staging prefix. It verifies each staged size and hash, downloads the
staged ciphertext, verifies its hash, decrypts it into an owner-only disposable
directory, and runs the full v2 archive verifier before promotion. Qualified
objects are no-overwrite, and the qualification receipt is promoted last.
Failed staging is cleaned without deleting any qualified object.

The provider interface is an injected executable with `put`, `stat`, `promote`,
`get`, and `delete-prefix` operations. The repository supplies only a local
fixture adapter and deterministic age test stub; it contains no real provider
adapter or credentials. Failure output deliberately omits child-process output
so credentials and archive contents cannot leak. Tests cover interrupted
uploads, corrupt downloads, wrong keys, duplicate backup IDs, full downloaded
restore verification, permissions, and secret redaction. This command is not
called by `backup.sh`, readiness, deployment, rollback, restore, maintenance, or
retention cleanup, and the policy continues to forbid production integration.

`scripts/check-runtime-state-backup-freshness.mjs` now provides a separate,
read-only fixture monitoring interface. It consumes only provider-safe object
metadata, rejects missing, stale, future-dated, malformed, or unsafe evidence,
and can emit an owner-only receipt without downloading backup contents.
`scripts/cleanup-runtime-state-remote-backups.mjs` is a separate retention
interface that is dry-run-only unless both `--execute` and the exact destructive
confirmation are supplied. It refuses to act on incomplete qualified backups,
preserves explicit incident holds, validates the disconnected policy first,
and publishes no-overwrite owner-only evidence. Neither command is called by
backup, readiness, deployment, rollback, restore, or maintenance. The supplied
provider remains a local fixture only; real-provider selection and retention
cutover require separate review and approval.

An opt-in disposable integration test also exercises the publisher with the
real `age` CLI and a MinIO S3-compatible emulator. The MinIO server and client
images are digest-pinned, share an internal Docker network with no published
host ports, use fixture-only credentials, enable bucket versioning and object
locking, and are removed with their network after the test. The injected
emulator adapter contains no endpoint or credential and is test-only. Run it
explicitly with `yarn test:runtime-state-s3-emulator`; it is excluded from the
ordinary script suite so normal validation never pulls images or mutates
Docker. This is emulator evidence only: TLS, provider-side encryption, and
capability validation still require a separately reviewed real-provider
adapter before any production eligibility decision.

## Phase 4 local restored-data safety boundary (additive only)

`scripts/verify-production-backup-locally.sh` now treats the backed-up
production environment and queue state as untrusted inputs. It requires the
backed-up `.env-prod` as inventory evidence but does not copy or source it.
Instead it writes an owner-only environment from an explicit allowlist with
fresh local JWT, CSRF, database, and administrator secrets. Email and SMS are
forced to `disabled`; Twilio, phone, SMTP, webhook, OAuth, cloud-storage, and production
endpoint settings are absent. Optional backed-up `.env` and `jwt_*` files are
not copied into the disposable project.

Copied Redis state is retained under `data/redis-backup-inspection` for offline
inspection only; active Redis starts empty. A generated Compose override
replaces both application networks and all four container names with unique
per-version names. After startup the verifier checks Docker's `Internal` property for both networks and
executes a bounded socket canary from the server container; any successful
external connection fails verification before a receipt can be issued. It then
executes the compiled email and SMS processors with fixture jobs and requires
both to report the disabled sink. The server-created disposable administrator
is used by the existing admin smoke suite to make, verify, and restore
representative application writes. Tests seed production-looking integration
values and queue data, prove they do not enter the active environment or Redis
directory, and prove unsafe delivery modes and simulated egress fail closed.

This remains a local, explicitly invoked verifier. `--backup` performs no SSH
or production read, while `--create-backup` remains an explicit production
read/copy operation outside automated validation. The verifier is not called by
backup, readiness, deployment, rollback, restore, or maintenance. The work
directory is owner-only and removed by default; `--keep` is rejected unless the
operator supplies `--acknowledge-sensitive-data-retention`. Failure injection
tests prove post-restore interruption tears down the stack and emits no passing
receipt.

Phase 4's real-Docker exit rehearsal passed on 2026-07-13 against a disposable,
migration-complete synthetic PostgreSQL 13 backup produced by
`scripts/create-synthetic-runtime-state-backup.sh`. The rehearsal performed a
clean dependency install with the `.nvmrc` Node version, restored the logical
SQL dump, built the shared/server/UI production artifacts and images, started
the isolated production-style stack, proved both networks internal and egress
denied, executed disabled email/SMS canaries, checked API/UI/same-origin proxy
paths, and made, independently read, and restored an administrator write. It
issued an owner-only passing receipt and removed its containers, volumes,
networks, copied data, and generated secrets. No production data, credentials,
SSH connection, provider, or VPS was used.
