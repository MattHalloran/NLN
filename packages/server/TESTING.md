# Testing Guide

This project uses [Vitest](https://vitest.dev/) as the test framework.

## Running Tests

```bash
# Run all tests (unit + integration) with coverage
yarn test

# Run only unit tests (fast, no Docker required)
yarn test --run --exclude "**/*.integration.test.ts"

# Run only integration tests (requires Docker)
yarn test --run "**/*.integration.test.ts"

# Run tests in watch mode (auto-rerun on changes)
yarn test:watch

# Run tests with UI
yarn test:ui
```

## Test Types

### Unit Tests
- **Pattern**: `*.test.ts` (not `*.integration.test.ts`)
- **Speed**: Fast (milliseconds)
- **Requirements**: None
- **Purpose**: Test individual functions and modules in isolation using mocks

### Integration Tests
- **Pattern**: `*.integration.test.ts`
- **Speed**: Slower (seconds to minutes)
- **Requirements**: Docker must be running
- **Purpose**: Test interactions between real components (database, Redis, API, queues)

## Test Structure

Tests are located alongside the source files with the `.test.ts` extension:
- Unit tests: Test individual functions and modules in isolation
- Integration tests: Test interactions between components (see example below)

## Writing Tests

### Basic Unit Test

```typescript
import { describe, it, expect } from 'vitest';

describe('MyModule', () => {
    it('should do something', () => {
        expect(1 + 1).toBe(2);
    });
});
```

### Using Mocks

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock a module
vi.mock('./myModule', () => ({
    myFunction: vi.fn(),
}));

describe('MyTest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call mocked function', () => {
        const mockFn = vi.fn();
        mockFn('test');
        expect(mockFn).toHaveBeenCalledWith('test');
    });
});
```

## Integration Tests with Testcontainers

The project includes support for integration tests using [Testcontainers](https://testcontainers.com/).

See `src/db/integration.test.example.ts` for a working example of how to:
1. Start a PostgreSQL container for testing
2. Run tests against the real database
3. Clean up containers after tests

To enable the example integration test:
```bash
mv src/db/integration.test.example.ts src/db/integration.test.ts
yarn test
```

**Note:** Integration tests require Docker to be running and will take longer to execute.

### Integration Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

describe('Database Integration Tests', () => {
    let container: StartedPostgreSqlContainer;

    beforeAll(async () => {
        container = await new PostgreSqlContainer('postgres:16-alpine')
            .withDatabase('test_db')
            .withUsername('test_user')
            .withPassword('test_password')
            .start();
    }, 60000); // 60 second timeout

    afterAll(async () => {
        if (container) {
            await container.stop();
        }
    });

    it('should connect to database', () => {
        const uri = container.getConnectionUri();
        expect(uri).toContain('postgresql://');
    });
});
```

## Configuration

Test configuration is in `vitest.config.mts`:
- Test environment: Node.js
- Coverage provider: v8
- Test pattern: `src/**/*.test.ts`

## Migration from Jest

This project was migrated from Jest to Vitest. Key changes:
- `jest.mock()` → `vi.mock()`
- `jest.fn()` → `vi.fn()`
- `jest.clearAllMocks()` → `vi.clearAllMocks()`
- All test files now import from `vitest` instead of using globals

## Best Practices

1. **Isolation**: Each test should be independent and not rely on others
2. **Clear Mocks**: Always clear mocks between tests using `beforeEach()`
3. **Descriptive Names**: Use clear test descriptions that explain what is being tested
4. **Async Tests**: Use `async/await` for async operations, don't forget timeouts for long-running tests
5. **Coverage**: Aim for high coverage but focus on meaningful tests over just hitting numbers

## Integration Tests

The project includes comprehensive integration tests using [Testcontainers](https://testcontainers.com/). These tests spin up real Docker containers for PostgreSQL, Redis, etc.

### Available Integration Tests

1. **Database Integration Tests** (`src/db/database.integration.test.ts`)
   - Tests Prisma operations against real PostgreSQL
   - Covers CRUD operations, transactions, relationships, cascades
   - 60+ test cases across all models

2. **Redis Integration Tests** (`src/redisConn.integration.test.ts`)
   - Tests Redis operations with real Redis instance
   - Covers strings, hashes, lists, sets, sorted sets
   - Includes session storage, caching, and rate limiting patterns

3. **Authentication Integration Tests** (`src/auth.integration.test.ts`)
   - Tests JWT token generation and validation
   - Tests authentication middleware
   - Covers role-based access control

4. **API Integration Tests** (`src/rest/api.integration.test.ts`)
   - Tests REST API endpoints end-to-end
   - Uses supertest with real Express server
   - Covers signup, login, logout, password reset

5. **Bull Queue Integration Tests** (`src/worker/email/queue.integration.test.ts`)
   - Tests job queue operations with real Redis + Bull
   - Covers job lifecycle, priorities, retries, events
   - Tests email queue specific workflows

### Prerequisites for Integration Tests

**Docker must be running:**
```bash
# Check Docker status
docker ps

# Start Docker if needed
sudo systemctl start docker  # Linux
# or open Docker Desktop on Mac/Windows
```

### Running Integration Tests

```bash
# Run all integration tests
yarn test --run "**/*.integration.test.ts"

# Run specific integration test suite
yarn test --run src/db/database.integration.test.ts
yarn test --run src/redisConn.integration.test.ts
yarn test --run src/auth.integration.test.ts
yarn test --run src/rest/api.integration.test.ts
yarn test --run src/worker/email/queue.integration.test.ts

# Run with verbose output
yarn test --run "**/*.integration.test.ts" --reporter=verbose
```

## Troubleshooting

### ES6 Module Issues
If you encounter ES6 module errors, ensure:
- Config file uses `.mts` extension (`vitest.config.mts`)
- Test files import Vitest functions explicitly

### Testcontainers Issues
- **Docker not running**: Ensure Docker daemon is active (`docker ps` should work)
- **Permission errors**: Add your user to docker group: `sudo usermod -aG docker $USER`
- **Port conflicts**: Stop existing containers if ports are in use
- **Timeout errors**: Increase timeout in test: `beforeAll(async () => {...}, 120000)`
- **File is not defined error**: This is fixed by using `pool: 'forks'` in vitest.config.mts

### Slow Tests
- Run specific tests: `vitest src/path/to/test.ts`
- Skip integration tests: `vitest --run --exclude "**/*.integration.test.ts"`
- Integration tests take 1-3 minutes due to container startup
- Use `--pool-options.forks.singleFork=true` for faster sequential execution

### Network Issues with Testcontainers
- Ensure Docker has internet access for pulling images
- Pre-pull images: `docker pull postgres:16-alpine redis:7-alpine`
- Check Docker network: `docker network ls`
