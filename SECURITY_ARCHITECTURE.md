# New Life Nursery (NLN) - Codebase Architecture & Security Overview

## 1. Application Type & Architecture

### 1.1 Application Type
- **E-commerce / Plant Nursery Management Application**
- **Full-stack application** with separate frontend (React), backend (Node.js/Express), and database (PostgreSQL)
- **Monorepo structure** using Yarn workspaces

### 1.2 Architecture Pattern
```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Vite)                   │
│              @local/ui - Client-side Application            │
│                  (Port 3001)                                 │
└────────────────────────┬────────────────────────────────────┘
                         │ CORS-enabled HTTP/HTTPS
┌────────────────────────▼────────────────────────────────────┐
│              Backend (Express/Node.js)                       │
│      @local/server - REST API Server (Port 5331)            │
│     • Authentication (JWT-based with HTTP-only cookies)     │
│     • File Upload/Image Processing                          │
│     • Email Service                                         │
│     • Database Seeding & Migrations                         │
└────────────────────────┬────────────────────────────────────┘
                         │ Prisma ORM
┌────────────────────────▼────────────────────────────────────┐
│           Database (PostgreSQL)                             │
│              (Port 5433)                                     │
│     • User Authentication & Authorization                   │
│     • Product Catalog (Plants, SKUs)                        │
│     • Order Management                                      │
│     • Customer Management                                   │
└─────────────────────────────────────────────────────────────┘

Shared Library (@local/shared):
  • Validation schemas (Yup)
  • Constants & Enums
  • Type definitions
  • Shared utilities
```

---

## 2. Main Technology Stack

### 2.1 Backend Stack
```
Framework:        Express.js ^4.17.1
Runtime:          Node.js (v18+)
Language:         TypeScript 4.9.5
Database ORM:     Prisma 6.1.0
Database:         PostgreSQL
Authentication:   JWT (jsonwebtoken ^9.0.0)
Password Hashing: bcryptjs ^3.0.2
Session Storage:  HTTP-only Cookies
File Processing:  Multer ^2.0.2, Sharp ^0.34.3
Image Hash:       imghash ^0.0.9
HEIC Conversion:  heic-convert ^2.1.0
Email Service:    Nodemailer ^6.6.0
Job Queue:        Bull ^4.10.4
Redis Client:     redis 4.4.0
Logging:          Winston ^3.7.2
CORS:             cors ^2.8.5
```

### 2.2 Frontend Stack
```
Framework:        React ^18.2.0
Build Tool:       Vite 5.4.20
Language:         TypeScript ^5.9.2
State Management: Zustand ^5.0.8
UI Library:       Material-UI ^5.18.0
Form Validation:  Formik ^2.2.8
HTTP Client:      Native Fetch API
Password Strength: zxcvbn ^4.4.2
```

### 2.3 Shared Stack
```
Validation:       Yup ^0.32.9
UUID Generation:  uuid ^9.0.0
XML Building:     xmlbuilder2 ^3.0.2
```

### 2.4 Development & Testing
```
Test Framework:   Vitest ^3.2.4
Test Runner:      @vitest/ui ^3.2.4
Coverage:         @vitest/coverage-v8
HTTP Testing:     Supertest ^7.1.4
Linting:          ESLint ^9.37.0
Formatting:       Prettier ^3.6.2
Git Hooks:        Husky
Staging:          lint-staged
E2E Testing:      Playwright ^1.56.0
Lighthouse CI:    @lhci/cli ^0.15.1
```

---

## 3. Key Security-Relevant Areas

### 3.1 Authentication & Authorization

#### 3.1.1 JWT-Based Authentication
**Location:** `/packages/server/src/auth.ts`

**Key Components:**
- **JWT Strategy:**
  - Tokens signed with `JWT_SECRET` (environment variable)
  - Stored in HTTP-only cookies with name `session-f234u7fdiafhdja2`
  - Session duration: 30 days (30 * 86400 * 1000 ms)
  - Issued at: `iat`
  - Issuer: `iss` = `https://${SITE_NAME}/`
  - Expiration: `exp` = current time + 30 days

- **Cookie Configuration:**
  ```typescript
  httpOnly: true              // Prevents JavaScript access
  secure: NODE_ENV === 'production'  // HTTPS only in production
  sameSite: 'none' | 'lax'   // CSRF protection (none for production)
  maxAge: 30 days
  path: '/'
  ```

- **Token Payload:**
  ```typescript
  {
    iat: Date,              // Issued at
    iss: string,            // Issuer
    customerId: string,     // User identifier
    businessId: string,     // Business identifier
    roles: string[],        // User roles (e.g., 'admin', 'customer')
    isCustomer: boolean,    // Quick flag for customers
    isAdmin: boolean,       // Quick flag for admins
    exp: number            // Expiration timestamp
  }
  ```

#### 3.1.2 Middleware Stack
**Location:** `/packages/server/src/index.ts`

**Order of Middleware (CRITICAL for security):**
1. **Raw Body Parser** - Handles JSON with special characters
2. **Cookie Parser** - Parses cookies with `JWT_SECRET` as signing key
3. **Prisma Attachment** - Attaches database client to request
4. **CORS Configuration** - **MUST come BEFORE authentication**
   - `origin: true` (allows any origin)
   - `credentials: true` (allows cookies)
5. **Authentication Middleware** (`authenticate`)
   - Verifies JWT from cookies
   - Sets `req.validToken`, `req.customerId`, `req.roles`, etc.
6. **Authorization Middleware** (role-based)
   - `requireCustomer()` - Restricts to customers/admins
   - `requireAdmin()` - Restricts to admins only

#### 3.1.3 Lockout Mechanism
**Location:** `/packages/server/src/rest/auth.ts` (login endpoint)

**Account Protection:**
- **Soft Lockout:** After 5 failed login attempts, 5-minute lockout
- **Hard Lockout:** After 15 failed login attempts, permanent lockout (manual admin intervention required)
- **Password Reset Attempts:** Throttled to once per 2 days (48 hours)
- **Status Tracking:** Customer account status tracked (Unlocked, SoftLock, HardLock, Deleted)

#### 3.1.4 Password Management
**Location:** `/packages/server/src/rest/auth.ts`

**Hashing Algorithm:**
- **Algorithm:** bcryptjs
- **Rounds:** 8 (configured in `/packages/server/src/consts.ts`)
- **Min Length:** 8 characters
- **Max Length:** 50 characters
- **Special Characters:** Supported (implementation uses raw body parser to handle special chars)

**Password Reset Flow:**
1. User requests password reset with email
2. System generates random reset code
3. Code sent via email with verification link
4. User clicks link with code parameter
5. Password updated only after code verification

---

### 3.2 API Endpoints & Routes

**Location:** `/packages/server/src/rest/`

#### 3.2.1 REST API Structure
```
Base URL: /api/rest/v1

Authentication Routes:
  POST   /auth/login                      - User login (email + password)
  POST   /auth/logout                     - User logout
  POST   /auth/signup                     - New user registration
  POST   /auth/request-password-change    - Request password reset
  POST   /auth/reset-password             - Complete password reset

Image Management (Admin-only):
  GET    /images?label=:label             - Retrieve images by label
  POST   /images                          - Upload images (multipart/form-data)
  PUT    /images                          - Update image metadata (alt text, descriptions)

Asset Management (Admin-only):
  POST   /assets/read                     - Read asset files
  POST   /assets/write                    - Write asset files

Dashboard:
  GET    /dashboard/stats                 - Dashboard statistics

Landing Page:
  GET    /landing-page                    - Public landing page data
  POST   /landing-page/variants           - A/B variant management (admin)

Plants:
  GET    /plants                          - Get plant catalog
  GET    /plants/:id                      - Get single plant
```

#### 3.2.2 File Upload Configuration
**Location:** `/packages/server/src/rest/index.ts`

**Multer Configuration:**
- **Storage:** Memory storage (files not persisted temporarily)
- **Max File Size:** 10MB per file
- **Upload Method:** `upload.array('files')`
- **Routes Using Uploads:** `/images`, `/assets`

#### 3.2.3 Admin-Only Endpoints
Protected by `requireAdmin()` middleware:
- Image upload/update: `/api/rest/v1/images` (POST, PUT)
- Asset management: `/api/rest/v1/assets/write`
- Variant management: `/api/rest/v1/landing-page/variants`

---

### 3.3 File Handling & Image Processing

**Location:** `/packages/server/src/utils/fileIO.ts`

#### 3.3.1 File Operations
- **Upload Directory:** `${PROJECT_DIR}/assets/`
- **Subdirectories:**
  - `/assets/public/` - Publicly accessible files
  - `/assets/private/` - Admin-only files (served with `requireAdmin` middleware)
  - `/assets/images/` - Publicly accessible images
- **Max Buffer Size:** 1GB (for large file handling)

#### 3.3.2 File Name Sanitization
**Function:** `clean()`
```typescript
// Removes invalid characters using regex: /([^a-z0-9 .\-_/]+)/gi
// Valid characters: alphanumeric, spaces, dots, hyphens, underscores, forward slashes
// Attempts up to 100 numbered variations if filename exists
```

#### 3.3.3 Image Processing
**Function:** `saveImage()`

**Supported Formats:**
- JPEG, PNG, GIF, BMP, HEIC, HEIF, ICO, WebP

**Processing Steps:**
1. Validate MIME type starts with `image/`
2. Validate file extension against whitelist
3. Read file stream to buffer
4. Probe image dimensions (using `probe-image-size`)
5. Convert HEIC/HEIF to JPEG (Apple format handling)
6. Generate image hash using `imghash` for duplicate detection
7. Store original image (XXL)
8. Generate WebP version (for optimization)
9. Create resized versions (XXS, XS, S, M, ML, L, XL, XXL)
10. Store metadata in database

**Image Sizes:**
```
XXS: 32px    XS: 64px    S: 128px    M: 256px
ML: 512px    L: 1024px   XL: 2048px  XXL: 4096px
```

**Duplicate Detection:** Images compared by hash; previously uploaded images can be reused

#### 3.3.4 Access Control for Files
**Static File Routes:**
```
GET /api/images       → Public (no auth required)
GET /api/public       → Public (no auth required)
GET /api/private      → Admin-only (requireAdmin middleware)
```

---

### 3.4 Database & Data Management

**Location:** `/packages/server/src/db/schema.prisma`

#### 3.4.1 Database Schema
**Database Type:** PostgreSQL with Prisma ORM v6.1.0

**Key Tables (Security-Relevant):**

**customers:**
- `id` (UUID primary key)
- `password` (hashed with bcryptjs, nullable for OAuth)
- `loginAttempts` (tracks failed logins)
- `lastLoginAttempt` (timestamp)
- `resetPasswordCode` (unique, nullable)
- `lastResetPasswordRequestAttempt` (timestamp)
- `accountApproved` (boolean)
- `emailVerified` (boolean)
- `status` (Unlocked, SoftLock, HardLock, Deleted)
- `sessionToken` (nullable)
- **Relationships:** roles, emails, phones, orders, feedback, business

**customer_roles:**
- `customerId` (foreign key)
- `roleId` (foreign key)
- **Roles:** Customer, Owner, Admin

**emails:**
- `emailAddress` (unique constraint)
- `customerId` (nullable foreign key)
- `businessId` (nullable foreign key)
- `receivesDeliveryUpdates` (boolean)

**phones:**
- `number` (unique constraint)
- `customerId` (nullable foreign key)
- `businessId` (nullable foreign key)

**orders:**
- `customerId` (required foreign key)
- `status` (Draft, Pending, Approved, Scheduled, In Transit, Delivered, etc.)
- `specialInstructions` (2048 chars max)
- `desiredDeliveryDate`, `expectedDeliveryDate`

**images:**
- `hash` (unique, primary key for deduplication)
- `alt` (256 chars max - accessibility)
- `description` (1024 chars max)
- `usedFor` (usage labeling)

#### 3.4.2 Database Access Pattern
- **Prisma Client:** Single instance shared across application
- **Connection String:** From `DB_URL` environment variable
- **Schema Migration:** Via Prisma migrations (`src/db/migrations/`)
- **Seeding:** Via Prisma seed script (`src/db/seeds/init.ts`)

#### 3.4.3 Data Validation
**Location:** `/packages/shared/src/validation/index.ts`

**Validation Library:** Yup (schema validation)

**Validation Schemas:**
- `passwordSchema` - Min 8, Max 50 chars
- `businessSchema` - Name required, max 128 chars
- `addressSchema` - Address components, max 4096 for delivery instructions
- `emailSchema` - Email format, max 128 chars
- `orderSchema` - Order status enum validation, item quantities
- `skuSchema` - SKU format, price/availability numbers
- All schemas configured with `abortEarly: false` for full error reporting

#### 3.4.4 Migrations & Database Versioning
**Location:** `/packages/server/src/db/migrations/`
- **Tool:** Prisma migrations
- **Version:** Prisma 6.1.0
- **Deploy:** `prisma migrate deploy` (in build script)

---

### 3.5 Email Service & Communication

**Location:** `/packages/server/src/utils/emailService.ts`

#### 3.5.1 Email Mode Configuration
The email service has different modes for different environments:

**Modes:**
1. **disabled** - No emails sent (testing)
2. **console** - Emails logged to console only
3. **file** - Emails saved to files + console (default for development)
4. **redirect** - All emails redirected to dev email
5. **staging** - Only whitelisted emails sent (with filtering)
6. **production** - Normal email sending

**Auto-Detection Logic (Priority Order):**
1. `EMAIL_MODE` environment variable (explicit override)
2. `CREATE_MOCK_DATA === 'true'` → "file" mode
3. `NODE_ENV` → "development" = "file", "test" = "disabled", "production" = "production"
4. `SERVER_LOCATION` → "local" = "file", "dns" = "production"
5. Default: "file"

#### 3.5.2 SMTP Configuration
**Environment Variables:**
```
SITE_EMAIL_USERNAME    - Email account for sending
SITE_EMAIL_PASSWORD    - Email password/app token
SITE_EMAIL_FROM        - Visible sender name
SITE_EMAIL_ALIAS       - Visible sender email address

SMTP_HOST              - SMTP server (default: smtp.gmail.com)
SMTP_PORT              - SMTP port (465 for SSL, 587 for STARTTLS)
SMTP_SECURE            - Boolean for secure connection
```

#### 3.5.3 Email Queue System
**Location:** `/packages/server/src/worker/email/queue.ts`
**Technology:** Bull (job queue with Redis)

**Email Types:**
- Customer verification links (signup)
- Password reset links
- Admin notifications
- Order status updates
- Delivery updates

#### 3.5.4 Email Templates
**Location:** `/packages/server/src/worker/email/templates/`
- HTML email templates
- Plain text fallback
- Templating system (likely Handlebars or similar)

---

### 3.6 Session & Cookie Management

**Cookie Name:** `session-f234u7fdiafhdja2`

**Session Configuration:**
- **Duration:** 30 days (from last login)
- **Storage:** HTTP-only cookies (cannot access via JavaScript)
- **Signing:** Signed with `JWT_SECRET`
- **HTTPS Only:** In production (`secure` flag)
- **CSRF Protection:** 
  - Development: `sameSite: 'lax'`
  - Production: `sameSite: 'none'` (requires HTTPS)
- **Path:** Root path `/`

**Session Cleanup:** Client-side logout clears cookie with `res.clearCookie(COOKIE.Jwt)`

---

## 4. Package Structure & Main Entry Points

### 4.1 Monorepo Structure
```
/root/NLN/
├── packages/
│   ├── server/              # Backend application
│   │   ├── src/
│   │   │   ├── index.ts     # Main server entry point (Port 5331)
│   │   │   ├── auth.ts      # JWT authentication middleware
│   │   │   ├── error.ts     # Custom error handling
│   │   │   ├── logger.ts    # Winston logging
│   │   │   ├── consts.ts    # Constants (HASHING_ROUNDS = 8)
│   │   │   ├── types.ts     # TypeScript type definitions
│   │   │   ├── rest/        # REST API route handlers
│   │   │   │   ├── index.ts # Route mounting
│   │   │   │   ├── auth.ts  # Authentication endpoints
│   │   │   │   ├── images.ts # Image management
│   │   │   │   ├── assets.ts # Asset management
│   │   │   │   ├── dashboard.ts # Dashboard data
│   │   │   │   ├── plants.ts # Plant catalog
│   │   │   │   └── landingPage.ts # Landing page content
│   │   │   ├── db/          # Database layer
│   │   │   │   ├── schema.prisma # Database schema
│   │   │   │   ├── migrations/ # Schema migrations
│   │   │   │   ├── models/  # Query functions
│   │   │   │   └── seeds/   # Database seeding
│   │   │   ├── utils/       # Utility functions
│   │   │   │   ├── fileIO.ts # File operations
│   │   │   │   ├── setupDatabase.ts # DB initialization
│   │   │   │   └── emailService.ts # Email service
│   │   │   └── worker/      # Background jobs
│   │   │       └── email/   # Email queue & templates
│   │   ├── package.json     # Dependencies & scripts
│   │   ├── tsconfig.json    # TypeScript config
│   │   └── vitest.config.mts # Test configuration
│   │
│   ├── ui/                  # Frontend application
│   │   ├── src/
│   │   │   ├── index.tsx    # Entry point
│   │   │   ├── App.tsx      # Root component
│   │   │   ├── Routes.tsx   # Route definitions
│   │   │   ├── api/         # HTTP client hooks
│   │   │   ├── pages/       # Page components
│   │   │   ├── components/  # Reusable components
│   │   │   ├── forms/       # Form components
│   │   │   ├── hooks/       # React hooks
│   │   │   ├── stores/      # Zustand state stores
│   │   │   └── utils/       # Utility functions
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── shared/              # Shared library
│       ├── src/
│       │   ├── consts/      # Shared constants
│       │   │   ├── model.ts # Data models (ROLES, ORDER_STATUS)
│       │   │   ├── api.ts   # API constants (COOKIE name)
│       │   │   └── statusCodes.ts # HTTP status codes
│       │   ├── validation/  # Validation schemas (Yup)
│       │   ├── types.d.ts   # Global type definitions
│       │   ├── ids/         # ID utilities
│       │   └── utils/       # Shared utilities
│       └── package.json
│
├── scripts/                 # Deployment & utility scripts
├── .github/                 # GitHub workflows
├── .husky/                  # Git hooks
├── .env                     # Development environment variables
├── .env-example             # Environment variable template
├── .env-prod                # Production environment variables
├── package.json             # Root workspace configuration
├── tsconfig.json            # Root TypeScript config
└── yarn.lock                # Dependency lock file
```

### 4.2 Main Entry Points

**Backend:**
- **Start Command:** `yarn start-development` or `yarn dev`
- **Main File:** `/packages/server/src/index.ts`
- **Port:** 5331
- **Build Output:** `/packages/server/dist/`

**Frontend:**
- **Start Command:** `yarn start-development` (from ui package)
- **Main File:** `/packages/ui/src/index.tsx`
- **Port:** 3001
- **Build Output:** `/packages/ui/dist/`

**Database:**
- **Type:** PostgreSQL
- **Connection:** Via `DB_URL` environment variable
- **Port:** 5433 (configurable)
- **ORM:** Prisma 6.1.0

**Redis:**
- **Purpose:** Job queue for email delivery
- **Port:** 6380 (configurable)
- **Library:** redis 4.4.0

---

## 5. Configuration Files Related to Security

### 5.1 Environment Variables

**Location:** `.env`, `.env-example`, `.env-prod`

**Critical Security Variables:**
```
# Authentication & Session
JWT_SECRET              - Random string for signing JWTs (REQUIRED)
ADMIN_EMAIL             - Admin account email (REQUIRED)
ADMIN_PASSWORD          - Admin account password (REQUIRED)

# Database
DB_URL                  - PostgreSQL connection string (REQUIRED)
DB_NAME                 - Database name
DB_USER                 - Database user
DB_PASSWORD             - Database password

# Email Configuration
SITE_EMAIL_USERNAME     - Email account for sending
SITE_EMAIL_PASSWORD     - Email password/token
SITE_EMAIL_FROM         - Email display name
SITE_EMAIL_ALIAS        - Email display address
SMTP_HOST               - SMTP server
SMTP_PORT               - SMTP port
SMTP_SECURE             - Boolean for SSL/TLS

# Email Protection Modes
EMAIL_MODE              - disabled|console|file|redirect|staging|production
DEV_EMAIL_REDIRECT      - Redirect dev emails to this address
STAGING_ALLOWED_EMAILS  - Comma-separated allowed emails in staging

# Server Configuration
NODE_ENV                - development|test|production
VITE_SERVER_LOCATION    - local|dns
PROJECT_DIR             - Root project directory (usually /srv/app)
SITE_NAME               - Domain name
SERVER_URL              - Public server URL
VIRTUAL_HOST            - Comma-separated domain list

# Feature Flags
CREATE_MOCK_DATA        - Boolean - seed fake data (DISABLE IN PRODUCTION)

# Optional Services
TWILIO_ACCOUNT_SID      - Twilio account ID
TWILIO_AUTH_TOKEN       - Twilio auth token
PHONE_NUMBER            - Twilio phone number
LETSENCRYPT_EMAIL       - Let's Encrypt notification email

# Ports
PORT_UI                 - Frontend port (3001)
PORT_SERVER             - Backend port (5331)
PORT_DB                 - Database port (5433)
PORT_REDIS              - Redis port (6380)
```

**Required for Production:**
- `JWT_SECRET` (strong, random string, min 32 chars recommended)
- `DB_URL` with secure credentials
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- `SITE_EMAIL_PASSWORD` (app token for Gmail)
- `NODE_ENV=production`
- `CREATE_MOCK_DATA=false`
- `EMAIL_MODE=production`
- `VITE_SERVER_LOCATION=dns`

### 5.2 TypeScript Configuration

**Location:** `/packages/server/tsconfig.json`

**Security-Relevant Settings:**
```json
{
  "strict": true,                    // Strict type checking enabled
  "noImplicitAny": true,             // Catch implicit any types
  "strictNullChecks": true,          // Strict null checking
  "noUnusedLocals": false,           // Warn on unused variables
  "noUnusedParameters": false,       // Warn on unused parameters
  "noImplicitReturns": true,         // Require explicit returns
  "forceConsistentCasingInFileNames": true  // Case-sensitive imports
}
```

### 5.3 ESLint Configuration

**Plugins:**
- `@typescript-eslint/eslint-plugin`
- `eslint-plugin-prettier` (code formatting)
- `eslint-plugin-react-hooks` (React best practices)

**Benefits:**
- Static analysis catches security issues
- Consistent code style prevents vulnerabilities
- Enforces TypeScript strict mode

### 5.4 Testing Configuration

**Location:** `/packages/server/vitest.config.mts`

**Test Settings:**
```typescript
globals: true              // Global test APIs
environment: 'node'        // Node.js test environment
fileParallelism: false     // Disable parallel tests for integration tests
singleFork: true          // Single process for integration tests
```

**Coverage Tools:**
- v8 coverage provider
- HTML report generation
- Excludes test files, mocks, and setup files

### 5.5 Git Hooks (Pre-commit)

**Location:** `.husky/pre-commit`

**Executes:**
```bash
lint-staged
```

**Purpose:**
- Runs linting on staged files before commit
- Prevents code quality issues and potential security vulnerabilities
- Configured in `.lintstagedrc.json`

### 5.6 Lighthouse CI Configuration

**Location:** `/root/NLN/lighthouserc.cjs`

**Purpose:**
- Continuous performance and security audits
- Checks for security headers, best practices
- Prevents performance degradation
- Automated on commits/pull requests

---

## 6. Security Architecture Summary

### 6.1 Authentication Flow
```
User Login Request
  ↓
Validate email/password format (Yup schema)
  ↓
Find customer by email in database
  ↓
Check if account is locked (soft/hard lockout)
  ↓
Verify password with bcryptjs (8 rounds)
  ↓
Check account approval & email verification status
  ↓
Clear login attempts counter
  ↓
Generate JWT token with user roles
  ↓
Set HTTP-only secure cookie with JWT
  ↓
Return 200 + user data
```

### 6.2 Authorization Flow
```
Incoming Request
  ↓
Extract cookie (session-f234u7fdiafhdja2)
  ↓
Verify JWT signature with JWT_SECRET
  ↓
Check token expiration (30 days)
  ↓
Set req.validToken, req.customerId, req.roles
  ↓
Check route-specific middleware:
   - requireAdmin() → checks req.isAdmin
   - requireCustomer() → checks req.isCustomer
  ↓
Proceed or return 401 Unauthorized
```

### 6.3 File Upload Security
```
File Upload Request
  ↓
Check admin authorization (requireAdmin)
  ↓
Extract files from multipart/form-data
  ↓
Validate file size (max 10MB)
  ↓
Validate MIME type (must start with "image/")
  ↓
Validate file extension (whitelist check)
  ↓
Sanitize filename (remove special characters)
  ↓
Check for filename conflicts (append number if needed)
  ↓
Process image (resize, hash, convert formats)
  ↓
Store in filesystem (${PROJECT_DIR}/assets/)
  ↓
Store metadata in database (hash for deduplication)
  ↓
Return image hash & dimensions
```

### 6.4 API Security Headers
**CORS Configuration:**
- `credentials: true` - Allows cookies in cross-origin requests
- `origin: true` - Accepts requests from any origin (consider restricting in production)

**Cookie Security:**
- HTTP-only (prevents XSS attacks via JavaScript)
- Secure flag in production (HTTPS only)
- SameSite flag (CSRF protection)

---

## 7. Notable Security Considerations

### 7.1 Strengths
1. **Strict TypeScript:** Full strict mode enabled
2. **Password Hashing:** Uses bcryptjs with 8 rounds
3. **JWT with HTTP-only Cookies:** Defense against XSS
4. **Account Lockout:** Soft (5 attempts) and hard (15 attempts) lockout mechanisms
5. **File Upload Validation:** MIME type + extension + filename sanitization
6. **Prisma ORM:** Prevents SQL injection
7. **Email Mode Flexibility:** Development-safe email modes prevent accidental production emails
8. **Environment-Specific Config:** Different settings for dev/prod/test

### 7.2 Areas for Attention
1. **CORS Configuration:** `origin: true` allows any domain - should be restricted to known domains
2. **SameSite Cookie:** Set to `'none'` in production, requires careful CSRF handling
3. **Raw Body Parser:** Uses raw body parser to bypass express.json() - ensure proper error handling
4. **Password Reset Email:** Should include expiration time for reset codes
5. **Login Attempt Tracking:** Currently only tracks failure count, consider tracking IP addresses
6. **File Upload Paths:** Ensure proper access control for private assets directory
7. **Admin Initialization:** Admin user created via environment variables - consider secure initialization flow
8. **Mock Data Flag:** `CREATE_MOCK_DATA` must be disabled in production
9. **Email Service:** Different modes for different environments - ensure correct mode is used

### 7.3 Missing Security Controls to Consider
1. **Rate Limiting:** No built-in rate limiting on API endpoints
2. **Request Validation Middleware:** Input validation at Express middleware level
3. **Security Headers:** No helmet.js or similar for HTTP security headers
4. **CSRF Tokens:** Relies on SameSite cookies, no explicit CSRF tokens
5. **Two-Factor Authentication:** Not mentioned in current implementation
6. **Audit Logging:** No comprehensive audit trail of user actions
7. **API Key Management:** No API key authentication for programmatic access
8. **Database Encryption:** No mention of encrypted fields or SSL connections
9. **Password Requirements:** No complexity requirements beyond length (8-50)
10. **Session Invalidation:** No logout endpoint visible in auth.ts review

---

## 8. Key Files Reference

| File | Purpose | Security Impact |
|------|---------|-----------------|
| `/packages/server/src/index.ts` | Server initialization, middleware ordering | HIGH - Middleware order critical |
| `/packages/server/src/auth.ts` | JWT & session management | CRITICAL |
| `/packages/server/src/rest/auth.ts` | Login/signup/password reset endpoints | CRITICAL |
| `/packages/server/src/db/schema.prisma` | Database structure & constraints | HIGH |
| `/packages/server/src/utils/fileIO.ts` | File upload & image processing | HIGH |
| `/packages/server/src/utils/emailService.ts` | Email sending with mode safety | MEDIUM |
| `/packages/shared/src/validation/index.ts` | Input validation schemas | HIGH |
| `/packages/shared/src/consts/api.ts` | Cookie names & constants | MEDIUM |
| `.env-example` | Environment variable template | HIGH |
| `/packages/server/tsconfig.json` | TypeScript strict mode | MEDIUM |

---

## 9. Environment Setup Checklist

**For Development:**
```
CREATE_MOCK_DATA=true
EMAIL_MODE=file
NODE_ENV=development
JWT_SECRET=<dev-secret-string>
DB_URL=postgresql://user:pass@localhost:5433/dbname
```

**For Production:**
```
CREATE_MOCK_DATA=false
EMAIL_MODE=production
NODE_ENV=production
JWT_SECRET=<strong-random-string-min-32-chars>
VITE_SERVER_LOCATION=dns
CORS_ORIGIN=yourdomain.com
SMTP_SECURE=true
SMTP_PORT=465
```

---

## 10. Deployment Security Recommendations

1. **Rotate JWT_SECRET:** Before deploying, generate new strong secret
2. **Configure CORS:** Replace `origin: true` with specific allowed domains
3. **Enable HTTPS:** Set `secure: true` for cookies automatically via NODE_ENV check
4. **Database:** Use managed PostgreSQL with SSL, strong passwords, limited network access
5. **Redis:** Secure Redis connection, disable public access
6. **Environment Files:** Never commit .env files, use secure vault
7. **Admin User:** Use secure initialization process, not environment variables long-term
8. **SSL Certificates:** Use Let's Encrypt with certbot (LETSENCRYPT_EMAIL configured)
9. **Monitoring:** Set up logging and monitoring for authentication failures
10. **Backups:** Regular database backups with encryption at rest

