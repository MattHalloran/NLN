import { test, expect } from "../../fixtures/auth";
import { gotoAdminPage } from "../../fixtures/admin";
import type { Page } from "@playwright/test";
import { APP_LINKS, REST_ROUTES, stripApiPrefix } from "@local/shared";
import { allowRuntimeIssue } from "../../fixtures/runtime-guard";

/**
 * Simplified E2E Tests for Admin Seasonal Content Management
 *
 * Focus on reliable, testable functionality
 */

const openSeasonalContent = (page: Page) =>
    gotoAdminPage(page, APP_LINKS.AdminHomepageSeasonal, /seasonal content management/i);

const openHomepageHub = async (page: Page) => {
    await page.goto(APP_LINKS.AdminHomepage);
    await expect(page.getByRole("heading", { name: "Hero Banner" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Seasonal Content" })).toBeVisible();
};

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

test.describe("Seasonal Content - Basic Display", () => {
    test("should load seasonal content page", async ({ authenticatedPage }) => {
        await openSeasonalContent(authenticatedPage);
    });

    test("should display plants and tips sections", async ({ authenticatedPage }) => {
        await openSeasonalContent(authenticatedPage);

        await expect(
            authenticatedPage.getByRole("button", { name: /seasonal plants \(\d+\)/i }),
        ).toBeVisible();
        await expect(
            authenticatedPage.getByRole("button", { name: /plant care tips \(\d+\)/i }),
        ).toBeVisible();
        await expect(authenticatedPage.getByText("Active Plants")).toBeVisible();
        await expect(authenticatedPage.getByText("Active Tips")).toBeVisible();
    });

    test("should show content cards", async ({ authenticatedPage }) => {
        await openSeasonalContent(authenticatedPage);

        await expect(
            authenticatedPage.getByRole("heading", { name: /black gum/i }).first(),
        ).toBeVisible();
        await expect(
            authenticatedPage.getByRole("heading", { name: /winter plant protection/i }).first(),
        ).toBeVisible();
    });
});

test.describe("Seasonal Content - Plants Tab", () => {
    test("should display plant editor controls", async ({ authenticatedPage }) => {
        await openSeasonalContent(authenticatedPage);

        await expect(
            authenticatedPage.getByRole("button", { name: /add new plant/i }),
        ).toBeVisible();
        await authenticatedPage
            .getByRole("heading", { name: /black gum/i })
            .first()
            .click();
        await expect(authenticatedPage.getByLabel(/^name$/i).first()).toBeVisible();
        await expect(authenticatedPage.getByLabel(/^description$/i).first()).toBeVisible();
    });

    test("should have add plant button", async ({ authenticatedPage }) => {
        await openSeasonalContent(authenticatedPage);

        await expect(
            authenticatedPage.getByRole("button", { name: /add new plant/i }),
        ).toBeVisible();
    });

    test("should display plant cards with details", async ({ authenticatedPage }) => {
        await openSeasonalContent(authenticatedPage);

        await expect(
            authenticatedPage.getByRole("heading", { name: /black gum/i }).first(),
        ).toBeVisible();
        await expect(
            authenticatedPage
                .locator("p")
                .filter({ hasText: /striking fall foliage/i })
                .first(),
        ).toBeVisible();
    });

    test("should add a plant and return it from the persisted document", async ({
        authenticatedPage,
    }) => {
        await openSeasonalContent(authenticatedPage);

        const plantName = `E2E Plant ${Date.now()}`;
        const plantDescription = "Persisted through the stable admin browser suite.";
        await authenticatedPage.getByRole("button", { name: /add new plant/i }).click();
        await authenticatedPage
            .getByLabel(/^name$/i)
            .last()
            .fill(plantName);
        await authenticatedPage
            .getByLabel(/^description$/i)
            .last()
            .fill(plantDescription);

        const saveResponse = authenticatedPage.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.landingPage.root)) &&
                response.request().method() === "PUT" &&
                response.status() === 200,
        );
        await authenticatedPage
            .getByRole("button", { name: /save all changes/i })
            .first()
            .click();
        const responseBody = await (await saveResponse).json();

        expect(responseBody.data.content.seasonal.plants).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: plantName,
                    description: plantDescription,
                }),
            ]),
        );
    });

    test("should keep plant edits visible when the save request fails", async ({
        authenticatedPage,
    }) => {
        await openSeasonalContent(authenticatedPage);

        const plantName = `E2E Failed Plant ${Date.now()}`;
        await authenticatedPage
            .getByRole("heading", { name: /black gum/i })
            .first()
            .click();
        const nameInput = authenticatedPage.getByLabel(/^name$/i).first();
        await nameInput.fill(plantName);
        allowRuntimeIssue(
            authenticatedPage,
            (issue) =>
                (issue.kind === "response" &&
                    issue.message.includes(stripApiPrefix(REST_ROUTES.landingPage.root)) &&
                    issue.message.startsWith("500 ")) ||
                (issue.kind === "console" && /status of 500/i.test(issue.message)),
        );
        await injectLandingPageSaveFailure(authenticatedPage);

        const saveResponse = authenticatedPage.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.landingPage.root)) &&
                response.request().method() === "PUT" &&
                response.status() === 500,
        );
        await authenticatedPage
            .getByRole("button", { name: /save all changes/i })
            .first()
            .click();
        await saveResponse;

        await expect(nameInput).toHaveValue(plantName);
        await expect(authenticatedPage.getByText(/unsaved changes/i)).toBeVisible();
        await expect(
            authenticatedPage.getByRole("button", { name: /save all changes/i }).first(),
        ).toBeEnabled();
    });
});

test.describe("Seasonal Content - Tips Tab", () => {
    test("should display tip editor controls", async ({ authenticatedPage }) => {
        await openSeasonalContent(authenticatedPage);

        await expect(authenticatedPage.getByRole("button", { name: /add new tip/i })).toBeVisible();
        await authenticatedPage
            .getByRole("heading", { name: /winter plant protection/i })
            .first()
            .click();
        await expect(authenticatedPage.getByLabel(/^title$/i).first()).toBeVisible();
        await expect(authenticatedPage.getByLabel(/^description$/i).first()).toBeVisible();
    });

    test("should display tip cards", async ({ authenticatedPage }) => {
        await openSeasonalContent(authenticatedPage);

        await expect(
            authenticatedPage.getByRole("heading", { name: /winter plant protection/i }).first(),
        ).toBeVisible();
        await expect(authenticatedPage.getByRole("button", { name: "General" })).toBeVisible();
        await expect(authenticatedPage.getByRole("button", { name: "Pest Control" })).toBeVisible();
    });
});

test.describe("Seasonal Content - Statistics", () => {
    test("should display statistics or counts", async ({ authenticatedPage }) => {
        await openSeasonalContent(authenticatedPage);

        await expect(authenticatedPage.getByText("Active Plants")).toBeVisible();
        await expect(authenticatedPage.getByText("Active Tips")).toBeVisible();
        await expect(authenticatedPage.getByText("Total Items")).toBeVisible();
    });
});

test.describe("Seasonal Content - Navigation", () => {
    test("should navigate between hero and seasonal pages through homepage hub", async ({
        authenticatedPage,
    }) => {
        await openHomepageHub(authenticatedPage);

        await authenticatedPage.getByRole("heading", { name: "Hero Banner" }).click();
        await expect(authenticatedPage).toHaveURL(/\/admin\/homepage\/hero-banner/);

        await openHomepageHub(authenticatedPage);
        await authenticatedPage.getByRole("heading", { name: "Seasonal Content" }).click();

        await expect(authenticatedPage).toHaveURL(/\/admin\/homepage\/seasonal/);
        await expect(
            authenticatedPage.getByRole("heading", { name: /seasonal content management/i }),
        ).toBeVisible();
    });
});
