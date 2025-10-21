import { test, expect } from "../fixtures/auth";
import { AdminHomePage } from "../pages/admin-home.page";

/**
 * E2E Tests for Admin Seasonal Content Management
 *
 * Tests cover:
 * - Adding seasonal plants
 * - Editing plant information
 * - Deleting plants
 * - Adding plant care tips
 * - Editing and deleting tips
 * - Toggling active status
 * - Data persistence
 */

test.describe("Admin Seasonal Content - Plants", () => {
  let adminPage: AdminHomePage;

  test.beforeEach(async ({ authenticatedPage }) => {
    adminPage = new AdminHomePage(authenticatedPage);
    await adminPage.goto();
    await adminPage.switchToSeasonalTab();
    await adminPage.switchToSeasonalPlantsTab();
  });

  test("should display existing seasonal plants", async ({ authenticatedPage }) => {
    // Verify plants are loaded
    const plantCards = authenticatedPage.locator("[class*=\"Card\"], [role=\"article\"]");
    const count = await plantCards.count();

    expect(count).toBeGreaterThan(0);
  });

  test("should add a new seasonal plant", async ({ authenticatedPage }) => {
    const newPlant = {
      name: `Test Plant ${Date.now()}`,
      description: "This is a test plant for E2E testing",
      season: "Spring",
      careLevel: "Easy",
    };

    // Add plant
    await adminPage.addSeasonalPlant(newPlant);

    // Verify success message
    await adminPage.expectSuccessMessage();

    // Verify plant appears in the list
    await expect(authenticatedPage.locator(`text=${newPlant.name}`)).toBeVisible();

    // Verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");
    await adminPage.switchToSeasonalTab();
    await adminPage.switchToSeasonalPlantsTab();
    await expect(authenticatedPage.locator(`text=${newPlant.name}`)).toBeVisible();
  });

  test("should edit an existing plant", async ({ authenticatedPage }) => {
    // First add a plant to edit
    const originalName = `Plant to Edit ${Date.now()}`;
    await adminPage.addSeasonalPlant({
      name: originalName,
      description: "Original description",
      season: "Summer",
      careLevel: "Medium",
    });

    await adminPage.expectSuccessMessage();

    // Edit the plant
    const updatedName = `${originalName} - Updated`;
    await adminPage.editPlant(originalName, {
      name: updatedName,
      description: "Updated description",
    });

    await adminPage.expectSuccessMessage();

    // Verify updated name appears
    await expect(authenticatedPage.locator(`text=${updatedName}`)).toBeVisible();

    // Verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");
    await adminPage.switchToSeasonalTab();
    await adminPage.switchToSeasonalPlantsTab();
    await expect(authenticatedPage.locator(`text=${updatedName}`)).toBeVisible();
  });

  test("should delete a plant", async ({ authenticatedPage }) => {
    // First add a plant to delete
    const plantName = `Plant to Delete ${Date.now()}`;
    await adminPage.addSeasonalPlant({
      name: plantName,
      description: "Will be deleted",
      season: "Fall",
      careLevel: "Advanced",
    });

    await adminPage.expectSuccessMessage();

    // Delete the plant
    await adminPage.deletePlant(plantName);

    await adminPage.expectSuccessMessage();

    // Verify plant is gone
    await expect(authenticatedPage.locator(`text=${plantName}`)).not.toBeVisible();

    // Verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");
    await adminPage.switchToSeasonalTab();
    await adminPage.switchToSeasonalPlantsTab();
    await expect(authenticatedPage.locator(`text=${plantName}`)).not.toBeVisible();
  });

  test("should display plant details correctly", async ({ authenticatedPage }) => {
    // Add a plant with specific details
    const plantData = {
      name: `Detailed Plant ${Date.now()}`,
      description: "A plant with all details visible",
      season: "Winter",
      careLevel: "Easy",
    };

    await adminPage.addSeasonalPlant(plantData);
    await adminPage.expectSuccessMessage();

    // Verify all details are shown in the card
    const plantCard = authenticatedPage.locator(`text=${plantData.name}`).locator("..").locator("..");

    await expect(plantCard).toContainText(plantData.description);
    await expect(plantCard).toContainText(plantData.season);
    await expect(plantCard).toContainText(plantData.careLevel);
  });

  test("should show active/inactive status", async ({ authenticatedPage }) => {
    // The active status chip should be visible
    const activeChips = authenticatedPage.locator("text=/Active|Inactive/i");
    const count = await activeChips.count();

    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Admin Seasonal Content - Plant Care Tips", () => {
  let adminPage: AdminHomePage;

  test.beforeEach(async ({ authenticatedPage }) => {
    adminPage = new AdminHomePage(authenticatedPage);
    await adminPage.goto();
    await adminPage.switchToSeasonalTab();
    await adminPage.switchToPlantCareTipsTab();
  });

  test("should display existing plant care tips", async ({ authenticatedPage }) => {
    // Verify tips are loaded
    const tipCards = authenticatedPage.locator("[class*=\"Card\"], [role=\"article\"]");
    const count = await tipCards.count();

    expect(count).toBeGreaterThan(0);
  });

  test("should add a new plant care tip", async ({ authenticatedPage }) => {
    const newTip = {
      title: `Test Tip ${Date.now()}`,
      description: "This is a test tip for E2E testing",
      category: "Watering",
      season: "Year-round",
    };

    // Add tip
    await adminPage.addPlantTip(newTip);

    // Verify success message
    await adminPage.expectSuccessMessage();

    // Verify tip appears in the list
    await expect(authenticatedPage.locator(`text=${newTip.title}`)).toBeVisible();

    // Verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");
    await adminPage.switchToSeasonalTab();
    await adminPage.switchToPlantCareTipsTab();
    await expect(authenticatedPage.locator(`text=${newTip.title}`)).toBeVisible();
  });

  test("should delete a plant care tip", async ({ authenticatedPage }) => {
    // First add a tip to delete
    const tipTitle = `Tip to Delete ${Date.now()}`;
    await adminPage.addPlantTip({
      title: tipTitle,
      description: "Will be deleted",
      category: "Fertilizing",
      season: "Spring",
    });

    await adminPage.expectSuccessMessage();

    // Delete the tip
    await adminPage.deleteTip(tipTitle);

    await adminPage.expectSuccessMessage();

    // Verify tip is gone
    await expect(authenticatedPage.locator(`text=${tipTitle}`)).not.toBeVisible();

    // Verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");
    await adminPage.switchToSeasonalTab();
    await adminPage.switchToPlantCareTipsTab();
    await expect(authenticatedPage.locator(`text=${tipTitle}`)).not.toBeVisible();
  });

  test("should display tip categories and seasons", async ({ authenticatedPage }) => {
    // Add a tip with specific category and season
    const tipData = {
      title: `Categorized Tip ${Date.now()}`,
      description: "A tip with visible category",
      category: "Pruning",
      season: "Summer",
    };

    await adminPage.addPlantTip(tipData);
    await adminPage.expectSuccessMessage();

    // Verify category and season chips are visible
    const tipCard = authenticatedPage.locator(`text=${tipData.title}`).locator("..").locator("..");

    await expect(tipCard).toContainText(tipData.category);
    await expect(tipCard).toContainText(tipData.season);
  });
});

test.describe("Admin Seasonal Content - Statistics", () => {
  let adminPage: AdminHomePage;

  test.beforeEach(async ({ authenticatedPage }) => {
    adminPage = new AdminHomePage(authenticatedPage);
    await adminPage.goto();
    await adminPage.switchToSeasonalTab();
  });

  test("should display statistics cards", async ({ authenticatedPage }) => {
    // Verify statistics cards are visible
    const statCards = authenticatedPage.locator("[class*=\"Card\"]").filter({ hasText: /Active Plants|Active Tips|Total Items/i });
    const count = await statCards.count();

    expect(count).toBeGreaterThanOrEqual(2); // At least Plants and Tips cards
  });

  test("should show correct active plant count", async ({ authenticatedPage }) => {
    // Find the "Active Plants" card
    const activePlantsCard = authenticatedPage.locator("text=/Active Plants/i").locator("..").locator("..");

    // Should have a number
    await expect(activePlantsCard).toContainText(/\d+/);
  });

  test("should update statistics after adding content", async ({ authenticatedPage }) => {
    // Get initial count
    const statCard = authenticatedPage.locator("text=/Total Items/i").locator("..").locator("..");
    const initialText = await statCard.textContent();
    const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || "0");

    // Add a plant
    await adminPage.switchToSeasonalPlantsTab();
    await adminPage.addSeasonalPlant({
      name: `Stat Test Plant ${Date.now()}`,
      description: "For statistics test",
      season: "Spring",
      careLevel: "Easy",
    });

    await adminPage.expectSuccessMessage();

    // Wait for page to update
    await authenticatedPage.waitForTimeout(1000);

    // Check if statistics updated (reload might be needed)
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState("networkidle");
    await adminPage.switchToSeasonalTab();

    const updatedCard = authenticatedPage.locator("text=/Total Items/i").locator("..").locator("..");
    const updatedText = await updatedCard.textContent();
    const updatedCount = parseInt(updatedText?.match(/\d+/)?.[0] || "0");

    expect(updatedCount).toBeGreaterThan(initialCount);
  });
});

test.describe("Admin Seasonal Content - Navigation", () => {
  let adminPage: AdminHomePage;

  test.beforeEach(async ({ authenticatedPage }) => {
    adminPage = new AdminHomePage(authenticatedPage);
    await adminPage.goto();
  });

  test("should switch between Hero and Seasonal tabs", async ({ authenticatedPage: _authenticatedPage }) => {
    // Start on Hero tab
    await adminPage.switchToHeroTab();
    await expect(adminPage.dropzone).toBeVisible();

    // Switch to Seasonal
    await adminPage.switchToSeasonalTab();
    await expect(adminPage.seasonalPlantsTab).toBeVisible();

    // Switch back to Hero
    await adminPage.switchToHeroTab();
    await expect(adminPage.dropzone).toBeVisible();
  });

  test("should switch between Plants and Tips tabs", async ({ authenticatedPage: _authenticatedPage }) => {
    await adminPage.switchToSeasonalTab();

    // Go to Plants tab
    await adminPage.switchToSeasonalPlantsTab();
    await expect(adminPage.addPlantButton).toBeVisible();

    // Go to Tips tab
    await adminPage.switchToPlantCareTipsTab();
    await expect(adminPage.addTipButton).toBeVisible();
  });
});
