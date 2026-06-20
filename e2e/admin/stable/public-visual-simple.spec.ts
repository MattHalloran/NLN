import { APP_LINKS } from "@local/shared";
import { test, expect } from "../../fixtures/guarded";

const expectNoHorizontalOverflow = async (page: import("@playwright/test").Page) => {
    const overflow = await page.evaluate(() => {
        const documentElement = document.documentElement;
        return documentElement.scrollWidth - documentElement.clientWidth;
    });

    expect(overflow).toBeLessThanOrEqual(1);
};

test.describe("Public Site - Visual Smoke", () => {
    test("keeps the public homepage first viewport stable", async ({ page }) => {
        await page.goto(APP_LINKS.Home);
        await expect(page.getByRole("heading", { name: /new life nursery|wholesale nursery/i }).first()).toBeVisible();
        await expectNoHorizontalOverflow(page);

        await expect(page).toHaveScreenshot("public-home-desktop.png", {
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

        await expect(page).toHaveScreenshot("public-gallery-desktop.png", {
            animations: "disabled",
            fullPage: false,
            maxDiffPixelRatio: 0.02,
        });
    });

    test("keeps mobile public entry pages within the viewport", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });

        await page.goto(APP_LINKS.Home);
        await expect(page.getByRole("heading", { name: /new life nursery|wholesale nursery/i }).first()).toBeVisible();
        await expectNoHorizontalOverflow(page);

        await expect(page).toHaveScreenshot("public-home-mobile.png", {
            animations: "disabled",
            fullPage: false,
            maxDiffPixelRatio: 0.02,
        });

        await page.goto(APP_LINKS.About);
        await expect(page.getByRole("heading", { name: /our heritage/i }).first()).toBeVisible();
        await expectNoHorizontalOverflow(page);
    });
});
