import { APP_LINKS, IMAGE_LABELS, REST_ROUTES, stripApiPrefix } from "@local/shared";
import { test, expect } from "../../fixtures/guarded";

test.describe("Public Gallery", () => {
    test("loads gallery data from the API and renders the gallery count", async ({ page }) => {
        const galleryResponsePromise = page.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.images.root)) &&
                response.url().includes(`label=${IMAGE_LABELS.Gallery}`) &&
                response.request().method() === "GET" &&
                response.status() === 200,
        );

        await page.goto(APP_LINKS.Gallery);
        await expect(page.getByRole("heading", { name: /our collection/i })).toBeVisible();

        const galleryResponse = await galleryResponsePromise;
        const images = (await galleryResponse.json()) as Array<{ alt?: string | null }>;
        await expect(
            page.getByText(new RegExp(`showing ${images.length} of ${images.length}`, "i")),
        ).toBeVisible();
    });

    test("keeps gallery navigation usable on mobile", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(APP_LINKS.Gallery);

        await expect(page.getByRole("heading", { name: /our collection/i })).toBeVisible();
        await expect(page.getByRole("tab", { name: "All", exact: true })).toBeVisible();
        await expect(
            page.locator("#content-wrap button").filter({ hasText: "Gallery" }),
        ).toBeVisible();
        await expect(page.getByText(/showing \d+ of \d+ items/i)).toBeVisible();
    });
});
