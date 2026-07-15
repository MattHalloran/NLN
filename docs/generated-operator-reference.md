# Generated Operator Command and Evidence Reference

> Authority: generated reference. Do not edit; regenerate with `node scripts/generate-operator-reference.mjs`.

Registry: `nln-release-commands-v1`

## Commands

| Command | Availability | Effect | Default | Receipt | Safest next command |
| --- | --- | --- | --- | --- | --- |
| `release prepare` | candidate | `local-read-only` | plan | `release-prepare` | release evidence verify |
| `release verify-backup` | candidate | `local-read-only` | verify | `runtime-state-backup-qualification` | release prepare |
| `release verify-local` | candidate | `local-fixture-mutation` | plan | `release-local-verification` | release evidence verify |
| `release deploy` | candidate | `local-fixture-mutation` | plan | `release-deploy` | release evidence verify |
| `release rollback-app` | candidate | `local-fixture-mutation` | plan | `app-only-rollback` | release evidence verify |
| `release status` | candidate | `local-read-only` | read | none | release evidence verify |
| `release health` | candidate | `local-read-only` | fixture observation | `vps-health-gate` | release maintenance plan |
| `release restore-database` | candidate-plan-only | `local-read-only` | plan | `release-recovery-plan` | review recovery decision matrix; execution requires Phase 11 approval |
| `release restore-disaster` | candidate-plan-only | `local-read-only` | plan | `release-recovery-plan` | complete Phase 9 and obtain Phase 11 approval |
| `release maintenance plan` | candidate | `local-read-only` | plan | `vps-maintenance-plan` | review plan before release maintenance execute |
| `release maintenance execute` | candidate | `local-fixture-mutation` | blocked without confirmation | `vps-maintenance-execution` | release health |
| `release evidence summarize` | candidate | `local-read-only` | summarize | `release-observability-summary` | review emitted local alert events |
| `release evidence verify` | candidate | `local-read-only` | verify | `release-evidence-verification` | release status |
| `prepare-deploy-readiness.sh` | current | `production-copy-out` | execute | `legacy-deploy-readiness` | deploy-production.sh |
| `deploy-production.sh` | current | `production-app-mutation` | execute | `legacy-production-deploy` | follow release-runbook.md |
| `rollback.sh` | advanced-destructive | `production-data-destructive` | dry-run | `legacy-destructive-rollback` | review recovery decision matrix |
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

## Lower-level package commands

| Alias | Owner | Visibility | Effect |
| --- | --- | --- | --- |
| `validate` | quality | routine | `local-read-only` |
| `validate:quick` | quality | routine | `local-read-only` |
| `validate:trusted-manifest` | trusted-gate | internal | `local-read-only` |
| `validate:trusted-receipt` | trusted-gate | advanced | `local-read-only` |
| `validate:runtime-state-inventory` | backup | internal | `local-read-only` |
| `validate:runtime-state-backup-policy` | backup | internal | `local-read-only` |
| `validate:runtime-state-remote-storage-policy` | backup | internal | `local-read-only` |
| `validate:immutable-release-policy` | release-builder | internal | `local-read-only` |
| `validate:reduced-downtime-policy` | release-operator | internal | `local-read-only` |
| `validate:vps-health-maintenance-policy` | maintenance | internal | `local-read-only` |
| `release` | release-operator | routine | `local-read-only` |
| `release:evidence` | release-operator | advanced | `local-read-only` |
| `validate:release-receipt` | release-operator | advanced | `local-read-only` |
| `validate:legacy-release-evidence` | release-operator | advanced | `local-read-only` |
| `validate:phase10-contracts` | phase10 | internal | `local-read-only` |
| `validate:prisma-client` | quality | internal | `local-fixture-mutation` |
| `validate:deployment-traceability` | phase10 | internal | `local-read-only` |
| `runtime-state:backup:create-qualification` | backup | advanced | `local-fixture-mutation` |
| `validate:deployment-operational-objectives` | reliability | internal | `local-read-only` |
| `release:state` | release-operator | advanced | `local-read-only` |
| `validate:deployment-module-boundaries` | phase10 | internal | `local-read-only` |
| `check:runtime-state-backup-freshness` | backup | advanced | `local-read-only` |
| `cleanup:runtime-state-remote-backups` | backup | advanced | `local-fixture-mutation` |
| `validate:browser` | quality | advanced | `local-fixture-mutation` |
| `validate:full` | quality | advanced | `local-fixture-mutation` |
| `validate:ci` | quality | internal | `local-fixture-mutation` |

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
| `nln-runtime-state-archive` | `archive-v2-compatibility` | `config/schemas/legacy-evidence.schema.json` |
| `nln-runtime-state-database-invariant-verification` | `database-invariant-compatibility` | `config/schemas/legacy-evidence.schema.json` |
| `runtime-state-application-restore-verification` | `application-restore-compatibility` | `config/schemas/legacy-evidence.schema.json` |
| `runtime-state-remote-download-verification` | `remote-download-compatibility` | `config/schemas/legacy-evidence.schema.json` |
| `runtime-state-resilience-qualification` | `resilience-compatibility` | `config/schemas/legacy-evidence.schema.json` |
| `release-lifecycle-state` | `release-lifecycle-state` | `config/schemas/receipt-envelope.schema.json` |
| `trusted-validation-gate` | `trusted-gate-compatibility` | `config/schemas/legacy-evidence.schema.json` |
| `vps-health-gate` | `vps-health-compatibility` | `config/schemas/legacy-evidence.schema.json` |
| `last-known-good-release` | `known-good-compatibility` | `config/schemas/legacy-evidence.schema.json` |
| `release-local-verification` | `release-local-verification` | `config/schemas/receipt-envelope.schema.json` |
| `release-recovery-plan` | `release-recovery-plan` | `config/schemas/receipt-envelope.schema.json` |
| `legacy-evidence-compatibility-verification` | `legacy-evidence-compatibility` | `config/schemas/receipt-envelope.schema.json` |

Legacy evidence is never upgraded in assurance by a compatibility reader.
