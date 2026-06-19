import { test, expect } from "../../fixtures/auth";
import { gotoAdminPage } from "../../fixtures/admin";
import type { Page } from "@playwright/test";
import { APP_LINKS } from "@local/shared";

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

    await expect(authenticatedPage.getByRole("button", { name: /add new plant/i })).toBeVisible();
    await authenticatedPage.getByRole("heading", { name: /black gum/i }).first().click();
    await expect(authenticatedPage.getByLabel(/^name$/i).first()).toBeVisible();
    await expect(authenticatedPage.getByLabel(/^description$/i).first()).toBeVisible();
  });

  test("should have add plant button", async ({ authenticatedPage }) => {
    await openSeasonalContent(authenticatedPage);

    await expect(authenticatedPage.getByRole("button", { name: /add new plant/i })).toBeVisible();
  });

  test("should display plant cards with details", async ({ authenticatedPage }) => {
    await openSeasonalContent(authenticatedPage);

    await expect(
      authenticatedPage.getByRole("heading", { name: /black gum/i }).first(),
    ).toBeVisible();
    await expect(
      authenticatedPage.locator("p").filter({ hasText: /striking fall foliage/i }).first(),
    ).toBeVisible();
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
  test("should navigate between hero and seasonal pages through homepage hub", async ({ authenticatedPage }) => {
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
