import { defineConfig, devices } from "@playwright/test";
import { E2E_TIMEOUTS, E2E_URLS } from "@local/shared";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env-prod" });
dotenv.config();

export default defineConfig({
    testDir: "./e2e",
    testMatch: [
        "admin/stable/public-smoke-simple.spec.ts",
        "production-local/auth-cookie.spec.ts",
    ],
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
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: [
        ["html", { outputFolder: "playwright-report/production-local", open: "never" }],
        ["list"],
        ["json", { outputFile: "test-results/production-local.json" }],
    ],
    outputDir: "test-results/production-local-artifacts",
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
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
