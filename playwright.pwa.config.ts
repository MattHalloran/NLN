import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "pwa.spec.ts",
  timeout: 90 * 1000,
  expect: {
    timeout: 15 * 1000,
  },
  fullyParallel: false,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/pwa", open: "never" }],
  ],
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: "pwa-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "yarn workspace ui build && cd packages/ui && PORT_UI=3001 node scripts/serve-production.js",
    url: "http://localhost:3001",
    reuseExistingServer: false,
    timeout: 180 * 1000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
