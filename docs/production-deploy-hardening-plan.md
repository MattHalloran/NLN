# Production Deploy Hardening Plan

> Authority: superseded historical implementation record. Use `release-runbook.md` for current operations.

This document captures the plan for making the next production deployment safer, more reliable, less likely to lose data, and faster to execute. It is a plan only. Do not run real production deploy, restore, cleanup, restart, rollback, prune, update, or deletion commands while implementing these changes unless explicitly approved.

## Safety Principles

1. Keep production untouched while implementing and validating this work.
2. Use local disposable Docker/Postgres data and stubbed SSH commands for validation.
3. Add new backup and rehearsal behavior in parallel before replacing the current production path.
4. Keep the existing runtime-state backup available until the new logical database backup and restore flow is proven.
5. Treat rollback and restore changes as high risk until a disposable restore test proves they work.
6. Before the first real production deploy with the new flow, run the current offsite backup successfully.

## Phase 0: Freeze The Deploy Contract

1. Define the intended production deploy path as the only supported normal path:

   ```bash
   ./scripts/deploy-production.sh -v <VERSION> -e .env-prod
   ```

2. Decide the required pre-deploy gate:
   - Preferred: `yarn validate:ci` for maximum confidence.
   - Fallback: `yarn validate` if runtime is too long.

3. Define recovery modes clearly:
   - `rollback.sh` means app/image plus database rollback only.
   - `restore-runtime-state.sh` means full runtime-state restore.

4. Capture these rules in `DEPLOYMENT.md` and make script output match the same language.

Validation:

- Confirm docs and scripts describe the same deployment and rollback behavior.
- Add or update shell tests asserting that the wrapper calls the chosen validation command.

## Phase 1: Make Backups Data-Safe

Status: Implemented locally. Runtime-state backups use `data/postgres.sql` as the required database artifact, and both rollback and full runtime restore understand the logical dump shape.

1. Replace live raw Postgres directory backup as the primary database backup with a logical dump from the running DB container:

   ```bash
   docker exec nln_db pg_dump -U "$DB_USER" -d "$DB_NAME"
   ```

2. Store the dump in runtime-state as a clear artifact, such as `database/postgres.sql` or `data/postgres.sql`.
3. Include the database dump in the manifest and checksum records.
4. Keep filesystem runtime backup for:
   - `data/uploads`
   - `assets`
   - `data/redis`
   - `data/migration-backups`
   - `.env-prod`
   - optional `.env`
   - optional `jwt_*`

5. Keep raw `data/postgres` backup only as an optional cold/offline mode, not as the main restore source.
6. Update `backup.sh`, `deploy.sh`, `runtime-state.sh`, `rollback.sh`, and `restore-runtime-state.sh` to understand the new backup shape.
7. Add backup verification:
   - Validate archive integrity.
   - Validate SQL dump is present and non-empty.
   - For plain SQL, verify expected SQL content and restore into a disposable Postgres container during rehearsal.
   - If switching to custom dump format, use `pg_restore --list` as an additional structural check.

Validation:

- Add shell tests for missing dump, corrupt or empty dump, missing uploads/assets, and manifest mismatch.
- Add a local disposable restore test proving the SQL dump can recreate schema and representative data.
- Confirm production deploy refuses to stop containers if the required verified backup is absent.

## Phase 2: Reorder Remote Deploy To Fail Before Mutation

1. Move remote repository checks before artifact extraction:
   - Confirm project directory exists.
   - Confirm the remote working tree is clean or in an explicitly accepted state.
   - Run `git fetch`.
   - Run `git pull --ff-only`, or preferably check out a specific expected commit/ref.

2. Add expected commit metadata to the artifact bundle:
   - Local build records `git rev-parse HEAD`.
   - Remote deploy verifies it is deploying that same commit.
   - Standard production deploys skip package version mutation during build so artifacts match the recorded commit. Package version bumps should be committed before running `deploy-production.sh`.

3. Extract artifacts into a staging directory first, for example:

   ```text
   /var/tmp/<VERSION>/staged/
   ```

4. Verify every expected tar exists and extracts successfully.
5. Swap staged artifacts into place only after:
   - environment validation passes
   - remote git validation passes
   - runtime backup validation passes
   - image archive validation passes

6. If extraction fails, leave the live app filesystem untouched.

Validation:

- Add shell tests where `git pull` fails before any artifact move or extraction.
- Add shell tests where a missing tar fails before container changes.
- Add shell tests proving backup is created before container stop but after deploy preconditions pass.
- Run a local dry run against a fixture project.

## Phase 3: Strengthen The Production Wrapper Gate

Status: Extended locally. `deploy-readiness.sh` now writes a freshness-limited readiness receipt after validation, rehearsal, read-only VPS checks, version-slot inspection, and backup preflight pass. `deploy-production.sh` verifies clean/synced git state and requires that receipt for the same version, commit, and validation command before building or transferring artifacts.

1. Change `deploy-production.sh` from separate `yarn test` and `yarn typecheck` calls to one configured validation command.
2. Default to:

   ```bash
   yarn validate:ci
   ```

3. Allow override with an environment variable such as:

   ```bash
   DEPLOY_VALIDATE_CMD="yarn validate"
   ```

4. Keep `--skip-tests`, but make the warning explicit:

   ```text
   Skipping validation gate; backups and VPS health checks still run.
   ```

5. Preserve the wrapper ordering:
   - environment validation
   - local validation gate
   - VPS healthcheck
   - version slot check
   - offsite backup preflight
   - mandatory offsite backup
   - build and transfer
   - remote deploy
   - post-deploy verification

Validation:

- Update `deploy-production.bats`.
- Run `yarn test:scripts`.
- Run full local `yarn validate:ci` before merging.

## Phase 4: Add A Production Deploy Rehearsal

Status: Implemented locally as `./scripts/deploy-rehearsal.sh -v rehearsal-<VERSION>`. A manual/scheduled GitHub Actions workflow also runs the same disposable rehearsal path without reading `.env-prod`.

1. Create a non-production rehearsal script:

   ```bash
   ./scripts/deploy-rehearsal.sh -v rehearsal-<VERSION>
   ```

2. The rehearsal should:
   - Create a temp project directory.
   - Generate a safe local env file.
   - Start disposable Postgres and Redis, or use local Docker Compose with isolated ports.
   - Build production images.
   - Transfer or copy artifacts locally.
   - Run `deploy.sh` against the temp project.
   - Verify containers become healthy.
   - Verify API healthcheck.
   - Verify UI response.
   - Test rollback or runtime restore against the disposable backup.

3. The rehearsal must never read `.env-prod` unless explicitly passed.
4. Add guardrails:
   - Reject production-looking `SITE_IP`.
   - Reject production public URLs.
   - Force `PROJECT_DIR` to the disposable temp project.
   - Refuse to replace existing local `nln_*` containers unless `--replace-local-containers` is explicitly supplied.

Implementation notes:

- The rehearsal requires a clean tracked worktree so `deploy-commit.txt` matches the temporary clone.
- The rehearsal uses the production compose container names because `docker-compose-prod.yml` defines fixed container names. This is why the local `nln_*` container guard is mandatory.
- The rehearsal verifies the runtime-state SQL dump by restoring it into a separate disposable Postgres container and querying a seeded probe row.
- The rehearsal runs `restore-runtime-state.sh` in dry-run mode against the disposable backup.

Validation:

- Run rehearsal locally.
- Add shell tests for guardrails. Completed in `scripts/tests/deploy-rehearsal.bats`.
- Add CI job if runtime is acceptable; otherwise document it as the required manual pre-production check.

## Phase 5: Stop Transferring `node_modules`

1. Audit production containers and mounted paths:
   - Server image already installs production dependencies.
   - UI image already contains serve tooling and built assets.

2. Remove these from `build.sh` transfer artifacts:
   - root `node_modules`
   - `packages/server/node_modules`
   - `packages/shared/node_modules`
   - `packages/ui/node_modules`

3. Remove matching extraction logic from `deploy.sh`.
4. Keep transferring only:
   - `packages/ui/dist`
   - `packages/server/dist`
   - `packages/shared/dist`
   - production Docker image archive
   - `.env-prod`

5. Confirm no script depends on host `node_modules` after deployment.

Validation:

- Run production build.
- Run deploy rehearsal.
- Verify containers start from image-owned dependencies.
- Compare artifact size and transfer time before and after.

## Phase 6: Make Rollback Safer And More Explicit

Status: Implemented locally for logical rollback and full runtime restore. `rollback.sh` creates an emergency SQL dump before database rollback, restores logical dumps, keeps legacy raw Postgres fallback, verifies DB connectivity, and verifies public UI/API endpoints. `restore-runtime-state.sh` remains dry-run by default; when executed, it creates an emergency runtime-state backup with a current SQL dump before stopping containers, restores filesystem state, initializes a clean Postgres data directory, and imports `data/postgres.sql`. It aborts if the emergency DB dump cannot be created unless `RUNTIME_STATE_ALLOW_NO_EMERGENCY_DB_DUMP=true` is set for an explicit disaster recovery case.

1. Rename output language in `rollback.sh` to database rollback.
2. Before destructive DB restore:
   - Create a verified emergency SQL dump of the current database.
   - Do not rely only on copying `data/postgres`.

3. Restore the database from the new logical dump backup.
4. After rollback:
   - Verify DB connectivity.
   - Verify server health.
   - Verify public UI/API if possible.

5. Keep full runtime restore as a separate, explicit command:

   ```bash
   ./scripts/restore-runtime-state.sh -v <VERSION> --execute
   ```

6. Keep dry-run as the default for full runtime restore.

Validation:

- Test rollback from a disposable backup in rehearsal.
- Test failure during restore leaves clear emergency backup instructions. Covered by local shell tests and script output checks; still needs a full disposable Docker rehearsal execution.
- Add shell tests for clear warning text and refusal when the dump is missing. Completed in `scripts/tests/runtime-state.bats` and `scripts/tests/restore-runtime-state.bats`.

## Phase 7: Add Public Post-Deploy Verification

Status: Implemented locally for deploy and rollback. `deploy.sh` and `rollback.sh` verify public UI and API healthcheck endpoints with retries after container health passes, and print container status/log diagnostics on failure. `deploy.sh` now also treats the internal server healthcheck as fatal and attempts non-database recovery before reporting failure.

1. After container health passes, verify from the VPS host:

   ```bash
   curl -fsS "$UI_URL"
   curl -fsS "$SERVER_URL/healthcheck"
   ```

   Use the correct public API health URL if it differs.

2. Verify the nginx-proxy path, not just internal container health.
3. If public verification fails:
   - print container statuses
   - print recent `nln_ui`, `nln_server`, and nginx proxy logs
   - exit non-zero

4. Add an optional retry window for DNS/proxy warmup.

Validation:

- Add shell tests with stubbed curl success and failure. Basic script-surface coverage is present; deeper curl failure-path tests can be added if this code changes again.
- Include this check in deploy rehearsal where possible. Included through `deploy.sh` during rehearsal.
- Manually validate in staging or local rehearsal before production.

## Phase 8: Guard Risky Migrations

Status: Implemented locally as `scripts/check-migrations.sh`, included in `yarn check:drift`.

1. Scan Prisma migration SQL for destructive operations.
2. Fail validation for risky migration SQL unless the migration includes:

   ```sql
   -- deploy-safe: allow-destructive-migration: <reviewed reason>
   ```

3. Treat the marker as a reviewed exception, not a bypass for routine changes.

Validation:

- Add shell tests for safe SQL, blocked destructive SQL, and explicitly reviewed destructive SQL.

## Recommended Implementation Order

1. Backup safety: logical DB dump and restore path.
2. Remote deploy ordering: fail before mutating live artifacts.
3. Stronger wrapper validation gate.
4. Public post-deploy verification.
5. Production deploy rehearsal script.
6. Remove `node_modules` transfer.
7. Rollback UX and full restore clarity.

This order reduces the largest safety risks before optimizing speed. The speed work matters, but backup correctness and fail-before-mutation behavior should land first.

## First Production Use Checklist

Before the first real production deploy using the new flow:

1. Confirm the working tree contains only intended changes.
2. Run `yarn test:scripts`.
3. Run the selected full validation gate, preferably `yarn validate:ci`.
4. Run the deploy rehearsal successfully:

   ```bash
   ./scripts/deploy-rehearsal.sh -v rehearsal-<VERSION>
   ```

5. Run the current offsite backup successfully:

   ```bash
   ./scripts/backup.sh -e .env-prod
   ```

6. Confirm no restore, rollback, cleanup, restart, prune, update, or deletion commands will be run unless explicitly intended.
7. Use a fresh deployment version.
8. Deploy through:

   ```bash
   ./scripts/deploy-production.sh -v <VERSION> -e .env-prod
   ```
