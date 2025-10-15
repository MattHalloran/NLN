import { test, expect } from '../fixtures/auth';
import { AdminHomePage } from '../pages/admin-home.page';

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

test.describe('Admin Hero Banner Management', () => {
  let adminPage: AdminHomePage;

  test.beforeEach(async ({ authenticatedPage }) => {
    adminPage = new AdminHomePage(authenticatedPage);
    await adminPage.goto();
    await adminPage.switchToHeroTab();
  });

  test('should display existing hero banners', async ({ authenticatedPage }) => {
    // Verify banners are loaded
    const bannerCount = await adminPage.getHeroBannerCount();
    expect(bannerCount).toBeGreaterThan(0);

    // Verify banner elements are visible
    await expect(adminPage.heroBannerItems.first()).toBeVisible();
  });

  test('should edit hero banner alt text and save', async ({ authenticatedPage }) => {
    const testAltText = `Test Alt Text ${Date.now()}`;

    // Edit the first banner's alt text - MUI TextField with label="Alt Text"
    const firstAltInput = authenticatedPage.getByLabel(/^Alt Text$/i).first();
    await firstAltInput.waitFor({ state: 'visible', timeout: 10000 });
    await firstAltInput.fill(testAltText);

    // Save changes
    await adminPage.saveChanges();
    await adminPage.expectSuccessMessage();

    // Reload page and verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    await adminPage.switchToHeroTab();
    const reloadedInput = authenticatedPage.getByLabel(/^Alt Text$/i).first();
    await expect(reloadedInput).toHaveValue(testAltText);
  });

  test('should edit banner description', async ({ authenticatedPage }) => {
    const testDescription = `Test Description ${Date.now()}`;

    // Edit the first banner's description - MUI TextField with label="Description"
    const firstDescInput = authenticatedPage.getByLabel(/^Description$/i).first();
    await firstDescInput.waitFor({ state: 'visible', timeout: 10000 });
    await firstDescInput.fill(testDescription);

    // Save changes
    await adminPage.saveChanges();
    await adminPage.expectSuccessMessage();

    // Verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    await adminPage.switchToHeroTab();
    const reloadedDescInput = authenticatedPage.getByLabel(/^Description$/i).first();
    await expect(reloadedDescInput).toHaveValue(testDescription);
  });

  test('should toggle banner active status', async ({ authenticatedPage }) => {
    // Find the first active switch - MUI Switch with FormControlLabel "Active"
    await authenticatedPage.waitForTimeout(1000); // Wait for banners to render
    const firstSwitch = authenticatedPage.getByLabel(/^Active$/i).first();
    await firstSwitch.waitFor({ state: 'visible', timeout: 10000 });

    // Get initial state
    const initialState = await firstSwitch.isChecked();

    // Toggle it
    await firstSwitch.click();

    // Save
    await adminPage.saveChanges();
    await adminPage.expectSuccessMessage();

    // Verify it changed
    await expect(firstSwitch).toHaveChecked(!initialState);

    // Reload and verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    const reloadedSwitch = authenticatedPage.locator('input[type="checkbox"]').filter({ has: authenticatedPage.locator('text=/Active/i') }).first();
    await expect(reloadedSwitch).toHaveChecked(!initialState);
  });

  test('should delete a banner', async ({ authenticatedPage }) => {
    // Get initial count
    const initialCount = await adminPage.getHeroBannerCount();

    // Delete the last banner
    await adminPage.deleteBanner(initialCount - 1);

    // Save
    await adminPage.saveChanges();
    await adminPage.expectSuccessMessage();

    // Verify count decreased
    await adminPage.expectBannerCount(initialCount - 1);

    // Verify persistence after reload
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    await adminPage.expectBannerCount(initialCount - 1);
  });

  test('should cancel changes without saving', async ({ authenticatedPage }) => {
    // Edit something
    const altInput = authenticatedPage.getByLabel(/^Alt Text$/i).first();
    await altInput.waitFor({ state: 'visible', timeout: 10000 });
    const originalValue = await altInput.inputValue();
    await altInput.fill('This should not be saved');

    // Cancel
    await adminPage.cancelChanges();

    // Verify original value restored
    await expect(altInput).toHaveValue(originalValue);

    // Reload to double-check nothing was saved
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    const reloadedInput = authenticatedPage.locator('input').filter({ hasText: /alt/i }).first();
    await expect(reloadedInput).toHaveValue(originalValue);
  });

  test('should show save/cancel buttons only when changes exist', async ({ authenticatedPage }) => {
    // Initially, save button should not be visible or should be disabled
    // (depends on your implementation)

    // Make a change
    const altInput = authenticatedPage.getByLabel(/^Alt Text$/i).first();
    await altInput.waitFor({ state: 'visible', timeout: 10000 });
    await altInput.fill('Test Change');

    // Now save button should be visible
    await expect(adminPage.saveButton).toBeVisible();
    await expect(adminPage.cancelButton).toBeVisible();
  });

  test('should handle validation errors gracefully', async ({ authenticatedPage }) => {
    // Try to save with invalid data (if applicable)
    // This test depends on your validation rules
    // Example: Try to set empty required fields

    const altInput = authenticatedPage.getByLabel(/^Alt Text$/i).first();
    await altInput.waitFor({ state: 'visible', timeout: 10000 });
    await altInput.fill('');

    // Try to save
    await adminPage.saveButton.click();

    // Should either show error message or prevent save
    // Adjust based on your actual validation behavior
  });
});

test.describe('Hero Banner - Advanced Features', () => {
  let adminPage: AdminHomePage;

  test.beforeEach(async ({ authenticatedPage }) => {
    adminPage = new AdminHomePage(authenticatedPage);
    await adminPage.goto();
    await adminPage.switchToHeroTab();
  });

  test('should reorder banners via drag and drop', async ({ authenticatedPage }) => {
    // Skip this test if less than 2 banners
    const bannerCount = await adminPage.getHeroBannerCount();
    test.skip(bannerCount < 2, 'Need at least 2 banners to test reordering');

    // Get the text of first two banners to track them
    const firstBannerAlt = await authenticatedPage.getByLabel(/^Alt Text$/i).first().inputValue();
    const secondBannerAlt = await authenticatedPage.getByLabel(/^Alt Text$/i).nth(1).inputValue();

    // Drag first banner to second position
    await adminPage.dragBanner(0, 1);

    // Save
    await adminPage.saveChanges();
    await adminPage.expectSuccessMessage();

    // Verify order changed
    const newFirstAlt = await authenticatedPage.locator('input').filter({ hasText: /alt/i }).first().inputValue();
    expect(newFirstAlt).toBe(secondBannerAlt);

    // Verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    const reloadedFirstAlt = await authenticatedPage.locator('input').filter({ hasText: /alt/i }).first().inputValue();
    expect(reloadedFirstAlt).toBe(secondBannerAlt);
  });

  test('should display banner images correctly', async ({ authenticatedPage }) => {
    // Verify that images are loading
    const images = authenticatedPage.locator('img[alt]');
    const imageCount = await images.count();

    expect(imageCount).toBeGreaterThan(0);

    // Check that at least one image has loaded
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      // Image should be visible
      await expect(img).toBeVisible();
    }
  });

  test('should maintain display order numbers', async ({ authenticatedPage }) => {
    // Check that display order is shown correctly
    const orderLabels = authenticatedPage.locator('text=/Order:/i');
    const count = await orderLabels.count();

    expect(count).toBeGreaterThan(0);

    // Verify orders are sequential
    for (let i = 0; i < count; i++) {
      const orderText = await orderLabels.nth(i).textContent();
      expect(orderText).toContain(String(i + 1));
    }
  });
});
