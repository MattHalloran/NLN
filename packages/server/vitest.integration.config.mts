import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    exclude: ['node_modules', 'dist', 'rust', 'generated'],
    setupFiles: ['./vitest.setup.ts'],
    clearMocks: true,
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: './coverage-integration',
      include: ['src/**/*.ts'],
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
      thresholds: {
        statements: 19.6,
        branches: 59.4,
        functions: 31,
        lines: 19.6,
      },
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});
