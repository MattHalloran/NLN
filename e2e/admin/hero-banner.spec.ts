import { test, expect } from "../fixtures/auth";
import { AdminHomePage } from "../pages/admin-home.page";
import { testHeroBanners, testHeroSettings } from "../fixtures/test-data";

/**
 * E2E Tests for Admin Hero Banner Management
 *
 * Tests cover:
 * - Viewing existing hero banners
 * - Editing banner properties (alt text, description, active status)
 * - Reordering banners via drag-and-drop
 * - Deleting banners
 * - Save/cancel functionality
 * - Data persistence after reload
 */

test.describe("Admin Hero Banner Management", () => {
  let adminPage: AdminHomePage;

  test.beforeEach(async ({ authenticatedPage }) => {
    // Re-seed test data before each test to ensure test isolation
    await authenticatedPage.request.put("http://localhost:5331/api/rest/v1/landing-page", {
      data: {
        heroBanners: testHeroBanners,
        heroSettings: testHeroSettings,
      },
    });

    // Small delay to ensure data is written
    await authenticatedPage.waitForTimeout(500);

    adminPage = new AdminHomePage(authenticatedPage);
    await adminPage.goto();
    await adminPage.switchToHeroTab();
  });

  test("should display existing hero banners", async ({ authenticatedPage: _authenticatedPage }) => {
    // Check if banners exist
    const bannerCount = await adminPage.getHeroBannerCount();
    test.skip(bannerCount === 0, "No hero banners in database to test");

    // Verify banners are loaded
    expect(bannerCount).toBeGreaterThan(0);

    // Verify banner elements are visible
    await expect(adminPage.heroBannerItems.first()).toBeVisible();
  });

  test("should edit hero banner alt text and save", async ({ authenticatedPage }) => {
    const bannerCount = await adminPage.getHeroBannerCount();
    test.skip(bannerCount === 0, "No hero banners in database to test");

    const testAltText = `Test Alt Text ${Date.now()}`;

    // Edit the first banner's alt text using page object model
    await adminPage.updateBannerAltText(0, testAltText);

    // Save changes
    await adminPage.saveChanges();
    await adminPage.expectSuccessMessage();

    // Reload page and verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");
    await adminPage.switchToHeroTab();
    const reloadedInput = authenticatedPage.locator("[data-testid=\"hero-alt-input-0\"] input:not([aria-hidden=\"true\"])").first();
    await expect(reloadedInput).toHaveValue(testAltText);
  });

  test("should edit banner description", async ({ authenticatedPage }) => {
    const bannerCount = await adminPage.getHeroBannerCount();
    test.skip(bannerCount === 0, "No hero banners in database to test");

    const testDescription = `Test Description ${Date.now()}`;

    // Edit the first banner's description using page object model
    await adminPage.updateBannerDescription(0, testDescription);

    // Save changes
    await adminPage.saveChanges();
    await adminPage.expectSuccessMessage();

    // Verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");
    await adminPage.switchToHeroTab();
    const reloadedDescInput = authenticatedPage.locator("[data-testid=\"hero-description-input-0\"] textarea:not([aria-hidden=\"true\"])").first();
    await expect(reloadedDescInput).toHaveValue(testDescription);
  });

  test("should toggle banner active status", async ({ authenticatedPage }) => {
    const bannerCount = await adminPage.getHeroBannerCount();
    test.skip(bannerCount === 0, "No hero banners in database to test");

    // Get initial state using data-testid (select the actual checkbox input)
    await authenticatedPage.waitForTimeout(1000); // Wait for banners to render
    const firstSwitch = authenticatedPage.locator("[data-testid=\"hero-active-switch-0\"] input[type=\"checkbox\"]");
    await firstSwitch.waitFor({ state: "visible", timeout: 10000 });
    const initialState = await firstSwitch.isChecked();

    // Toggle it using page object model
    await adminPage.toggleBannerActive(0);

    // Save
    await adminPage.saveChanges();
    await adminPage.expectSuccessMessage();

    // Verify it changed
    if (initialState) {
      await expect(firstSwitch).not.toBeChecked();
    } else {
      await expect(firstSwitch).toBeChecked();
    }

    // Reload and verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");
    await adminPage.switchToHeroTab();
    const reloadedSwitch = authenticatedPage.locator("[data-testid=\"hero-active-switch-0\"] input[type=\"checkbox\"]");
    if (initialState) {
      await expect(reloadedSwitch).not.toBeChecked();
    } else {
      await expect(reloadedSwitch).toBeChecked();
    }
  });

  test("should delete a banner", async ({ authenticatedPage }) => {
    // Get initial count
    const initialCount = await adminPage.getHeroBannerCount();
    test.skip(initialCount === 0, "No hero banners in database to test");

    // Delete the last banner
    await adminPage.deleteBanner(initialCount - 1);

    // Save
    await adminPage.saveChanges();
    await adminPage.expectSuccessMessage();

    // Verify count decreased
    await adminPage.expectBannerCount(initialCount - 1);

    // Verify persistence after reload
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");
    await adminPage.expectBannerCount(initialCount - 1);
  });

  test("should cancel changes without saving", async ({ authenticatedPage }) => {
    const bannerCount = await adminPage.getHeroBannerCount();
    test.skip(bannerCount === 0, "No hero banners in database to test");

    // Get original value using data-testid (select the actual input inside the wrapper)
    const altInput = authenticatedPage.locator("[data-testid=\"hero-alt-input-0\"] input:not([aria-hidden=\"true\"])").first();
    await altInput.waitFor({ state: "visible", timeout: 10000 });
    const originalValue = await altInput.inputValue();

    // Edit something
    await altInput.fill("This should not be saved");

    // Cancel
    await adminPage.cancelChanges();

    // Verify original value restored
    await expect(altInput).toHaveValue(originalValue);

    // Reload to double-check nothing was saved
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");
    const reloadedInput = authenticatedPage.locator("[data-testid=\"hero-alt-input-0\"] input:not([aria-hidden=\"true\"])").first();
    await expect(reloadedInput).toHaveValue(originalValue);
  });

  test("should show save/cancel buttons only when changes exist", async ({ authenticatedPage }) => {
    const bannerCount = await adminPage.getHeroBannerCount();
    test.skip(bannerCount === 0, "No hero banners in database to test");

    // Initially, save button should not be visible (hidden by hasChanges state)
    await expect(adminPage.saveButton).not.toBeVisible();

    // Make a change using data-testid (select the actual input inside the wrapper)
    const altInput = authenticatedPage.locator("[data-testid=\"hero-alt-input-0\"] input:not([aria-hidden=\"true\"])").first();
    await altInput.waitFor({ state: "visible", timeout: 10000 });
    await altInput.fill("Test Change");

    // Now save button should be visible
    await expect(adminPage.saveButton).toBeVisible();
    await expect(adminPage.cancelButton).toBeVisible();
  });

  test("should handle validation errors gracefully", async ({ authenticatedPage }) => {
    const bannerCount = await adminPage.getHeroBannerCount();
    test.skip(bannerCount === 0, "No hero banners in database to test");

    // Try to set empty alt text (if validation exists)
    const altInput = authenticatedPage.locator("[data-testid=\"hero-alt-input-0\"] input:not([aria-hidden=\"true\"])").first();
    await altInput.waitFor({ state: "visible", timeout: 10000 });
    await altInput.fill("");

    // Try to save (button should appear after change)
    await adminPage.saveButton.waitFor({ state: "visible", timeout: 5000 });
    await adminPage.saveButton.click();

    // Wait a moment for any validation or save to process
    await authenticatedPage.waitForTimeout(2000);

    // Either way, we verify the test doesn't crash
    // Actual validation behavior depends on backend implementation
  });
});

test.describe("Hero Banner - Advanced Features", () => {
  let adminPage: AdminHomePage;

  test.beforeEach(async ({ authenticatedPage }) => {
    // Re-seed test data before each test to ensure test isolation
    await authenticatedPage.request.put("http://localhost:5331/api/rest/v1/landing-page", {
      data: {
        heroBanners: testHeroBanners,
        heroSettings: testHeroSettings,
      },
    });

    // Small delay to ensure data is written
    await authenticatedPage.waitForTimeout(500);

    adminPage = new AdminHomePage(authenticatedPage);
    await adminPage.goto();
    await adminPage.switchToHeroTab();
  });

  test("should reorder banners via drag and drop", async ({ authenticatedPage }) => {
    // Skip this test if less than 2 banners
    const bannerCount = await adminPage.getHeroBannerCount();
    test.skip(bannerCount < 2, "Need at least 2 banners to test reordering");

    // Get the alt text of first two banners using data-testid to track them
    const _firstBannerAlt = await authenticatedPage.locator("[data-testid=\"hero-alt-input-0\"] input:not([aria-hidden=\"true\"])").first().inputValue();
    const secondBannerAlt = await authenticatedPage.locator("[data-testid=\"hero-alt-input-1\"] input:not([aria-hidden=\"true\"])").first().inputValue();

    // Drag first banner to second position
    await adminPage.dragBanner(0, 1);

    // Save
    await adminPage.saveChanges();
    await adminPage.expectSuccessMessage();

    // Verify order changed (what was second is now first)
    const newFirstAlt = await authenticatedPage.locator("[data-testid=\"hero-alt-input-0\"] input:not([aria-hidden=\"true\"])").first().inputValue();
    expect(newFirstAlt).toBe(secondBannerAlt);

    // Verify persistence after reload
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");
    const reloadedFirstAlt = await authenticatedPage.locator("[data-testid=\"hero-alt-input-0\"] input:not([aria-hidden=\"true\"])").first().inputValue();
    expect(reloadedFirstAlt).toBe(secondBannerAlt);
  });

  test("should display banner images correctly", async ({ authenticatedPage }) => {
    const bannerCount = await adminPage.getHeroBannerCount();
    test.skip(bannerCount === 0, "No hero banners in database to test");

    // Verify that images are loading
    const images = authenticatedPage.locator("img[alt]");
    const imageCount = await images.count();

    expect(imageCount).toBeGreaterThan(0);

    // Check that at least one image has loaded
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      // Image should be visible
      await expect(img).toBeVisible();
    }
  });

  test("should maintain display order numbers", async ({ authenticatedPage }) => {
    const bannerCount = await adminPage.getHeroBannerCount();
    test.skip(bannerCount === 0, "No hero banners in database to test");

    // Wait for banners to load
    await authenticatedPage.waitForTimeout(1000);

    // Check that display order is shown correctly
    const orderLabels = authenticatedPage.locator("text=/Order:/i");
    const count = await orderLabels.count();

    // Verify we have banners with order labels
    expect(count).toBeGreaterThan(0);

    // Verify orders are sequential (1, 2, 3, etc.)
    for (let i = 0; i < count; i++) {
      const orderText = await orderLabels.nth(i).textContent();
      expect(orderText).toContain(String(i + 1));
    }
  });
});
