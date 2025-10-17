import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'rust', 'generated'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'dist',
        'rust',
        'generated',
        'src/**/*.d.ts',
        'src/mocks/**',
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
