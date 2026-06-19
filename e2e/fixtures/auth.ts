import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { APP_LINKS, E2E_TIMEOUTS, REST_ROUTES, stripApiPrefix } from "@local/shared";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Authentication Fixture
 *
 * This fixture handles admin authentication for E2E tests.
 * It stores authentication state in a file to reuse across tests,
 * avoiding the need to login for every test.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, "../.auth/admin.json");

/**
 * Setup authentication once before all tests
 * This reduces test execution time significantly
 */
export async function setupAuth(page: Page) {
    // Track responses
    const responses: Array<{ url: string; status: number }> = [];

    page.on("response", (response) => {
        const url = response.url();
        responses.push({ url, status: response.status() });
        if (url.includes("auth") || url.includes("login")) {
            console.log(`→ Response: ${url} [${response.status()}]`);
        }
    });

    // Log console messages and errors
    page.on("console", (msg) => console.log(`Browser console: ${msg.type()}: ${msg.text()}`));
    page.on("pageerror", (error) => console.error(`Browser error: ${error.message}`));

    // Navigate to login page
    await page.goto(APP_LINKS.LogIn);

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    console.log("✓ Login page loaded");

    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables");
    }

    // Fill in admin credentials
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);

    console.log("✓ Credentials filled");

    // Click login button
    console.log("Clicking submit button...");
    const loginResponsePromise = page.waitForResponse(
        (response) => response.url().includes(stripApiPrefix(REST_ROUTES.auth.login)),
        { timeout: E2E_TIMEOUTS.longMs },
    );
    await page.click('button[type="submit"]');
    console.log("✓ Submit button clicked");

    let loginResponse;
    try {
        loginResponse = await loginResponsePromise;
        console.log(`✓ Captured login response: ${loginResponse.status()}`);
    } catch (error) {
        console.error("Recent responses:", responses.slice(-10));
        throw new Error(
            `Login response not captured after ${E2E_TIMEOUTS.longMs / 1000} seconds: ${String(error)}`,
        );
    }

    // Check response status
    const status = loginResponse.status();
    console.log(`Login API status: ${status}`);

    if (status !== 200) {
        const responseBody = await loginResponse.text();
        await page.screenshot({ path: "test-results/login-error.png" });
        throw new Error(`Login API returned ${status}: ${responseBody}`);
    }

    // Wait for navigation away from login page
    await page.waitForURL((url) => !url.pathname.includes(APP_LINKS.LogIn), {
        timeout: E2E_TIMEOUTS.longMs,
    });

    // Verify we're logged in
    const currentUrl = page.url();
    if (currentUrl.includes(APP_LINKS.LogIn)) {
        await page.screenshot({ path: "test-results/still-on-login.png" });
        throw new Error(`Still on login page after authentication. Current URL: ${currentUrl}`);
    }

    // Save storage state to file
    await page.context().storageState({ path: authFile });

    console.log("✓ Authentication successful, state saved");
}

/**
 * Extended test fixture with authenticated page
 */
export const test = base.extend<{ authenticatedPage: Page }>({
    authenticatedPage: async ({ browser }, use) => {
        // Create a new context with saved auth state
        const context = await browser.newContext({
            storageState: authFile,
        });

        const page = await context.newPage();

        await use(page);

        await context.close();
    },
});

export { expect };
