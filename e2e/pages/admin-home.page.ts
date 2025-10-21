import { Page, Locator, expect } from "@playwright/test";

/**
 * Page Object Model for Admin Home Page
 *
 * Handles interactions with the hero banner and seasonal content management UI.
 */
export class AdminHomePage {
  readonly page: Page;

  // Tab selectors
  readonly heroTab: Locator;
  readonly seasonalTab: Locator;

  // Hero banner selectors
  readonly dropzone: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly heroBannerItems: Locator;

  // Seasonal content selectors
  readonly seasonalPlantsTab: Locator;
  readonly plantCareTipsTab: Locator;
  readonly addPlantButton: Locator;
  readonly addTipButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Tabs
    this.heroTab = page.getByRole("tab", { name: /hero banner/i });
    this.seasonalTab = page.getByRole("tab", { name: /seasonal content/i });

    // Hero banner elements - using data-testid for reliability
    this.dropzone = page.locator("[class*=\"dropzone\"], form").first();
    this.saveButton = page.locator("[data-testid=\"hero-save-button\"]");
    this.cancelButton = page.locator("[data-testid=\"hero-cancel-button\"]");
    this.heroBannerItems = page.locator("[data-testid^=\"hero-banner-card-\"]");

    // Seasonal content elements
    this.seasonalPlantsTab = page.getByRole("tab", { name: /seasonal plants/i });
    this.plantCareTipsTab = page.getByRole("tab", { name: /plant care tips/i });
    this.addPlantButton = page.getByRole("button", { name: /add plant/i });
    this.addTipButton = page.getByRole("button", { name: /add tip/i });
  }

  async goto() {
    await this.page.goto("/admin/hero");
    await this.page.waitForLoadState("networkidle");
    // Wait for tabs to be fully loaded
    await this.heroTab.waitFor({ state: "visible", timeout: 15000 });
  }

  async switchToHeroTab() {
    await this.heroTab.click();
    await this.page.waitForTimeout(500); // Wait for tab transition
  }

  async switchToSeasonalTab() {
    await this.seasonalTab.click();
    await this.page.waitForTimeout(500);
  }

  async switchToSeasonalPlantsTab() {
    await this.seasonalPlantsTab.click();
    await this.page.waitForTimeout(500);
  }

  async switchToPlantCareTipsTab() {
    await this.plantCareTipsTab.click();
    await this.page.waitForTimeout(500);
  }

  // Hero Banner Actions
  async getHeroBannerCount(): Promise<number> {
    return await this.heroBannerItems.count();
  }

  async updateBannerAltText(index: number, altText: string) {
    // Use data-testid for reliable selection - target the first visible input (MUI renders hidden copies)
    const altInput = this.page.locator(`[data-testid="hero-alt-input-${index}"] input:not([aria-hidden="true"])`).first();
    await altInput.waitFor({ state: "visible", timeout: 5000 });

    // Click to focus the input
    await altInput.click();
    await this.page.waitForTimeout(100);

    // Select all existing text using keyboard shortcut
    await this.page.keyboard.press("Control+A");
    await this.page.waitForTimeout(50);

    // Type the new text - this triggers proper React onChange events for MUI
    await this.page.keyboard.type(altText);
    await this.page.waitForTimeout(200);

    // Blur to finalize the change
    await altInput.blur();
    await this.page.waitForTimeout(300);
  }

  async updateBannerDescription(index: number, description: string) {
    // Use data-testid for reliable selection - target the first visible textarea (MUI renders hidden copies)
    const descInput = this.page.locator(`[data-testid="hero-description-input-${index}"] textarea:not([aria-hidden="true"])`).first();
    await descInput.waitFor({ state: "visible", timeout: 5000 });

    // Click to focus the textarea
    await descInput.click();
    await this.page.waitForTimeout(100);

    // Select all existing text using keyboard shortcut
    await this.page.keyboard.press("Control+A");
    await this.page.waitForTimeout(50);

    // Type the new text - this triggers proper React onChange events for MUI
    await this.page.keyboard.type(description);
    await this.page.waitForTimeout(200);

    // Blur to finalize the change
    await descInput.blur();
    await this.page.waitForTimeout(300);
  }

  async toggleBannerActive(index: number) {
    // Use data-testid for reliable selection - target the checkbox input within the Switch wrapper
    const switchControl = this.page.locator(`[data-testid="hero-active-switch-${index}"] input[type="checkbox"]`);
    await switchControl.waitFor({ state: "visible", timeout: 5000 });

    // Click the switch to toggle it
    await switchControl.click({ force: true }); // force: true helps with MUI Switch which has overlays

    // Wait for onChange to process and React state to update
    await this.page.waitForTimeout(800);
  }

  async deleteBanner(index: number) {
    // Use data-testid for reliable selection
    const deleteButton = this.page.locator(`[data-testid="hero-delete-button-${index}"]`);
    await deleteButton.waitFor({ state: "visible", timeout: 5000 });

    // Click the delete button
    await deleteButton.click();

    // Wait for React state to update (deletion + reordering)
    await this.page.waitForTimeout(800);
  }

  async dragBanner(fromIndex: number, toIndex: number) {
    // Get the specific banner cards
    const fromBanner = this.heroBannerItems.nth(fromIndex);
    const toBanner = this.heroBannerItems.nth(toIndex);

    // Wait for both banners to be visible
    await fromBanner.waitFor({ state: "visible", timeout: 5000 });
    await toBanner.waitFor({ state: "visible", timeout: 5000 });

    // Use Playwright's dragTo method which properly triggers HTML5 drag events
    // This is required for react-beautiful-dnd (@hello-pangea/dnd) to work
    await fromBanner.dragTo(toBanner);

    // Wait for React state to update
    await this.page.waitForTimeout(1000);
  }

  async saveChanges() {
    // Wait for save button to become visible (indicates hasChanges=true)
    await this.saveButton.waitFor({ state: "visible", timeout: 10000 });
    // Small delay to ensure button is interactive
    await this.page.waitForTimeout(200);
    await this.saveButton.click();
    // Don't wait for success message here - let tests check explicitly with expectSuccessMessage()
    // This avoids the Snackbar auto-hide timing issue
  }

  async cancelChanges() {
    await this.cancelButton.click();
  }

  // Seasonal Plant Actions
  async addSeasonalPlant(plantData: {
    name: string;
    description: string;
    season: string;
    careLevel: string;
    icon?: string;
  }) {
    await this.addPlantButton.waitFor({ state: "visible", timeout: 10000 });
    await this.addPlantButton.click();

    // Wait for dialog to open
    await this.page.waitForSelector("role=dialog", { timeout: 10000 });
    await this.page.waitForTimeout(500);

    // Fill in plant details
    const nameInput = this.page.getByLabel(/^name$/i);
    await nameInput.waitFor({ state: "visible", timeout: 5000 });
    await nameInput.fill(plantData.name);

    await this.page.getByLabel(/description/i).fill(plantData.description);
    await this.page.getByLabel(/season/i).selectOption(plantData.season);
    await this.page.getByLabel(/care level/i).selectOption(plantData.careLevel);

    // Save
    const saveButton = this.page.getByRole("dialog").getByRole("button", { name: /save/i });
    await saveButton.click();

    // Wait for dialog to close
    await this.page.waitForSelector("role=dialog", { state: "hidden", timeout: 10000 });
    await this.page.waitForTimeout(500);
  }

  async editPlant(plantName: string, newData: { name?: string; description?: string }) {
    // Find the plant card and click edit
    const plantCard = this.page.locator(`text=${plantName}`).locator("..").locator("..");
    await plantCard.getByRole("button", { name: /edit/i }).click();

    // Wait for dialog
    await this.page.waitForSelector("role=dialog");

    if (newData.name) {
      await this.page.getByLabel(/name/i).fill(newData.name);
    }
    if (newData.description) {
      await this.page.getByLabel(/description/i).fill(newData.description);
    }

    // Save
    await this.page.getByRole("dialog").getByRole("button", { name: /save/i }).click();
    await this.page.waitForSelector("role=dialog", { state: "hidden", timeout: 5000 });
  }

  async deletePlant(plantName: string) {
    // Set up dialog handler for confirmation
    this.page.once("dialog", dialog => dialog.accept());

    const plantCard = this.page.locator(`text=${plantName}`).locator("..").locator("..");
    await plantCard.getByRole("button", { name: /delete|trash/i }).click();

    // Wait for deletion
    await this.page.waitForTimeout(1000);
  }

  // Plant Tip Actions
  async addPlantTip(tipData: {
    title: string;
    description: string;
    category: string;
    season: string;
  }) {
    await this.addTipButton.click();

    await this.page.waitForSelector("role=dialog");

    await this.page.getByLabel(/title/i).fill(tipData.title);
    await this.page.getByLabel(/description/i).fill(tipData.description);
    await this.page.getByLabel(/category/i).selectOption(tipData.category);
    await this.page.getByLabel(/season/i).selectOption(tipData.season);

    await this.page.getByRole("dialog").getByRole("button", { name: /save/i }).click();
    await this.page.waitForSelector("role=dialog", { state: "hidden", timeout: 5000 });
  }

  async deleteTip(tipTitle: string) {
    this.page.once("dialog", dialog => dialog.accept());

    const tipCard = this.page.locator(`text=${tipTitle}`).locator("..").locator("..");
    await tipCard.getByRole("button", { name: /delete|trash/i }).click();

    await this.page.waitForTimeout(1000);
  }

  // Assertions
  async expectSuccessMessage() {
    // Look for MUI Snackbar with success message - more specific selector
    // Increased timeout to 20s to account for slow operations with large datasets
    await expect(
      this.page.locator("[role=\"alert\"], .MuiSnackbar-root, [class*=\"Snackbar\"]").locator("text=/successfully|success/i"),
    ).toBeVisible({ timeout: 20000 });
    // Wait for network activity from the refetch with longer timeout
    await this.page.waitForLoadState("networkidle", { timeout: 15000 });
    // Small delay to ensure React state updates complete
    await this.page.waitForTimeout(500);
  }

  async expectBannerCount(count: number) {
    await expect(this.heroBannerItems).toHaveCount(count);
  }
}
