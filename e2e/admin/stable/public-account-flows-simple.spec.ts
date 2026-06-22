import { test, expect } from "../../fixtures/guarded";
import { APP_LINKS, REST_ROUTES, stripApiPrefix } from "@local/shared";

test.describe("Public Account Flows", () => {
    test("keeps signed-out visitors out of protected admin pages", async ({ page }) => {
        await page.goto(APP_LINKS.AdminContactInfo);

        await expect(page).toHaveURL(new RegExp(`${APP_LINKS.Home}$`));
        await expect(
            page.getByRole("heading", { name: /new life nursery|wholesale nursery/i }).first(),
        ).toBeVisible();
        await expect(page.getByRole("heading", { name: /contact information/i })).not.toBeVisible();
    });

    test("shows client-side signup validation without submitting invalid data", async ({
        page,
    }) => {
        await page.goto(APP_LINKS.Register);
        await expect(page.getByRole("heading", { name: /sign up/i }).last()).toBeVisible();

        let signupRequests = 0;
        page.on("request", (request) => {
            if (
                request.url().includes(stripApiPrefix(REST_ROUTES.auth.signup)) &&
                request.method() === "POST"
            ) {
                signupRequests += 1;
            }
        });

        await page.getByLabel(/first name/i).fill("E2E");
        await page.getByLabel(/last name/i).fill("Validation");
        await page.getByLabel(/business\/organization/i).fill("E2E Nursery");
        await page.getByLabel(/email address/i).fill("not-an-email");
        await page.getByLabel(/phone number/i).fill("555-555-0100");
        await page.getByLabel(/^password$/i).fill("ValidPass123!");
        await page.getByLabel(/confirm password/i).fill("DifferentPass123!");
        await page.getByRole("button", { name: /create account/i }).click();

        await expect(page.getByText(/email.*valid email/i)).toBeVisible();
        expect(signupRequests).toBe(0);
    });

    test("shows login failure response for invalid credentials", async ({ page }) => {
        await page.goto(APP_LINKS.LogIn);
        await expect(page.getByRole("heading", { name: /log in/i }).last()).toBeVisible();

        const loginResponsePromise = page.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.auth.login)) &&
                response.request().method() === "POST",
        );

        await page.getByLabel(/email address/i).fill(`not-a-user-${Date.now()}@example.test`);
        await page.getByLabel(/^password$/i).fill("wrong-password");
        await page.getByRole("button", { name: /sign in/i }).click();

        const loginResponse = await loginResponsePromise;
        expect(loginResponse.status()).toBe(401);
        await expect(page).toHaveURL(new RegExp(`${APP_LINKS.LogIn}$`));
    });

    test("creates a new account from the public signup form", async ({ page }) => {
        await page.goto(APP_LINKS.Register);
        await expect(page.getByRole("heading", { name: /sign up/i }).last()).toBeVisible();

        const email = `e2e-signup-${Date.now()}@example.test`;
        const signupResponsePromise = page.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.auth.signup)) &&
                response.request().method() === "POST",
        );

        await page.getByLabel(/first name/i).fill("E2E");
        await page.getByLabel(/last name/i).fill("Signup");
        await page.getByLabel(/business\/organization/i).fill("E2E Nursery");
        await page.getByLabel(/email address/i).fill(email);
        await page.getByLabel(/phone number/i).fill("555-555-0100");
        await page.getByLabel(/^password$/i).fill("ValidPass123!");
        await page.getByLabel(/confirm password/i).fill("ValidPass123!");
        await page.getByRole("button", { name: /create account/i }).click();

        const signupResponse = await signupResponsePromise;
        expect(signupResponse.status()).toBe(200);
        await expect(page.getByRole("dialog").getByText(/welcome/i)).toBeVisible();
    });

    test("requests a password reset for an existing account and returns the visitor home", async ({
        page,
    }) => {
        const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.test";

        await page.goto(APP_LINKS.ForgotPassword);
        await expect(page.getByRole("heading", { name: /forgot password/i }).last()).toBeVisible();

        const resetResponsePromise = page.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.auth.requestPasswordChange)) &&
                response.request().method() === "POST",
        );

        await page.getByLabel(/email address/i).fill(adminEmail);
        await page.getByRole("button", { name: /send reset link/i }).click();

        const resetResponse = await resetResponsePromise;
        expect(resetResponse.status()).toBe(200);
        await expect(page).toHaveURL(new RegExp(`${APP_LINKS.Home}$`));
    });
});
