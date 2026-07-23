# Release Runbook

> Authority: current production live-window procedure. This is the only authoritative routine production deployment procedure.

This is the short release-window checklist for production deployments. For full background and recovery details, use [DEPLOYMENT.md](../DEPLOYMENT.md).

## Normal Path

Run readiness before the deployment window:

```bash
./scripts/prepare-deploy-readiness.sh -v <VERSION> -e .env-prod
```

Run the deployment wrapper during the approved deployment window:

```bash
./scripts/deploy-production.sh -v <VERSION> -e .env-prod
```

`deploy-production.sh` is the routine production entry point. Do not use `build.sh` plus SSH, direct `deploy.sh`, `rollback.sh`, or `restore-runtime-state.sh --execute` as the normal deployment path.

## Pre-Deploy Checklist

- [ ] `<VERSION>` is fresh and has not been used for a production deployment.
- [ ] The trusted validation gate passed for the commit being deployed.
- [ ] `.deploy-readiness/<VERSION>.receipt` exists, is fresh, and matches the current commit.
- [ ] The readiness receipt records restored-backup migration rehearsal success.
- [ ] A qualified production recovery-package path is recorded, including the exact current production commit and images.
- [ ] Restore drill receipt is recorded if this deploy includes risky migrations, restore tooling changes, or other high-risk runtime changes.
- [ ] Migration risk has been reviewed; destructive migrations have an explicit review marker and documented rollback implications.
- [ ] Expected downtime window is accepted.
- [ ] RTO/RPO and downtime targets from [deployment-slo.md](deployment-slo.md) are understood.
- [ ] Scheduled deploy rehearsal and restore drill workflows are green, or any failure has been reviewed.
- [ ] No separate maintenance, cleanup, package update, prune, restart, restore, or rollback action is being bundled into this deploy.

## Stop Conditions

Stop and do not deploy when any of these occur:

- readiness or validation fails;
- backup preflight, backup creation, or restore verification fails;
- VPS health reports a critical failure;
- the version slot already exists on the VPS;
- the readiness receipt is missing, stale, for a different commit, or records skipped gates;
- migration rehearsal did not run against the selected runtime-state backup;
- the deploy command would require an emergency override that has not been explicitly approved.

## Failure Decision Tree

Preparation/readiness failure:
Stop. Fix the failing validation, backup, migration rehearsal, or VPS health condition. Re-run readiness before deploying.

Backup failure:
Stop. Do not deploy without a fresh qualified production recovery package. Investigate backup logs, disk space, SSH access, image export, checksums, and restore verification output. See [Production Recovery Package](production-recovery-package.md).

Critical VPS health failure:
Stop. Review the healthcheck output and schedule the recommended maintenance separately using [vps-maintenance.md](vps-maintenance.md). The healthcheck is read-only and must not perform remediation automatically.

Routine deployment is non-interactive for proxy infrastructure. Both
`nginx-proxy` and either `nginx-proxy-acme` (current) or `nginx-proxy-le`
(legacy transition only) must already be running. Restore proxy infrastructure
separately; deployment must not clone, bootstrap, restart, or reconfigure it.

Deployment fails before downtime:
The live app should still be running. Fix the cause, then re-run the standard wrapper only after confirming the version slot and backup state are still valid.

If `/var/tmp/<VERSION>/runtime-state/manifest.txt` exists, that version is
consumed even when activation failed. Preserve it and use a fresh version for
the retry.

Deployment fails after artifact swap or app startup:
Use the automatic non-database recovery output from `deploy.sh` first. This is the fastest recovery path because it restores previous application artifacts/images without replacing the database.

Migration or database failure:
Stop and treat this as a data-protection incident. Do not repeatedly restart or re-run migrations until the current database state, latest verified backup, and emergency dump/salvage options are understood.

Bad deploy discovered after new production writes:
Prefer app-only recovery when possible. Database restore or older-version rollback can discard writes made after the selected backup, so record the emergency dump path and decide whether manual salvage is required.

App-only recovery recreates only `nln_ui` and `nln_server` from the archived
previous images. It verifies that the exact `nln_db` and `nln_redis` container
identities did not change; protected state containers must not be
force-recreated as part of application recovery.

## Recovery Choices

For Redis-specific restore expectations, use [redis-runtime-state.md](redis-runtime-state.md). Redis is operationally important but recoverable; PostgreSQL is the data of record.

| Mode                            | Restores app?     | Restores DB? | Typical speed | Data-loss risk        |
| ------------------------------- | ----------------- | ------------ | ------------- | --------------------- |
| automatic non-database recovery | yes               | no           | fastest       | low for DB            |
| runtime-state restore           | yes/runtime files | yes          | slower        | reverts to backup     |
| older-version rollback          | yes               | yes          | slower        | reverts to old backup |

App-only non-database recovery:
Use when the new app fails to start or fails health checks after artifact replacement, but the database should remain intact. This is the fastest and least destructive recovery mode.

Full runtime-state restore from the current deploy slot:
Use when the current deployment slot contains the runtime-state backup you need to restore. This can replace database/runtime files with the backup state and must be treated as data-destructive for writes after that backup.

Older-version rollback:
Use `rollback.sh` only as an advanced recovery path. Review the summary first:

```bash
./scripts/rollback.sh -v <PREVIOUS_VERSION> --dry-run
```

It restores the target version's database dump and Docker images. Writes made after that target backup can be lost from the live database.

Emergency dump salvage:
Before rollback replaces the database, `rollback.sh` creates an emergency SQL dump of the current database. Keep that path for manual recovery of recent writes when needed.

## Forbidden Unless Separately Approved

Do not run these during deployment tooling work or a routine release unless the production action is separately approved:

- `./scripts/deploy-production.sh` outside an approved deployment window;
- remote `./scripts/deploy.sh`;
- `./scripts/rollback.sh`;
- `./scripts/restore-runtime-state.sh --execute`;
- `docker-compose down`, `docker-compose up`, container restarts, or production migration execution;
- cleanup, deletion, pruning, package updates, or production file modification.

Read-only inspection, `./scripts/vps-healthcheck.sh -e .env-prod`, `./scripts/backup.sh -e .env-prod --preflight-only`, and verified runtime-state backup creation are allowed only when they are part of the approved pre-deploy validation process.

## Post-Deploy Checklist

- [ ] `deploy-production.sh` completed successfully.
- [ ] Post-deploy smoke checks passed.
- [ ] Public UI and API endpoints respond through the production URLs from `.env-prod`.
- [ ] Containers are healthy or in the expected running state.
- [ ] Recent server logs do not show new fatal errors.
- [ ] Deployment receipt, backup path, readiness receipt, and smoke result are recorded.
- [ ] The pre-deployment recovery package still passes `sha256sum -c SHA256SUMS`.
- [ ] Actual downtime and any recovery actions are recorded.
- [ ] `/var/tmp/<VERSION>/deploy-downtime.receipt` is recorded when remote deployment reaches public endpoint verification.

## Notes For Migration-Bearing Deploys

Use [MIGRATION_RISK.md](MIGRATION_RISK.md) to classify the change before the release window.

Before deploying migrations, record:

- pending migration names;
- whether each migration is additive, backfill, expand/contract, destructive, or emergency-only SQL;
- whether destructive SQL has the required review marker;
- the restored-backup migration rehearsal receipt;
- whether app-only rollback remains safe after the migration;
- the database restore path if rollback requires replacing the database.
