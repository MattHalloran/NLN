# Phase 11 Safe Adoption Plan

This document turns the recommended deployment improvements into an ordered adoption
program. It does not authorize deployment or production mutation. The machine-readable
authority is `config/phase11-adoption-policy.json`, which currently disables production
integration, production access, and VPS mutation.

## Current boundary

Only Stage A (local fixtures/disposable infrastructure) and Stage B (synthetic CI
rehearsal) may be automated. Production-facing stages require separate, stage-specific
human approval. Under the current user authorization, future VPS activity is limited to
approved read-only observation and approved read/copy backup operations. Deployment,
service lifecycle changes, package maintenance, cleanup, pruning, restart, and deletion
remain forbidden.

Phase 11 cannot advance to production adoption until Phase 9 disaster recovery is
qualified, Phase 10 is qualified, and repository branch protection requires the trusted
gate. These are evidence requirements, not checkboxes that may be waived.

The fixture-only Phase 9 foundation is defined by
`config/phase9-disaster-recovery-policy.json`. Its rehearsal command consumes an
immutable release bundle, encrypted backup, separately stored recovery identity, and
separately stored recovery configuration. It denies repository/network access, measures
RTO/RPO, requires emergency evidence before destructive boundaries, and retains manual
salvage evidence. A fixture result explicitly does not qualify a real backup or authorize
production cutover.

## Ordered stages

1. **Local-only qualification:** complete failure injection and obtain two clean-checkout
   validations plus two distinct trusted-gate receipts for the exact commit.
2. **CI rehearsal:** schedule synthetic deploy, app rollback, encrypted backup, and
   clean-host restore rehearsals. Any unresolved flaky or hanging test blocks promotion.
3. **Production observation:** after separate approval, compare candidate and legacy
   read-only health reports. Do not modify the host.
4. **Backup qualification:** after separate approval, copy runtime state off the VPS,
   encrypt and publish it, then download and restore-verify from a different host. Record
   secure cleanup of copied data.
5. **Evidence canary:** after separate approval, wrap the existing mutation sequence
   with exact-commit receipts and immutable bundle evidence without changing that
   sequence.
6. **Deployment cutover:** after explicit production-mutation approval, use a low-risk
   release, controlled migration evidence, exact-transition rollback rehearsal, named
   operators, stop conditions, and a retained legacy path.
7. **Stabilization:** review measured objectives and retain the legacy path until
   multiple new-path releases and recovery rehearsals have succeeded.

## Immediate safe work

- Keep the production entrypoints frozen and production integration flags false.
- Complete Phase 9 using fixtures, disposable containers, and independently stored
  synthetic artifacts.
- Confirm branch-protection configuration and exact-commit CI receipts through
  repository governance; do not synthesize evidence locally.
- Add scheduled synthetic rehearsals only after their commands are proven incapable of
  reading `.env-prod` or opening production network connections.
- Configure a real encrypted provider adapter separately; credentials, endpoints, and
  age identities must remain outside the repository.
- Prepare observation and copy-only command allowlists for later human review.

## Stop conditions

Stop if a command reads `.env-prod`, attempts SSH unexpectedly, needs production
credentials during fixture work, changes a frozen production entrypoint, broadens
evidence permissions, cannot bind evidence to the exact commit, or would require an
implicit/bypass approval. Preserve the legacy path and report the failed gate.

## Scheduled synthetic rehearsal matrix

The Stage B matrix is governed by `config/phase11-ci-rehearsal-manifest.json`:

- disposable deploy rehearsal;
- clean-host disaster restore and failure injection;
- encrypted fixture publication, download, restore, and provider failure handling; and
- immutable app-only rollback with database/Redis state preservation.

All workflows are scheduled and manually runnable, use immutable action pins, declare
read-only repository permissions, and retain TAP evidence even after failures. The
validator rejects production environment names, production entrypoints, SSH/copy
commands, missing evidence, floating actions, or any claim that fixture evidence
qualifies production.

## GitHub governance audit

`audit:github-deployment-governance` compares live branch protection and commit checks
with `config/github-deployment-governance-policy.json`, then verifies distinct push and
pull-request trusted-gate receipts for the exact commit. It is read-only and publishes
owner-only evidence whether governance is qualified or blocked. A missing required
`Trusted Gate`, non-strict checks, inadequate review requirement, force pushes, branch
deletion, failed exact-commit checks, stale evidence, or reused receipts blocks
qualification. The audit never changes repository settings.
