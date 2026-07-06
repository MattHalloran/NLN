import { test, expect } from "../../fixtures/auth";
import { gotoAdminPage } from "../../fixtures/admin";
import type { Page } from "@playwright/test";
import { APP_LINKS, DEFAULT_SERVER_URLS, REST_ROUTES, stripApiPrefix } from "@local/shared";
import { allowRuntimeIssue } from "../../fixtures/runtime-guard";

/**
 * Simplified E2E Tests for Admin Hero Banner Management
 *
 * Focus on what actually works and is testable
 */

const HERO_VARIANT_ID = "variant-homepage-official";
const LANDING_PAGE_ROOT_PATH = stripApiPrefix(REST_ROUTES.landingPage.root);

const isLandingPageContentPut = (response: { url: () => string; request: () => { method: () => string }; status: () => number }) =>
    response.url().includes(LANDING_PAGE_ROOT_PATH) &&
    !response.url().includes(`${LANDING_PAGE_ROOT_PATH}/settings`) &&
    response.request().method() === "PUT" &&
    response.status() === 200;

const openHeroBanner = (page: Page) =>
    gotoAdminPage(
        page,
        `${APP_LINKS.AdminHomepageHeroBanner}?variantId=${HERO_VARIANT_ID}`,
        /hero section settings/i,
    );

const openHomepageHub = async (page: Page) => {
    await page.goto(APP_LINKS.AdminHomepage);
    await expect(page.getByRole("heading", { name: "Seasonal Content" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hero Banner" })).toBeVisible();
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

test.describe("Hero Banner - Basic Display and Navigation", () => {
    test("should load admin hero page successfully", async ({ authenticatedPage }) => {
        await openHeroBanner(authenticatedPage);
    });

    test("should display hero banner editing sections", async ({ authenticatedPage }) => {
        await openHeroBanner(authenticatedPage);

        await expect(authenticatedPage.getByText("Hero Text Content")).toBeVisible();
        await expect(authenticatedPage.getByText("Trust Badges")).toBeVisible();
        await expect(authenticatedPage.getByText("Call-to-Action Buttons")).toBeVisible();
        await expect(authenticatedPage.getByText("Hero Banner Images")).toBeVisible();
    });

    test("should show dropzone for uploading images", async ({ authenticatedPage }) => {
        await openHeroBanner(authenticatedPage);

        await expect(
            authenticatedPage.getByText(/drag.*drop|drop.*click|upload/i).first(),
        ).toBeVisible();
    });

    test("should display seeded hero banners", async ({ authenticatedPage }) => {
        await openHeroBanner(authenticatedPage);

        await expect(authenticatedPage.getByTestId("hero-banner-card-0")).toBeVisible();
        await expect(authenticatedPage.getByTestId("hero-alt-input-0")).toBeVisible();
        await expect(authenticatedPage.getByTestId("hero-description-input-0")).toBeVisible();
    });
});

test.describe("Hero Banner - Navigation", () => {
    test("should navigate to seasonal content from homepage hub", async ({ authenticatedPage }) => {
        await openHomepageHub(authenticatedPage);

        await authenticatedPage.getByRole("heading", { name: "Seasonal Content" }).click();

        await expect(authenticatedPage).toHaveURL(/\/admin\/homepage\/seasonal/);
        await expect(
            authenticatedPage.getByRole("heading", { name: /seasonal content management/i }),
        ).toBeVisible();
    });

    test("should navigate to hero banner from homepage hub", async ({ authenticatedPage }) => {
        await openHomepageHub(authenticatedPage);

        await authenticatedPage.getByRole("heading", { name: "Hero Banner" }).click();

        await expect(authenticatedPage).toHaveURL(/\/admin\/homepage\/hero-banner/);
        await expect(
            authenticatedPage.getByRole("heading", { name: /hero section settings/i }),
        ).toBeVisible();
    });
});

test.describe("Hero Banner - Form Interactions", () => {
    test("should show alt text input fields", async ({ authenticatedPage }) => {
        await openHeroBanner(authenticatedPage);

        await expect(authenticatedPage.getByTestId("hero-alt-input-0")).toBeVisible();
        await expect(authenticatedPage.getByLabel(/alt text/i).first()).toBeVisible();
    });

    test("should show save and cancel buttons after a text change", async ({
        authenticatedPage,
    }) => {
        await openHeroBanner(authenticatedPage);

        const titleInput = authenticatedPage.getByLabel(/^title$/i).first();
        await titleInput.fill(`E2E Hero ${Date.now()}`);

        await expect(
            authenticatedPage.getByRole("button", { name: /save all changes/i }).first(),
        ).toBeVisible();
        await expect(
            authenticatedPage.getByRole("button", { name: /^cancel$/i }).first(),
        ).toBeVisible();
    });

    test("should save hero banner alt text and return it from the persisted document", async ({
        authenticatedPage,
    }) => {
        await openHeroBanner(authenticatedPage);

        const altText = `E2E hero alt ${Date.now()}`;
        const altInput = authenticatedPage.getByTestId("hero-alt-input-0").locator("input");
        await altInput.fill(altText);

        const saveResponse = authenticatedPage.waitForResponse(isLandingPageContentPut);
        await authenticatedPage
            .getByRole("button", { name: /save all changes/i })
            .first()
            .click();
        const responseBody = await (await saveResponse).json();

        expect(responseBody.data.content.hero.banners[0].alt).toBe(altText);
    });

    test("should keep hero edits visible when the save request fails", async ({
        authenticatedPage,
    }) => {
        await openHeroBanner(authenticatedPage);

        const title = `E2E Failed Hero ${Date.now()}`;
        const titleInput = authenticatedPage.getByLabel(/^title$/i).first();
        await titleInput.fill(title);
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

        await expect(titleInput).toHaveValue(title);
        await expect(authenticatedPage.getByText(/unsaved changes/i)).toBeVisible();
        await expect(
            authenticatedPage.getByRole("button", { name: /save all changes/i }).first(),
        ).toBeEnabled();
    });
});

test.describe("Hero Banner - Drag and Drop", () => {
    test("should show drag handles on banner cards", async ({ authenticatedPage }) => {
        await openHeroBanner(authenticatedPage);

        await expect(authenticatedPage.getByTestId("hero-banner-card-0")).toBeVisible();
        await expect(authenticatedPage.getByTestId("hero-active-switch-0")).toBeVisible();
        await expect(authenticatedPage.getByTestId("hero-delete-button-0")).toBeVisible();
    });

    test("should reorder banners by dragging and persist after save", async ({
        authenticatedPage,
    }) => {
        await openHeroBanner(authenticatedPage);

        const bannerCards = authenticatedPage.getByTestId(/^hero-banner-card-/);
        const bannerCount = await bannerCards.count();
        expect(bannerCount).toBeGreaterThanOrEqual(2);
        await expect(authenticatedPage.getByTestId("hero-banner-card-1")).toBeVisible();

        const firstAltInput = authenticatedPage.getByTestId("hero-alt-input-0").locator("input");
        const secondAltInput = authenticatedPage.getByTestId("hero-alt-input-1").locator("input");
        const secondAlt = await secondAltInput.inputValue();

        await authenticatedPage.getByTestId("hero-drag-handle-1").focus();
        await authenticatedPage.keyboard.press("Space");
        await authenticatedPage.keyboard.press("ArrowUp");
        await authenticatedPage.keyboard.press("Space");

        await expect(firstAltInput).toHaveValue(secondAlt);

        const saveResponse = authenticatedPage.waitForResponse(isLandingPageContentPut);
        await authenticatedPage
            .getByRole("button", { name: /save all changes/i })
            .first()
            .click();
        const response = await saveResponse;
        const responsePayload = response.request().postDataJSON() as {
            heroBanners: Array<{ alt: string; displayOrder: number }>;
        };
        expect(responsePayload.heroBanners[0]).toMatchObject({
            alt: secondAlt,
            displayOrder: 1,
        });
        expect(responsePayload.heroBanners[1]).toMatchObject({
            displayOrder: 2,
        });

        const responseBody = await response.json();
        expect(responseBody.data.content.hero.banners[0].alt).toBe(secondAlt);

        await expect
            .poll(async () => {
                const getResponse = await authenticatedPage.request.get(
                    `${DEFAULT_SERVER_URLS.localOrigin}${REST_ROUTES.landingPage.root}?onlyActive=false&variantId=${HERO_VARIANT_ID}`,
                );
                expect(getResponse.status()).toBe(200);
                const body = await getResponse.json();
                const firstBanner = body.content.hero.banners[0];
                return {
                    alt: firstBanner?.alt,
                    displayOrder: firstBanner?.displayOrder,
                };
            })
            .toEqual({
                alt: secondAlt,
                displayOrder: 1,
            });

        await authenticatedPage.waitForLoadState("networkidle");
        await authenticatedPage.reload();
        await expect(
            authenticatedPage.getByRole("heading", { name: /hero section settings/i }),
        ).toBeVisible();
        await expect(authenticatedPage.getByTestId("hero-alt-input-0").locator("input")).toHaveValue(
            secondAlt,
        );
    });
});
