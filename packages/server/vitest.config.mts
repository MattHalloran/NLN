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
        statements: 4.1,
        branches: 55,
        functions: 21,
        lines: 4.1,
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
