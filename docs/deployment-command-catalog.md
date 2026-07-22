# Deployment Command and Ownership Catalog

> Authority: stable reference. Machine-readable command identity and effects are owned by `config/command-registry.json`.

The current production owners are `prepare-deploy-readiness.sh` followed by `deploy-production.sh`. Candidate commands are owned by `scripts/release.mjs`; advanced Phase 5–8 commands remain fixture-only. Legacy `rollback.sh` is destructive recovery, never routine rollback.

Use the [generated operator reference](generated-operator-reference.md) for aliases, defaults, receipts, and next-step guidance. Historical implementation narrative remains in [Deployment Surface Inventory](deployment-surface-inventory.md), which is no longer the command authority.
