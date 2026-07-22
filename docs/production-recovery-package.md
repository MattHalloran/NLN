# Production Recovery Package

> Authority: recovery-package format and verification reference. The live deployment procedure remains [Release Runbook](release-runbook.md).

## Purpose

`capture-production-recovery-package.sh` creates one local, owner-only recovery directory before deployment. It combines a restore-tested runtime-state backup with the exact application release currently running on production.

```bash
./scripts/capture-production-recovery-package.sh -e .env-prod
```

This is a read/copy operation. It must not deploy, restart containers, run migrations, restore data, update packages, prune Docker, or delete production files.

## Protected contents

The parent runtime-state backup contains the logical PostgreSQL dump, uploads, assets, environment files, optional JWT files, Redis state, and migration evidence. `production-recovery/` additionally contains:

- `production-identity.txt`: exact production Git commit, tracked-worktree state, container names, image IDs, and configured image references;
- `runtime-state-binding.txt`: SHA-256 binding to the parent restore-tested runtime-state archive and manifest;
- `production-source.tar.gz`: `git archive HEAD` from production;
- `application-artifacts.tar.gz`: the production Compose file, compiled UI/server/shared output, migrations, schema, and operational scripts;
- `production-images.tar.gz`: every unique image backing UI, server, PostgreSQL, and Redis;
- `SHA256SUMS`: hashes binding all package objects;
- `manifest.txt`: format, production commit, capture time, qualification status, and image-load verification status.

All directories must be `0700` and all files `0600`. A dirty tracked production checkout, missing container, invalid archive, failed stream, missing commit, existing destination, or checksum failure leaves no qualified recovery package.

## Optional local image-load verification

```bash
./scripts/capture-production-recovery-package.sh -e .env-prod --verify-image-load
```

This loads and inspects the captured images using the local Docker daemon. Existing local tags for the captured production image references are recorded and restored afterward. This option changes only local Docker metadata.

## Verification

```bash
PACKAGE="backups/<SERVER>/<TIMESTAMP>/production-recovery"
./scripts/verify-production-recovery-package.sh "${PACKAGE}"
```

Do not treat a runtime-state directory without `production-recovery/manifest.txt`, or a manifest without `qualification=passed`, as a complete application-and-data recovery package.

## Limitations

- The workstation copy is off-VPS but is not durable 3-2-1 storage.
- Live uploads/assets are filesystem copies rather than a transactional snapshot; PostgreSQL uses a consistent logical dump.
- Redis remains best-effort operational state; PostgreSQL is the data of record.
- Capturing images consumes VPS read I/O, network bandwidth, and local disk. Run it before the deployment window and confirm capacity first.
