# Operations and Documentation Hub

> Authority: operator hub. This page routes operators by role and safety boundary; it is not itself a live-window procedure.

## Current supported routine release

There is exactly one production procedure: [Release Runbook](release-runbook.md).
The supported sequence remains:

```bash
./scripts/prepare-deploy-readiness.sh -v <VERSION> -e .env-prod
./scripts/deploy-production.sh -v <VERSION> -e .env-prod
```

Do not substitute candidate `release` commands for this path. Phase 10 does not authorize production access or mutation.

## Candidate local and rehearsal workflow

The Phase 10 interface is fixture/local only. Discover it without reading secrets or contacting a host:

```bash
yarn release --help
yarn release prepare --help
yarn release evidence verify --help
```

See the [generated command reference](generated-operator-reference.md), [evidence reference](deployment-evidence-reference.md), [capability matrix](deployment-capability-matrix.md), and [Phase 10 architecture](deployment-reliability-architecture.md).

## Advanced recovery and destructive restore

Start with the [recovery decision matrix](recovery-decision-matrix.md). `rollback-app` means application-only recovery with the database preserved. `restore-data` and legacy `rollback.sh` can replace data and require separate authorization. Redis recovery expectations are in [Redis runtime state](redis-runtime-state.md).

## Maintenance and disaster recovery

Maintenance is never bundled with a routine release. Use [VPS maintenance](vps-maintenance.md) for read-only health and separately authorized maintenance. Phase 9 disaster recovery and Phase 11 production adoption remain dependencies, not supported Phase 10 operations.

## Authoritative references

- [Release Runbook](release-runbook.md) — only current live-window procedure.
- [Deployment SLI/SLO](deployment-slo.md) — formulas, windows, scope, and owners.
- [Deployment command catalog](deployment-command-catalog.md) — stable ownership and effects.
- [Generated operator reference](generated-operator-reference.md) — registry-derived command and receipt names.
- [Deployment evidence reference](deployment-evidence-reference.md) — receipt relationships, compatibility limits, storage, and verification.
- [Deployment reliability architecture](deployment-reliability-architecture.md) — policies, adapters, extension rules, and testing boundaries.
- [Deployment reliability master plan](deployment-reliability-master-plan.md) — reserved phase taxonomy.
- [Deployment architecture/reference](../DEPLOYMENT.md) — background, not a live procedure.
- [Testing and Validation Guide](../TESTING.md) and [Environment Variables](../ENVIRONMENT.md).
