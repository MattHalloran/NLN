# Production Security Checklist

**Last Updated**: 2025-10-14
**Status**: Week 1 Critical Fixes Complete ✅

---

## Environment File Security

### ✅ .gitignore Configuration
- `.env*` files are properly excluded from git (except `.env-example`)
- Verified in `.gitignore:89-91`
- No `.env-prod` in git repository history

### ✅ Environment Files Status

| File | Location | Git Tracked | Status |
|------|----------|-------------|--------|
| `.env-example` | Root | ✅ Yes (template only) | ✅ Safe |
| `.env` | Root | ❌ No | ✅ Secure |
| `.env-prod` | Root | ❌ No | ✅ Secure |
| `packages/server/.env` | Server | ❌ No | ✅ Secure |
| `packages/ui/.env` | UI | ❌ No | ✅ Secure |

### 🔐 Credential Management

**Current Approach**: Local `.env` files (git-ignored)
**Status**: ✅ Adequate for current deployment scale

**Recommendations for Scaling**:
- Consider AWS Secrets Manager or similar when deploying to cloud
- Use encrypted secrets for CI/CD pipelines
- Implement secret rotation policy (every 90 days)

---

## Week 1 Fixes Completed ✅

### 1. Mock Data Flag
- **Issue**: `CREATE_MOCK_DATA=true` in production config
- **Risk**: Would populate production database with fake data
- **Fix**: Changed to `CREATE_MOCK_DATA=false` in `.env-prod`
- **Status**: ✅ Fixed

### 2. Production Volume Mounts
- **Issue**: Source code mounted in production containers
- **Risk**: Security vulnerability, source code exposed
- **Fix**: Removed source code mounts, kept only `dist/`, `data/`, and `assets/`
- **Files Modified**: `docker-compose-prod.yml:73-80`
- **Status**: ✅ Fixed

### 3. Redis Data Persistence
- **Issue**: `rm -f dump.rdb` on every restart
- **Risk**: All sessions and queued jobs lost on restart
- **Fix**: Removed data deletion command from redis startup
- **Files Modified**: `docker-compose-prod.yml:131`
- **Status**: ✅ Fixed

### 4. Backup Script Paths
- **Issue**: References to old project name "Vrooli"
- **Risk**: Backups would fail
- **Fix**: Updated paths to use NLN and PROJECT_DIR variable
- **Files Modified**: `scripts/backup.sh:60,77`
- **Status**: ✅ Fixed

### 5. SMTP Configuration
- **Issue**: Hardcoded to Gmail SMTP
- **Risk**: Can't use other email providers (SendGrid, SES, etc.)
- **Fix**: Made SMTP configurable via environment variables
- **New Variables**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`
- **Files Modified**:
  - `packages/server/src/utils/emailService.ts:97-125`
  - `.env-example:58-65`
  - `ENVIRONMENT.md:223-248`
- **Status**: ✅ Fixed

---

## Security Verification Tasks

### ✅ Completed
- [x] Verify `.env-prod` not in git
- [x] Verify `.gitignore` properly configured
- [x] Fix mock data flag
- [x] Fix production volume mounts
- [x] Fix Redis persistence
- [x] Make SMTP configurable
- [x] Update backup scripts

### ⚠️ Recommended Before Production
- [ ] Rotate all production credentials (if they've ever been shared)
- [ ] Set up secrets management (AWS Secrets Manager, Doppler)
- [ ] Implement rate limiting on API endpoints
- [ ] Add CORS configuration review
- [ ] Set up security headers (Helmet.js)
- [ ] Enable audit logging for sensitive operations
- [ ] Configure SSL/TLS certificates properly
- [ ] Set up firewall rules on production server
- [ ] Implement automated security scanning (Snyk, npm audit)
- [ ] Create incident response plan

---

## Credential Security Best Practices

### 🔐 Current Credentials to Manage

1. **JWT_SECRET** (.env-prod)
   - Used for: Session cookies and JWT tokens
   - Rotation: Every 90 days (forces user re-login)
   - Generation: `openssl rand -base64 32`

2. **DB_PASSWORD** (.env-prod)
   - Used for: PostgreSQL database access
   - Rotation: Every 90 days (requires database restart)
   - Requirements: Minimum 16 characters, mixed case, numbers, symbols

3. **ADMIN_PASSWORD** (.env-prod)
   - Used for: Initial admin account
   - Rotation: Every 90 days via admin panel
   - Requirements: Minimum 16 characters, mixed case, numbers, symbols

4. **SITE_EMAIL_PASSWORD** (.env-prod)
   - Used for: SMTP authentication
   - Type: App-specific password (Gmail) or API key (SendGrid)
   - Rotation: Every 90 days

### 📋 Credential Rotation Checklist

When rotating credentials:

1. **JWT_SECRET Rotation**:
   ```bash
   # Generate new secret
   openssl rand -base64 32

   # Update .env-prod on server
   # Restart server (all users will be logged out)
   docker-compose -f docker-compose-prod.yml restart server
   ```

2. **DB_PASSWORD Rotation**:
   ```bash
   # Connect to database
   docker exec -it nln_db psql -U postgres

   # Change password
   ALTER USER nlnuser WITH PASSWORD 'new_secure_password';

   # Update .env-prod
   # Restart all services
   docker-compose -f docker-compose-prod.yml down
   docker-compose -f docker-compose-prod.yml up -d
   ```

3. **Email Password Rotation**:
   - Generate new app-specific password from email provider
   - Update SITE_EMAIL_PASSWORD in .env-prod
   - Restart server only (no database restart needed)

---

## Access Control

### Who Has Access to Production Credentials?

**Document who has access**:
- [ ] Production server SSH access: _______________
- [ ] `.env-prod` file access: _______________
- [ ] Database direct access: _______________
- [ ] Email account access: _______________

**Review quarterly**:
- Remove access for former team members
- Rotate credentials when someone leaves
- Audit access logs

---

## Secrets Not to Commit to Git

### ❌ Never Commit
- `.env` files (except `.env-example`)
- `jwt_priv.pem` / `jwt_pub.pem` (JWT keys)
- `.vault*` files
- `upload_certificate.pem` (app signing keys)
- Database dumps with real data
- API keys, tokens, passwords in any form
- SSH private keys

### ✅ Safe to Commit
- `.env-example` (templates with placeholder values)
- Public configuration files
- Documentation
- Schema files without data

---

## Monitoring & Alerts

### 🔔 Set Up Alerts For
- Failed login attempts (>10/hour)
- Database connection failures
- Disk space warnings (>80% full)
- SSL certificate expiration (30 days before)
- Unusual traffic patterns
- Server downtime

### 📊 Log These Security Events
- All admin actions
- Password changes
- Failed authentication attempts
- Database queries from unexpected IPs
- File uploads/downloads
- API rate limit violations

---

## Incident Response Plan

### If Credentials Are Compromised

1. **Immediate Actions** (within 1 hour):
   - Rotate all affected credentials immediately
   - Review access logs for unauthorized access
   - Notify team members
   - Take affected services offline if necessary

2. **Investigation** (within 24 hours):
   - Determine scope of breach
   - Check database for unauthorized changes
   - Review all log files
   - Document timeline of events

3. **Recovery** (within 48 hours):
   - Deploy new credentials
   - Verify system integrity
   - Restore from backups if necessary
   - Update security measures

4. **Post-Mortem** (within 1 week):
   - Document what happened
   - Identify root cause
   - Implement preventive measures
   - Update security procedures

### Emergency Contacts
- Primary: _______________
- Secondary: _______________
- Hosting Provider: _______________

---

## Production Deployment Checklist

Before deploying to production:

### Configuration
- [ ] `CREATE_MOCK_DATA=false` in `.env-prod`
- [ ] `NODE_ENV=production`
- [ ] `EMAIL_MODE=production`
- [ ] `SERVER_LOCATION=dns`
- [ ] All credentials rotated (not reusing dev credentials)
- [ ] SSL certificates configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled

### Infrastructure
- [ ] Database backups automated
- [ ] Monitoring and alerts configured
- [ ] Log aggregation set up
- [ ] Firewall rules configured
- [ ] nginx-proxy running and configured
- [ ] Redis persistence verified
- [ ] Disk space sufficient (>50GB free)

### Testing
- [ ] Staging deployment successful
- [ ] Health checks passing
- [ ] Database migrations tested
- [ ] Backup restoration tested
- [ ] Rollback procedure tested

### Documentation
- [ ] Deployment runbook created
- [ ] Rollback procedure documented
- [ ] Troubleshooting guide updated
- [ ] Team trained on emergency procedures

---

## Next Steps (Week 2)

1. **Set up Container Registry** (4 hours)
   - GitHub Container Registry (free)
   - Tag images with git SHA
   - Implement vulnerability scanning

2. **Create CI/CD Pipeline** (2 days)
   - GitHub Actions workflow
   - Automated tests on PR
   - Automated deployments

3. **Implement Monitoring** (1 day)
   - Error tracking (Sentry)
   - Uptime monitoring (UptimeRobot)
   - Performance monitoring

4. **Set up Staging Environment** (1 day)
   - Identical to production
   - Test deployment process
   - Automated deployments from dev branch

---

## Risk Assessment

**Week 0 (Before fixes)**: 🔴 HIGH - Multiple critical security issues
**Week 1 (After fixes)**: 🟡 MEDIUM - Security fundamentals in place, need infrastructure

**Remaining Risks**:
- No automated backups (manual process)
- No monitoring/alerting
- No CI/CD pipeline
- Manual deployment process
- No staging environment

**Timeline to Production-Ready**: 1-2 weeks of focused work

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Prisma Security](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-aws-lambda)

---

**Maintained By**: DevOps Team
**Review Frequency**: Weekly during initial deployment, Monthly after stabilization
