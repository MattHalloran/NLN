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

    this.saveButton = page.getByTestId('save-changes-button');
    this.revertButton = page.getByTestId('revert-changes-button');
    this.rangeGroupingToggle = page.getByLabel(/group ranges/i);
    this.advancedModeToggle = page.getByLabel(/advanced mode/i);
    this.applyAllDaysButton = page.getByTestId('apply-monday-to-all');
    this.addNoteButton = page.getByTestId('add-note-button');
  }

  async goto() {
    await this.page.goto('/admin/contact-info');
    await this.page.waitForLoadState('networkidle');
    // Wait for the form to be ready by checking for day checkboxes
    await this.page.waitForSelector('text=/Monday|Tuesday|Wednesday/i', { timeout: 20000 });
  }

  // Day configuration
  async enableDay(day: string) {
    const checkbox = this.page.getByTestId(`day-enabled-${day.toLowerCase()}`);
    await checkbox.waitFor({ state: 'visible', timeout: 10000 });
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
      await this.page.waitForTimeout(300); // Brief wait for state update
    }
  }

  async disableDay(day: string) {
    const checkbox = this.page.getByTestId(`day-enabled-${day.toLowerCase()}`);
    if (await checkbox.isChecked()) {
      await checkbox.uncheck();
    }
  }

  async setDayHours(day: string, openTime: string, closeTime: string) {
    // Enable the day first
    await this.enableDay(day);

    // Wait for the form to update
    await this.page.waitForTimeout(500);

    // Ensure the "Closed" checkbox is NOT checked
    const closedCheckbox = this.page.getByTestId(`day-closed-${day.toLowerCase()}`);
    await closedCheckbox.waitFor({ state: 'visible', timeout: 10000 });

    // If it's checked, uncheck it to show the time selects
    if (await closedCheckbox.isChecked()) {
      await closedCheckbox.uncheck();
      await this.page.waitForTimeout(500);
    }

    // Use data-testid to find the time selects
    const openTimeSelect = this.page.getByTestId(`open-time-${day.toLowerCase()}`);
    const closeTimeSelect = this.page.getByTestId(`close-time-${day.toLowerCase()}`);

    await openTimeSelect.waitFor({ state: 'visible', timeout: 10000 });

    // Set opening time
    await openTimeSelect.click();
    await this.page.waitForTimeout(300);
    await this.page.locator(`[role="listbox"] [role="option"]:has-text("${openTime}")`).first().click();
    await this.page.waitForTimeout(300);

    // Set closing time
    await closeTimeSelect.click();
    await this.page.waitForTimeout(300);
    await this.page.locator(`[role="listbox"] [role="option"]:has-text("${closeTime}")`).first().click();
    await this.page.waitForTimeout(300);
  }

  async markDayClosed(day: string) {
    await this.enableDay(day);

    // Wait for the UI to update after enabling
    await this.page.waitForTimeout(500);

    // Use data-testid to find the closed checkbox
    const closedCheckbox = this.page.getByTestId(`day-closed-${day.toLowerCase()}`);
    await closedCheckbox.waitFor({ state: 'visible', timeout: 10000 });

    if (!(await closedCheckbox.isChecked())) {
      await closedCheckbox.check();
      await this.page.waitForTimeout(500);
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
    // Find the note input with this text using value attribute
    const noteInput = this.page.locator(`input[value="${noteText}"]`);
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
    // Don't wait for success message here - let tests check explicitly with expectSuccessMessage()
    // This avoids the Snackbar auto-hide timing issue
  }

  async revertChanges() {
    await this.revertButton.click();
    await this.page.waitForTimeout(500);
  }

  // Assertions
  async expectSuccessMessage() {
    await expect(this.page.locator('text=/successfully|success/i').first()).toBeVisible({ timeout: 15000 });
    // Wait additional time for refetch to complete and UI to update
    await this.page.waitForTimeout(1000);
    // Wait for network to be idle to ensure refetch completed
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
  }

  async expectDayEnabled(day: string) {
    const checkbox = this.page.getByTestId(`day-enabled-${day.toLowerCase()}`);
    await expect(checkbox).toBeChecked();
  }

  async expectDayDisabled(day: string) {
    const checkbox = this.page.getByTestId(`day-enabled-${day.toLowerCase()}`);
    await expect(checkbox).not.toBeChecked();
  }

  async expectPreviewContains(text: string) {
    const preview = this.page.locator('table').first();
    await expect(preview).toContainText(text);
  }
}
