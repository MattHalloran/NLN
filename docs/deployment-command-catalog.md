# Deployment Command and Ownership Catalog

> Authority: stable reference. Machine-readable command identity and effects are owned by `config/command-registry.json`.

The current production owners are `prepare-deploy-readiness.sh` followed by `deploy-production.sh`. Candidate commands are owned by `scripts/release.mjs`; advanced Phase 5–8 commands remain fixture-only. Legacy `rollback.sh` is destructive recovery, never routine rollback.

`capture-production-recovery-package.sh` owns the complete read/copy-only pre-deployment capture. It delegates runtime data collection to `backup.sh`, then binds the result to the exact production source, compiled artifacts, Compose configuration, and running images. `backup.sh` remains the lower-level data-only command.

Use the [generated operator reference](generated-operator-reference.md) for aliases, defaults, receipts, and next-step guidance. Historical implementation narrative remains in [Deployment Surface Inventory](deployment-surface-inventory.md), which is no longer the command authority.
