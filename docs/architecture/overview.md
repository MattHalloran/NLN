# System Architecture Overview

This document provides a high-level overview of the New Life Nursery (NLN) application architecture.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Components](#components)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)
- [Deployment Architecture](#deployment-architecture)
- [Security Architecture](#security-architecture)

## System Overview

NLN is a full-stack monorepo application built with TypeScript, consisting of:

- **Frontend**: React SPA with Material-UI
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis for sessions and background jobs
- **Infrastructure**: Docker-based containerization

## Architecture Diagram

### High-Level Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTP/HTTPS
       │
┌──────▼──────────────────────────────────────────────┐
│              Nginx Reverse Proxy                    │
│         (Production only - nginx-proxy)             │
└──────┬──────────────────────┬───────────────────────┘
       │                      │
       │ /                    │ /api
       │                      │
┌──────▼──────┐        ┌──────▼───────┐
│   UI (React)│        │  Server      │
│   Port 3001 │        │  (Express)   │
│             │◄───────┤  Port 5331   │
│   Vite Dev  │  REST  │              │
│   Server    │   API  │  REST API    │
└─────────────┘        └──────┬───────┘
                              │
                              │
              ┌───────────────┼───────────────┐
              │               │               │
       ┌──────▼─────┐  ┌──────▼──────┐  ┌────▼──────┐
       │ PostgreSQL │  │    Redis    │  │  Email    │
       │   Port     │  │   Port      │  │  Service  │
       │   5433     │  │   6380      │  │  (SMTP)   │
       │            │  │             │  │           │
       │  Prisma    │  │  Sessions   │  │  Nodemailer│
       │  ORM       │  │  Bull Queue │  │           │
       └────────────┘  └─────────────┘  └───────────┘
```

### Container Architecture (Docker)

```
Docker Network: app
┌──────────────────────────────────────────────────────┐
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────┐  ┌──────┐   │
│  │ nln_ui   │  │nln_server│  │nln_db│  │nln   │   │
│  │          │  │          │  │      │  │redis │   │
│  │  React   │  │ Express  │  │Postgre│ │      │   │
│  │  Vite    │  │ Node.js  │  │ SQL  │  │Cache │   │
│  │          │  │          │  │      │  │Queue │   │
│  └──────────┘  └──────────┘  └──────┘  └──────┘   │
│                                                      │
└──────────────────────────────────────────────────────┘

Docker Network: proxy (Production only)
┌──────────────────────────────────────────────────────┐
│  ┌────────────────┐                                  │
│  │  nginx-proxy   │  (External container)            │
│  │  + letsencrypt │                                  │
│  └────────────────┘                                  │
└──────────────────────────────────────────────────────┘
```

## Components

### 1. UI Package (`packages/ui`)

**Technology**: React 18, TypeScript, Vite, Material-UI v5

**Responsibilities**:
- Customer-facing storefront (plant catalog, business info)
- Admin panel (dashboard, content management)
- User authentication UI (login, signup, password reset)
- Image upload and management interfaces
- Responsive design with dark mode support

**Key Features**:
- React Router for client-side routing
- Material-UI components for consistent design
- Axios for REST API communication
- React Context for state management
- Service Worker for PWA capabilities (currently disabled)

**Build Output**:
- Development: Vite dev server on port 3001
- Production: Static files served by nginx

### 2. Server Package (`packages/server`)

**Technology**: Express.js, TypeScript, Node.js 18+

**Responsibilities**:
- REST API endpoints (v1 API)
- Authentication and authorization (JWT)
- Database operations via Prisma
- Image upload handling (multer)
- Email sending (Nodemailer + Bull queue)
- Static file serving

**Key Modules**:
- `/rest/auth.ts` - Authentication endpoints
- `/rest/landingPage.ts` - Homepage content API
- `/rest/plants.ts` - Plant catalog API
- `/rest/dashboard.ts` - Admin statistics API
- `/rest/images.ts` - Image upload/management
- `/rest/assets.ts` - Static asset management
- `/auth.ts` - Auth middleware and JWT handling
- `/worker/email/` - Email queue processing

**API Structure**:
```
/api/rest/v1/
├── health              (GET)
├── auth/
│   ├── login           (POST)
│   ├── logout          (POST)
│   ├── signup          (POST)
│   └── reset-password  (POST)
├── landing-page        (GET, PUT)
├── plants              (GET, POST, PUT, DELETE)
├── images              (GET, POST, PUT)
├── assets              (GET, POST)
└── dashboard/stats     (GET)
```

### 3. Database Package (`packages/db`)

**Technology**: PostgreSQL 13, Prisma ORM 6.1

**Responsibilities**:
- Data persistence
- Schema migrations
- Relational data management

**Key Models**:
- `User` - Customer and admin accounts
- `Role` - User roles (customer, admin)
- `Business` - Business information
- `Plant` - Plant catalog items
- `Sku` - Product SKUs
- `Order` - Customer orders
- `OrderItem` - Order line items
- `Image` - Image metadata
- `Discount` - Promotional discounts

**Migrations**:
- Located in `packages/server/src/db/migrations/`
- Managed by Prisma Migrate
- Automatic backup before each migration

### 4. Shared Package (`packages/shared`)

**Technology**: TypeScript

**Responsibilities**:
- Shared types and interfaces
- Common utilities
- Cross-package constants

**Benefits**:
- Type safety between frontend and backend
- DRY principle for common code
- Single source of truth for types

### 5. Redis

**Technology**: Redis 7 Alpine

**Responsibilities**:
- Session storage (Express sessions)
- Background job queue (Bull)
- Caching layer (future use)
- Rate limiting (future use)

**Configuration**:
- Max memory: 256MB
- Eviction policy: allkeys-lru
- Persistence: AOF (Append Only File)
- Data directory: `./data/redis/`

### 6. Email Service

**Technology**: Nodemailer + Bull Queue

**Responsibilities**:
- Transactional emails (verification, password reset)
- Admin notifications
- Queued email processing
- Development email protection

**Email Protection Modes** (See [EMAIL_PROTECTION.md](../EMAIL_PROTECTION.md)):
- `disabled` - No emails sent (testing)
- `console` - Console logging only
- `file` - Save to JSON files (default dev mode)
- `redirect` - Redirect all emails to developer
- `staging` - Whitelist-only sending
- `production` - Normal email delivery

## Data Flow

### User Authentication Flow

```
┌──────┐   1. Login    ┌────────┐   2. Validate   ┌──────────┐
│Client│ ─────────────►│ Server │ ───────────────►│ Database │
└───┬──┘               └────┬───┘                 └──────────┘
    │                       │ 3. Generate JWT
    │                       │    + Session
    │                       ▼
    │                  ┌────────┐
    │   4. Set Cookie  │ Redis  │
    │ ◄────────────────┤Session │
    │                  └────────┘
    │
    │  5. Subsequent Requests
    │     (with JWT cookie)
    ▼
```

**Steps**:
1. User submits credentials (email + password)
2. Server validates against database (bcrypt hash comparison)
3. Server generates JWT token with user claims
4. JWT stored in HTTP-only cookie + session in Redis
5. Subsequent requests authenticated via JWT in cookie

### Content Management Flow (Admin)

```
┌─────┐  1. Upload   ┌────────┐  2. Store   ┌─────────────┐
│Admin│ ───────────►│ Server │ ───────────►│ File System │
└──┬──┘   Image      └────┬───┘   File      └─────────────┘
   │                      │
   │                      │ 3. Save Metadata
   │                      ▼
   │                 ┌──────────┐
   │  4. Return URL  │ Database │
   │ ◄───────────────┤ (Prisma) │
   │                 └──────────┘
   │
   │  5. Update UI
   ▼
┌─────┐
│ UI  │
└─────┘
```

**Steps**:
1. Admin uploads image via multipart/form-data
2. Server saves file to `assets/images/` directory
3. Server creates Image record in database
4. Server returns image URL to client
5. UI updates to display new image

### Email Sending Flow

```
┌────────┐  1. Trigger  ┌────────┐  2. Add Job  ┌───────────┐
│ Server │ ────────────►│  Bull  │ ────────────►│   Redis   │
└────────┘   Event      │ Queue  │   to Queue   └───────────┘
                        └────┬───┘
                             │ 3. Process Job
                             ▼
                        ┌──────────┐
                        │  Worker  │
                        │ Process  │
                        └────┬─────┘
                             │ 4. Send Email
                             ▼
                        ┌──────────┐
                        │   SMTP   │
                        │  Server  │
                        └──────────┘
```

**Steps**:
1. Application event triggers email (e.g., password reset)
2. Server adds email job to Bull queue in Redis
3. Background worker picks up job
4. Worker sends email via SMTP (or dev protection mode)

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | UI library |
| TypeScript | 5.9.x | Type safety |
| Vite | 7.x | Build tool |
| Material-UI | 5.x | Component library |
| React Router | 6.x | Client routing |
| Axios | 1.x | HTTP client |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4.x | Web framework |
| TypeScript | 5.9.x | Type safety |
| Prisma | 6.1.x | Database ORM |
| Nodemailer | 6.x | Email sending |
| Bull | 4.x | Job queue |
| JWT | 9.x | Authentication |

### Infrastructure
| Technology | Version | Purpose |
|---|---|---|
| PostgreSQL | 13 | Primary database |
| Redis | 7 | Cache & queues |
| Docker | Latest | Containerization |
| Docker Compose | v3.9 | Orchestration |
| nginx-proxy | Latest | Reverse proxy (prod) |

### Testing
| Technology | Version | Purpose |
|---|---|---|
| Vitest | 3.2.x | Unit testing |
| Playwright | 1.56.x | E2E testing |
| Testcontainers | 11.7.x | Integration testing |
| Supertest | 7.x | API testing |

## Deployment Architecture

### Development Environment

```
Developer Machine
├── Docker Compose (docker-compose.yml)
│   ├── UI container (hot reload)
│   ├── Server container (hot reload)
│   ├── PostgreSQL container
│   ├── Redis container
│   └── Adminer container (DB admin)
└── Source code mounted as volumes
```

**Key Features**:
- Hot module replacement (HMR)
- Source maps enabled
- Mock data generation option
- Email protection (file mode)
- Port forwarding: 3001 (UI), 5331 (Server), 8081 (Adminer)

### Production Environment

```
VPS Server
├── nginx-proxy (port 80/443)
│   ├── Automatic SSL (Let's Encrypt)
│   ├── Routes / → UI
│   └── Routes /api → Server
├── Docker Compose (docker-compose-prod.yml)
│   ├── UI container (static build)
│   ├── Server container (compiled JS)
│   ├── PostgreSQL container (persistent volume)
│   └── Redis container (persistent volume)
└── Persistent volumes for data, images, uploads
```

**Key Features**:
- Compiled TypeScript (no source code)
- Minified builds
- Production environment variables
- Automatic SSL certificates
- Health checks for all containers
- Persistent data volumes

### Deployment Process

See [DEPLOYMENT.md](../../DEPLOYMENT.md) for full details.

**Two-Phase Process**:

1. **Build Phase** (Local machine):
   ```bash
   ./scripts/build.sh -v 2.2.6 -e .env-prod -d y
   ```
   - Validates environment
   - Builds UI and server
   - Creates Docker images
   - Transfers to VPS

2. **Deploy Phase** (Production server):
   ```bash
   ./scripts/deploy.sh -v 2.2.6
   ```
   - Backs up database
   - Loads new images
   - Restarts containers
   - Verifies health checks

## Security Architecture

### Authentication & Authorization

**JWT-Based Authentication**:
- HTTP-only cookies (XSS protection)
- Signed JWT tokens (tampering protection)
- Short token expiry (security)
- Session invalidation on logout

**Authorization Layers**:
1. **Public** - No authentication required
2. **Authenticated** - Requires valid JWT
3. **Admin** - Requires admin role

**Middleware Stack**:
```typescript
app.use(auth.attachPrisma)      // Attach DB client
app.use(auth.authenticate)       // Parse JWT, attach user
app.use('/api/private', auth.requireAdmin)  // Admin routes
```

### Data Security

**Database**:
- Password hashing (bcrypt)
- SQL injection prevention (Prisma parameterized queries)
- Connection string in environment variables
- Regular backups

**Secrets Management**:
- Environment variables for all secrets
- Never committed to git
- Validated on server startup
- Different secrets per environment

**File Uploads**:
- File size limits (10MB)
- Type validation
- Stored outside public web root
- Admin-only access to private files

### Network Security

**Development**:
- CORS enabled for localhost
- HTTP only (local network)

**Production**:
- HTTPS only (Let's Encrypt SSL)
- CORS restricted to production domain
- HTTP → HTTPS redirect
- Security headers (Helmet.js - future)

## Monitoring & Observability

### Health Checks

**Server Health Endpoint**: `/healthcheck`
```json
{
  "status": "healthy",
  "timestamp": "2025-10-14T...",
  "uptime": 42.5,
  "checks": {
    "server": "ok",
    "database": "ok",
    "redis": "ok"
  }
}
```

**Docker Health Checks**:
- Server: HTTP health check every 20s
- Database: `pg_isready` + SELECT 1
- Redis: `redis-cli ping`
- UI: Depends on healthy server

### Logging

**Structured Logging**:
- Custom logger in `src/logger.ts`
- Log levels: error, warn, info, debug
- Error codes for tracking
- JSON format for parsing

**Log Locations**:
- Container logs: `docker logs <container>`
- Application logs: `data/logs/`
- Email logs (dev): `logs/emails/`

### Future Monitoring

Planned additions:
- Error tracking (Sentry)
- Uptime monitoring (UptimeRobot)
- Performance monitoring (New Relic/DataDog)
- Log aggregation (ELK stack)
- Metrics dashboard (Grafana)

## Scalability Considerations

### Current Limitations

- Single VPS deployment
- No load balancing
- Limited horizontal scaling
- Manual deployment process

### Future Improvements

1. **Horizontal Scaling**:
   - Multiple server instances
   - Load balancer (nginx/HAProxy)
   - Shared Redis for sessions
   - Database read replicas

2. **CI/CD**:
   - GitHub Actions pipeline
   - Automated testing gate
   - Container registry (GHCR)
   - Automated deployments

3. **Caching**:
   - Redis caching layer
   - CDN for static assets (CloudFlare)
   - Browser caching headers
   - API response caching

4. **Database**:
   - Connection pooling (already using Prisma pool)
   - Query optimization
   - Database indexes
   - Read replicas for reports

## Related Documentation

- [REST API Reference](../api/rest-api.md) - API endpoint documentation
- [Database Schema](database-schema.md) - Database structure details
- [Deployment Guide](../../DEPLOYMENT.md) - Production deployment process
- [Environment Variables](../../ENVIRONMENT.md) - Configuration reference
- [Security Checklist](../../SECURITY_CHECKLIST.md) - Security best practices

---

**Last Updated**: October 14, 2025
**Maintained By**: Development Team
