import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'rust', 'generated', 'src/**/*.integration.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      thresholds: {
        statements: 9.7,
        branches: 70,
        functions: 43.6,
        lines: 9.7,
        'src/middleware/**/*.ts': {
          statements: 44,
          branches: 85,
          functions: 43,
          lines: 44,
        },
        'src/rest/*.ts': {
          statements: 7,
          branches: 79,
          functions: 58,
          lines: 7,
        },
        'src/rest/assets.ts': {
          statements: 69,
          branches: 77,
          functions: 100,
          lines: 69,
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
        'src/config/paths.ts': {
          statements: 87,
          branches: 71,
          functions: 55,
          lines: 87,
        },
        'src/error.ts': {
          statements: 100,
          branches: 69,
          functions: 100,
          lines: 100,
        },
        'src/logger.ts': {
          statements: 88,
          branches: 33,
          functions: 100,
          lines: 88,
        },
        'src/utils/objectTools.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/utils/random.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/utils/secureCompare.ts': {
          statements: 92,
          branches: 90,
          functions: 100,
          lines: 92,
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
  },
  resolve: {
    alias: {
      // Handle .js imports for TypeScript files
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
