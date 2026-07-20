# Phase 9 Disaster-Recovery Qualification

Phase 9 proves the fixture recovery mechanics without connecting them to production.
The governing contract is `config/phase9-disaster-recovery-policy.json`.

## Inputs and isolation

Each clean-host drill requires four independently stored inputs:

- an immutable release bundle;
- an encrypted, download-verified backup;
- the recovery identity; and
- recovery configuration.

Inputs from the repository checkout or a shared storage directory are rejected. The
fixture adapter is statically prohibited from importing network modules. Recovery
configuration must deny repository and network access and must select PostgreSQL 13.

## Rehearsal

Run `yarn rehearse:disaster-recovery --drill-id <ID> ...` only with synthetic fixture
artifacts. The command creates a disposable owner-only workspace, verifies the release
and backup evidence, invokes the no-network adapter, checks the application and runtime
state, records RTO/RPO, publishes retained salvage evidence, and removes the workspace.

It fails closed for missing or corrupt release, backup, recovery key, environment,
uploads, assets, or JWT material; PostgreSQL mismatch; excessive RPO; emergency dump
failure; and interruption at each destructive boundary. Qualification and salvage
evidence are owner-only and cannot be overwritten.

## Program qualification

`yarn qualify:phase9-disaster-recovery` requires two distinct successful drill receipts
plus a complete failure-injection matrix. Its result explicitly states:

- fixture-only;
- does not qualify a real backup; and
- does not authorize production cutover.

Emergency salvage remains manual. Evidence records source, applied, and conflicting
write counts and cannot be automatically deleted before formal recovery closure.

## Remaining production-facing proof

Scheduled fixture drills provide regression evidence but do not replace an approved
real-backup drill. Before Phase 11 can advance, separately approved work must restore a
copied encrypted production backup on an isolated non-production host, measure real
RTO/RPO, prove recovery from a different machine, and retain the resulting evidence.
That work may copy data from the VPS but must not deploy or mutate the VPS.
