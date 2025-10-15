# Environment Variables Documentation

This document provides a comprehensive reference for all environment variables used in the NLN (New Life Nursery) application.

## Table of Contents

- [Quick Start](#quick-start)
- [Required Variables](#required-variables)
- [Optional Variables](#optional-variables)
- [Port Configuration](#port-configuration)
- [Database Configuration](#database-configuration)
- [Redis Configuration](#redis-configuration)
- [Email Configuration](#email-configuration)
- [Security Configuration](#security-configuration)
- [Debug/Development Settings](#debugdevelopment-settings)
- [Production Settings](#production-settings)
- [Validation](#validation)

---

## Quick Start

1. Copy `.env-example` to `.env` in the project root
2. Update all required variables (marked with ⚠️ below)
3. Review and configure optional variables based on your needs
4. Run validation: `yarn typecheck` to ensure configuration is correct

---

## Required Variables

These variables **MUST** be set for the application to function correctly. The server will refuse to start if these are missing.

### ⚠️ JWT_SECRET
- **Required**: Yes
- **Type**: String
- **Description**: Random string used to secure session cookies and JWT tokens
- **Example**: `somerandomstring123!@#`
- **Security Note**: Use a cryptographically secure random string (at least 32 characters)
- **Generate with**: `openssl rand -base64 32`

### ⚠️ PROJECT_DIR
- **Required**: Yes
- **Type**: Path
- **Description**: Location of project's root directory
- **Default**: `/srv/app`
- **Example**: `/srv/app` or `/home/user/NLN`
- **Note**: Used by Docker and scripts to locate assets, logs, and uploads

### ⚠️ ADMIN_EMAIL
- **Required**: Yes
- **Type**: Email
- **Description**: Admin email address for initial admin account
- **Example**: `admin@newlifenurseryinc.com`
- **Note**: Used during database initialization to create admin user

### ⚠️ ADMIN_PASSWORD
- **Required**: Yes
- **Type**: String
- **Description**: Admin password for email login
- **Example**: `SecurePassword123!`
- **Security Note**: Use a strong password with mixed case, numbers, and special characters

---

## Port Configuration

### PORT_SERVER
- **Required**: No
- **Type**: Number
- **Default**: `5331`
- **Description**: Port for the backend server
- **Example**: `5331`
- **Used by**: Server, UI, Docker healthchecks
- **Note**: Must match `VITE_PORT_SERVER` for local development

### PORT_UI
- **Required**: No
- **Type**: Number
- **Default**: `3001`
- **Description**: Port for the frontend UI server
- **Example**: `3001`

### PORT_DB
- **Required**: No
- **Type**: Number
- **Default**: `5433`
- **Description**: PostgreSQL database port
- **Example**: `5433`
- **Note**: Default Postgres port is 5432, but we use 5433 to avoid conflicts

### PORT_REDIS
- **Required**: No
- **Type**: Number
- **Default**: `6380`
- **Description**: Redis server port
- **Example**: `6380`
- **Note**: Default Redis port is 6379, but we use 6380 to avoid conflicts

---

## Database Configuration

### DB_URL
- **Required**: Yes (auto-constructed from other DB variables)
- **Type**: Connection String
- **Description**: Full PostgreSQL connection string
- **Format**: `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
- **Example**: `postgresql://dbuser:dbpass@localhost:5433/nln_db`
- **Note**: Automatically constructed in docker-compose files

### DB_NAME
- **Required**: Yes
- **Type**: String
- **Description**: Name of the PostgreSQL database
- **Example**: `nln_db`

### DB_USER
- **Required**: Yes
- **Type**: String
- **Description**: PostgreSQL database user
- **Example**: `nln_user`

### DB_PASSWORD
- **Required**: Yes
- **Type**: String
- **Description**: PostgreSQL database password
- **Example**: `securedbpassword123`
- **Security Note**: Use a strong, unique password

### DB_CONN
- **Required**: No (Docker only)
- **Type**: String
- **Description**: Database connection host and port for Docker networking
- **Format**: `hostname:port`
- **Example**: `db:5433`
- **Note**: In Docker, this references the database container name

### DB_PULL
- **Required**: No
- **Type**: Boolean
- **Default**: `false`
- **Description**: If true, generates schema.prisma from existing database. If false, runs migrations.
- **Example**: `false`
- **Use case**: Set to `true` when connecting to an existing database

---

## Redis Configuration

### REDIS_CONN
- **Required**: No
- **Type**: String
- **Description**: Redis connection host and port
- **Format**: `hostname:port`
- **Default**: `redis:6380`
- **Example**: `localhost:6380` (local) or `redis:6380` (Docker)
- **Note**: Used for session storage and Bull job queues

---

## Email Configuration

### SITE_EMAIL_USERNAME
- **Required**: Yes
- **Type**: Email
- **Description**: Email address used for sending emails (cannot be an alias)
- **Example**: `noreply@newlifenurseryinc.com`
- **Note**: Must be the actual email account, not an alias

### SITE_EMAIL_PASSWORD
- **Required**: Yes
- **Type**: String
- **Description**: Password or app-specific token for the email account
- **Example**: `your_email_app_password`
- **Security Note**: Use app-specific passwords when available (Gmail, Outlook, etc.)

### SITE_EMAIL_FROM
- **Required**: Yes
- **Type**: String
- **Description**: Display name shown as the email sender
- **Example**: `"New Life Nursery"`
- **Note**: Wrap in quotes if it contains spaces

### SITE_EMAIL_ALIAS
- **Required**: No
- **Type**: Email
- **Description**: Email address displayed to recipients (can be different from SITE_EMAIL_USERNAME)
- **Example**: `info@newlifenurseryinc.com`

### EMAIL_MODE
- **Required**: No
- **Type**: Enum
- **Default**: Auto-determined based on NODE_ENV
- **Options**:
  - `disabled`: No emails sent (testing)
  - `console`: Emails logged to console only (development)
  - `file`: Emails saved to files + console (safe development)
  - `redirect`: All emails redirected to DEV_EMAIL_REDIRECT (staging)
  - `staging`: Only whitelisted emails sent (staging with restrictions)
  - `production`: Normal email sending (production only)
- **Description**: Controls email behavior in different environments
- **Example**: `file`

### DEV_EMAIL_REDIRECT
- **Required**: No (required if EMAIL_MODE=redirect)
- **Type**: Email
- **Description**: Developer email to receive all redirected emails
- **Example**: `developer@yourcompany.com`

### STAGING_ALLOWED_EMAIL_DOMAINS
- **Required**: No (required if EMAIL_MODE=staging)
- **Type**: Comma-separated list
- **Description**: Email domains allowed in staging mode
- **Example**: `yourcompany.com,gmail.com`

### STAGING_ALLOWED_EMAILS
- **Required**: No (required if EMAIL_MODE=staging)
- **Type**: Comma-separated list
- **Description**: Specific emails allowed in staging mode
- **Example**: `test@yourcompany.com,qa@yourcompany.com`

### SMTP_HOST
- **Required**: No
- **Type**: String
- **Default**: `smtp.gmail.com`
- **Description**: SMTP server hostname for sending emails
- **Example**: `smtp.sendgrid.net`, `email-smtp.us-east-1.amazonaws.com`, `smtp.office365.com`
- **Note**: Allows using different email providers beyond Gmail

### SMTP_PORT
- **Required**: No
- **Type**: Number
- **Default**: `465`
- **Description**: SMTP server port
- **Common values**:
  - `465` - SSL/TLS (secure)
  - `587` - STARTTLS (secure after upgrade)
  - `25` - Plain (not recommended)
- **Example**: `587`

### SMTP_SECURE
- **Required**: No
- **Type**: Boolean
- **Default**: `true`
- **Description**: Whether to use secure connection (SSL/TLS)
- **Example**: `false` (use with port 587 for STARTTLS)
- **Note**: Set to `false` when using port 587, `true` for port 465

---

## SMS/Twilio Configuration (Optional)

### PHONE_NUMBER
- **Required**: No
- **Type**: Phone Number
- **Description**: Twilio phone number for sending SMS
- **Example**: `+15551234567`
- **Note**: Can leave blank if not using Twilio

### TWILIO_ACCOUNT_SID
- **Required**: No
- **Type**: String
- **Description**: Twilio account SID
- **Example**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Note**: Can leave blank if not using Twilio

### TWILIO_AUTH_TOKEN
- **Required**: No
- **Type**: String
- **Description**: Twilio authentication token
- **Example**: `your_twilio_auth_token`
- **Security Note**: Keep this secret
- **Note**: Can leave blank if not using Twilio

---

## Security Configuration

### LETSENCRYPT_EMAIL
- **Required**: Yes (for production with SSL)
- **Type**: Email
- **Description**: Email for Let's Encrypt to contact about certificate issues
- **Example**: `admin@newlifenurseryinc.com`
- **Note**: Let's Encrypt will send expiration warnings to this address

---

## Server Configuration

### NODE_ENV
- **Required**: No
- **Type**: Enum
- **Default**: `development`
- **Options**: `development`, `production`
- **Description**: Node.js environment mode
- **Example**: `production`
- **Note**: Affects logging, error handling, and security settings

### SERVER_LOCATION
- **Required**: No
- **Type**: Enum
- **Default**: `local`
- **Options**: `local`, `dns`
- **Description**: Determines how server URLs are constructed
- **Example**: `local` (for development), `dns` (for production)
- **Note**: Set to `local` when developing, even on VPS with Remote Development

### SERVER_URL
- **Required**: Yes (for production)
- **Type**: URL
- **Description**: Full server URL during production
- **Example**: `https://newlifenurseryinc.com/api`
- **Note**: Must include `/api` path

### SITE_IP
- **Required**: No (required if SERVER_LOCATION=dns)
- **Type**: IP Address
- **Description**: IP address of the production server
- **Example**: `192.81.123.456`
- **Note**: Only used if SERVER_LOCATION is set to 'dns'

### VIRTUAL_HOST
- **Required**: Yes (for production with nginx-proxy)
- **Type**: Comma-separated list
- **Description**: Website domain names for nginx-proxy routing
- **Example**: `newlifenurseryinc.com,www.newlifenurseryinc.com`
- **Note**: No spaces between comma-separated values

### VITE_PORT_SERVER
- **Required**: No
- **Type**: Number
- **Default**: `5331`
- **Description**: Server port for Vite to connect to (must match PORT_SERVER)
- **Example**: `5331`
- **Note**: Used by UI to know which port the server is running on

### VITE_SERVER_LOCATION
- **Required**: No
- **Type**: Enum
- **Default**: `local`
- **Options**: `local`, `dns`
- **Description**: Tells Vite/UI how to construct server URLs
- **Example**: `local`

### VITE_SERVER_URL
- **Required**: No
- **Type**: URL
- **Description**: Server URL for Vite/UI in production
- **Example**: `https://newlifenurseryinc.com/api`

### VITE_SITE_IP
- **Required**: No
- **Type**: IP Address
- **Description**: Site IP for Vite/UI
- **Example**: `192.81.123.456`

---

## Debug/Development Settings

### CREATE_MOCK_DATA
- **Required**: No
- **Type**: Boolean
- **Default**: `false`
- **Description**: Populates database with fake data for testing
- **Example**: `true`
- **⚠️ WARNING**: **MUST be set to `false` before production deployment**

### GENERATE_SOURCEMAP
- **Required**: No
- **Type**: Boolean
- **Default**: `false`
- **Description**: Controls whether source maps are generated during build
- **Example**: `false`
- **Note**: Set to `false` to reduce memory usage during builds on smaller machines
- **Reference**: https://stackoverflow.com/a/57892656/10240279

---

## Environment Variable Validation

The server performs pre-flight validation on startup to ensure critical environment variables are set.

**Location**: `packages/server/src/index.ts:18-29`

**Currently validated variables**:
- `JWT_SECRET`
- `PROJECT_DIR`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

If any required variables are missing, the server will:
1. Log an error with code `0007`
2. Display an error message to console
3. Exit with code 1

---

## Environment Files

The project uses multiple environment files:

1. **`.env-example`**: Template with all available variables and documentation
2. **`.env`**: Local development environment (git-ignored)
3. **`.env-prod`**: Production environment (git-ignored)
4. **`packages/server/.env`**: Server-specific overrides (git-ignored)
5. **`packages/ui/.env`**: UI-specific overrides (git-ignored)

### File Priority

Environment variables are loaded in this order (later overrides earlier):

1. System environment variables
2. Root `.env` file
3. Package-specific `.env` files
4. Docker-compose environment sections
5. Command-line arguments

---

## Docker Compose Environment Variables

Docker compose files inject environment variables into containers. See:

- `docker-compose.yml` - Development environment
- `docker-compose-prod.yml` - Production environment

**Important notes**:
- Variables are passed from host `.env` files
- Default values use `${VAR:-default}` syntax
- Some variables (like `PORT_SERVER`) must be set in both docker-compose and container environments

---

## Security Best Practices

1. **Never commit** `.env` files to git
2. **Use strong passwords** for all credentials (minimum 16 characters, mixed case, numbers, symbols)
3. **Rotate secrets regularly** (every 90 days recommended)
4. **Use app-specific passwords** for email services
5. **Set `CREATE_MOCK_DATA=false`** before production
6. **Set `EMAIL_MODE=production`** only in production
7. **Use environment-specific** `.env-prod` for production
8. **Limit access** to `.env` files (chmod 600)

---

## Troubleshooting

### Server won't start

1. Check that all required variables are set:
   ```bash
   yarn workspace server typecheck
   ```

2. Verify database connectivity:
   ```bash
   docker-compose ps db
   ```

3. Check Redis connectivity:
   ```bash
   docker-compose ps redis
   ```

4. Review server logs:
   ```bash
   docker-compose logs server
   ```

### Health check fails

Visit `http://localhost:5331/healthcheck` to see detailed status of:
- Server
- Database connection
- Redis connection

Response format:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 42.5,
  "checks": {
    "server": "ok",
    "database": "ok",
    "redis": "ok"
  }
}
```

### Environment variables not loading

1. Ensure `.env` file exists in project root
2. Check file permissions: `chmod 600 .env`
3. Verify no syntax errors in `.env` (no quotes around simple values)
4. Restart Docker containers: `docker-compose down && docker-compose up -d`

---

## Migration Checklist: Development → Production

- [ ] Set `NODE_ENV=production`
- [ ] Set `CREATE_MOCK_DATA=false`
- [ ] Set `EMAIL_MODE=production`
- [ ] Set `SERVER_LOCATION=dns`
- [ ] Configure `SERVER_URL` with production domain
- [ ] Set `VIRTUAL_HOST` with production domains
- [ ] Update `SITE_IP` with production server IP
- [ ] Generate new `JWT_SECRET` (don't reuse development secret)
- [ ] Set strong `DB_PASSWORD`
- [ ] Set strong `ADMIN_PASSWORD`
- [ ] Configure `LETSENCRYPT_EMAIL`
- [ ] Review all email configuration for production email service
- [ ] Set `DB_PULL=false` (use migrations, not db pull)
- [ ] Verify `.env-prod` is in `.gitignore`

---

## Additional Resources

- [Prisma Environment Variables](https://www.prisma.io/docs/reference/api-reference/environment-variables-reference)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Node.js Environment Variables](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)
- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)

---

**Last Updated**: 2025-01-15
**Version**: 2.0.0
