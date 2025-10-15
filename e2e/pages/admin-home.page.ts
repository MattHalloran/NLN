import { Page, Locator, expect } from '@playwright/test';

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
    this.heroTab = page.getByRole('tab', { name: /hero banner/i });
    this.seasonalTab = page.getByRole('tab', { name: /seasonal content/i });

    // Hero banner elements - more specific selectors
    this.dropzone = page.locator('[class*="dropzone"], form').first();
    this.saveButton = page.getByRole('button', { name: /save changes/i }).first();
    this.cancelButton = page.getByRole('button', { name: /^cancel$/i }).first();
    this.heroBannerItems = page.locator('div[class*="MuiCard"]').filter({ has: page.locator('img[alt]') });

    // Seasonal content elements
    this.seasonalPlantsTab = page.getByRole('tab', { name: /seasonal plants/i });
    this.plantCareTipsTab = page.getByRole('tab', { name: /plant care tips/i });
    this.addPlantButton = page.getByRole('button', { name: /add plant/i });
    this.addTipButton = page.getByRole('button', { name: /add tip/i });
  }

  async goto() {
    await this.page.goto('/admin/hero');
    await this.page.waitForLoadState('networkidle');
    // Wait for tabs to be fully loaded
    await this.heroTab.waitFor({ state: 'visible', timeout: 15000 });
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
    // Find the text field with label containing "Alt Text"
    const altInput = this.page.locator('input[id*="Alt"]').or(this.page.locator('label:has-text("Alt Text") + div input')).nth(index);
    await altInput.waitFor({ state: 'visible', timeout: 5000 });
    await altInput.fill(altText);
  }

  async updateBannerDescription(index: number, description: string) {
    // Find the text field with label containing "Description"
    const descInput = this.page.locator('textarea[id*="Description"]').or(this.page.locator('label:has-text("Description") + div textarea')).nth(index);
    await descInput.waitFor({ state: 'visible', timeout: 5000 });
    await descInput.fill(description);
  }

  async toggleBannerActive(index: number) {
    // Find the Switch input labeled "Active"
    const switchControls = this.page.locator('label:has-text("Active") input[type="checkbox"]');
    await switchControls.nth(index).click();
  }

  async deleteBanner(index: number) {
    // Find the delete IconButton - more specific selector
    const deleteButtons = this.page.locator('button[color="error"]').or(this.page.locator('button:has(svg)').filter({ hasText: '' }));
    await deleteButtons.nth(index).click();
  }

  async dragBanner(fromIndex: number, toIndex: number) {
    const fromBanner = this.heroBannerItems.nth(fromIndex);
    const toBanner = this.heroBannerItems.nth(toIndex);

    await fromBanner.dragTo(toBanner);
  }

  async saveChanges() {
    await this.saveButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.saveButton.click();
    // Wait for success message or snackbar
    await this.page.locator('text=/updated successfully|saved successfully|success/i').first().waitFor({ state: 'visible', timeout: 15000 });
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
    await this.addPlantButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.addPlantButton.click();

    // Wait for dialog to open
    await this.page.waitForSelector('role=dialog', { timeout: 10000 });
    await this.page.waitForTimeout(500);

    // Fill in plant details
    const nameInput = this.page.getByLabel(/^name$/i);
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill(plantData.name);

    await this.page.getByLabel(/description/i).fill(plantData.description);
    await this.page.getByLabel(/season/i).selectOption(plantData.season);
    await this.page.getByLabel(/care level/i).selectOption(plantData.careLevel);

    // Save
    const saveButton = this.page.getByRole('dialog').getByRole('button', { name: /save/i });
    await saveButton.click();

    // Wait for dialog to close
    await this.page.waitForSelector('role=dialog', { state: 'hidden', timeout: 10000 });
    await this.page.waitForTimeout(500);
  }

  async editPlant(plantName: string, newData: { name?: string; description?: string }) {
    // Find the plant card and click edit
    const plantCard = this.page.locator(`text=${plantName}`).locator('..').locator('..');
    await plantCard.getByRole('button', { name: /edit/i }).click();

    // Wait for dialog
    await this.page.waitForSelector('role=dialog');

    if (newData.name) {
      await this.page.getByLabel(/name/i).fill(newData.name);
    }
    if (newData.description) {
      await this.page.getByLabel(/description/i).fill(newData.description);
    }

    // Save
    await this.page.getByRole('dialog').getByRole('button', { name: /save/i }).click();
    await this.page.waitForSelector('role=dialog', { state: 'hidden', timeout: 5000 });
  }

  async deletePlant(plantName: string) {
    // Set up dialog handler for confirmation
    this.page.once('dialog', dialog => dialog.accept());

    const plantCard = this.page.locator(`text=${plantName}`).locator('..').locator('..');
    await plantCard.getByRole('button', { name: /delete|trash/i }).click();

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

    await this.page.waitForSelector('role=dialog');

    await this.page.getByLabel(/title/i).fill(tipData.title);
    await this.page.getByLabel(/description/i).fill(tipData.description);
    await this.page.getByLabel(/category/i).selectOption(tipData.category);
    await this.page.getByLabel(/season/i).selectOption(tipData.season);

    await this.page.getByRole('dialog').getByRole('button', { name: /save/i }).click();
    await this.page.waitForSelector('role=dialog', { state: 'hidden', timeout: 5000 });
  }

  async deleteTip(tipTitle: string) {
    this.page.once('dialog', dialog => dialog.accept());

    const tipCard = this.page.locator(`text=${tipTitle}`).locator('..').locator('..');
    await tipCard.getByRole('button', { name: /delete|trash/i }).click();

    await this.page.waitForTimeout(1000);
  }

  // Assertions
  async expectSuccessMessage() {
    await expect(this.page.locator('text=/successfully|success/i').first()).toBeVisible({ timeout: 10000 });
  }

  async expectBannerCount(count: number) {
    await expect(this.heroBannerItems).toHaveCount(count);
  }
}
