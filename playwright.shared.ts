import { defineConfig, devices } from "@playwright/test";
import type { PlaywrightTestConfig } from "@playwright/test";
import { DEFAULT_PORTS, E2E_TIMEOUTS } from "@local/shared";
import * as dotenv from "dotenv";

if (process.env.E2E_IGNORE_DOTENV !== "true") dotenv.config();
process.env.E2E_MANAGE_SERVICES ??= "true";
const uiPort = Number(process.env.PORT_UI ?? DEFAULT_PORTS.ui),
    serverPort = Number(process.env.PORT_SERVER ?? DEFAULT_PORTS.server),
    uiUrl = `http://localhost:${uiPort}`,
    serverHealthcheck = `http://localhost:${serverPort}/healthcheck`;

if (
    !Number.isSafeInteger(uiPort) ||
    uiPort < 1024 ||
    uiPort > 65535 ||
    !Number.isSafeInteger(serverPort) ||
    serverPort < 1024 ||
    serverPort > 65535
)
    throw new Error("E2E UI and server ports must be valid unprivileged ports");

type E2EConfigOptions = {
    testMatch: PlaywrightTestConfig["testMatch"];
    reportName: string;
    testIgnore?: PlaywrightTestConfig["testIgnore"];
    uiServerCommand?: string;
    uiServerTimeout?: number;
};

export const createE2EConfig = ({
    testMatch,
    reportName,
    testIgnore = [],
    uiServerCommand = "cd packages/ui && yarn start-development",
    uiServerTimeout = E2E_TIMEOUTS.uiStartMs,
}: E2EConfigOptions) =>
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
            ...(Array.isArray(testIgnore) ? testIgnore : [testIgnore]),
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
            baseURL: uiUrl,
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
                url: serverHealthcheck,
                reuseExistingServer: !process.env.CI,
                timeout: E2E_TIMEOUTS.serverStartMs,
                stdout: "pipe",
                stderr: "pipe",
            },
            {
                command: uiServerCommand,
                url: uiUrl,
                reuseExistingServer: !process.env.CI,
                timeout: uiServerTimeout,
                stdout: "ignore",
                stderr: "pipe",
            },
        ],
    });
