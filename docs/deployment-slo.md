# Deployment SLOs

These are initial operational budgets for routine production deploys. Replace the targets with measured values after local rehearsal and the first approved production deploy using the hardened process.

## Targets

| Metric | Initial target | Evidence |
| --- | --- | --- |
| RPO for routine deploy | latest mandatory pre-deploy runtime-state backup | `backup.sh --verify-restore` output and backup manifest |
| RPO before database rollback | emergency dump immediately before rollback mutation | `rollback.sh` emergency dump path |
| App-only recovery RTO | 10 minutes | deploy recovery output and rehearsal timing |
| Full database rollback RTO | 30 minutes | rollback dry-run plus rehearsal/rollback timing |
| Routine deploy downtime | 5 minutes | `${PROJECT_DIR}/../var/tmp/<VERSION>/deploy-downtime.receipt` or `/var/tmp/<VERSION>/deploy-downtime.receipt` on the VPS |

## Receipts

`deploy-production.sh` writes `.validation/deploy-<VERSION>.json` with phase timings for environment validation, git readiness, readiness receipt verification, VPS health, backup preflight, mandatory backup, build/transfer, remote deploy, smoke checks, and container inventory.

`deploy.sh` writes `/var/tmp/<VERSION>/deploy-downtime.receipt` on the deployment host after public endpoint verification passes. The timer starts immediately before `docker-compose down` and stops after public endpoints pass.

`verify-production-backup-locally.sh` writes `.validation/local-production-backup/*.receipt`.

`restore-drill.sh` writes `.validation/restore-drills/*.receipt`.

`.github/workflows/restore-drill.yml` runs a scheduled fixture restore drill without production secrets or production data.

## Review Rules

Stop a deployment before downtime if the backup, readiness receipt, migration gate, or VPS health checks fail.

After each deployment, record:

- deploy receipt path;
- backup path;
- downtime seconds;
- smoke result;
- any recovery action taken;
- whether the observed time exceeded the target.

Do not loosen a target based on one slow run. Investigate the cause first, then revise the target only if the measured process has changed.
