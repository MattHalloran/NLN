# Agent Notes

## Production VPS Access

- Production VPS settings are sourced from `.env-prod`; do not hard-code production IPs, hostnames, credentials, or environment values in committed files.
- Passwordless SSH uses a per-server key named `~/.ssh/id_rsa_${SITE_IP}` and connects as `root`.
- To connect interactively, run:

```bash
./scripts/connectToServer.sh
```

- Equivalent explicit command:

```bash
SITE_IP=$(grep SITE_IP .env-prod | cut -d= -f2)
ssh -i ~/.ssh/id_rsa_${SITE_IP} root@${SITE_IP}
```

- If the key is missing or batch-mode SSH fails because no public key is installed on the VPS, run:

```bash
./scripts/keylessSsh.sh -e .env-prod
```

That setup script creates `~/.ssh/id_rsa_${SITE_IP}` if needed, appends the public key to root's `authorized_keys` on the VPS, and verifies passwordless SSH with `BatchMode=yes`.

## Production Deployment Policy

- Use `./scripts/deploy-production.sh -v <VERSION> -e .env-prod` for normal deployments.
- Use a fresh version every time; the wrapper refuses to deploy if `/var/tmp/<VERSION>/runtime-state/manifest.txt` already exists on the VPS.
- The wrapper blocks deployment unless non-mutating VPS health checks pass and a fresh offsite runtime-state backup succeeds.
- `./scripts/vps-healthcheck.sh -e .env-prod` is read-only: it may recommend cleanup, updates, or inspection commands, but must not perform remediation automatically.
- When validating deployment changes locally, stub SSH/backup/deploy commands. Do not run real deployment, backup, cleanup, update, prune, restart, or deletion commands against production unless explicitly asked.

## Public Repository Safety

- Keep this file operational but non-secret: committed instructions may describe workflows, script names, and variable names, but must not include real production IPs, domains, tokens, passwords, private keys, database URLs, or copied `.env-prod` values.
- Use documentation placeholders such as `<VERSION>`, `${SITE_IP}`, and `${PROJECT_DIR}` instead of concrete production infrastructure values.
- Runtime-state backups may contain `.env-prod`, optional `.env`, and optional `jwt_*`; they must remain ignored by git and should be stored with owner-only permissions.

## Production Deployments and Backups

- Standard production deploys should use:

```bash
./scripts/deploy-production.sh -v <VERSION> -e .env-prod
```

- Before risky production work, take a runtime-state backup without SSH key provisioning:

```bash
./scripts/backup.sh -e .env-prod
```

- Before a production deployment, prefer the complete recovery package, which also captures the exact running commit, compiled artifacts, Compose configuration, and Docker images:

```bash
./scripts/capture-production-recovery-package.sh -e .env-prod
```

- Preview backup size and included paths without creating an archive:

```bash
./scripts/backup.sh -e .env-prod --preflight-only
```

- Runtime-state backups include `data/postgres`, `data/uploads`, `assets`, `data/redis`, `data/migration-backups`, `.env-prod`, optional `.env`, and optional `jwt_*`. Logs are excluded by default; add `--include-logs` only when diagnostics are needed.
