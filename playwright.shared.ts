import { defineConfig, devices } from "@playwright/test";
import type { PlaywrightTestConfig } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

type E2EConfigOptions = {
  testMatch: PlaywrightTestConfig["testMatch"];
  reportName: string;
};

export const createE2EConfig = ({ testMatch, reportName }: E2EConfigOptions) =>
  defineConfig({
    testDir: "./e2e",
    testMatch,
    testIgnore: [
      "../**",
      "../../**",
      "**/node_modules/**",
      "**/packages/**",
      "**/dist/**",
      "pwa.spec.ts",
    ],
    timeout: 60 * 1000,
    expect: {
      timeout: 10000,
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
      ["html", { outputFolder: `playwright-report/${reportName}`, open: "never" }],
      ["list"],
      ["json", { outputFile: `test-results/${reportName}.json` }],
    ],
    use: {
      baseURL: "http://localhost:3001",
      trace: "on-first-retry",
      screenshot: "only-on-failure",
      video: "retain-on-failure",
      actionTimeout: 15 * 1000,
      viewport: { width: 1280, height: 720 },
      acceptDownloads: true,
    },
    projects: [
      {
        name: "data-backup",
        testMatch: /setup\/data-backup\.setup\.ts/,
      },
      {
        name: "setup",
        testMatch: /.*\.setup\.ts/,
        testIgnore: /setup\/data-backup\.setup\.ts/,
        dependencies: ["data-backup"],
      },
      {
        name: "chromium",
        use: { ...devices["Desktop Chrome"] },
        dependencies: ["setup"],
      },
      {
        name: "data-restore",
        testMatch: /teardown\/data-restore\.teardown\.ts/,
        dependencies: ["chromium"],
      },
    ],
    webServer: [
      {
        command: "bash scripts/start-e2e-server.sh",
        url: "http://localhost:5331/healthcheck",
        reuseExistingServer: !process.env.CI,
        timeout: 180 * 1000,
        stdout: "pipe",
        stderr: "pipe",
      },
      {
        command: "cd packages/ui && yarn start-development",
        url: "http://localhost:3001",
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
        stdout: "ignore",
        stderr: "pipe",
      },
    ],
  });
