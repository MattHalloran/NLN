# Generated Operator Command and Evidence Reference

> Authority: generated reference. Do not edit; regenerate with `node scripts/generate-operator-reference.mjs`.

Registry: `nln-release-commands-v1`

## Commands

| Command | Availability | Effect | Default | Receipt | Safest next command |
| --- | --- | --- | --- | --- | --- |
| `release prepare` | candidate | `local-read-only` | plan | `release-prepare` | release evidence verify |
| `release verify-backup` | candidate | `local-read-only` | verify | `runtime-state-backup-qualification` | release prepare |
| `release deploy` | candidate | `local-fixture-mutation` | plan | `release-deploy` | release evidence verify |
| `release rollback-app` | candidate | `local-fixture-mutation` | plan | `app-only-rollback` | release evidence verify |
| `release status` | candidate | `local-read-only` | read | none | release evidence verify |
| `release evidence verify` | candidate | `local-read-only` | verify | `release-evidence-verification` | release status |
| `prepare-deploy-readiness.sh` | current | `production-copy-out` | execute | `legacy-deploy-readiness` | deploy-production.sh |
| `deploy-production.sh` | current | `production-app-mutation` | execute | `legacy-production-deploy` | follow release-runbook.md |
| `rollback.sh` | advanced-destructive | `production-data-destructive` | dry-run | `legacy-destructive-rollback` | review recovery decision matrix |
| `evaluate:vps-health` | candidate | `local-read-only` | fixture | `vps-health-evaluation` | plan:vps-maintenance |
| `execute:vps-maintenance` | candidate | `local-fixture-mutation` | blocked without confirmation | `vps-maintenance-execution` | inspect failure receipt |
| `release:summary` | candidate | `local-read-only` | summarize | `release-observability-summary` | review emitted local alert events |
| `qualify:phase10` | candidate | `local-read-only` | verify | `phase10-qualification` | Phase 11 review; do not execute production |
| `validate:trusted` | current | `local-read-only` | validate | `validation-receipt` | release prepare or current production readiness |
| `runtime-state:manifest:capture` | advanced | `local-fixture-mutation` | create local manifest | `runtime-state-manifest-v2` | runtime-state:manifest:verify |
| `runtime-state:manifest:verify` | advanced | `local-read-only` | verify | `runtime-state-manifest-verification` | runtime-state:archive:create |
| `runtime-state:archive:create` | advanced | `local-fixture-mutation` | create local archive | `runtime-state-archive-v2` | runtime-state:archive:verify |
| `runtime-state:archive:verify` | advanced | `local-read-only` | verify | `runtime-state-archive-verification` | runtime-state:backup:qualify |
| `runtime-state:backup:verify-compatible` | advanced | `local-read-only` | read compatibility | `runtime-state-backup-compatibility` | use qualification for operational assurance |
| `runtime-state:database:verify` | advanced | `local-read-only` | verify facts | `runtime-state-database-invariants` | runtime-state:database:restore-verify |
| `runtime-state:database:restore-verify` | advanced | `local-fixture-mutation` | disposable restore | `runtime-state-database-restore-verification` | runtime-state:backup:qualify |
| `publish:runtime-state-backup` | advanced | `local-fixture-mutation` | fixture provider | `nln-runtime-state-remote-publication` | qualify:remote-evidence |
| `qualify:remote-evidence` | candidate | `local-read-only` | verify | `runtime-state-remote-download-verification` | release prepare |
| `create:release-bundle` | candidate | `local-fixture-mutation` | create immutable local bundle | `immutable-release-bundle` | validate:release-bundle |
| `validate:release-bundle` | candidate | `local-read-only` | verify | `immutable-release-bundle` | release prepare |
| `record:last-known-good` | candidate | `local-fixture-mutation` | record fixture evidence | `last-known-good-release` | release status |
| `validate:migration-compatibility` | candidate | `local-read-only` | verify | none | evaluate:migration-compatibility |
| `evaluate:migration-compatibility` | candidate | `local-read-only` | evaluate fixture facts | `migration-rollback-compatibility` | release deploy |
| `run:controlled-migrations` | candidate | `local-fixture-mutation` | fixture adapter | `controlled-migration` | verify resulting migration receipt |
| `rehearse:reduced-downtime` | candidate | `local-fixture-mutation` | plan | `reduced-downtime-deployment-rehearsal` | release evidence verify |
| `plan:vps-maintenance` | candidate | `local-read-only` | plan | `vps-maintenance-plan` | review plan before execute:vps-maintenance |

## Receipt types

| Receipt | Semantic verifier | Schema |
| --- | --- | --- |
| `release-prepare` | `release-prepare` | `config/schemas/release-prepare.schema.json` |
| `release-deploy` | `release-deploy` | `config/schemas/release-deploy.schema.json` |
| `release-evidence-index` | `release-evidence-index` | `config/schemas/release-evidence-index.schema.json` |
| `release-alert` | `release-alert` | `config/schemas/release-alert-event.schema.json` |
| `phase10-qualification` | `phase10-qualification` | `config/schemas/receipt-envelope.schema.json` |
| `runtime-state-backup-qualification` | `backup-qualification` | `config/schemas/receipt-envelope.schema.json` |
| `migration-rollback-compatibility` | `rollback-compatibility` | `config/schemas/receipt-envelope.schema.json` |
| `immutable-release-bundle` | `immutable-bundle` | `config/schemas/receipt-envelope.schema.json` |
| `controlled-migration` | `controlled-migration` | `config/schemas/receipt-envelope.schema.json` |
| `app-only-rollback` | `app-only-rollback` | `config/schemas/receipt-envelope.schema.json` |
| `reduced-downtime-deployment-rehearsal` | `reduced-downtime` | `config/schemas/receipt-envelope.schema.json` |
| `vps-maintenance-plan` | `maintenance-plan` | `config/schemas/receipt-envelope.schema.json` |
| `vps-maintenance-execution` | `maintenance-execution` | `config/schemas/receipt-envelope.schema.json` |

Legacy evidence is never upgraded in assurance by a compatibility reader.
