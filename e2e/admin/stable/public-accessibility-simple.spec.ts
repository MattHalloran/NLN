import { APP_LINKS } from "@local/shared";
import { test, expect } from "../../fixtures/guarded";
import { expectNoSeriousAccessibilityViolations } from "../../fixtures/accessibility";

const CONTACT_PATH = "/contact";

const routes = [
    { path: APP_LINKS.Home, heading: /new life nursery|wholesale nursery/i },
    { path: APP_LINKS.About, heading: /our heritage/i },
    { path: APP_LINKS.Gallery, heading: /our collection/i },
    { path: CONTACT_PATH, heading: /contact us/i },
    { path: APP_LINKS.Register, heading: /sign up/i },
    { path: APP_LINKS.LogIn, heading: /log in/i },
] as const;

test.describe("Public Site - Accessibility Smoke", () => {
    for (const route of routes) {
        test(`has no serious accessibility violations on ${route.path}`, async ({ page }) => {
            await page.goto(route.path);
            await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();

            await expectNoSeriousAccessibilityViolations(page);
        });
    }
});
