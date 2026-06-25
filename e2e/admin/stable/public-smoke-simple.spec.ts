import { APP_LINKS, REST_ROUTES, stripApiPrefix } from "@local/shared";
import { test, expect } from "../../fixtures/guarded";

const CONTACT_PATH = "/contact";

const expectUsablePage = async (page: import("@playwright/test").Page, heading: RegExp) => {
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    await expect(page.locator("body")).not.toBeEmpty();
};

const waitForHomepageViewTracking = (page: import("@playwright/test").Page) =>
    page.waitForResponse(
        (response) =>
            response.url().includes("/rest/v1/landing-page/variants/") &&
            response.url().endsWith("/track") &&
            response.request().method() === "POST",
    );

const gotoHomeAndExpectUsable = async (page: import("@playwright/test").Page) => {
    const viewTrackingResponsePromise = waitForHomepageViewTracking(page);

    await page.goto(APP_LINKS.Home);
    await expectUsablePage(page, /new life nursery|wholesale nursery/i);

    const viewTrackingResponse = await viewTrackingResponsePromise;
    expect(viewTrackingResponse.status()).toBe(200);
};

test.describe("Public Site - Smoke", () => {
    test("loads the core public pages and navigates between them", async ({ page }) => {
        await gotoHomeAndExpectUsable(page);
        await expect(page.getByRole("button", { name: /browse plants/i })).toBeVisible();

        await page.goto(APP_LINKS.About);
        await expectUsablePage(page, /our heritage/i);
        await expect(page.getByRole("heading", { name: /years of experience/i })).toBeVisible();

        await page.goto(APP_LINKS.Gallery);
        await expectUsablePage(page, /our collection/i);
        await expect(page.getByRole("tab", { name: "All", exact: true })).toBeVisible();
        await expect(page.getByText(/showing \d+ of \d+ items/i)).toBeVisible();

        await page.goto(CONTACT_PATH);
        await expectUsablePage(page, /contact us/i);
        const contactContent = page.locator("#page").last();
        await expect(contactContent.getByRole("heading", { name: /hours/i })).toBeVisible();
        await expect(contactContent.getByText(/call us/i)).toBeVisible();
        await expect(contactContent.getByText(/email us/i)).toBeVisible();
    });

    test("renders mobile public pages without layout-blocking runtime failures", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 390, height: 844 });

        await gotoHomeAndExpectUsable(page);

        await page.goto(APP_LINKS.About);
        await expectUsablePage(page, /our heritage/i);

        await page.goto(CONTACT_PATH);
        await expectUsablePage(page, /contact us/i);
    });

    test("loads account entry forms with accessible controls", async ({ page }) => {
        await page.goto(APP_LINKS.Register);
        await expectUsablePage(page, /sign up/i);
        await expect(page.getByLabel(/first name/i)).toBeVisible();
        await expect(page.getByLabel(/email address/i)).toBeVisible();
        await expect(page.getByLabel(/^password$/i)).toBeVisible();
        await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();

        await page.goto(APP_LINKS.LogIn);
        await expectUsablePage(page, /log in/i);
        await expect(page.getByLabel(/email address/i)).toBeVisible();
        await expect(page.getByLabel(/^password$/i)).toBeVisible();
        await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    });

    test("submits the public newsletter signup from the homepage", async ({ page }) => {
        await gotoHomeAndExpectUsable(page);

        const emailInput = page.getByPlaceholder(/enter your email address/i);
        await emailInput.scrollIntoViewIfNeeded();
        await expect(emailInput).toBeVisible();

        const subscribeResponsePromise = page.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.newsletter.subscribe)) &&
                response.request().method() === "POST",
        );

        await emailInput.fill(`e2e-newsletter-${Date.now()}@example.test`);
        await page
            .getByRole("button", { name: /subscribe|sign up|get updates/i })
            .last()
            .click();

        const subscribeResponse = await subscribeResponsePromise;
        expect(subscribeResponse.status()).toBe(200);
        await expect(page.getByText(/thank you|already subscribed|welcome back/i)).toBeVisible();
    });
});
