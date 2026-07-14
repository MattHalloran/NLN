# Deployment SLI and SLO Contract

> Authority: operational reference. Contract version `nln-operational-sli-v1` in `config/operational-sli.json` is authoritative for machine validation.

Production observations, local observations, fixture rehearsals, and policy limits are distinct. Fixture measurements never satisfy a production SLO. Unless an indicator says otherwise, the aggregation window is the trailing 30 days ending at the receipt's canonical UTC `finishedAt`.

| Indicator | Formula | Clock/unit | Evidence | Scope | Minimum samples | Alert | Owner |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| deployment success rate | successful production deploy receipts / completed production deploy receipts | `finishedAt`, ratio | `release-deploy` receipts | production | 5 | below 0.95 | release operator |
| deployment downtime | `userVisibleDowntimeFinishedAt - userVisibleDowntimeStartedAt` | adapter monotonic clock, ms | production deploy receipt | production | 1 | above 60,000 ms | release operator |
| fixture rollback RTO | rollback `finishedAt - startedAt` | receipt timestamps, ms | `app-only-rollback` | fixture | 3 | above 300,000 ms | release operator |

RPO is the age of the newest `qualified` backup at the instant database mutation begins. It is not capture completion time, remote publication time, or the age of an unverified archive. The routine production bound is 3,600 seconds, owned by the backup policy.

Restore-drill cadence has two clocks: fixture exercises must occur within 168 hours; a production-qualified backup restore requires explicit authorization and has a separate 2,160-hour maximum. One does not satisfy the other.

`release:summary` emits local events for stale/missing qualified backups, overdue restore evidence, repeated failures, threshold violations, missing remote verification or resilience evidence, and health/maintenance blockers. Alert transport is deferred. Review after every production deployment and monthly. Below the minimum sample count, report “insufficient samples,” never passing.

Compatibility labels retained for current tooling are: **RPO for routine deploy** (3,600 seconds), **App-only recovery RTO** (300 seconds for fixture qualification), **Full database rollback RTO** (backup-dependent and measured separately), and **Routine deploy downtime** (60 seconds alert threshold). Current deployments may emit `/var/tmp/<VERSION>/deploy-downtime.receipt`; it remains legacy evidence and is not rewritten. The scheduled fixture source is `.github/workflows/restore-drill.yml`.
