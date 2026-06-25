# Deployment Guide

This document describes the production deployment process for the New Life Nursery website.

## Table of Contents

- [Overview](#overview)
- [Recent Improvements](#recent-improvements)
- [Prerequisites](#prerequisites)
- [Deployment Process](#deployment-process)
- [Rollback Procedure](#rollback-procedure)
- [Troubleshooting](#troubleshooting)
- [Known Issues & Limitations](#known-issues--limitations)
- [Future Improvements](#future-improvements)

## Overview

The deployment process is a two-phase manual workflow:

1. **Build Phase** (`build.sh`) - Run on your development machine
   - Validates environment configuration
   - Builds UI and server code
   - Creates production Docker images
   - Compresses and transfers artifacts to VPS

2. **Deploy Phase** (`deploy.sh`) - Run on the production server
   - Validates environment configuration
   - Verifies the remote repository can fast-forward to the commit that was built
   - Backs up current runtime state
   - Stages build artifacts before replacing live files
   - Loads new Docker images
   - Restarts containers with health checks
   - Verifies public UI and API endpoints
   - Verifies successful deployment

## Recent Improvements

### 1. Automatic Environment File Loading (docker-compose-prod.yml)
- **What**: Production docker-compose now automatically loads `.env-prod` via `env_file` directive
- **Why**: Simplifies deployment commands and prevents using wrong environment file
- **Impact**: No longer need to specify `--env-file .env-prod` when starting containers

### 2. Environment Validation (`validate-env.sh`)
- **What**: Validates all required environment variables before deployment
- **Why**: Prevents deployment failures due to missing or malformed configuration
- **When**: Runs automatically at the start of `build.sh` and `deploy.sh`

### 3. Health Check Polling (in `deploy.sh`)
- **What**: Waits for all containers to become healthy before declaring success
- **Why**: Prevents "deployment succeeded" messages when containers actually failed
- **Timeout**: 5 minutes with status updates every 15 seconds
- **What it checks**: All 4 containers (ui, server, db, redis) must be healthy or running

### 4. Pre-Migration Database Backup (in `server.sh`)
- **What**: Creates a SQL dump backup immediately before running migrations
- **Where**: `data/migration-backups/pre-migration-YYYYMMDD-HHMMSS.sql`
- **Why**: Provides a restore point if migrations corrupt data
- **Retention**: Keeps the last 10 backups automatically

### 5. Rollback Script (`rollback.sh`)
- **What**: Automated rollback to a previous version
- **Why**: Quick recovery from failed deployments
- **What it does**:
  - Creates emergency SQL dump of the current database
  - Stops containers
  - Restores database from the specified version's logical dump
  - Loads old Docker images
  - Starts containers with health checks

### 6. Improved Error Handling
- **Git pull failures**: Now exits with error instead of warning
- **Migration failures**: Now exits with error and provides restore instructions
- **Container startup failures**: Now detected and reported
- **Failed deploy recovery**: If startup, health, or public endpoint verification fails after artifact swap, `deploy.sh` attempts non-database recovery by restoring previous build artifacts and application images, then prints explicit runtime restore and older-version rollback commands.

### 7. Mandatory Offsite Backup and VPS Health Gate (`deploy-production.sh`)
- **What**: The standard deployment wrapper now runs a non-mutating VPS health check and requires a successful offsite backup before build/transfer.
- **Why**: Prevents routine deployments from proceeding without a fresh offsite recovery point or with critical VPS health problems.
- **Policy**: Critical health issues block deployment; cleanup/update findings are warnings with recommended operator commands only.

### 8. Logical Runtime-State Database Backups
- **What**: Runtime-state backups now require `data/postgres.sql`, created with `pg_dump`, instead of copying live Postgres data files as the primary backup.
- **Why**: A logical dump is consistent while Postgres is running and is safer to validate and restore.
- **Compatibility**: Legacy `/var/tmp/<VERSION>/postgres` raw backups are still recognized by rollback as a fallback for older deployments.

### 9. Staged Artifact Deployment
- **What**: `deploy.sh` validates Git state and extracts artifacts into `/var/tmp/<VERSION>/staged-artifacts` before replacing live `dist` directories.
- **Why**: Git or extraction failures now stop before live build artifacts are changed.
- **Commit check**: `build.sh` transfers `deploy-commit.txt`; `deploy.sh` fast-forwards the remote repository and verifies `HEAD` matches that commit.

### 10. Disposable Deploy Rehearsal
- **What**: `deploy-rehearsal.sh` runs a local disposable rehearsal of the production deploy path.
- **Why**: Verifies build artifacts, logical backup creation, container restart, public endpoint checks, SQL dump restore, and rollback execution before touching production.
- **Safety**: Generates a loopback-only env by default, refuses production-looking env values, and refuses to replace existing local `nln_*` containers unless explicitly allowed.

### 11. Non-Deploying Readiness Gate
- **What**: `deploy-readiness.sh` runs the pre-production confidence checks without deploying.
- **Why**: Gives one command for env validation, clean/synced git state, local validation, rehearsal, restored-backup migration rehearsal, read-only VPS health, version-slot freshness, and backup preflight.
- **Safety**: It must not deploy, restart, restore, prune, update, clean up, or create backup archives.
- **Receipt**: On success, it writes a local `.deploy-readiness/<VERSION>.receipt` proving the exact commit, validation command, rehearsal, and VPS preflight that passed.
- **Migration gate**: A recent local runtime-state backup is required through `--migration-backup PATH`. The readiness receipt is not accepted by production deploy unless this restored-backup migration rehearsal passed.

### 12. Readiness Receipt Enforcement
- **What**: `deploy-production.sh` now requires a fresh readiness receipt for the same version, commit, and validation command before it builds or transfers artifacts.
- **Why**: The expensive local validation and rehearsal can be completed before the deploy window, while the actual deploy still verifies that the current commit is clean, pushed, synchronized, and recently rehearsed.
- **Freshness**: Receipts are valid for 4 hours by default. Override with `DEPLOY_READINESS_RECEIPT_MAX_AGE_SECONDS` only when the deploy window has been intentionally planned.

### 13. Post-Deploy Smoke Gate
- **What**: `deploy-production.sh` runs `deploy-smoke.sh --admin` after the remote deploy completes.
- **Why**: Public page checks, Prisma migration status, recent fatal log scanning, and reversible admin API checks all need to pass before the wrapper reports success.
- **Safety**: The standalone smoke script keeps admin checks explicit; the production wrapper opts into them for the standard deploy path.

### 14. Migration Risk Checks
- **What**: `scripts/check-migrations.sh` runs as part of `yarn check:drift`.
- **Why**: Potentially destructive migration SQL, such as dropping columns/tables, truncation, broad deletes, type changes, or new NOT NULL constraints, must carry an explicit review marker before passing validation.
- **Marker**: Use `-- deploy-safe: allow-destructive-migration: <reason>` only after backup and rollback implications are reviewed.

## Prerequisites

### On Development Machine
- Access to production server via SSH
- SSH keys configured (`~/.ssh/id_rsa_{SITE_IP}`)
  - Use `./scripts/keylessSsh.sh -e .env-prod` to set up if needed
  - Use `./scripts/connectToServer.sh` to connect interactively
- `.env-prod` file configured with production settings

### Production VPS SSH Access

The current production VPS connection details are read from `.env-prod`:

```bash
SITE_IP=$(grep SITE_IP .env-prod | cut -d= -f2)
PROJECT_DIR=$(grep PROJECT_DIR .env-prod | cut -d= -f2)
```

Do not commit concrete production IPs, hostnames, credentials, or copied `.env-prod` values. Keep production connection details in `.env-prod` and reference them through variables such as `${SITE_IP}` and `${PROJECT_DIR}`.

Passwordless SSH is supported through a per-server private key at `~/.ssh/id_rsa_${SITE_IP}`. The usual interactive connection command is:

```bash
./scripts/connectToServer.sh
```

The equivalent explicit SSH command is:

```bash
ssh -i ~/.ssh/id_rsa_${SITE_IP} root@${SITE_IP}
```

If that key does not exist locally, or if batch-mode SSH fails because the public key is not installed on the VPS, run:

```bash
./scripts/keylessSsh.sh -e .env-prod
```

That script creates `~/.ssh/id_rsa_${SITE_IP}` when missing, appends the public key to root's `authorized_keys` on the VPS, and verifies passwordless SSH with `BatchMode=yes`.

### On Production Server
- Docker and Docker Compose installed
- Nginx reverse proxy running
- Sufficient disk space in `/var/tmp` for backups

## Deployment Process

### Step 1: Pre-Deployment Checklist

Before starting deployment, verify:

```bash
# Run the same default validation gate used by deploy-production.sh
yarn validate:ci

# Verify git status
git status

# Validate environment configuration (optional - runs automatically in build.sh)
./scripts/validate-env.sh .env-prod
```

Create or identify a recent local runtime-state backup for migration rehearsal. The production wrapper will create a fresh offsite backup during deployment, but readiness also needs a local backup path so migrations can be rehearsed against production-shaped data before the deploy window:

```bash
./scripts/backup.sh -e .env-prod --preflight-only
./scripts/backup.sh -e .env-prod --verify-restore
```

For a focused rehearsal, run the disposable local deploy path before the production wrapper:

```bash
./scripts/deploy-rehearsal.sh -v rehearsal-<VERSION>
```

The rehearsal creates a temp project clone, generates a local loopback production-shaped env file, starts disposable Postgres and Redis containers, runs the production build locally, runs `deploy.sh` in rehearsal mode, verifies public UI/API responses, verifies the runtime-state SQL dump restores into a separate disposable Postgres container, executes a disposable rollback probe, and runs a full runtime-state restore dry run.

Important constraints:
- The rehearsal requires a clean tracked worktree so `deploy-commit.txt` matches the cloned project.
- It uses the production compose container names (`nln_ui`, `nln_server`, `nln_db`, `nln_redis`) and refuses to run if those local containers already exist. Use `--replace-local-containers` only when those containers are disposable local state.
- It does not read `.env-prod` unless explicitly passed with `-e`; explicit env files are copied into the temp rehearsal directory and forced to use the disposable `PROJECT_DIR`.

Or run the combined non-deploying readiness gate:

```bash
./scripts/deploy-readiness.sh -v <VERSION> -e .env-prod --migration-backup backups/${SITE_IP}/<BACKUP_TIMESTAMP>
```

This checks the env file, clean/synced git state, local validation, disposable deploy rehearsal, restored-backup migration rehearsal, read-only VPS health, fresh deployment version slot, and offsite backup preflight. It does not deploy, restart, restore, prune, update, clean up, or create backup archives.

When this passes, it writes `.deploy-readiness/<VERSION>.receipt`. The standard production wrapper requires that receipt to be fresh and bound to the current commit before it proceeds.

### Step 2: Build (On Development Machine)

```bash
cd /path/to/NLN
./scripts/build.sh -v <VERSION> -e .env-prod -d y

# Example:
# ./scripts/build.sh -v 3.0.1 -e .env-prod -d y
```

Arguments:
- `-v`: Version number (updates all package.json files unless `BUILD_SKIP_PACKAGE_VERSION_UPDATE=true`)
- `-e`: Environment file path (defaults to `.env-prod`)
- `-d`: Deploy to VPS (y/N) - if 'y', automatically transfers files

The build script will:
1. ✓ Validate environment configuration
2. ✓ Update version numbers unless `BUILD_SKIP_PACKAGE_VERSION_UPDATE=true`
3. ✓ Build shared packages
4. ✓ Build server
5. ✓ Build UI with production settings
6. ✓ Generate sitemap
7. ✓ Build Docker images
8. ✓ Tag Docker images as both `:prod` and `:<VERSION>`
9. ✓ Compress artifacts
10. ✓ Transfer to VPS at `/var/tmp/{VERSION}/`

### Step 3: Deploy (On Production Server)

#### Simplified Workflow (Recommended)

Complete deployment from your development machine with the standard wrapper:

```bash
./scripts/deploy-production.sh -v <VERSION> -e .env-prod
```

This wrapper validates the environment, verifies the git worktree is clean and synchronized, verifies the fresh readiness receipt, runs non-mutating VPS health checks, refuses reused deployment versions, creates a mandatory offsite backup, builds and transfers artifacts, deploys remotely, and prints final container status.

Run readiness first:

```bash
SITE_IP=$(grep SITE_IP .env-prod | cut -d= -f2)
./scripts/deploy-readiness.sh -v <VERSION> -e .env-prod --migration-backup backups/${SITE_IP}/<BACKUP_TIMESTAMP>
./scripts/deploy-production.sh -v <VERSION> -e .env-prod
```

The wrapper uses `<VERSION>` as the deployment slot and Docker image tag, but it does not mutate package.json versions during the build. If package version bumps are needed, make and commit them before running the production wrapper so the built commit and remote checkout stay identical.

To use a lighter local validation gate intentionally:

```bash
DEPLOY_VALIDATE_CMD=validate ./scripts/deploy-production.sh -v <VERSION> -e .env-prod
```

The deploy wrapper will only accept this when the readiness receipt was created with the same `DEPLOY_VALIDATE_CMD` value.

Use a fresh version for each deployment. The wrapper refuses to deploy if `/var/tmp/<VERSION>/runtime-state/manifest.txt` already exists on the VPS, because reusing a version would prevent a fresh pre-deployment runtime-state backup from being created.

Do not use `--skip-tests` for normal production deployments. It is reserved for an explicit emergency bypass and requires `DEPLOY_ALLOW_UNVALIDATED=true`; VPS health checks, version-slot checks, mandatory offsite backup, and post-deploy smoke still run.

### Rehearsal and Recovery Drill

Before a high-risk deployment, run a local drill:

```bash
./scripts/deploy-rehearsal.sh -v rehearsal-<VERSION>
```

The drill creates a disposable project, runs the production build/deploy path locally, verifies the runtime SQL dump restores into a separate disposable Postgres container, executes a disposable rollback probe, and dry-runs full runtime-state restore. It must not read `.env-prod` unless you explicitly pass `-e`, and it refuses production-looking endpoints.

Manual equivalent:

```bash
# Set version
VERSION="3.0.1"

# Build and transfer without the interactive transfer confirmation
DEPLOY_CONFIRMED=true ./scripts/build.sh -v ${VERSION} -e .env-prod -d y

# Deploy remotely
SITE_IP=$(grep SITE_IP .env-prod | cut -d= -f2)
PROJECT_DIR=$(grep PROJECT_DIR .env-prod | cut -d= -f2)

ssh -i ~/.ssh/id_rsa_${SITE_IP} root@${SITE_IP} \
  "cd ${PROJECT_DIR} && ./scripts/deploy.sh -v ${VERSION}"

# Quick verification
ssh -i ~/.ssh/id_rsa_${SITE_IP} root@${SITE_IP} \
  'docker ps --format "table {{.Names}}\t{{.Status}}"'
```

#### Option A: SSH In and Deploy Manually

```bash
# Connect to production server
./scripts/connectToServer.sh

# Once connected, navigate to project and deploy
cd ${PROJECT_DIR}  # e.g., /root/NLN or /srv/app
./scripts/deploy.sh -v <VERSION>
```

#### Option B: Remote Deployment (One-Liner)

Deploy directly from your development machine without manually SSH'ing in:

```bash
# Set variables from your .env-prod
SITE_IP=$(grep SITE_IP .env-prod | cut -d= -f2)
VERSION="<VERSION>"
PROJECT_DIR=$(grep PROJECT_DIR .env-prod | cut -d= -f2)

# Deploy with one command (simplified)
ssh -i ~/.ssh/id_rsa_${SITE_IP} root@${SITE_IP} \
  "cd ${PROJECT_DIR} && ./scripts/deploy.sh -v ${VERSION}"
```

This one-liner will:
1. Connect to production server via SSH
2. Navigate to project directory
3. Run the deploy script with the specified version

**Note**: The deploy script (`deploy.sh`) handles git operations internally and verifies the remote checkout matches the commit built by `build.sh`, so you do not need to run `git stash && git fetch && git pull` manually.

**Note**: The production docker-compose file (`docker-compose-prod.yml`) now automatically loads `.env-prod` via the `env_file` directive. No need to manually specify `--env-file` when starting containers.

The deploy script will:
1. ✓ Validate environment configuration
2. ✓ Fast-forward Git and verify the built commit
3. ✓ Stage build artifacts under `/var/tmp/{VERSION}/staged-artifacts`
4. ✓ Backup current runtime state to `/var/tmp/{VERSION}/runtime-state`
5. ✓ Run setup.sh
6. ✓ Load Docker images
7. ✓ Stop old containers
8. ✓ Swap staged artifacts into place
9. ✓ Start new containers (automatically uses `.env-prod`)
10. ✓ Wait for health checks
11. ✓ Verify internal server healthcheck
12. ✓ Verify public UI and API healthcheck endpoints

### VPS Health Checks

The standard wrapper runs:

```bash
./scripts/vps-healthcheck.sh -e .env-prod
```

This script is non-mutating. It only reads remote state and prints recommendations.

Critical blockers:
- SSH batch-mode failure
- Missing project directory or required runtime paths
- Docker or docker-compose unavailable
- Expected production containers not running
- Low disk space on the project, `/var/tmp`, or Docker data filesystem

Warnings only:
- Many or large `/var/tmp/<VERSION>` deployment backups
- Large application logs
- Available system package updates
- Docker disk usage that should be reviewed

Remediation is intentionally recommendation-only. Do not run cleanup, package update, prune, restart, or deletion commands during deployment unless a human has reviewed the warning and intentionally scheduled that maintenance.

### Step 4: Post-Deployment Verification

After deployment completes successfully:

#### Option A: Verify from Production Server

```bash
# Check container status
docker ps

# Check container logs
docker logs nln_server
docker logs nln_ui

# Verify website is accessible
curl ${SERVER_URL}/healthcheck

# Check migration backups were created
ls -lh data/migration-backups/
```

#### Option B: Verify Remotely from Development Machine

```bash
# Set variables from your .env-prod
SITE_IP=$(grep SITE_IP .env-prod | cut -d= -f2)
PROJECT_DIR=$(grep PROJECT_DIR .env-prod | cut -d= -f2)
SERVER_URL=$(grep SERVER_URL .env-prod | cut -d= -f2)
UI_URL=$(grep UI_URL .env-prod | cut -d= -f2)

# Check container status
ssh -i ~/.ssh/id_rsa_${SITE_IP} root@${SITE_IP} "docker ps"

# View server logs (last 50 lines)
ssh -i ~/.ssh/id_rsa_${SITE_IP} root@${SITE_IP} "docker logs --tail 50 nln_server"

# View UI logs (last 50 lines)
ssh -i ~/.ssh/id_rsa_${SITE_IP} root@${SITE_IP} "docker logs --tail 50 nln_ui"

# Follow logs in real-time (press Ctrl+C to stop)
ssh -i ~/.ssh/id_rsa_${SITE_IP} root@${SITE_IP} "docker logs -f nln_server"

# Check all container health
ssh -i ~/.ssh/id_rsa_${SITE_IP} root@${SITE_IP} "docker ps --format 'table {{.Names}}\t{{.Status}}'"

# Verify website is accessible
curl ${UI_URL}
curl ${SERVER_URL}/healthcheck
```

#### Quick Verification One-Liner

For a quick status check combining container status and recent logs:

```bash
SITE_IP=$(grep SITE_IP .env-prod | cut -d= -f2)
ssh -i ~/.ssh/id_rsa_${SITE_IP} root@${SITE_IP} \
  'echo "=== Container Status ===" && docker ps --format "table {{.Names}}\t{{.Status}}" && echo -e "\n=== Server Logs (last 10 lines) ===" && docker logs --tail 10 nln_server'
```

## Rollback Procedure

If deployment fails or you discover issues:

### Quick Rollback

```bash
# On production server
./scripts/rollback.sh -v <PREVIOUS_VERSION>

# Example: Roll back to version 3.0.0
# ./scripts/rollback.sh -v 3.0.0
```

This will:
1. Create emergency SQL dump of the current database
2. Stop current containers
3. Restore database from specified version backup
4. Load Docker images from specified version
5. Start containers
6. Wait for health checks
7. Verify successful rollback

### Manual Rollback (if rollback.sh fails)

1. **Create an emergency SQL dump**:
   ```bash
   mkdir -p /var/tmp/manual-emergency-backup
   set -a
   . ./.env-prod
   set +a
   docker exec -e PGPASSWORD="${DB_PASSWORD}" nln_db pg_dump -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-privileges > /var/tmp/manual-emergency-backup/current-postgres.sql
   test -s /var/tmp/manual-emergency-backup/current-postgres.sql
   ```

2. **Stop containers**:
   ```bash
   docker-compose -f docker-compose-prod.yml down
   ```

3. **Restore database from logical dump**:
   ```bash
   ROLLBACK_VERSION="<PREVIOUS_VERSION>"  # e.g., "3.0.0"
   rm -rf data/postgres
   docker-compose --env-file /var/tmp/${ROLLBACK_VERSION}/.env-prod -f docker-compose-prod.yml up -d db
   set -a
   . /var/tmp/${ROLLBACK_VERSION}/.env-prod
   set +a
   until docker exec nln_db pg_isready -U "${DB_USER}" -d "${DB_NAME}"; do sleep 2; done
   docker exec -i -e PGPASSWORD="${DB_PASSWORD}" nln_db psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB_NAME}" < /var/tmp/${ROLLBACK_VERSION}/runtime-state/data/postgres.sql
   docker-compose --env-file /var/tmp/${ROLLBACK_VERSION}/.env-prod -f docker-compose-prod.yml down
   ```

4. **Load old images**:
   ```bash
   docker load -i /var/tmp/${ROLLBACK_VERSION}/production-docker-images.tar.gz
   ```

5. **Start containers**:
   ```bash
   docker-compose -f docker-compose-prod.yml up -d
   ```
   Note: The `.env-prod` file is automatically loaded via the `env_file` directive in `docker-compose-prod.yml`

6. **Monitor startup**:
   ```bash
   docker ps
   docker logs -f nln_server
   ```

## Troubleshooting

### Build Failures

**Environment validation failed**
- Check that all required variables are set in `.env-prod`
- Verify URLs start with http:// or https://
- Verify IP addresses are valid
- Run `./scripts/validate-env.sh .env-prod` for details

**Build fails with "yarn build failed"**
- Check for TypeScript errors: `yarn typecheck`
- Check for ESLint errors: `yarn lint`
- Verify all dependencies are installed: `yarn install`

**Docker build fails**
- Check Docker is running: `docker version`
- Check disk space: `df -h`
- Try rebuilding without cache: `docker-compose build --no-cache`

### Deployment Failures

**"Docker images archive not found"**
- Verify build.sh completed successfully
- Check files exist in `/var/tmp/{VERSION}/`
- Re-run build.sh if necessary

**"Timeout waiting for containers to become healthy"**
- Check container logs: `docker logs nln_server`, `docker logs nln_ui`
- Common issues:
  - Database migrations failed
  - Missing environment variables
  - Port conflicts
  - Out of memory

**"Migrations failed"**
- Check migration backup exists: `ls data/migration-backups/`
- Check database logs: `docker logs nln_db`
- Restore from pre-migration backup if needed (instructions printed in error)
- Consider rolling back to previous version

**"Could not pull latest changes from repository"**
- Check for uncommitted changes: `git status`
- Check for merge conflicts: `git diff`
- Resolve conflicts and re-run deploy.sh
- Or commit/stash changes before deploying

### Health Check Issues

**Server health check not responding**
- Server may still be initializing (especially after migrations)
- Check server logs: `docker logs nln_server`
- Verify server started: `docker exec nln_server ps aux | grep node`
- Check healthcheck endpoint manually:
  ```bash
  docker exec nln_server curl http://localhost:5331/healthcheck
  ```

**Redis shows "no healthcheck"**
- This is normal for Redis in some configurations
- Verify it's running: `docker exec nln_redis redis-cli ping`

### Nginx Reverse Proxy Issues

**"nginx-proxy-le container constantly restarting"**
- Check logs: `docker logs nginx-proxy-le`
- Common error: "can't get nginx-proxy container ID"
- Solution: Restart nginx proxy containers:
  ```bash
  docker restart nginx-proxy nginx-proxy-le
  ```
- If still restarting, you can temporarily stop it:
  ```bash
  docker stop nginx-proxy-le
  ```
  The main nginx-proxy will continue to work for HTTPS (existing certificates)

**"502 Bad Gateway after deployment"**
- Verify all app containers are healthy: `docker ps`
- Check if nginx can reach containers:
  ```bash
  docker logs nginx-proxy | tail -20
  ```
- Look for "Connection refused" errors pointing to container IPs
- Verify container networking configuration (see "UI Container Network Binding" below)
- Try restarting nginx-proxy:
  ```bash
  docker restart nginx-proxy
  ```

**UI container not accessible from nginx-proxy**
- The serve configuration may be binding to localhost instead of 0.0.0.0
- Check with: `docker logs nln_ui | grep "Accepting connections"`
- Should see: `Accepting connections at http://0.0.0.0:3001` or similar
- If it shows `http://localhost:3000`, nginx-proxy cannot reach it
- Temporary workaround: Restart the UI container
  ```bash
  docker restart nln_ui
  ```

## Known Issues & Limitations

### Still Present

1. **Downtime During Deployment**
   - Containers are stopped before new ones start
   - Typically 2-5 minutes of downtime
   - **Impact**: Users see errors during deployment
   - **Mitigation**: Deploy during low-traffic periods

2. **Validation Gate Depends on Entry Point**
   - `./scripts/deploy-production.sh` runs its configured validation gate before deploying
   - Manual `build.sh` + remote `deploy.sh` workflows still rely on the operator to run tests first
   - **Impact**: Bypassing the wrapper can still let broken code reach production
   - **Mitigation**: Use `deploy-production.sh` for standard deploys, or run tests manually before lower-level workflows

3. **No Staging Environment**
   - There is no persistent staging VPS
   - **Impact**: Higher risk of issues in production
   - **Mitigation**: Run `./scripts/deploy-rehearsal.sh -v rehearsal-<VERSION>` before production deploys, plus manual QA where needed

4. **Manual Version Management**
   - Version must be manually entered and updated
   - **Impact**: Potential for version number mistakes
   - **Mitigation**: Double-check version numbers

5. **UI Container Network Binding**
   - The UI container's serve configuration may occasionally bind to localhost instead of all interfaces
   - **Symptoms**:
     - Containers show as healthy
     - `docker logs nln_ui` shows `Accepting connections at http://localhost:3000`
     - Website returns 502 Bad Gateway
     - nginx-proxy logs show "Connection refused" to container IP
   - **Impact**: Website not accessible despite healthy containers
   - **Mitigation**: Restart the UI container with `docker restart nln_ui`
   - **Verification**:
     ```bash
     # Check what interface UI is listening on
     docker logs nln_ui | grep "Accepting connections"

     # Get container IP
     docker inspect nln_ui --format="{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}"

     # Test connectivity from host (should return 200)
     curl -I http://<CONTAINER_IP>:3001
     ```

### Recently Fixed

- ✅ Environment validation
- ✅ Health check verification
- ✅ Pre-migration backups
- ✅ Automated rollback
- ✅ Git pull error handling
- ✅ Migration failure handling
- ✅ Logical `pg_dump` runtime-state database backups
- ✅ Staged artifact extraction before live file replacement
- ✅ Host `node_modules` no longer transferred
- ✅ Public UI/API post-deploy verification
- ✅ Disposable local deploy rehearsal

## Future Improvements

### High Priority

1. **Zero-Downtime Deployment (Blue-Green)**
   - Run new containers on different ports
   - Switch nginx proxy after health checks pass
   - No user-facing downtime

2. **CI/CD Pipeline**
   - Automated testing on every commit
   - Automated builds on merge
   - Push images to container registry
   - Optional automated deployment

### Medium Priority

3. **Proper Docker Image Tagging**
   - Current build saves both version tags and `:prod`
   - Compose still runs `:prod` for compatibility
   - Future work could make compose run versioned tags directly

4. **Separate UI and Server Deployments**
   - Deploy independently
   - Faster, lower-risk updates
   - Hotfix one service without affecting the other

5. **Persistent Staging Environment**
   - Test deployments before production
   - Could run on same VPS with different ports
   - The local deploy rehearsal reduces risk, but does not replace a persistent staging environment with production-like DNS, proxy, and data scale

### Lower Priority

6. **Database Migration Safety Tools**
   - Migration validation tests
   - Backward-compatibility checks
   - Tools like Atlas or Bytebase

7. **Monitoring and Alerting**
   - Automatic alerts on deployment failures
   - Application error tracking
   - Performance monitoring

## Backup Management

### Automatic Backups

**Deployment Backups** (`/var/tmp/{VERSION}/runtime-state`)
- Created at start of each deployment
- One backup per version
- Includes `data/postgres.sql`, `data/uploads`, `assets`, `data/redis`, `data/migration-backups`, `.env-prod`, optional `.env`, and optional `jwt_*`
- Excludes logs by default
- Manual cleanup (not automatic)

**Docker Image Archives** (`/var/tmp/{VERSION}/production-docker-images.tar.gz`)
- Created by `build.sh`
- Includes existing compose tags (`nln_ui:prod`, `nln_server:prod`)
- Also includes audit tags (`nln_ui:{VERSION}`, `nln_server:{VERSION}`)
- Compose still runs the `:prod` tags

**Migration Backups** (`data/migration-backups/`)
- Created before each migration run
- Keeps last 10 backups automatically
- SQL format (easy to inspect and restore)

**Emergency Database Backups** (created by rollback.sh)
- Created at `/var/tmp/emergency-backup-{timestamp}/`
- Contains `current-postgres.sql`
- Manual cleanup after verifying rollback worked

### Offsite Backups

Use `backup.sh` for offsite runtime-state backups. It refuses to provision SSH keys by default, so passwordless SSH must already work before it runs.

The standard `deploy-production.sh` workflow requires a successful offsite backup before building or transferring deployment artifacts. If the offsite backup preflight or archive creation fails, deployment stops.

```bash
# Preview included paths and size estimates without creating an archive
./scripts/backup.sh -e .env-prod --preflight-only

# Run once, excluding logs
./scripts/backup.sh -e .env-prod

# Include logs when diagnostic history is needed
./scripts/backup.sh -e .env-prod --include-logs

# Run continuously every 24 hours
./scripts/backup.sh -e .env-prod -i 86400 -l y

# Optional: keep only the last 7 backups
./scripts/backup.sh -e .env-prod -c 7
```

This backs up to your development machine for offsite storage and writes a manifest plus SHA-256 checksum next to each archive.

### Full-State Emergency Restore

Rollback remains database-only by default to avoid overwriting uploads or assets unexpectedly. If a critical incident requires restoring all runtime state, use `restore-runtime-state.sh`. Start with the default dry run:

```bash
cd /root/NLN
./scripts/restore-runtime-state.sh -v <VERSION>
```

If the dry run validates the selected backup and the restore is intentional, execute it:

```bash
./scripts/restore-runtime-state.sh -v <VERSION> --execute
```

The execute mode creates an emergency runtime-state backup first, then stops containers, restores runtime filesystem paths (`data/uploads`, `data/redis`, `data/migration-backups`, `assets`, `.env-prod`, optional `.env`, and optional `jwt_*`), then starts containers again. Database rollback is handled by `rollback.sh` from the logical dump at `data/postgres.sql`.

Manual equivalent if the restore script is unavailable:

```bash
cd /root/NLN
docker-compose -f docker-compose-prod.yml down
cp -rp /var/tmp/<VERSION>/runtime-state/data/uploads data/
cp -rp /var/tmp/<VERSION>/runtime-state/data/redis data/
cp -rp /var/tmp/<VERSION>/runtime-state/data/migration-backups data/
cp -rp /var/tmp/<VERSION>/runtime-state/assets .
cp -p /var/tmp/<VERSION>/runtime-state/.env-prod .
docker-compose --env-file .env-prod -f docker-compose-prod.yml up -d
```

### On-VPS Backup Inventory

Deployment backups under `/var/tmp/<VERSION>` are not cleaned up automatically. Before manual cleanup, inventory available backups and their sizes:

```bash
ls -lh /var/tmp
du -sh /var/tmp/*/runtime-state 2>/dev/null
```

Keep at least the latest known-good version and any versions needed for recent incident recovery. Do not delete backup directories during an active incident.

## Support

For issues not covered in this guide:
- Check container logs: `docker logs <container_name>`
- Check application logs: `ls -lh data/logs/`
- Review recent commits: `git log --oneline -10`
- Check disk space: `df -h`
- Check memory: `free -h`

## Version History

- **2025-11-03**: Simplified one-liner deployment command, added nginx proxy troubleshooting, documented UI networking issue
- **2025-01-14**: Added environment validation, health checks, pre-migration backups, rollback script
- **2024-01-23**: Initial deployment process
