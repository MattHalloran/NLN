import { APP_LINKS, REST_ROUTES, stripApiPrefix } from "@local/shared";
import { test, expect } from "../../fixtures/auth";

test.describe("About Content - Admin", () => {
    test("persists story title updates and renders them on the public About page", async ({
        authenticatedPage,
        browser,
    }) => {
        const variantId = "variant-homepage-official";
        const title = `E2E About Story ${Date.now()}`;

        await authenticatedPage.goto(`${APP_LINKS.AdminHomepageAbout}?variantId=${variantId}`);
        await expect(
            authenticatedPage.getByRole("heading", { name: /about story settings/i }),
        ).toBeVisible();

        await authenticatedPage
            .getByLabel(/^title$/i)
            .first()
            .fill(title);
        await expect(authenticatedPage.getByText(/unsaved changes/i)).toBeVisible();

        const saveResponsePromise = authenticatedPage.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.landingPage.root)) &&
                response.request().method() === "PUT" &&
                response.status() === 200,
        );
        await authenticatedPage
            .getByRole("button", { name: /save all changes/i })
            .first()
            .click();
        const saveResponse = await saveResponsePromise;
        const responseBody = await saveResponse.json();
        expect(responseBody.data.content.about.story.title).toBe(title);

        const publicContext = await browser.newContext();
        await publicContext.addInitScript((id) => {
            localStorage.setItem("variantAssignment", id);
            localStorage.setItem("variantAssignmentTimestamp", Date.now().toString());
        }, variantId);
        const publicPage = await publicContext.newPage();
        await publicPage.goto(APP_LINKS.About);
        await expect(publicPage.getByRole("heading", { name: title })).toBeVisible();
        await publicContext.close();
    });
});
