# Deployment Operations Improvement Plan

> Authority: superseded historical implementation record. It is not a current runbook or phase taxonomy.

This document is a phased action plan for implementing and validating the next deployment-process improvements:

- Recommendation 1: Make `deploy-production.sh` the only normal production deployment path.
- Recommendation 2: Add a one-command prepare/readiness workflow, or make readiness select a verified local backup safely.
- Recommendation 3: Add a recurring restore-drill process.
- Recommendation 5: Add a deployment lock to prevent overlapping deploys.
- Recommendation 6: Improve migration safety before container downtime and clarify rollback implications.

This is a plan only. Do not change production state while implementing or validating these phases.

## Production Safety Boundary

Production must remain unaffected while this work is implemented and validated.

Allowed production interactions during implementation:

- Read-only SSH commands that inspect state, such as `test -f`, `docker ps`, `df`, `du`, `git rev-parse`, `git status --porcelain`, and application health reads.
- Copying data from production to local/offsite backup storage using existing backup paths, when explicitly required for validation and when no production files are modified.
- Existing non-mutating scripts such as `./scripts/vps-healthcheck.sh -e .env-prod` and `./scripts/backup.sh -e .env-prod --preflight-only`.
- Creating a local/offsite backup from production with `./scripts/backup.sh -e .env-prod --verify-restore`, because it reads/copies production runtime state but must not change the VPS.

Forbidden production interactions during implementation unless separately and explicitly approved:

- Real production deploys.
- Remote `docker-compose down`, `docker-compose up`, container restarts, image pruning, volume pruning, cleanup, package updates, service restarts, rollback, runtime restore, database restore, migration execution, or file deletion.
- Modifying files under the production project directory.
- Writing lock files on the production VPS until the deployment-lock implementation has been validated locally and the first real use is explicitly approved.
- Running `./scripts/deploy-production.sh`, remote `./scripts/deploy.sh`, `./scripts/rollback.sh`, or `./scripts/restore-runtime-state.sh --execute` against production.

All implementation should be validated with local disposable projects, local Docker/Postgres containers, and stubbed SSH/backup/deploy commands first. Current production behavior must remain the fallback until the new scripts and tests are proven.

## Current Deployment Context

The supported production wrapper is currently:

```bash
./scripts/deploy-production.sh -v <VERSION> -e .env-prod
```

Current safety gates:

- `deploy-production.sh` validates `.env-prod`, requires a clean synced git worktree, verifies a fresh readiness receipt, runs VPS health checks, checks the `/var/tmp/<VERSION>/runtime-state/manifest.txt` slot, runs backup preflight, creates a mandatory offsite runtime-state backup with restore verification, builds/transfers artifacts, deploys remotely, and runs post-deploy smoke checks.
- `deploy-readiness.sh` runs local validation, deploy rehearsal, restored-backup migration rehearsal, read-only VPS checks, version-slot inspection, and backup preflight, then writes `.deploy-readiness/<VERSION>.receipt`.
- `backup.sh` creates runtime-state backups with `data/postgres.sql`, runtime files, manifest, checksum, and optional disposable restore verification.
- `deploy.sh` runs on the VPS, verifies commit and artifact checksums, stages artifacts, creates a local runtime-state backup, backs up current images, stops containers, swaps artifacts, starts containers, and verifies health/endpoints.
- `rollback.sh` restores app images and database from a previous version after creating an emergency database dump.
- `restore-runtime-state.sh` is dry-run by default and performs a full runtime-state restore only with `--execute` and confirmation.

Key constraints:

- The project is a single-VPS Docker Compose deployment.
- The deploy path has planned downtime because `deploy.sh` runs `docker-compose down` before starting the new version.
- Migrations run from `scripts/server.sh` during server container startup.
- A failed startup can trigger non-database recovery, but database migrations and database rollback remain high-risk operations.

## Phase 0: Freeze Scope And Baseline

Goal: make the improvement work reviewable and ensure no accidental production mutation happens while planning or testing.

Actions:

1. Confirm the normal production path in docs and script output:

   ```bash
   ./scripts/deploy-production.sh -v <VERSION> -e .env-prod
   ```

2. Identify all other deploy-capable entry points and label them in documentation as advanced/manual recovery paths:
   - `scripts/build.sh`
   - `scripts/deploy.sh`
   - `scripts/rollback.sh`
   - `scripts/restore-runtime-state.sh`

3. Add a short "Production Safety Boundary" section to `DEPLOYMENT.md`, or link to this plan from `DEPLOYMENT.md`.
4. Confirm existing test commands without touching production:

   ```bash
   yarn test:scripts
   yarn validate:quick
   ```

5. Capture the current deployment command order from `scripts/tests/deploy-production.bats` as the behavior that must not regress.

Validation:

- Run script tests locally only.
- Review docs for any production examples that bypass `deploy-production.sh` without clear "manual/advanced" labeling.
- Verify no new command in this phase opens SSH or mutates production.

Exit criteria:

- A reviewer can identify the single normal deploy command in less than a minute.
- Manual paths are documented but clearly secondary.
- No production state has been changed.

## Phase 1: Single Supported Normal Deploy Path

Goal: reduce operator error by making `deploy-production.sh` the only documented routine production deploy path.

Implementation actions:

1. Update `DEPLOYMENT.md` so the "Recommended" path is the only normal path:

   ```bash
   ./scripts/deploy-readiness.sh -v <VERSION> -e .env-prod --migration-backup <LOCAL_BACKUP>
   ./scripts/deploy-production.sh -v <VERSION> -e .env-prod
   ```

2. Move manual `build.sh` plus SSH `deploy.sh` instructions into an "Advanced Manual Recovery / Debugging" section.
3. Add warnings to manual deploy docs:
   - manual paths are more error-prone;
   - they can bypass wrapper sequencing;
   - normal deploys should not use them.
4. Add or adjust script output in `build.sh` and `deploy.sh` so interactive use points operators back to `deploy-production.sh` for routine production releases.
5. Keep manual scripts functional for recovery and local rehearsal. Do not remove them.

Validation:

- Add or update Bats/docs tests that assert `DEPLOYMENT.md` includes `deploy-production.sh` as the standard path.
- Add script-output tests if changing help text.
- Run:

  ```bash
  yarn test:scripts
  ```

Production safety:

- No production SSH is needed.
- No production deploy commands are run.

Exit criteria:

- Routine deploy docs no longer present manual SSH deploy as an equivalent normal option.
- Operators still have clear recovery/debug paths, but they are labeled as advanced.

## Phase 2: One-Command Prepare And Readiness Workflow

Goal: reduce readiness friction while preserving the current backup and migration safety guarantees.

Current issue:

- `deploy-readiness.sh` requires `--migration-backup PATH`.
- That is safe, but operators must manually create/find a recent backup and pass the right path.
- Production deploy later creates another fresh offsite backup, so the workflow is safe but cognitively heavy.

Preferred implementation:

1. Add a new wrapper:

   ```bash
   ./scripts/prepare-deploy-readiness.sh -v <VERSION> -e .env-prod
   ```

2. The wrapper should:
   - validate `.env-prod`;
   - run backup preflight;
   - create a local/offsite runtime-state backup with `--verify-restore`;
   - determine the created backup directory;
   - run `deploy-readiness.sh -v <VERSION> -e .env-prod --migration-backup <CREATED_BACKUP>`;
   - print the exact production deploy command after success.

3. Do not change `deploy-readiness.sh` initially. Keep the explicit `--migration-backup` contract so lower-level behavior remains clear and testable.
4. Add a `--use-latest-verified-backup` option only if the wrapper proves awkward. If added, it must:
   - inspect local backup manifests only;
   - reject backups without `backup_type=runtime-state`;
   - reject backups missing `data/postgres.sql`;
   - reject backups older than a configured threshold;
   - reject backups without a checksum or restore-verification marker, unless an explicit override is provided.

Implementation details:

- Prefer making `backup.sh` optionally emit a machine-readable receipt path, such as:

  ```bash
  ./scripts/backup.sh -e .env-prod --verify-restore --print-backup-dir
  ```

- If adding machine-readable output, keep existing human output unchanged where possible and add tests for the new flag.
- Use local files under `backups/${SITE_IP}/<timestamp>` as the source of truth.
- Do not write to production except the existing read/copy behavior of `backup.sh`.

Validation:

- Unit-test the wrapper with stubbed `backup.sh` and `deploy-readiness.sh`.
- Test ordering:
  - validate env;
  - backup preflight;
  - backup with restore verification;
  - readiness with the backup path returned by backup.
- Test failure cases:
  - backup preflight fails;
  - backup archive creation fails;
  - restore verification fails;
  - readiness fails;
  - backup path cannot be determined.
- Run:

  ```bash
  yarn test:scripts
  ```

Production safety:

- During implementation, use stubs and fixture backup directories.
- If a real backup is needed for final validation, only run:

  ```bash
  ./scripts/backup.sh -e .env-prod --preflight-only
  ./scripts/backup.sh -e .env-prod --verify-restore
  ```

  These are allowed read/copy operations and must not modify the VPS.

Exit criteria:

- A normal operator can run one prepare command before the deploy window.
- The generated readiness receipt remains bound to the exact version, commit, validation command, rehearsal status, VPS preflight, and migration rehearsal.
- No production state changes beyond read/copy backup operations.

## Phase 3: Restore-Drill Process

Goal: make backup restore confidence routine instead of incidental.

Implementation actions:

1. Add a documented restore drill command sequence:

   ```bash
   ./scripts/backup.sh -e .env-prod --verify-restore
   ./scripts/rehearse-migrations-from-backup.sh --backup backups/${SITE_IP}/<BACKUP_TIMESTAMP>
   ./scripts/restore-runtime-state.sh -v <LOCAL_OR_REHEARSAL_VERSION>
   ```

2. Add a dedicated local drill script if the manual sequence remains too error-prone:

   ```bash
   ./scripts/restore-drill.sh --backup <LOCAL_BACKUP>
   ```

3. The drill must:
   - never connect to production unless explicitly creating/copying a backup;
   - validate runtime-state manifest and critical paths;
   - restore the SQL dump into disposable local Postgres;
   - run checked-in migrations against the restored dump;
   - optionally run a dry-run `restore-runtime-state.sh` against a fixture/rehearsal backup;
   - write a local drill receipt under `.validation/restore-drills/`.

4. Add a calendar/process recommendation:
   - run monthly;
   - run before high-risk migrations;
   - run after backup/restore script changes;
   - retain the latest successful drill receipt.

5. Add a short drill report format:
   - backup path;
   - backup timestamp;
   - commit;
   - restore container image;
   - migration status result;
   - operator/date;
   - failures and follow-up actions.

Validation:

- Tests for drill script behavior with fixture backups.
- Tests that production-looking commands are not run by default.
- Tests that missing `data/postgres.sql`, missing `.env-prod`, corrupt archive, or failed migration exits non-zero.
- Run locally:

  ```bash
  yarn test:scripts
  ./scripts/rehearse-migrations-from-backup.sh --backup <FIXTURE_OR_RECENT_LOCAL_BACKUP>
  ```

Production safety:

- Default drill mode must use an existing local backup.
- Creating a fresh backup from production is allowed only as a read/copy operation.
- The drill must never run deploy, restart, restore, rollback, cleanup, migration, or deletion commands on production.

Exit criteria:

- Restore confidence is backed by a repeatable command and local receipt.
- A failed backup or migration rehearsal blocks readiness/deploy preparation.

## Phase 4: Deployment Lock

Goal: prevent overlapping deploys or restore/deploy collisions.

Risk being addressed:

- Two shells or operators could start deploy-related workflows for the same project at the same time.
- Current version-slot checks help, but they do not fully prevent concurrent deploy attempts with different versions.

Implementation approach:

1. Add a local lock for wrapper-side operations:

   ```text
   .deploy-lock/deploy-production.lock
   ```

   Use `flock` where available.

2. Add a remote lock for production mutation phases, but validate it locally/stubbed before first real use:

   ```text
   /var/lock/nln-deploy.lock
   ```

3. Lock ownership metadata should include:
   - version;
   - command;
   - started_at UTC;
   - local commit;
   - operator/user if available;
   - host.

4. `deploy-production.sh` should acquire the local lock before expensive gates and hold it until the wrapper exits.
5. Remote `deploy.sh`, `rollback.sh`, and `restore-runtime-state.sh --execute` should acquire the same remote lock before any mutation.
6. Read-only scripts should not require the lock:
   - `vps-healthcheck.sh`;
   - `backup.sh --preflight-only`;
   - backup creation that only reads/copies production.
7. Add stale-lock handling:
   - default behavior: fail closed and print lock details;
   - optional `--force-lock` or `DEPLOY_FORCE_LOCK=true`, documented as dangerous;
   - force path should be tested locally and require explicit confirmation for destructive scripts.

Validation:

- Unit tests with a stubbed `flock` or real local `flock`:
   - second deploy blocks while first lock is held;
   - lock is released after success;
   - lock is released after failure;
   - stale lock message is clear;
   - read-only health/backup preflight does not take the mutation lock.
- Stub SSH tests for remote lock command ordering.
- Local rehearsal should still pass.

Production safety:

- Do not create `/var/lock/nln-deploy.lock` on production during implementation.
- Validate all remote lock commands through stubs first.
- First production lock use should happen only as part of an explicitly approved future production deployment.

Exit criteria:

- Concurrent deploy attempts fail clearly before mutation.
- Rollback and runtime restore cannot run concurrently with deploy.
- Read-only diagnostics remain available.

## Phase 5: Migration Safety Before Downtime

Goal: reduce migration-related downtime and make database rollback risk explicit.

Current behavior:

- The server container runs pre-migration backup and `prisma migrate deploy` during startup.
- `deploy-readiness.sh` already requires restored-backup migration rehearsal.
- `check-migrations.sh` already scans for risky migration SQL markers.

Implementation actions:

1. Add a pre-downtime migration gate in `deploy.sh` before `docker-compose down`.
2. The gate should run after:
   - environment validation;
   - commit verification;
   - artifact checksum verification;
   - staged artifact extraction;
   - runtime-state backup validation.
3. The gate should inspect migration status using the currently running DB and the staged or checked-in migration files without applying migrations if possible.
4. If Prisma cannot provide a pure dry-run for the needed check, use conservative alternatives:
   - `prisma migrate status`;
   - compare migration directories and applied migration table;
   - rely on restored-backup migration rehearsal as the apply test;
   - fail if pending migrations include unreviewed destructive SQL.
5. Add explicit output before downtime:

   ```text
   Pending migrations were rehearsed against restored backup in readiness receipt <path>.
   Pending production migration count: <N>.
   Destructive migration review markers: <none/list>.
   ```

6. Keep actual `prisma migrate deploy` in server startup initially to avoid changing migration execution architecture in the same change.
7. Add a future optional phase to move migration execution to a controlled one-shot step before app startup, but only after local rehearsal proves it is safer.
8. Update rollback docs:
   - database rollback restores the backup from the target version;
   - writes after that backup can be lost from the live DB;
   - the emergency dump is the recovery source for manual data salvage;
   - high-risk migrations should use expand/migrate/contract patterns.

Validation:

- Add tests for migration gate behavior:
   - no pending migrations;
   - pending safe migration;
   - pending destructive migration without marker blocks;
   - pending destructive migration with marker proceeds;
   - missing readiness receipt blocks production wrapper before deploy;
   - stale readiness receipt blocks production wrapper before deploy.
- Add local integration validation using `rehearse-migrations-from-backup.sh`.
- Run:

  ```bash
  yarn test:scripts
  yarn check:drift
  ```

Production safety:

- Do not run migrations on production during implementation.
- Do not run `docker-compose down` or restart containers.
- Any production DB interaction during implementation must be read-only, such as migration status inspection, and should be deferred until after stub/local validation.

Exit criteria:

- Deploy cannot reach downtime without a clear migration safety signal.
- Risky migrations require explicit review markers and restored-backup rehearsal.
- Rollback data-loss implications are clear in docs and script output.

## Phase 6: Combined Validation And First-Use Checklist

Goal: prove the full improved workflow without affecting the deployed site.

Local/stubbed validation:

1. Run shell tests:

   ```bash
   yarn test:scripts
   ```

2. Run drift checks:

   ```bash
   yarn check:drift
   ```

3. Run the deploy rehearsal:

   ```bash
   ./scripts/deploy-rehearsal.sh -v rehearsal-<VERSION>
   ```

4. Run restore drill against a local fixture or existing local backup.
5. Run prepare/readiness wrapper with all production-touching commands stubbed.

Allowed production read/copy validation, only after local/stubbed validation passes:

1. Read-only health:

   ```bash
   ./scripts/vps-healthcheck.sh -e .env-prod
   ```

2. Backup preflight:

   ```bash
   ./scripts/backup.sh -e .env-prod --preflight-only
   ```

3. Fresh offsite backup with local restore verification:

   ```bash
   ./scripts/backup.sh -e .env-prod --verify-restore
   ```

Forbidden during first-use validation unless separately approved:

- `./scripts/deploy-production.sh`
- remote `./scripts/deploy.sh`
- `./scripts/rollback.sh`
- `./scripts/restore-runtime-state.sh --execute`
- production cleanup, restart, prune, update, deletion, migration execution, or restore commands

Final readiness before a future approved production deploy:

1. Confirm a fresh local/offsite backup exists and restore verification passed.
2. Confirm restore drill passed.
3. Confirm readiness receipt is fresh for the exact version and commit.
4. Confirm the deployment lock behavior has passed local/stubbed tests.
5. Confirm migration safety gate has passed.
6. Confirm the planned deployment window accepts the known downtime from `docker-compose down`.

## Suggested Implementation Order

1. Phase 1: docs and command-contract cleanup.
2. Phase 2: prepare/readiness wrapper.
3. Phase 3: restore drill.
4. Phase 4: deployment lock.
5. Phase 5: migration safety gate and rollback messaging.
6. Phase 6: combined validation.

This order improves clarity first, then reduces operator friction, then proves recovery, then prevents concurrency failures, then tightens the highest-risk database transition behavior.

## Implementation Status

Implemented locally:

- Phase 1: `DEPLOYMENT.md` now documents `deploy-production.sh` as the routine production deployment path and labels manual build/SSH deploy as advanced recovery/debugging.
- Phase 2: `prepare-deploy-readiness.sh` creates a verified runtime-state backup, runs readiness with that backup, and prints the exact deploy command.
- Phase 3: `restore-drill.sh` validates local runtime-state backups, runs migration rehearsal, performs a dry-run runtime restore check, and writes local drill receipts.
- Phase 4: Deploy, rollback, and execute-mode runtime restore paths now acquire deployment locks; active locks fail closed.
- Phase 5: `deploy.sh` now runs a read-only pre-downtime migration gate that requires readiness proof and pending migration status by default.

Validated locally:

```bash
yarn test:scripts
yarn check:drift
git diff --check
```

Production remains untouched. First production use still requires a separate explicit approval and should start with read-only health checks and read/copy backup validation only.

## Open Questions

1. What maximum age should be allowed for a backup used by readiness migration rehearsal?
2. Should restore-drill receipts be committed, ignored, or stored under `.validation/` only?
3. Should the deployment lock cover backup creation, or only mutation-capable deploy/rollback/restore phases?
4. Should a future phase split migrations into an explicit one-shot command before app startup?
5. What downtime budget is acceptable for routine deploys?
