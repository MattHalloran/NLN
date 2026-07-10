# Deployment Surface Inventory

Status: Phase 0 baseline. This document describes the current supported path; it
does not authorize production access or change deployment behavior.

## Supported Production Contract

The only routine production entry point is:

```bash
./scripts/deploy-production.sh -v <VERSION> -e .env-prod
```

Its externally observable order is protected by the stub-only contract test in
`scripts/tests/deploy-production.bats`:

1. validate the local environment;
2. acquire the deployment lock and require a clean, synchronized worktree;
3. verify a fresh readiness receipt for the exact version and commit;
4. run the read-only VPS health check;
5. reject reuse of the remote version backup slot;
6. run offsite-backup preflight;
7. create and restore-verify the mandatory offsite backup;
8. build and transfer artifacts;
9. invoke the lower-level remote deploy;
10. run post-deploy admin smoke checks;
11. report remote container state and write a deployment receipt.

Tests replace validation, health, SSH, backup, build, and deploy calls with
local stubs. They must never require `.env-prod`, an SSH key, or a reachable VPS.

## Ownership Map

### Routine public entry points

| Command | Responsibility | Production effect |
| --- | --- | --- |
| `prepare-deploy-readiness.sh` | Produce release evidence without deploying | Optional read/copy checks only when explicitly selected |
| `deploy-readiness.sh` | Run validation, rehearsal, migration, and preflight gates | May perform approved read-only/read-copy checks |
| `deploy-production.sh` | Normal production orchestration | Mutating; production use requires explicit operator action |
| `backup.sh` | Off-VPS runtime-state backup and verification | Read/copy; never part of local automated tests |
| `vps-healthcheck.sh` | VPS readiness report | Read-only |

### Local and disposable qualification entry points

| Command | Responsibility | Safety boundary |
| --- | --- | --- |
| `deploy-rehearsal.sh` | Disposable end-to-end deploy and rollback rehearsal | Local fixture infrastructure only |
| `restore-drill.sh` | Restore qualification from a supplied backup | `--backup` is the automated-test default |
| `verify-production-backup-locally.sh` | Production-style local verification | `--backup` must not contact production |
| `validate-trusted.sh` | Aggregate trusted validation | Local/CI only |
| `validate-release.sh` | Release validation orchestration | Local/CI only |

### Advanced mutation and recovery entry points

| Command | Responsibility | Operator rule |
| --- | --- | --- |
| `deploy.sh` | Lower-level remote activation | Called by the supported wrapper; direct use is advanced-only |
| `rollback.sh` | Older full-state rollback | Destructive; not routine app rollback |
| `restore-runtime-state.sh` | Runtime-state restore | Dry-run by default; `--execute` is destructive |
| `applyMigrations.sh` | Database migration execution | Never run against production during implementation |
| `build.sh` | Build and artifact transfer | Production transfer only through approved orchestration |

### Internal deployment helpers

- `deploy-safety.sh`: worktree, version, and receipt safety primitives.
- `deploy-lock.sh`: shared mutation lock.
- `runtime-state.sh`: runtime backup discovery and compatibility helpers.
- `check-deploy-migration-gate.sh` and `check-migrations.sh`: migration gates.
- `deploy-smoke.sh` and `public-smoke.mjs`: post-activation checks.
- `deploy-receipt.mjs` and `validation-receipt.mjs`: evidence writers.
- `shared.sh`, `utils.sh`, `env-defaults.sh`, and `validate-env.sh`: common
  environment and shell support.

## Release Definitions and Automation

- `docker-compose-prod.yml`: current production service definition.
- `docker-compose.local-production.yml`: local production-style override.
- `docker-compose.yml`: development/default service definition.
- `.github/workflows/ci.yml`: validation, integration, browser, rehearsal, and
  trusted-gate jobs.
- `.github/workflows/deploy-rehearsal.yml`: scheduled disposable rehearsal.
- `.github/workflows/restore-drill.yml`: scheduled synthetic restore drill.
- `.github/workflows/codeql-analysis.yml`: security analysis.
- `.github/workflows/lighthouse.yml`: scheduled performance checks.

## Runtime State and Protection Classification

| State | Classification | Current protection expectation |
| --- | --- | --- |
| PostgreSQL | Irreplaceable source of record | Logical dump plus restore verification |
| `data/uploads` and `assets` | Irreplaceable user/application files | Included in runtime backup |
| `.env-prod`, optional `.env`, `jwt_*` | Irreplaceable secrets/configuration | Git-ignored and owner-only |
| Redis persistence | Operationally important, not source of record | Best-effort runtime backup |
| `data/migration-backups` | Recovery evidence | Included and Git-ignored |
| Logs | Optional diagnostics | Excluded by default |
| `.validation` receipts | Local release evidence | Git-ignored and owner-only |

Sensitive local files must be mode `0600`; sensitive directories must be mode
`0700`. The repository-safety audit checks tracked content, ignore rules, and
the supplied local environment file's mode. Its optional value comparison is
limited to unique credential-bearing values; public endpoints are not treated
as secrets by this heuristic.

## Current Baseline Classification

At the creation of this inventory, the only untracked deployment change was
`docs/deployment-reliability-master-plan.md`. It is planning documentation and
does not alter the production path. Existing deployment hardening scripts and
tests are part of the tracked baseline and require regression validation rather
than reconstruction.

Phase 0 changes introduced alongside this inventory are documentation, a
read-only repository audit, and stubbed/local tests only. No current entry point
is redirected, reordered, or removed.

## Phase 0 Review and Commit Map

The Phase 0 work should be reviewed and committed by concern; this section is a
map, not authorization for an agent to create commits:

1. **Planning baseline:** `docs/deployment-reliability-master-plan.md`.
2. **Inventory and ownership:** this document.
3. **Repository safety gate:** `.gitignore`,
   `scripts/audit-public-repository-safety.sh`, its Bats tests, the package
   command, and the clean-checkout CI invocation.
4. **Phase 1 test reliability:** `scripts/tests/__runTests.sh` adds active-file
   reporting and per-file timeouts; the validation receipt and its tests enforce
   owner-only evidence permissions.

The first two groups are documentation-only. The third and fourth groups are
local/CI-only validation changes. None changes the supported production command,
remote call order, Compose lifecycle, backup behavior, or restore behavior.

## Clean-Checkout Baseline

CI is the authoritative clean-checkout execution environment: it checks out the
candidate commit before dependencies are installed and runs the repository
safety audit before any build or test command. A merge-ready Phase 0 candidate
must show:

- the repository-safety audit and its Bats failure fixtures pass;
- the existing stubbed production deployment-order contract passes unchanged;
- `yarn validate:quick` passes from the CI checkout;
- `git diff --check` passes for the candidate patch; and
- the CI checkout contains every path listed in the ownership map.

A local dirty worktree cannot honestly supply clean-checkout evidence. Until
the changes are committed by an authorized operator, local results are useful
pre-commit evidence but Phase 0 remains short of its merge-ready exit criterion.
