import { test, expect } from "../../fixtures/auth";
import { APP_LINKS, REST_ROUTES, stripApiPrefix } from "@local/shared";

test.describe("Newsletter Subscribers - Admin", () => {
    test("shows public signups in the admin subscriber table and exports CSV", async ({
        authenticatedPage,
        browser,
    }) => {
        const email = `e2e-admin-subscriber-${Date.now()}@example.test`;

        const publicContext = await browser.newContext();
        const publicPage = await publicContext.newPage();

        await publicPage.goto(APP_LINKS.Home);
        const emailInput = publicPage.getByPlaceholder(/enter your email address/i);
        await emailInput.scrollIntoViewIfNeeded();
        await expect(emailInput).toBeVisible();

        const subscribeResponsePromise = publicPage.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.newsletter.subscribe)) &&
                response.request().method() === "POST",
        );
        await emailInput.fill(email);
        await publicPage
            .getByRole("button", { name: /subscribe|sign up|get updates/i })
            .last()
            .click();
        const subscribeResponse = await subscribeResponsePromise;
        expect(subscribeResponse.status()).toBe(200);
        await publicContext.close();

        await authenticatedPage.goto(APP_LINKS.AdminNewsletterSubscribers);
        await expect(
            authenticatedPage.locator("#page").getByRole("heading", {
                name: /newsletter subscribers/i,
            }),
        ).toBeVisible();
        await expect(authenticatedPage.getByText(/total subscribers/i)).toBeVisible();

        const listResponsePromise = authenticatedPage.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.newsletter.subscribers)) &&
                response.request().method() === "GET" &&
                response.status() === 200,
        );
        await authenticatedPage.getByPlaceholder(/search by email/i).fill(email);
        await authenticatedPage.getByRole("button", { name: /^search$/i }).click();
        await listResponsePromise;

        await expect(authenticatedPage.getByRole("cell", { name: email })).toBeVisible();
        await expect(authenticatedPage.getByRole("cell", { name: "active" }).first()).toBeVisible();

        const exportResponsePromise = authenticatedPage.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.newsletter.subscribersExport)) &&
                response.request().method() === "GET" &&
                response.status() === 200,
        );
        await authenticatedPage.getByRole("button", { name: /export csv/i }).click();
        const exportResponse = await exportResponsePromise;

        expect(exportResponse.headers()["content-type"]).toContain("text/csv");
        await expect(exportResponse.text()).resolves.toContain(email);
    });
});
