# Contributing to New Life Nursery

Thank you for your interest in contributing to the New Life Nursery project! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Documentation](#documentation)
- [Getting Help](#getting-help)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and considerate
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org))
- **Yarn** package manager ([Install](https://yarnpkg.com))
- **Docker** and Docker Compose ([Install](https://docs.docker.com/get-docker/))
- **Git** ([Install](https://git-scm.com/downloads))

### Initial Setup

1. **Fork the Repository**

   Visit the GitHub repository and click "Fork" to create your own copy.

2. **Clone Your Fork**

   ```bash
   git clone https://github.com/YOUR-USERNAME/NLN.git
   cd NLN
   ```

3. **Add Upstream Remote**

   ```bash
   git remote add upstream https://github.com/ORIGINAL-OWNER/NLN.git
   ```

4. **Install Dependencies**

   ```bash
   yarn install
   ```

5. **Configure Environment**

   ```bash
   cp .env-example .env
   ```

   Edit `.env` and set required variables:
   - `JWT_SECRET` - Generate with: `openssl rand -base64 32`
   - `PROJECT_DIR` - Set to your local path (e.g., `/home/user/NLN`)
   - `ADMIN_EMAIL` - Your email for admin account
   - `ADMIN_PASSWORD` - Strong password for admin

6. **Start Development Environment**

   ```bash
   docker-compose up -d
   ```

7. **Verify Installation**

   ```bash
   # Check containers are running
   docker-compose ps

   # Run tests
   yarn test

   # Access the application
   # UI: http://localhost:3001
   # Server: http://localhost:5331
   ```

## Development Workflow

### Creating a Feature Branch

Always create a new branch for your work:

```bash
# Update your local main/dev branch
git checkout dev
git pull upstream dev

# Create a feature branch
git checkout -b feature/your-feature-name
```

### Branch Naming Convention

Use descriptive branch names:

- `feature/add-plant-search` - New features
- `fix/login-error` - Bug fixes
- `docs/api-documentation` - Documentation
- `refactor/auth-module` - Code refactoring
- `test/dashboard-e2e` - Test additions

### Making Changes

1. **Make Your Changes**

   Edit code, add features, fix bugs.

2. **Run Tests Frequently**

   ```bash
   # Run unit tests
   yarn test

   # Run E2E tests
   yarn test:e2e

   # Type check
   yarn typecheck
   ```

3. **Commit Your Changes**

   ```bash
   git add .
   git commit -m "feat: add plant search functionality"
   ```

   See [Commit Messages](#commit-messages) for conventions.

4. **Keep Your Branch Updated**

   ```bash
   git fetch upstream
   git rebase upstream/dev
   ```

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

**Format**: `<type>(<scope>): <description>`

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, semicolons)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples**:
```
feat(auth): add password reset functionality
fix(dashboard): correct plant count calculation
docs(api): update REST API documentation
test(plants): add integration tests for plant CRUD
refactor(ui): extract reusable form components
chore(deps): update TypeScript to 5.9.2
```

**Guidelines**:
- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Capitalize first letter
- No period at the end
- Keep under 72 characters
- Reference issues: `fix(auth): resolve login bug (#123)`

## Code Standards

### TypeScript

- **Strict Mode**: Enabled in all packages
- **No `any`**: Avoid using `any` type; use `unknown` or proper types
- **Interfaces over Types**: Prefer interfaces for object shapes
- **Explicit Return Types**: Always specify function return types

**Example**:
```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  roles: Role[];
}

async function getUser(id: string): Promise<User | null> {
  return await prisma.user.findUnique({ where: { id } });
}

// ❌ Bad
async function getUser(id: any) {
  return await prisma.user.findUnique({ where: { id } });
}
```

### React/Frontend

- **Functional Components**: Use hooks, not class components
- **TypeScript Props**: Always type component props
- **Hooks**: Follow [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- **Material-UI**: Use MUI components consistently
- **No Inline Styles**: Use MUI's `sx` prop or styled components

**Example**:
```typescript
// ✅ Good
interface PlantCardProps {
  plant: Plant;
  onSelect: (id: string) => void;
}

const PlantCard: React.FC<PlantCardProps> = ({ plant, onSelect }) => {
  return (
    <Card sx={{ maxWidth: 345 }}>
      <CardContent>
        <Typography variant="h5">{plant.name}</Typography>
      </CardContent>
    </Card>
  );
};

// ❌ Bad
const PlantCard = (props: any) => {
  return <div style={{ maxWidth: "345px" }}>...</div>;
};
```

### Backend/Express

- **Async/Await**: Use async/await, not callbacks
- **Error Handling**: Always use try/catch
- **Validation**: Validate all input with schemas
- **No Hardcoded Values**: Use constants and environment variables

**Example**:
```typescript
// ✅ Good
router.post("/plants", async (req: Request, res: Response) => {
  try {
    const { prisma } = req as any;
    await validateArgs(createPlantSchema, req.body);

    const plant = await prisma.plant.create({
      data: req.body
    });

    return res.status(201).json(plant);
  } catch (error) {
    logger.error("Failed to create plant:", error);
    return res.status(500).json({ error: "Failed to create plant" });
  }
});

// ❌ Bad
router.post("/plants", (req, res) => {
  prisma.plant.create({ data: req.body }).then(plant => {
    res.json(plant);
  });
});
```

### Code Formatting

- **Indentation**: 4 spaces (not tabs)
- **Line Length**: Max 120 characters
- **Semicolons**: Required
- **Quotes**: Double quotes for strings
- **Trailing Commas**: Required in multiline

**Run Linting**:
```bash
# Check for issues
yarn lint

# Auto-fix issues
yarn lint --fix
```

### File Organization

- **One Component Per File**: React components
- **Co-located Tests**: Place tests next to source files
- **Barrel Exports**: Use index.ts for exports
- **Naming**:
  - Components: `PascalCase.tsx`
  - Utilities: `camelCase.ts`
  - Constants: `UPPER_SNAKE_CASE`
  - Types/Interfaces: `PascalCase`

**Example Structure**:
```
components/
├── PlantCard/
│   ├── PlantCard.tsx
│   ├── PlantCard.test.tsx
│   ├── PlantCard.styles.ts
│   └── index.ts
```

## Testing

### Running Tests

```bash
# Run all tests
yarn test

# Run unit tests only (fast)
yarn test --exclude "**/*.integration.test.ts"

# Run integration tests (requires Docker)
yarn test --run "**/*.integration.test.ts"

# Run E2E tests
yarn test:e2e

# Run E2E tests with UI
yarn test:e2e:ui

# Watch mode (re-run on changes)
yarn test:watch
```

### Writing Tests

#### Unit Tests (Vitest)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('calculateDiscount', () => {
  it('should apply 10% discount correctly', () => {
    const result = calculateDiscount(100, 0.10);
    expect(result).toBe(90);
  });

  it('should return original price for zero discount', () => {
    const result = calculateDiscount(100, 0);
    expect(result).toBe(100);
  });
});
```

#### Integration Tests (Testcontainers)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

describe('Plant API Integration', () => {
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:13-alpine')
      .start();
  }, 120000);

  afterAll(async () => {
    await container?.stop();
  });

  it('should create a plant', async () => {
    // Test implementation
  });
});
```

#### E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('admin can add a plant', async ({ page }) => {
  await page.goto('/admin/plants');
  await page.click('button:has-text("Add Plant")');
  await page.fill('input[name="name"]', 'Rose Bush');
  await page.click('button:has-text("Save")');

  await expect(page.locator('text=Rose Bush')).toBeVisible();
});
```

### Test Coverage

- Aim for **80%+ coverage** for critical code
- **Required coverage**:
  - Authentication: 100%
  - Payment processing: 100%
  - Data validation: 90%
  - API endpoints: 80%

```bash
# Generate coverage report
yarn test --coverage
```

## Submitting Changes

### Before Submitting

1. **Run All Tests**

   ```bash
   yarn test
   yarn test:e2e
   yarn typecheck
   ```

2. **Update Documentation**

   If your changes affect:
   - API endpoints → Update `docs/api/rest-api.md`
   - Configuration → Update `ENVIRONMENT.md`
   - Architecture → Update `docs/architecture/overview.md`

3. **Update CHANGELOG** (if applicable)

   Add entry under "Unreleased" section.

### Creating a Pull Request

1. **Push Your Branch**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open Pull Request**

   - Go to GitHub repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

3. **PR Title Format**

   Use the same format as commit messages:
   ```
   feat(plants): add search and filter functionality
   ```

4. **PR Description Template**

   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] E2E tests pass
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-reviewed code
   - [ ] Commented complex code
   - [ ] Updated documentation
   - [ ] No new warnings
   - [ ] Added/updated tests

   ## Related Issues
   Closes #123
   ```

5. **Request Review**

   - Tag relevant reviewers
   - Respond to feedback promptly
   - Make requested changes in new commits

### Review Process

1. **Automated Checks** (if CI/CD enabled)
   - Tests must pass
   - Linting must pass
   - Type checking must pass

2. **Code Review**
   - At least one approval required
   - Address all review comments
   - Re-request review after changes

3. **Merge**
   - Maintainer will merge after approval
   - Branch will be deleted automatically

## Documentation

### Updating Documentation

- Keep documentation in sync with code
- Use clear, concise language
- Include code examples
- Add diagrams where helpful

### Documentation Locations

- **README.md** - Project overview
- **docs/** - Detailed documentation
  - `architecture/` - System design
  - `api/` - API reference
  - `development/` - Dev guides
- **ENVIRONMENT.md** - Environment variables
- **DEPLOYMENT.md** - Deployment guide

### Writing Good Documentation

**Do**:
- ✅ Use examples
- ✅ Explain the "why", not just the "what"
- ✅ Keep it up to date
- ✅ Use consistent formatting

**Don't**:
- ❌ Assume knowledge
- ❌ Use jargon without explanation
- ❌ Leave outdated information

## Getting Help

### Resources

- **Documentation**: See [`/docs`](docs/README.md)
- **API Reference**: [REST API Docs](docs/api/rest-api.md)
- **Architecture**: [System Overview](docs/architecture/overview.md)

### Communication

- **GitHub Issues**: Report bugs, request features
- **Pull Requests**: Discuss implementation details
- **Email**: Contact maintainers directly

### Asking Questions

When asking for help:

1. **Search First**: Check existing issues and documentation
2. **Be Specific**: Include error messages, steps to reproduce
3. **Provide Context**: OS, Node version, Docker version
4. **Include Code**: Show what you've tried

**Good Question**:
```
I'm getting a "Connection refused" error when trying to connect
to PostgreSQL in the integration tests.

Error: Error: connect ECONNREFUSED 127.0.0.1:5433

Environment:
- OS: Ubuntu 22.04
- Node: 18.20.8
- Docker: 24.0.5

Steps to reproduce:
1. Run `yarn test --run "**/*.integration.test.ts"`
2. Error occurs when connecting to database

I've checked that Docker is running (`docker ps` shows containers).
```

## Project Structure

Understanding the codebase:

```
NLN/
├── packages/
│   ├── ui/                # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── api/
│   │   │   └── utils/
│   │   └── package.json
│   ├── server/            # Express backend
│   │   ├── src/
│   │   │   ├── rest/      # API routes
│   │   │   ├── db/        # Database models
│   │   │   ├── worker/    # Background jobs
│   │   │   └── utils/
│   │   └── package.json
│   ├── shared/            # Shared code
│   └── db/                # Database setup
├── e2e/                   # E2E tests
├── scripts/               # Deployment scripts
├── docs/                  # Documentation
└── docker-compose.yml     # Development setup
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to New Life Nursery!** 🌱

---

**Last Updated**: October 14, 2025
**Maintained By**: Development Team
