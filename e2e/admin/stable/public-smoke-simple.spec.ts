import { APP_LINKS } from "@local/shared";
import { test, expect } from "../../fixtures/guarded";

const expectUsablePage = async (page: import("@playwright/test").Page, heading: RegExp) => {
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    await expect(page.locator("body")).not.toBeEmpty();
};

test.describe("Public Site - Smoke", () => {
    test("loads the core public pages and navigates between them", async ({ page }) => {
        await page.goto(APP_LINKS.Home);
        await expectUsablePage(page, /new life nursery|wholesale nursery/i);
        await expect(page.getByRole("button", { name: /browse plants/i })).toBeVisible();

        await page.goto(APP_LINKS.About);
        await expectUsablePage(page, /our heritage/i);
        await expect(page.getByText(/years of experience/i)).toBeVisible();

        await page.goto(APP_LINKS.Gallery);
        await expectUsablePage(page, /our collection/i);
        await expect(page.getByRole("tab", { name: "All", exact: true })).toBeVisible();
        await expect(page.getByText(/showing \d+ of \d+ items/i)).toBeVisible();
    });

    test("renders mobile public pages without layout-blocking runtime failures", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });

        await page.goto(APP_LINKS.Home);
        await expectUsablePage(page, /new life nursery|wholesale nursery/i);

        await page.goto(APP_LINKS.About);
        await expectUsablePage(page, /our heritage/i);
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
});
