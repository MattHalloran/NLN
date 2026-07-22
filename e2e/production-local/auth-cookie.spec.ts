import { APP_LINKS, isAdminSession, REST_ROUTES, stripApiPrefix } from "@local/shared";
import { test, expect } from "../fixtures/guarded";

test.describe("Production Local Auth Runtime", () => {
    test("logs in as admin and keeps a usable same-origin auth session", async ({ page }) => {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            throw new Error(
                "ADMIN_EMAIL and ADMIN_PASSWORD must be set for production-local auth validation",
            );
        }

        await page.goto(APP_LINKS.LogIn);
        await expect(page.getByRole("button", { name: /log in|sign in/i })).toBeVisible();

        await page.fill('input[name="email"]', adminEmail);
        await page.fill('input[name="password"]', adminPassword);

        const loginResponsePromise = page.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.auth.login)) &&
                response.request().method() === "POST",
        );

        await page.click('button[type="submit"]');

        const loginResponse = await loginResponsePromise;
        expect(loginResponse.status()).toBe(200);

        await expect(page).toHaveURL(new RegExp(`${APP_LINKS.Home}$`));
        await expect(page.getByTestId("homepage-hero")).toBeVisible();

        const sessionResponse = await page.request.get(REST_ROUTES.auth.session);
        expect(sessionResponse.status()).toBe(200);

        const session = await sessionResponse.json();
        expect(session).toMatchObject({
            authenticated: true,
        });
        expect(isAdminSession(session.user)).toBe(true);

        await page.goto(APP_LINKS.Admin);
        await expect(page).not.toHaveURL(new RegExp(`${APP_LINKS.LogIn}$`));
    });
});
