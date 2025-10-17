import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Playwright End-to-End Testing Configuration
 *
 * This configuration sets up E2E tests for the NLN admin panel features.
 * Tests run against a local development server on port 3001.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  // Only match .spec.ts files in e2e directory
  testMatch: '*.spec.ts',

  // Explicitly ignore everything outside e2e
  testIgnore: [
    '../**',
    '../../**',
    '**/node_modules/**',
    '**/packages/**',
    '**/dist/**',
  ],

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Expect timeout for assertions
  expect: {
    timeout: 10000
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3001',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Maximum time each action such as `click()` can take
    actionTimeout: 15 * 1000,

    // Browser context options
    viewport: { width: 1280, height: 720 },

    // Accept all downloads
    acceptDownloads: true,
  },

  // Configure projects for major browsers
  projects: [
    // Data backup - runs FIRST before everything
    {
      name: 'data-backup',
      testMatch: /setup\/data-backup\.setup\.ts/,
    },

    // Auth setup project - runs after data backup
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      testIgnore: /setup\/data-backup\.setup\.ts/,
      dependencies: ['data-backup'],
    },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    // Data restore - runs LAST after all tests
    {
      name: 'data-restore',
      testMatch: /teardown\/data-restore\.teardown\.ts/,
      dependencies: ['chromium'],
    },

    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Test against mobile viewports
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'cd packages/ui && yarn start-development',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
