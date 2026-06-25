import { APP_LINKS } from "@local/shared";
import type { Page, PageAssertionsToHaveScreenshotOptions } from "@playwright/test";
import { test, expect } from "../../fixtures/guarded";

const expectNoHorizontalOverflow = async (page: Page) => {
    const overflow = await page.evaluate(() => {
        const documentElement = document.documentElement;
        return documentElement.scrollWidth - documentElement.clientWidth;
    });

    expect(overflow).toBeLessThanOrEqual(1);
};

const hideHomepageHeroMedia = async (page: Page) => {
    await page.addStyleTag({
        content: `
            main picture img[alt="Fall 2025 Highlights"],
            main picture img[alt="Plant selection at New Life Nursery"],
            main picture img[alt="Butterfly at New Life Nursery"] {
                visibility: hidden !important;
            }
        `,
    });
};

const expectStableScreenshot = async (
    page: Page,
    name: string,
    options: PageAssertionsToHaveScreenshotOptions,
) => {
    await expect(page).toHaveScreenshot(name, options);
};

test.describe("Public Site - Visual Smoke", () => {
    test("keeps the public homepage first viewport stable", async ({ page }) => {
        await page.goto(APP_LINKS.Home);
        await expect(
            page.getByRole("heading", { name: /new life nursery|wholesale nursery/i }).first(),
        ).toBeVisible();
        await expectNoHorizontalOverflow(page);
        await hideHomepageHeroMedia(page);

        await expectStableScreenshot(page, "public-home-desktop.png", {
            animations: "disabled",
            fullPage: false,
            maxDiffPixelRatio: 0.02,
        });
    });

    test("keeps gallery browsing first viewport stable", async ({ page }) => {
        await page.goto(APP_LINKS.Gallery);
        await expect(page.getByRole("heading", { name: /our collection/i }).first()).toBeVisible();
        await expect(page.getByText(/showing \d+ of \d+ items/i)).toBeVisible();
        await expectNoHorizontalOverflow(page);

        await expectStableScreenshot(page, "public-gallery-desktop.png", {
            animations: "disabled",
            fullPage: false,
            maxDiffPixelRatio: 0.02,
        });
    });

    test("keeps informational public pages visually stable", async ({ page }) => {
        await page.goto(APP_LINKS.About);
        await expect(page.getByRole("heading", { name: /our heritage/i }).first()).toBeVisible();
        await expectNoHorizontalOverflow(page);

        await expectStableScreenshot(page, "public-about-desktop.png", {
            animations: "disabled",
            fullPage: false,
            maxDiffPixelRatio: 0.02,
        });

        await page.goto(APP_LINKS.Contact);
        await expect(page.getByRole("heading", { name: /contact us/i }).first()).toBeVisible();
        await expectNoHorizontalOverflow(page);

        await expectStableScreenshot(page, "public-contact-desktop.png", {
            animations: "disabled",
            fullPage: false,
            maxDiffPixelRatio: 0.02,
        });
    });

    test("keeps account entry pages visually stable", async ({ page }) => {
        await page.goto(APP_LINKS.LogIn);
        await expect(page.getByRole("heading", { name: /log in/i }).last()).toBeVisible();
        await expectNoHorizontalOverflow(page);

        await expectStableScreenshot(page, "public-login-desktop.png", {
            animations: "disabled",
            fullPage: false,
            maxDiffPixelRatio: 0.02,
        });

        await page.goto(APP_LINKS.Register);
        await expect(page.getByRole("heading", { name: /sign up/i }).last()).toBeVisible();
        await expectNoHorizontalOverflow(page);

        await expectStableScreenshot(page, "public-register-desktop.png", {
            animations: "disabled",
            fullPage: false,
            maxDiffPixelRatio: 0.02,
        });
    });

    test("keeps mobile public entry pages within the viewport", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });

        await page.goto(APP_LINKS.Home);
        await expect(
            page.getByRole("heading", { name: /new life nursery|wholesale nursery/i }).first(),
        ).toBeVisible();
        await expectNoHorizontalOverflow(page);
        await hideHomepageHeroMedia(page);

        await expectStableScreenshot(page, "public-home-mobile.png", {
            animations: "disabled",
            fullPage: false,
            maxDiffPixelRatio: 0.02,
        });

        await page.goto(APP_LINKS.About);
        await expect(page.getByRole("heading", { name: /our heritage/i }).first()).toBeVisible();
        await expectNoHorizontalOverflow(page);
    });
});
