# Database Migration Guide

## Adding Email Verification Token Fields

This migration adds two new fields to the `customer` table for secure email verification.

### Fields Added
- `emailVerificationCode` - VARCHAR(256), unique, nullable
- `emailVerificationExpiry` - TIMESTAMPTZ, nullable

### Option 1: Automatic Migration (Recommended)

```bash
cd /root/NLN/packages/server

# Generate migration
npx prisma migrate dev --name add_email_verification_tokens

# This will:
# 1. Generate SQL migration file
# 2. Apply migration to database
# 3. Regenerate Prisma client
```

### Option 2: Manual Migration

If you prefer to run SQL manually:

```sql
-- Add email verification code field
ALTER TABLE customer 
ADD COLUMN "emailVerificationCode" VARCHAR(256) UNIQUE;

-- Add email verification expiry field
ALTER TABLE customer 
ADD COLUMN "emailVerificationExpiry" TIMESTAMPTZ;
```

### Production Deployment

```bash
cd /root/NLN/packages/server

# Apply pending migrations
npx prisma migrate deploy

# Regenerate client
npx prisma generate
```

### Verify Migration

```bash
# Check schema
npx prisma db pull

# Verify columns exist
psql $DB_URL -c "\d customer"
```

### Rollback (if needed)

```bash
# Revert migration
npx prisma migrate resolve --rolled-back 20250124_add_email_verification_tokens

# Drop columns manually if needed
psql $DB_URL -c "ALTER TABLE customer DROP COLUMN emailVerificationCode, DROP COLUMN emailVerificationExpiry;"
```
