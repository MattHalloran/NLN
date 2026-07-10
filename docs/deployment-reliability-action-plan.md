# Deployment Reliability Action Plan

This plan turns the deployment review findings into an implementation roadmap. It is intentionally operational: every phase lists the goal, implementation work, validation work, production safety boundary, and acceptance criteria.

## Scope

The target outcome is a release process where:

- code has passed the trusted validation gate before deployment;
- production runtime state is backed up with restore verification before risk is taken;
- a recent production backup can be exercised locally against a production-style build;
- the VPS is checked for health and maintenance signals before deployment;
- rollback behavior is explicit, rehearsed, and fast for app-only failures;
- database rollback risk is understood and minimized;
- planned downtime is bounded to the shortest practical `docker-compose down` window.

## Non-Goals

- Zero-downtime deployment.
- Multi-node orchestration.
- Production changes while implementing this plan.
- Automatic production cleanup, package upgrades, restarts, restores, rollbacks, migrations, or pruning without a separate explicit approval.

## Production Safety Boundary

Until a future production deployment is explicitly approved, implementation and validation must use local Docker, disposable projects, fixtures, and stubbed SSH/deploy commands.

Allowed production interactions during validation, after local/stubbed tests pass:

- `./scripts/vps-healthcheck.sh -e .env-prod`
- `./scripts/backup.sh -e .env-prod --preflight-only`
- `./scripts/backup.sh -e .env-prod --verify-restore`
- read-only SSH inspection such as `docker ps`, `df`, `du`, `git status`, and `test -f`

Forbidden production interactions unless separately approved:

- `./scripts/deploy-production.sh`
- remote `./scripts/deploy.sh`
- `./scripts/rollback.sh`
- `./scripts/restore-runtime-state.sh --execute`
- `docker-compose down/up`, restarts, cleanup, deletion, pruning, package updates, database restore, migration execution, or production file modification

## Current Baseline

The normal intended path is:

```bash
./scripts/prepare-deploy-readiness.sh -v <VERSION> -e .env-prod
./scripts/deploy-production.sh -v <VERSION> -e .env-prod
```

Current strengths to preserve:

- `deploy-production.sh` verifies env, clean/synced git state, fresh readiness receipt, read-only VPS health, version-slot freshness, mandatory offsite backup, build/transfer, remote deploy, and smoke checks.
- `backup.sh` creates targeted runtime-state backups with `data/postgres.sql`, critical runtime paths, manifests, checksums, and optional disposable restore verification.
- `deploy.sh` stages artifacts and verifies commit/checksums before downtime, creates a remote runtime-state backup, runs a pre-downtime migration gate, backs up current app images, then stops containers and swaps artifacts.
- `rollback.sh` creates an emergency database dump before replacing the DB with a previous version backup.
- `deploy-rehearsal.sh`, `restore-drill.sh`, and CI deploy rehearsal already provide a strong local validation foundation.

Known gaps to close:

- local production verification from a fresh production backup is not one obvious command;
- remote `deploy.sh` should validate readiness receipt contents, not only receive a proof path/string;
- rollback is fast for app-only failures but not fast for database rollback;
- Redis backup consistency and criticality are not explicitly defined;
- RTO/RPO and downtime budgets are not measured or documented;
- operator documentation is thorough but too broad for a live release window.

## Phase 1: Operator Runbook

Goal: create a short release-window document that an operator can follow without reading every script.

Implementation:

1. Add `docs/release-runbook.md`.
2. Include the exact normal command sequence:

   ```bash
   ./scripts/prepare-deploy-readiness.sh -v <VERSION> -e .env-prod
   ./scripts/deploy-production.sh -v <VERSION> -e .env-prod
   ```

3. Include a decision tree for failures:
   - prepare/readiness failure: do not deploy;
   - backup failure: do not deploy;
   - VPS health critical failure: do not deploy;
   - deploy fails before downtime: fix/retry after evaluating cause;
   - deploy fails after app startup: use automatic non-database recovery output first;
   - migration/database failure: stop and use documented restore/rollback path.
4. Include a concise "forbidden unless approved" section.
5. Include rollback choices:
   - app-only non-database recovery;
   - full runtime-state restore from current deploy slot;
   - older-version rollback with database replacement;
   - emergency dump location for manual salvage.
6. Add pre-deploy and post-deploy checkboxes:
   - CI trusted gate passed;
   - readiness receipt exists and is fresh;
   - verified backup path recorded;
   - restore drill receipt recorded when required;
   - known migration risk reviewed;
   - expected downtime window accepted.

Validation:

- Add a docs test that asserts the runbook names `prepare-deploy-readiness.sh` and `deploy-production.sh` as the normal path.
- Add a docs test that flags manual `deploy.sh`, `rollback.sh`, and `restore-runtime-state.sh --execute` as advanced/recovery paths.
- Run `yarn test:scripts`.

Acceptance criteria:

- An operator can identify the normal path, rollback options, and "stop/no-go" conditions in under two minutes.
- The runbook does not contain production IPs, domains, secrets, or copied `.env-prod` values.

## Phase 2: One-Command Local Production Verification From Backup

Goal: make "run production locally using production data we just backed up" a first-class command.

Proposed command:

```bash
./scripts/verify-production-backup-locally.sh --backup backups/${SITE_IP}/<TIMESTAMP>
```

Optional convenience mode:

```bash
./scripts/verify-production-backup-locally.sh --create-backup -e .env-prod
```

Implementation:

1. Create `scripts/verify-production-backup-locally.sh`.
2. Accept either:
   - `--backup PATH` pointing at a local runtime-state backup directory or archive;
   - `--create-backup -e .env-prod`, which delegates to `backup.sh --verify-restore --print-backup-dir`.
3. Resolve backup inputs consistently with `restore-drill.sh`:
   - timestamp dir containing `runtime-state/`;
   - direct `runtime-state/` dir;
   - `.tar.gz` archive.
4. Validate backup manifest and critical paths with `runtime_state_validate_backup`.
5. Create a disposable local project/work directory.
6. Generate a local-safe env file:
   - loopback `SITE_IP`;
   - local `UI_URL` and `SERVER_URL`;
   - local-only ports;
   - `COOKIE_SECURE=false`;
   - email file/console mode;
   - no production hostnames or public callbacks.
7. Restore backup runtime files into the disposable project:
   - `data/uploads`;
   - `assets`;
   - `data/redis` or intentionally sanitized Redis state, depending on Phase 6;
   - `data/migration-backups`;
   - `.env-prod` only as an input source, not as the final runtime env without local sanitization;
   - optional `.env` and `jwt_*` if needed for app compatibility.
8. Restore `data/postgres.sql` into local disposable Postgres.
9. Build and start the production stack locally with `docker-compose-prod.yml` plus `docker-compose.local-production.yml`.
10. Run checks:
    - API healthcheck;
    - UI root;
    - same-origin API path through UI proxy;
    - public smoke;
    - PWA/static header check if applicable locally;
    - optional admin reversible smoke check only if the sanitized env has test credentials.
11. Emit a verification receipt under `.validation/local-production-backup/`.
12. Clean up containers, networks, temp dirs, and local volumes by default; support `--keep` for debugging.

Validation:

- Unit-test backup input resolution.
- Unit-test env sanitization: production `SITE_IP`, `UI_URL`, `SERVER_URL`, SMTP settings, and cookie settings must not survive into the local runtime env unless explicitly allowed.
- Unit-test that `--backup` mode does not call SSH.
- Unit-test that `--create-backup` calls only `backup.sh --verify-restore --print-backup-dir`.
- Add an integration fixture with a tiny SQL dump and runtime paths.
- Run:

  ```bash
  yarn test:scripts
  ./scripts/verify-production-backup-locally.sh --backup <FIXTURE_BACKUP>
  ```

Acceptance criteria:

- A recent production backup can be verified locally with one command.
- The local verification never points browsers, cookies, API calls, SMTP, or SSH at production.
- The receipt records backup path, commit, local ports, checks run, start time, end time, and result.

## Phase 3: Remote Readiness Receipt Enforcement

Goal: make the remote mutation path independently verify that the deploy was rehearsed for the exact commit/version.

Implementation:

1. During `build.sh`, copy the local readiness receipt for `<VERSION>` into the transfer slot, for example:

   ```text
   /var/tmp/<VERSION>/deploy-readiness.receipt
   ```

2. Add the receipt file to `deploy-manifest.sha256`.
3. Add a receipt verification helper that validates:
   - receipt exists;
   - `version=<VERSION>`;
   - `commit=<deploy-commit.txt>`;
   - `validation_command=<DEPLOY_VALIDATE_CMD>`;
   - `validation_skipped=false`;
   - `rehearsal_skipped=false`;
   - `vps_skipped=false`;
   - `migration_rehearsal_skipped=false`;
   - `created_epoch` is within the configured max age.
4. Use this helper in:
   - local `deploy-production.sh` before build/transfer, preserving current behavior;
   - remote `deploy.sh` before the pre-downtime migration gate.
5. Remove or de-emphasize string-only readiness proof. In rehearsal mode, keep a local-only bypass such as `DEPLOY_REHEARSAL=true`.
6. Make direct remote `deploy.sh` usage fail closed unless:
   - valid transferred receipt exists; or
   - explicit emergency override is set and logged.

Validation:

- Tests for valid receipt.
- Tests for missing receipt.
- Tests for stale receipt.
- Tests for wrong version.
- Tests for wrong commit.
- Tests for skipped gates.
- Tests that `deploy.sh` fails before `docker-compose down` if receipt validation fails.
- Run:

  ```bash
  yarn test:scripts
  ./scripts/deploy-rehearsal.sh -v rehearsal-<VERSION>
  ```

Acceptance criteria:

- A direct remote deploy cannot accidentally bypass readiness rehearsal.
- Receipt validation happens before downtime.
- The receipt is covered by transfer checksum verification.

## Phase 4: Migration Risk Program

Goal: make database changes the most carefully controlled part of deployment.

Implementation:

1. Keep restored-backup migration rehearsal mandatory for production readiness.
2. Enhance `check-deploy-migration-gate.sh` output:
   - pending migration count;
   - pending migration names;
   - destructive markers found;
   - explicit statement that migrations were rehearsed against restored backup.
3. Add a migration risk classification doc:
   - safe additive changes;
   - backfills;
   - expand/contract changes;
   - destructive changes;
   - emergency-only direct SQL.
4. Add a `MIGRATION_RISK.md` template or section in the release runbook for any migration-bearing deploy.
5. For destructive migrations, require:
   - review marker in SQL;
   - restore drill receipt;
   - manual sign-off in release notes/runbook;
   - rollback implications documented.
6. Investigate moving migrations from server startup into an explicit one-shot command, but do not implement in the same pass unless the rehearsal proves it reduces risk. If adopted later, the one-shot should:
   - run after backup and before app container replacement;
   - block on failure before app restart if no schema has changed;
   - record migration status in the deploy receipt;
   - preserve compatibility with app rollback.

Validation:

- Fixture migrations:
   - additive migration passes;
   - destructive unmarked migration fails;
   - destructive marked migration passes with clear output;
   - missing migration status fails unless explicit override is set.
- Rehearse migrations against a real or fixture runtime-state backup.
- Confirm failed migration gate exits before downtime in deploy tests.

Acceptance criteria:

- Every pending migration has a clear risk signal before downtime.
- Destructive migrations cannot pass unnoticed.
- Operators understand whether rollback can safely restore app only or requires database restore/manual salvage.

## Phase 5: Rollback And Recovery Drill

Goal: make rollback behavior tested, measured, and honest about data-loss implications.

Implementation:

1. Extend `deploy-rehearsal.sh` or add a dedicated rollback drill script that measures:
   - app-only recovery duration;
   - full runtime-state restore dry-run duration;
   - SQL restore duration for a representative backup;
   - container health wait duration.
2. Add rollback runbook sections for:
   - failed deployment before downtime;
   - failed app startup after artifact swap;
   - failed migration;
   - bad deploy discovered after new writes happened;
   - manual data salvage from emergency dump.
3. Add clearer rollback warnings:
   - rolling back to an older version replaces the database with the target version's backup;
   - writes after that backup may be lost from the live database;
   - emergency dump is retained for manual recovery.
4. Add a `--dry-run` or confirmation summary to `rollback.sh` if not already sufficient:
   - backup version;
   - DB dump path;
   - image archive path;
   - expected current emergency dump path;
   - containers affected.
5. Add a table of recovery modes:

   | Mode | Restores app? | Restores DB? | Typical speed | Data-loss risk |
   | --- | --- | --- | --- | --- |
   | automatic non-database recovery | yes | no | fastest | low for DB |
   | runtime-state restore | yes/runtime files | yes | slower | reverts to backup |
   | older-version rollback | yes | yes | slower | reverts to old backup |

Validation:

- Run local deploy rehearsal rollback probe.
- Add Bats tests for rollback warning text and dry-run output.
- Measure local SQL restore duration for fixture and latest available local backup.
- Confirm rollback refuses missing/empty DB dump and corrupt image archive.

Acceptance criteria:

- Operators can choose the least destructive recovery path.
- Rollback duration and data-loss implications are documented.
- Rollback tests cover both happy path and refusal paths.

## Phase 6: Redis Runtime-State Decision

Goal: decide whether Redis data is critical and make backup behavior match that decision.

Investigation:

1. Identify Redis usage in the app:
   - cache only;
   - session store;
   - Bull queues;
   - rate limiting;
   - job state;
   - durable business data.
2. Decide and document one of:
   - Redis is disposable: do not treat `data/redis` as critical, document effects of loss.
   - Redis is operationally important but recoverable: backup best-effort and warn on restore limitations.
   - Redis is critical: use a consistent backup path.

If Redis is disposable:

- Move `data/redis` from critical paths to optional paths, or keep it in backups but document that restore is not a data integrity guarantee.
- Ensure local production verification can start with clean Redis.

If Redis is critical:

- Add a remote `redis-cli SAVE` or `BGSAVE` plus readiness wait before copying Redis files.
- Consider exporting queue state through the application/database instead if Bull state matters.
- Validate restored Redis state in local verification.

Validation:

- Search app code for Redis/Bull usage and classify each usage.
- Add tests around runtime-state path classification.
- Add restore verification for Redis only if Redis is classified as critical.

Acceptance criteria:

- Redis backup semantics are explicit.
- Backup/restore scripts do not imply stronger Redis guarantees than they provide.

## Phase 7: RTO, RPO, And Downtime Measurement

Goal: replace vague safety claims with measured operational budgets.

Implementation:

1. Extend deploy receipts to record phase timings already collected by `deploy-production.sh`:
   - readiness verification;
   - VPS health;
   - backup preflight;
   - mandatory backup;
   - build/transfer;
   - remote deploy;
   - smoke checks.
2. Add remote downtime timing inside `deploy.sh`:
   - timestamp immediately before `docker-compose down`;
   - timestamp after public endpoints pass;
   - record downtime seconds.
3. Add restore timing:
   - backup creation duration;
   - SQL restore verification duration;
   - local production verification duration;
   - rollback probe duration.
4. Add `docs/deployment-slo.md` with initial budgets:
   - RPO target: latest mandatory pre-deploy backup plus emergency dump before rollback;
   - RTO app-only recovery target;
   - RTO full DB rollback target;
   - routine deploy downtime target.
5. Make budgets empirical. Start with observed numbers from local rehearsal and first approved production deploy.

Validation:

- Unit-test receipt fields.
- Run local rehearsal and confirm timings are written.
- Confirm failed deploy receipts still record completed phase timings.

Acceptance criteria:

- Every deploy/rehearsal produces enough timing data to discuss reliability concretely.
- Downtime budget is visible before deployment and measured afterward.

## Phase 8: VPS Maintenance Policy

Goal: ensure the server is healthy without letting deploy tooling perform surprise maintenance.

Implementation:

1. Keep `vps-healthcheck.sh` read-only.
2. Add `docs/vps-maintenance.md` or a runbook section with:
   - disk cleanup procedure;
   - old `/var/tmp/<VERSION>` retention policy;
   - Docker image/container inventory procedure;
   - package update policy;
   - log review policy;
   - backup retention policy.
3. Add thresholds to the runbook:
   - minimum disk percent and GB;
   - maximum warning count/size for runtime backups;
   - maximum app log size.
4. Make remediation commands explicit manual commands, not automatic deploy behavior.

Validation:

- Docs tests assert healthcheck remains read-only in wording.
- Script tests assert healthcheck output recommends cleanup but does not run cleanup commands.

Acceptance criteria:

- Deploys block on critical health failures.
- Maintenance recommendations are clear but never silently executed by deploy scripts.

## Phase 9: CI And Scheduled Validation

Goal: keep the deployment process itself from rotting.

Implementation:

1. Keep CI trusted gate requiring:
   - quick validation;
   - integration;
   - E2E;
   - deploy rehearsal.
2. Add or preserve a scheduled deploy rehearsal workflow.
3. Add scheduled restore drill using a fixture backup. Do not use production secrets in public CI.
4. Add script tests for:
   - runbook docs;
   - local production verification script;
   - readiness receipt remote enforcement;
   - migration gate;
   - rollback warnings;
   - Redis classification.
5. Add a manual workflow for operators to upload/provide a sanitized backup artifact for restore drill, if useful.

Validation:

- CI must pass on pull requests.
- Scheduled deploy rehearsal must alert on failure.
- Fixture restore drill must alert on failure.

Acceptance criteria:

- Deployment tooling is tested continuously, not only during releases.
- Production data is never required in CI.

## Phase 10: Final Integrated Release Simulation

Goal: prove the full process end to end before using it on production.

Local/stubbed simulation:

1. Run:

   ```bash
   yarn test:scripts
   yarn check:drift
   yarn validate:quick
   ```

2. Run deploy rehearsal:

   ```bash
   ./scripts/deploy-rehearsal.sh -v rehearsal-<VERSION>
   ```

3. Run restore drill against fixture or recent local backup:

   ```bash
   ./scripts/restore-drill.sh --backup <BACKUP>
   ```

4. Run local production verification from backup:

   ```bash
   ./scripts/verify-production-backup-locally.sh --backup <BACKUP>
   ```

5. Run prepare/deploy wrapper tests with SSH/build/deploy commands stubbed.

Allowed production read/copy validation after local/stubbed pass:

```bash
./scripts/vps-healthcheck.sh -e .env-prod
./scripts/backup.sh -e .env-prod --preflight-only
./scripts/backup.sh -e .env-prod --verify-restore
```

First approved production deploy checklist:

- CI trusted gate passed for the deployed commit.
- Release runbook filled out.
- Fresh backup path recorded.
- Local production verification receipt recorded.
- Restore drill receipt recorded for migration-bearing or high-risk deploys.
- Readiness receipt is fresh for the exact version and commit.
- Remote receipt is transferred and checksummed.
- VPS health has no critical issues.
- Migration risk reviewed.
- Rollback mode and expected data-loss implications reviewed.
- Downtime window accepted.

Acceptance criteria:

- The first production use is a normal approved deploy, not a tooling experiment.
- Every safety claim in the release runbook has a receipt, test result, or measured timing behind it.

## Suggested Implementation Order

1. Phase 1: release runbook.
2. Phase 2: local production verification from backup.
3. Phase 3: remote readiness receipt enforcement.
4. Phase 4: migration risk program.
5. Phase 5: rollback and recovery drill.
6. Phase 6: Redis runtime-state decision.
7. Phase 7: RTO/RPO/downtime measurement.
8. Phase 8: VPS maintenance policy.
9. Phase 9: CI and scheduled validation.
10. Phase 10: integrated release simulation.

This order improves operator clarity first, then verifies real data locally, then hardens the production mutation path, then addresses the remaining database, Redis, measurement, and maintenance risks.

## Open Decisions

1. What is the maximum acceptable age for a backup used in readiness and local production verification?
2. What is the target routine deploy downtime budget?
3. What is the target app-only recovery time?
4. What is the target full database rollback time?
5. Is Redis disposable, operationally important, or critical?
6. Should migration execution remain in server startup, or move to a one-shot deploy phase after more rehearsal?
7. Should restore drill receipts be committed, stored under ignored `.validation/`, or archived elsewhere?
8. How many `/var/tmp/<VERSION>` deploy slots should be retained on the VPS?
9. How many offsite runtime-state backups should be retained locally/offsite?
