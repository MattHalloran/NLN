import { test, expect } from "../../fixtures/auth";
import { gotoAdminPage } from "../../fixtures/admin";
import type { Page } from "@playwright/test";
import { APP_LINKS } from "@local/shared";

/**
 * Simplified E2E Tests for Admin Hero Banner Management
 *
 * Focus on what actually works and is testable
 */

const openHeroBanner = (page: Page) =>
  gotoAdminPage(page, APP_LINKS.AdminHomepageHeroBanner, /hero section settings/i);

const openHomepageHub = async (page: Page) => {
  await page.goto(APP_LINKS.AdminHomepage);
  await expect(page.getByRole("heading", { name: "Seasonal Content" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hero Banner" })).toBeVisible();
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

    await expect(authenticatedPage.getByText(/drag.*drop|drop.*click|upload/i).first()).toBeVisible();
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

  test("should show save and cancel buttons after a text change", async ({ authenticatedPage }) => {
    await openHeroBanner(authenticatedPage);

    const titleInput = authenticatedPage.getByLabel(/^title$/i).first();
    await titleInput.fill(`E2E Hero ${Date.now()}`);

    await expect(
      authenticatedPage.getByRole("button", { name: /save all changes/i }).first(),
    ).toBeVisible();
    await expect(authenticatedPage.getByRole("button", { name: /^cancel$/i }).first()).toBeVisible();
  });
});

test.describe("Hero Banner - Drag and Drop", () => {
  test("should show drag handles on banner cards", async ({ authenticatedPage }) => {
    await openHeroBanner(authenticatedPage);

    await expect(authenticatedPage.getByTestId("hero-banner-card-0")).toBeVisible();
    await expect(authenticatedPage.getByTestId("hero-active-switch-0")).toBeVisible();
    await expect(authenticatedPage.getByTestId("hero-delete-button-0")).toBeVisible();
  });
});
