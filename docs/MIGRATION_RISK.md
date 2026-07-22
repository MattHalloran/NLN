# Migration Risk Classification

> Authority: migration risk reference. It informs the release runbook but does not authorize migration execution.

Use this guide before any production release that includes database migrations. The goal is to make rollback and data-loss implications explicit before the deployment window.

## Required Evidence

Record these items in the release notes or the release runbook:

- pending migration names from `check-deploy-migration-gate.sh`;
- migration class for each pending migration;
- restored-backup migration rehearsal receipt;
- whether app-only rollback remains safe after the migration;
- database restore or manual salvage path if rollback requires replacing the database.

## Classes

Safe additive:
Creates tables, columns, indexes, nullable foreign keys, or enum values without removing or rewriting existing data. App-only rollback is usually safe when old code ignores the new schema.

Backfill:
Writes or rewrites existing rows while preserving the old schema. Review execution time, lock behavior, and whether the write can be re-run safely.

Expand/contract:
Uses multiple releases to avoid downtime or data loss. The expand release adds compatible schema first; later releases switch code paths and then remove old schema after data is migrated.

Destructive:
Drops, truncates, renames, tightens nullability, changes column type, deletes rows, or otherwise makes existing data unavailable to old code. These migrations require the review marker and explicit sign-off.

Emergency-only direct SQL:
Manual SQL outside the migration system. Use only for incident response or a separately approved maintenance window. Record exact SQL, operator, timestamp, backup path, and rollback/salvage plan.

## Destructive Migration Requirements

A destructive migration must have all of the following before deployment:

- SQL marker: `-- deploy-safe: allow-destructive-migration: <reviewed reason>`;
- restored-backup migration rehearsal receipt;
- release notes or runbook sign-off;
- rollback implications documented, including whether app-only rollback is unsafe;
- latest verified runtime-state backup path;
- emergency dump/manual salvage plan for writes after the selected backup.

The marker means the risk was reviewed. It does not mean the migration is safe or reversible.

## Pre-Downtime Gate

The deploy path runs:

```bash
./scripts/check-deploy-migration-gate.sh --migration-root <DIR> --env-file <FILE> --readiness-receipt <RECEIPT>
```

The gate scans migration SQL, reports pending migration names, blocks unmarked destructive SQL, and requires readiness evidence that migrations were rehearsed against a restored backup. It does not apply migrations.

## One-Shot Migration Follow-Up

Migrations currently remain tied to application startup. Moving them into an explicit one-shot deploy phase is a separate design change. Do not make that change inside an ordinary release unless rehearsal proves it reduces risk and the rollback behavior is documented.
