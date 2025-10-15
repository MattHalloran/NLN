import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Admin Contact Info Page
 *
 * Handles interactions with business hours and contact information management.
 */
export class AdminContactPage {
  readonly page: Page;

  // Main elements
  readonly saveButton: Locator;
  readonly revertButton: Locator;
  readonly rangeGroupingToggle: Locator;
  readonly advancedModeToggle: Locator;
  readonly applyAllDaysButton: Locator;
  readonly addNoteButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.saveButton = page.getByRole('button', { name: /save changes/i });
    this.revertButton = page.getByRole('button', { name: /revert changes/i });
    this.rangeGroupingToggle = page.getByLabel(/group ranges/i);
    this.advancedModeToggle = page.getByLabel(/advanced mode/i);
    this.applyAllDaysButton = page.getByRole('button', { name: /apply monday to all days/i });
    this.addNoteButton = page.getByRole('button', { name: /add note/i });
  }

  async goto() {
    await this.page.goto('/admin/contact-info');
    await this.page.waitForLoadState('networkidle');
    // Wait for the form to be ready by checking for day checkboxes
    await this.page.waitForSelector('text=/Monday|Tuesday|Wednesday/i', { timeout: 20000 });
  }

  // Day configuration
  async enableDay(day: string) {
    // Wait for the day label to be visible
    await this.page.waitForSelector(`text=${day}`, { timeout: 10000 });
    const checkbox = this.page.getByLabel(new RegExp(`^${day}$`, 'i'));
    await checkbox.waitFor({ state: 'visible', timeout: 10000 });
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
      await this.page.waitForTimeout(300); // Brief wait for state update
    }
  }

  async disableDay(day: string) {
    const checkbox = this.page.getByLabel(new RegExp(day, 'i'));
    if (await checkbox.isChecked()) {
      await checkbox.uncheck();
    }
  }

  async setDayHours(day: string, openTime: string, closeTime: string) {
    // Enable the day first
    await this.enableDay(day);

    // Wait for the form to update
    await this.page.waitForTimeout(500);

    // Find the row for this day - go up through the FormControlLabel structure
    const dayLabel = this.page.locator(`label:has-text("${day}")`).first();
    const dayRow = dayLabel.locator('..').locator('..').locator('..');

    // Wait for selects to be visible
    await dayRow.locator('select').first().waitFor({ state: 'visible', timeout: 5000 });

    // Set opening time
    const openSelect = dayRow.locator('select').first();
    await openSelect.selectOption(openTime);

    // Set closing time
    const closeSelect = dayRow.locator('select').nth(1);
    await closeSelect.selectOption(closeTime);

    await this.page.waitForTimeout(300);
  }

  async markDayClosed(day: string) {
    await this.enableDay(day);

    const dayRow = this.page.locator(`text=${day}`).locator('..').locator('..');
    const closedCheckbox = dayRow.getByLabel(/closed/i);

    if (!(await closedCheckbox.isChecked())) {
      await closedCheckbox.check();
    }
  }

  async applyMondayToAllDays() {
    await this.applyAllDaysButton.click();
    await this.page.waitForTimeout(500);
  }

  async toggleRangeGrouping() {
    await this.rangeGroupingToggle.click();
    await this.page.waitForTimeout(500);
  }

  async toggleAdvancedMode() {
    await this.advancedModeToggle.click();
    await this.page.waitForTimeout(500);
  }

  // Special notes
  async addNote(noteText: string) {
    await this.addNoteButton.click();

    // Find the last (newly added) note input
    const noteInputs = this.page.getByPlaceholder(/note/i);
    const lastNoteInput = noteInputs.last();

    await lastNoteInput.fill(noteText);
  }

  async removeNote(noteText: string) {
    // Find the note input with this text
    const noteInput = this.page.getByDisplayValue(noteText);
    const noteRow = noteInput.locator('..').locator('..');

    // Click the delete button in this row
    await noteRow.getByRole('button', { name: /delete/i }).click();
  }

  // Advanced mode (markdown editor)
  async setMarkdownHours(markdown: string) {
    await this.toggleAdvancedMode();

    const markdownEditor = this.page.locator('textarea').first();
    await markdownEditor.fill(markdown);
  }

  // Actions
  async saveChanges() {
    await this.saveButton.click();
    await this.page.waitForSelector('text=/updated successfully|success/i', { timeout: 10000 });
  }

  async revertChanges() {
    await this.revertButton.click();
    await this.page.waitForTimeout(500);
  }

  // Assertions
  async expectSuccessMessage() {
    await expect(this.page.locator('text=/successfully|success/i').first()).toBeVisible({ timeout: 10000 });
  }

  async expectDayEnabled(day: string) {
    const checkbox = this.page.getByLabel(new RegExp(day, 'i'));
    await expect(checkbox).toBeChecked();
  }

  async expectDayDisabled(day: string) {
    const checkbox = this.page.getByLabel(new RegExp(day, 'i'));
    await expect(checkbox).not.toBeChecked();
  }

  async expectPreviewContains(text: string) {
    const preview = this.page.locator('table').first();
    await expect(preview).toContainText(text);
  }
}
