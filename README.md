# New Life Nursery Website

[![Website](https://img.shields.io/website?label=newlifenurseryinc.com&style=for-the-badge&url=https%3A%2F%2Fnewlifenurseryinc.com)][website]
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=for-the-badge)](https://nodejs.org)

A modern, full-stack web application for New Life Nursery Inc., featuring a customer-facing storefront and comprehensive admin panel for managing products, content, and orders.

## Features

### Customer Features
- 🌿 **Plant Catalog** - Browse seasonal plants with detailed information
- 🎨 **Modern Design** - Responsive UI with automatic dark mode
- 📱 **Mobile-Friendly** - Optimized for all device sizes
- 🔍 **SEO Optimized** - Search engine friendly with dynamic sitemaps
- 🔐 **User Accounts** - Customer authentication and profiles

### Admin Features
- 📊 **Dashboard** - Real-time statistics and insights
- 🖼️ **Hero Banner Management** - Upload and manage homepage banners
- 🌱 **Seasonal Content** - Manage plants and care tips
- ⏰ **Business Hours** - Configure store hours and contact information
- 📧 **Email Protection** - Development safety features to prevent accidental customer emails

## Tech Stack

| Technology | Purpose | Version |
|---|---|---|
| [React](https://reactjs.org/) | Frontend UI | `^18.0.0` |
| [TypeScript](https://www.typescriptlang.org/) | Type Safety | `^5.9.2` |
| [Material-UI](https://mui.com/) | UI Components | `^5.0.0` |
| [Vite](https://vitejs.dev/) | Build Tool | `^7.0.0` |
| [Express](https://expressjs.com/) | Backend Server | `^4.17.1` |
| [Prisma](https://www.prisma.io/) | Database ORM | `^6.1.0` |
| [PostgreSQL](https://www.postgresql.org/) | Database | `13` |
| [Redis](https://redis.io/) | Caching & Queues | `7` |
| [Docker](https://www.docker.com/) | Containerization | - |
| [Playwright](https://playwright.dev/) | E2E Testing | `^1.56.0` |
| [Vitest](https://vitest.dev/) | Unit Testing | `^3.2.4` |

## Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org))
- **Yarn** package manager ([Install](https://yarnpkg.com))
- **Docker** and Docker Compose ([Install](https://docs.docker.com/get-docker/))
- **Git** ([Install](https://git-scm.com/downloads))

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/NLN.git
cd NLN

# Install dependencies
yarn install

# Copy environment template
cp .env-example .env

# Edit .env and configure required variables
# At minimum, set: JWT_SECRET, PROJECT_DIR, ADMIN_EMAIL, ADMIN_PASSWORD
nano .env
```

### Running Locally

```bash
# Start all services with Docker Compose
docker-compose up -d

# Or use the development script
./scripts/develop.sh

# Access the application
# UI: http://localhost:3001
# Server: http://localhost:5331
# Adminer (DB): http://localhost:8081
```

### Running Local Production

Use this when you need the production-built UI and server running locally without touching the production VPS:

```bash
bash scripts/start-local-production.sh -v <VERSION>
```

This builds production artifacts with `VITE_API_BASE_URL=/api`, starts Docker with `docker-compose.local-production.yml`, and serves browser API traffic through the UI origin at `http://localhost:3001/api`. That same-origin path avoids local CORS drift and lets CSRF/auth cookies behave like the remote production proxy topology.

```bash
# Validate the local production browser runtime
yarn test:e2e:production-local
```

The production-local gate checks public page loading, CSRF-backed newsletter signup, and admin login/session cookies. It uses local Docker only and does not run production SSH, backup, deploy, cleanup, update, prune, restart, or deletion commands.

### Verify Installation

```bash
# Check all containers are running
docker-compose ps

# Run health check
curl http://localhost:5331/healthcheck

# Run the fast local test suite
yarn test
```

## Project Structure

```
NLN/
├── packages/
│   ├── ui/                 # React frontend (Vite + TypeScript)
│   ├── server/             # Express backend (TypeScript)
│   ├── shared/             # Shared types and utilities
│   └── db/                 # Database schemas and migrations
├── scripts/                # Deployment and utility scripts
├── docs/                   # Documentation
├── e2e/                    # Playwright E2E tests
├── assets/                 # Static assets (images, PDFs)
├── data/                   # Persistent data (DB, Redis, uploads)
└── docker-compose.yml      # Docker orchestration
```

## Documentation

Comprehensive documentation is available in the [`/docs`](docs) directory:

### Getting Started
- [📖 Documentation Index](docs/README.md) - Central documentation hub
- [⚙️ Environment Variables](ENVIRONMENT.md) - Complete env var reference (532 lines)

### Development
- [💻 Testing Guide](TESTING.md) - Validation tiers and test commands
- [🧪 Server Testing](packages/server/TESTING.md) - Server unit and integration tests
- [🎭 Lighthouse CI](docs/lighthouse-ci.md) - Public page performance and quality checks

### Architecture
- [🏗️ System Overview](docs/architecture/overview.md) - Architecture and data flow
- [🔌 REST API](docs/api/rest-api.md) - API endpoint reference

### Deployment
- [🚀 Production Hardening Plan](docs/production-deploy-hardening-plan.md) - Deployment safety context
- [📧 Email Protection](docs/EMAIL_PROTECTION.md) - Development email safety

## Development Commands

```bash
# Fast local tests
yarn test

# Local quality gate
yarn validate

# Full local validation gate
yarn validate:full

# Browser validation gate
yarn validate:browser

# Stable public visitor E2E suite
yarn test:e2e:public

# Public-page visual regression snapshots
yarn test:visual

# Stable admin E2E suite
yarn test:e2e:admin

# Production-built local stack browser gate
yarn test:e2e:production-local

# Read-only smoke check for a deployed public URL
yarn smoke:public https://<your-site>

# Type checking
yarn typecheck

# Lint code
yarn lint

# Start development servers
yarn workspace ui start-development
yarn workspace server start-development
```

## Testing

The project includes layered test coverage:

- **Unit Tests**: Shared, UI, and server Vitest suites with coverage thresholds
- **Integration Tests**: Server Vitest suites with Testcontainers-backed PostgreSQL and Redis
- **Browser Tests**: Playwright public visitor flows, visual snapshots, stable admin flows, accessibility checks, and PWA checks
- **Script Tests**: Bats coverage for backup, deploy, rollback, readiness, healthcheck, and migration safety

```bash
# Run fast unit tests
yarn test

# Run the quick local quality gate
yarn validate

# Run full local validation
yarn validate:full

# Run E2E tests with UI
yarn test:e2e:ui

# View test report
yarn test:e2e:report
```

See [Testing Guide](TESTING.md) for details.

## Deployment

The project uses a two-phase deployment process:

1. **Build Phase** (local machine) - `./scripts/build.sh`
2. **Deploy Phase** (production server) - `./scripts/deploy.sh`

See the [Deployment Guide](DEPLOYMENT.md) for complete instructions.

### Key Deployment Features
- ✅ Environment validation
- ✅ Health check verification
- ✅ Pre-migration database backups
- ✅ Automated rollback script
- ✅ Docker containerization

## Security

Security is a top priority. Key features:

- 🔐 JWT-based authentication
- 🛡️ Email protection system (prevents accidental emails in dev)
- 🔒 Role-based access control (admin, customer)
- 📋 Pre-deployment security checklist
- 🔑 Environment variable validation
- 🚨 Secrets management guidelines

See [Security Checklist](SECURITY_CHECKLIST.md) for details.

## License

This project is licensed under the MIT License.

## Support

- **Documentation**: See [`/docs`](docs/README.md)
- **Issues**: Report bugs via GitHub Issues
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)

## Acknowledgments

Built for New Life Nursery Inc. as both a functional website and a reference for creating powerful, maintainable web applications.

---

[website]: https://newlifenurseryinc.com/

**Last Updated**: October 14, 2025
**Version**: 2.0.0
