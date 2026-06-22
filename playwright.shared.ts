import { defineConfig, devices } from "@playwright/test";
import type { PlaywrightTestConfig } from "@playwright/test";
import { E2E_TIMEOUTS, E2E_URLS } from "@local/shared";
import * as dotenv from "dotenv";

dotenv.config();
process.env.E2E_MANAGE_SERVICES ??= "true";

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
        timeout: E2E_TIMEOUTS.testMs,
        expect: {
            timeout: E2E_TIMEOUTS.mediumMs,
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
        outputDir: `test-results/${reportName}-artifacts`,
        globalTeardown: "./e2e/teardown/e2e-services.teardown.ts",
        use: {
            baseURL: E2E_URLS.ui,
            trace: "on-first-retry",
            screenshot: "only-on-failure",
            video: "retain-on-failure",
            actionTimeout: E2E_TIMEOUTS.longMs,
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
                command: "E2E_MANAGE_SERVICES=true bash scripts/start-e2e-server.sh",
                url: E2E_URLS.serverHealthcheck,
                reuseExistingServer: !process.env.CI,
                timeout: E2E_TIMEOUTS.serverStartMs,
                stdout: "pipe",
                stderr: "pipe",
            },
            {
                command: "cd packages/ui && yarn start-development",
                url: E2E_URLS.ui,
                reuseExistingServer: !process.env.CI,
                timeout: E2E_TIMEOUTS.uiStartMs,
                stdout: "ignore",
                stderr: "pipe",
            },
        ],
    });
