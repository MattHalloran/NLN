# VPS Maintenance Policy

> Authority: separately authorized maintenance reference. It is not part of the routine release procedure.

Production maintenance must be scheduled separately from routine deployments. Deployment tooling may block on critical health failures and print recommendations, but it must not silently clean up disk, prune Docker resources, update packages, restart services, restore data, or delete files.

## Healthcheck Role

`./scripts/vps-healthcheck.sh -e .env-prod` is read-only. It may inspect:

- required runtime paths;
- Docker and docker-compose availability;
- expected container presence;
- disk space for the project, `/var/tmp`, and Docker data;
- deployment backup inventory;
- application log size;
- available package updates;
- Docker disk usage.

It may recommend manual commands, but remediation requires a separate operator decision.

## Thresholds

Defaults used by `vps-healthcheck.sh`:

- disk free percent: at least `15%`;
- disk free space: at least `5 GB`;
- runtime-state deployment backups warning count: more than `5`;
- runtime-state deployment backups warning size: more than `20 GB`;
- app log warning size: more than `1 GB`.

Override these only for a specific run with documented environment variables:

- `VPS_HEALTH_DISK_MIN_PERCENT`;
- `VPS_HEALTH_DISK_MIN_GB`;
- `VPS_HEALTH_BACKUP_WARN_COUNT`;
- `VPS_HEALTH_BACKUP_WARN_GB`;
- `VPS_HEALTH_LOG_WARN_GB`.

## Manual Procedures

Disk cleanup:
Inventory first with `df -h`, `du -sh /var/tmp/*`, project runtime directories, and Docker disk usage. Delete only version slots and artifacts that are outside the retention policy and no longer needed for rollback or restore drills.

Deployment slot retention:
Keep at least the current version slot, the most recent known-good previous version slot, and any version slots referenced by active incidents or release notes. Do not remove a slot before confirming its runtime-state backup and image archive are no longer needed.

Backup retention:
Keep the latest verified pre-deploy backup, the backup used for local production verification, and any backup referenced by a restore drill, rollback, or incident. Runtime-state backups may contain env files and JWT material, so keep permissions owner-only and never commit them.

Docker inventory:
Review containers and images before removing anything. Do not run Docker prune commands during a release window unless there is a separately approved maintenance action and current backups are verified.

Package updates:
Apply package updates in a maintenance window, not inside deployment tooling. Review available updates, snapshot/backup first, apply updates, then verify Docker, app containers, logs, and public endpoints.

Log review:
Inspect large logs before deletion. Preserve logs needed for active incidents or release validation.

## Stop Conditions

Do not deploy when the healthcheck reports a critical issue. Resolve or explicitly waive the issue in a separate maintenance decision before returning to the release path.
