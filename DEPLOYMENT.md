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
   - Backs up current database
   - Extracts build artifacts
   - Loads new Docker images
   - Restarts containers with health checks
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
  - Creates emergency backup of current state
  - Stops containers
  - Restores database from specified version
  - Loads old Docker images
  - Starts containers with health checks

### 6. Improved Error Handling
- **Git pull failures**: Now exits with error instead of warning
- **Migration failures**: Now exits with error and provides restore instructions
- **Container startup failures**: Now detected and reported

## Prerequisites

### On Development Machine
- Access to production server via SSH
- SSH keys configured (`~/.ssh/id_rsa_{SITE_IP}`)
  - Use `./scripts/keylessSsh.sh -e .env-prod` to set up if needed
  - Use `./scripts/connectToServer.sh` to connect interactively
- `.env-prod` file configured with production settings

### On Production Server
- Docker and Docker Compose installed
- Nginx reverse proxy running
- Sufficient disk space in `/var/tmp` for backups

## Deployment Process

### Step 1: Pre-Deployment Checklist

Before starting deployment, verify:

```bash
# Run tests
yarn test

# Type check
yarn typecheck

# Verify git status
git status

# Validate environment configuration (optional - runs automatically in build.sh)
./scripts/validate-env.sh .env-prod
```

### Step 2: Build (On Development Machine)

```bash
cd /path/to/NLN
./scripts/build.sh -v <VERSION> -e .env-prod -d y

# Example:
# ./scripts/build.sh -v 3.0.1 -e .env-prod -d y
```

Arguments:
- `-v`: Version number (updates all package.json files)
- `-e`: Environment file path (defaults to `.env-prod`)
- `-d`: Deploy to VPS (y/N) - if 'y', automatically transfers files

The build script will:
1. ✓ Validate environment configuration
2. ✓ Update version numbers
3. ✓ Build shared packages
4. ✓ Build server
5. ✓ Build UI with production settings
6. ✓ Generate sitemap
7. ✓ Build Docker images
8. ✓ Compress artifacts
9. ✓ Transfer to VPS at `/var/tmp/{VERSION}/`

### Step 3: Deploy (On Production Server)

#### Simplified Workflow (Recommended)

Complete deployment from your development machine with these tested commands:

```bash
# Set version
VERSION="3.0.1"

# Build and transfer
./scripts/build.sh -v ${VERSION} -e .env-prod -d y

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

**Note**: The deploy script (`deploy.sh`) handles git operations internally (lines 182-184), so you don't need to run `git stash && git fetch && git pull` manually.

**Note**: The production docker-compose file (`docker-compose-prod.yml`) now automatically loads `.env-prod` via the `env_file` directive. No need to manually specify `--env-file` when starting containers.

The deploy script will:
1. ✓ Validate environment configuration
2. ✓ Backup current database to `/var/tmp/{VERSION}/postgres`
3. ✓ Extract build artifacts
4. ✓ Pull latest code (scripts, configs)
5. ✓ Run setup.sh
6. ✓ Load Docker images
7. ✓ Stop old containers
8. ✓ Start new containers (automatically uses `.env-prod`)
9. ✓ **Wait for health checks** (NEW!)
10. ✓ Verify server is responding

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
1. Create emergency backup of current state
2. Stop current containers
3. Restore database from specified version backup
4. Load Docker images from specified version
5. Start containers
6. Wait for health checks
7. Verify successful rollback

### Manual Rollback (if rollback.sh fails)

1. **Stop containers**:
   ```bash
   docker-compose -f docker-compose-prod.yml down
   ```

2. **Restore database**:
   ```bash
   ROLLBACK_VERSION="<PREVIOUS_VERSION>"  # e.g., "3.0.0"
   rm -rf data/postgres
   cp -rp /var/tmp/${ROLLBACK_VERSION}/postgres data/
   ```

3. **Load old images**:
   ```bash
   docker load -i /var/tmp/${ROLLBACK_VERSION}/production-docker-images.tar.gz
   ```

4. **Start containers**:
   ```bash
   docker-compose -f docker-compose-prod.yml up -d
   ```
   Note: The `.env-prod` file is automatically loaded via the `env_file` directive in `docker-compose-prod.yml`

5. **Monitor startup**:
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

2. **No Automated Testing Gate**
   - Tests don't run automatically before deployment
   - Must manually run `yarn test` before deploying
   - **Impact**: Broken code can reach production
   - **Mitigation**: Always run tests manually before deploying

3. **Large Transfer Sizes**
   - `node_modules` are transferred (can be 100s of MB)
   - Slow deployments over slow connections
   - **Impact**: Build/deploy takes longer
   - **Mitigation**: Use fast internet connection for builds

4. **No Staging Environment**
   - Production is first place full integration is tested
   - **Impact**: Higher risk of issues in production
   - **Mitigation**: Thorough local testing, manual QA

5. **Manual Version Management**
   - Version must be manually entered and updated
   - **Impact**: Potential for version number mistakes
   - **Mitigation**: Double-check version numbers

6. **UI Container Network Binding**
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

3. **Stop Transferring node_modules**
   - Install inside Docker build
   - Dramatically faster deployments
   - Already configured in Dockerfiles, just need to update build.sh

### Medium Priority

4. **Proper Docker Image Tagging**
   - Tag with version numbers instead of `:prod`
   - Makes rollback even faster
   - Better tracking of what's running

5. **Separate UI and Server Deployments**
   - Deploy independently
   - Faster, lower-risk updates
   - Hotfix one service without affecting the other

6. **Staging Environment**
   - Test deployments before production
   - Could run on same VPS with different ports

### Lower Priority

7. **Database Migration Safety Tools**
   - Migration validation tests
   - Backward-compatibility checks
   - Tools like Atlas or Bytebase

8. **Monitoring and Alerting**
   - Automatic alerts on deployment failures
   - Application error tracking
   - Performance monitoring

## Backup Management

### Automatic Backups

**Deployment Backups** (`/var/tmp/{VERSION}/postgres`)
- Created at start of each deployment
- One backup per version
- Manual cleanup (not automatic)

**Migration Backups** (`data/migration-backups/`)
- Created before each migration run
- Keeps last 10 backups automatically
- SQL format (easy to inspect and restore)

**Emergency Backups** (created by rollback.sh)
- Created at `/var/tmp/emergency-backup-{timestamp}/`
- Manual cleanup after verifying rollback worked

### Offsite Backups

Consider setting up the existing `backup.sh` script to run periodically:

```bash
# Run once
./scripts/backup.sh

# Run continuously every 24 hours
./scripts/backup.sh -i 86400 -l y

# Keep last 7 backups
./scripts/backup.sh -c 7
```

This backs up to your development machine for offsite storage.

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
