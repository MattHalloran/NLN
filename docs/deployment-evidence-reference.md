# Deployment Evidence Reference

> Authority: evidence reference. This document explains the canonical Phase 10 evidence model; `config/receipt-registry.json` and its schemas remain machine-authoritative.

## Evidence boundary

Phase 10 evidence is fixture/local only. A successful fixture receipt does not authorize production access or mutation. Current production readiness and deployment receipts retain their existing legacy meaning until a separately approved Phase 11 cutover.

Canonical receipts are owner-only regular files. They bind a receipt type, producer, release version and full commit, scope, governing policy hash, canonical timestamps and duration, input/output hashes, child receipt hashes, result, and a redacted failure. `yarn validate:release-receipt --receipt <FILE>` verifies this envelope and recursively verifies registered child evidence.

Compatibility evidence predates the common envelope. It remains readable under `config/schemas/legacy-evidence.schema.json`, but registry membership does not upgrade its assurance. A canonical qualifier must invoke the relevant domain verifier and hash-bind the original bytes before compatibility evidence can participate in a stronger result.

## Core evidence graph

```text
trusted validation ─┐
immutable bundle ───┤
qualified backup ───┼─> release evidence index ─> lifecycle-state receipt
migration safety ───┤                              └─> prepare/deploy receipt
fixture health ─────┘
```

Optional local application verification, remote download verification, and 3-2-1 resilience evidence strengthen the graph but never replace required evidence. `config/runtime-state-assurance-profiles.json` defines the ordered backup profiles. A weaker profile cannot satisfy a stronger gate.

`release:state evaluate` derives lifecycle state from exact indexed receipt types and hashes. Missing evidence emits a blocked receipt. It is not valid to edit a state field manually.

## Verification commands

```bash
yarn validate:release-receipt --receipt <RECEIPT>
yarn release evidence verify --index <INDEX>
yarn release:state evaluate --index <INDEX> --output <STATE_RECEIPT>
yarn release evidence summarize --directory <EVIDENCE_DIR> --output <SUMMARY> --alerts <ALERTS>
```

These commands are local and do not discover `.env-prod`. Evidence publication never overwrites an existing path.

## Storage and retention

Receipts may expose operational metadata such as durations, hashes, safe counts, and failure codes. Treat them as operational-confidential. They must not contain environment values, credentials, connection strings, database rows, personal identifiers, upload names, or raw provider output. Preserve incident-held evidence. Retention deletion remains separate, dry-run-first, and cannot run as part of deployment.

## Failure evidence

A failed or recovered deployment remains a failed release attempt for reliability reporting. Failure receipts state whether application mutation, database mutation, and user-visible downtime began, plus the safest next action. Recovery success is recorded separately and never converts the original attempt into success.
