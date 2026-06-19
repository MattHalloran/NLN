import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.integration.test.ts'],
    exclude: ['node_modules', 'dist', 'rust', 'generated'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      thresholds: {
        statements: 6.8,
        branches: 64.9,
        functions: 37.9,
        lines: 6.8,
        'src/rest/*.ts': {
          statements: 3.6,
          branches: 76,
          functions: 52,
          lines: 3.6,
        },
        'src/worker/email/**/*.ts': {
          statements: 48,
          branches: 47,
          functions: 66,
          lines: 48,
        },
        'src/utils/**/*.ts': {
          statements: 8.3,
          branches: 88,
          functions: 24,
          lines: 8.3,
        },
      },
      exclude: [
        'node_modules',
        'dist',
        'rust',
        'generated',
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.integration.test.ts',
        'src/**/*.test.example.ts',
        'src/__mocks__/**',
        'src/__tests__/**',
        'src/mocks/**',
        'src/db/migrations/**',
        'vitest.setup.ts',
      ],
    },
    clearMocks: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Disable test concurrency for integration tests
    fileParallelism: false,
  },
  resolve: {
    alias: {
      // Handle .js imports for TypeScript files
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
