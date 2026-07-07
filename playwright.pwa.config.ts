import { defineConfig, devices } from "@playwright/test";
import { DEFAULT_PORTS, E2E_TIMEOUTS, E2E_URLS } from "@local/shared";

const pwaPort = Number(process.env.PORT_UI ?? DEFAULT_PORTS.ui);
const pwaBaseURL = pwaPort === DEFAULT_PORTS.ui ? E2E_URLS.ui : `http://localhost:${pwaPort}`;

export default defineConfig({
    testDir: "./e2e",
    testMatch: "pwa.spec.ts",
    timeout: E2E_TIMEOUTS.pwaTestMs,
    expect: {
        timeout: E2E_TIMEOUTS.longMs,
    },
    fullyParallel: false,
    reporter: [
        ["list"],
        ["html", { outputFolder: "playwright-report/pwa", open: "never" }],
        ["json", { outputFile: "test-results/pwa.json" }],
    ],
    outputDir: "test-results/pwa-artifacts",
    use: {
        baseURL: pwaBaseURL,
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
        command: `VITE_ENABLE_LOCAL_PWA=true yarn workspace ui build && cd packages/ui && PORT_UI=${pwaPort} node scripts/serve-production.js`,
        url: pwaBaseURL,
        reuseExistingServer: false,
        timeout: E2E_TIMEOUTS.serverStartMs,
        stdout: "pipe",
        stderr: "pipe",
    },
});
