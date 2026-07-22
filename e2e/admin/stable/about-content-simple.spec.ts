import { APP_LINKS, REST_ROUTES, stripApiPrefix } from "@local/shared";
import { test, expect } from "../../fixtures/auth";
import type { Page } from "@playwright/test";
import { allowRuntimeIssue } from "../../fixtures/runtime-guard";

const injectLandingPageSaveFailure = async (page: Page) => {
    await page.route(`**${REST_ROUTES.landingPage.root}**`, async (route) => {
        if (route.request().method() !== "PUT") {
            await route.continue();
            return;
        }

        await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "Injected E2E landing page save failure" }),
        });
    });
};

test.describe("About Content - Admin", () => {
    const openAboutContent = async (page: Page, variantId: string) => {
        const contentResponsePromise = page.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.landingPage.root)) &&
                response.request().method() === "GET" &&
                response.status() === 200,
        );

        await page.goto(`${APP_LINKS.AdminHomepageAbout}?variantId=${variantId}`);
        await contentResponsePromise;
        await expect(page.getByRole("heading", { name: /about story settings/i })).toBeVisible();
    };

    test("persists story title updates and renders them on the public About page", async ({
        authenticatedPage,
        browser,
    }) => {
        const variantId = "variant-homepage-official";
        const title = `E2E About Story ${Date.now()}`;

        await openAboutContent(authenticatedPage, variantId);

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

    test("keeps story edits visible when the save request fails", async ({ authenticatedPage }) => {
        const variantId = "variant-homepage-official";
        const title = `E2E Failed About Story ${Date.now()}`;

        await openAboutContent(authenticatedPage, variantId);

        const titleInput = authenticatedPage.getByLabel(/^title$/i).first();
        await expect(titleInput).not.toHaveValue("");
        await titleInput.fill(title);
        await expect(titleInput).toHaveValue(title);
        const saveButton = authenticatedPage
            .getByRole("button", { name: /save all changes/i })
            .first();
        await expect(saveButton).toBeVisible();
        allowRuntimeIssue(
            authenticatedPage,
            (issue) =>
                (issue.kind === "response" &&
                    issue.message.includes(stripApiPrefix(REST_ROUTES.landingPage.root)) &&
                    issue.message.startsWith("500 ")) ||
                (issue.kind === "console" && /status of 500/i.test(issue.message)),
        );
        await injectLandingPageSaveFailure(authenticatedPage);

        const saveResponsePromise = authenticatedPage.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.landingPage.root)) &&
                response.request().method() === "PUT" &&
                response.status() === 500,
        );
        await saveButton.click();
        await saveResponsePromise;

        await expect(titleInput).toHaveValue(title);
        await expect(authenticatedPage.getByText(/unsaved changes/i)).toBeVisible();
        await expect(saveButton).toBeEnabled();
    });
});
