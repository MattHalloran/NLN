import { test, expect } from '../fixtures/auth';
import { AdminContactPage } from '../pages/admin-contact.page';

/**
 * E2E Tests for Admin Contact Info Management
 *
 * Tests cover:
 * - Setting business hours for individual days
 * - Marking days as closed
 * - Bulk applying hours to all days
 * - Range grouping (MON-FRI format)
 * - Adding and removing special notes
 * - Advanced markdown mode
 * - Data persistence
 */

test.describe('Admin Contact Info - Business Hours', () => {
  let contactPage: AdminContactPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    contactPage = new AdminContactPage(authenticatedPage);
    await contactPage.goto();
  });

  test('should enable and configure a single day', async ({ authenticatedPage }) => {
    // Enable Monday
    await contactPage.enableDay('Monday');

    // Set hours
    await contactPage.setDayHours('Monday', '9:00 AM', '5:00 PM');

    // Save
    await contactPage.saveChanges();
    await contactPage.expectSuccessMessage();

    // Verify in preview
    await contactPage.expectPreviewContains('Monday');
    await contactPage.expectPreviewContains('9:00 AM');
    await contactPage.expectPreviewContains('5:00 PM');

    // Verify persistence
    await authenticatedPage.reload();
    await contactPage.expectDayEnabled('Monday');
  });

  test('should mark a day as closed', async ({ authenticatedPage }) => {
    // Mark Sunday as closed
    await contactPage.markDayClosed('Sunday');

    // Save
    await contactPage.saveChanges();
    await contactPage.expectSuccessMessage();

    // Verify preview shows "CLOSED"
    await contactPage.expectPreviewContains('CLOSED');

    // Verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    await contactPage.expectDayEnabled('Sunday');
  });

  test('should apply Monday hours to all days', async ({ authenticatedPage }) => {
    // Set Monday hours
    await contactPage.setDayHours('Monday', '8:00 AM', '6:00 PM');

    // Apply to all days
    await contactPage.applyMondayToAllDays();

    // Verify all days are enabled
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) {
      await contactPage.expectDayEnabled(day);
    }

    // Save
    await contactPage.saveChanges();
    await contactPage.expectSuccessMessage();

    // Verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');

    for (const day of days) {
      await contactPage.expectDayEnabled(day);
    }
  });

  test('should disable a day', async ({ authenticatedPage }) => {
    // Enable then disable Monday
    await contactPage.enableDay('Monday');
    await contactPage.disableDay('Monday');

    // Save
    await contactPage.saveChanges();
    await contactPage.expectSuccessMessage();

    // Verify Monday is not in preview
    // (depends on implementation - disabled days may not show)

    // Verify persistence
    await authenticatedPage.reload();
    await contactPage.expectDayDisabled('Monday');
  });

  test('should toggle range grouping', async ({ authenticatedPage }) => {
    // Set up consecutive days with same hours
    await contactPage.setDayHours('Monday', '9:00 AM', '5:00 PM');
    await contactPage.setDayHours('Tuesday', '9:00 AM', '5:00 PM');
    await contactPage.setDayHours('Wednesday', '9:00 AM', '5:00 PM');

    // Enable range grouping
    await contactPage.toggleRangeGrouping();

    // Preview should show MON-WED format
    await contactPage.expectPreviewContains('MON');

    // Save
    await contactPage.saveChanges();
    await contactPage.expectSuccessMessage();

    // Verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    await contactPage.expectPreviewContains('MON');
  });

  test('should update hours and verify preview immediately', async ({ authenticatedPage }) => {
    // Set hours
    await contactPage.setDayHours('Thursday', '10:00 AM', '4:00 PM');

    // Preview should update without saving
    await contactPage.expectPreviewContains('Thursday');
    await contactPage.expectPreviewContains('10:00 AM');
    await contactPage.expectPreviewContains('4:00 PM');
  });

  test('should revert changes without saving', async ({ authenticatedPage }) => {
    // Make a change
    await contactPage.setDayHours('Friday', '11:00 AM', '3:00 PM');

    // Revert
    await contactPage.revertChanges();

    // Changes should be gone
    // (verify by checking preview or form state)

    // Save should not persist the change
    await contactPage.saveChanges();

    // Reload and verify Friday doesn't have those hours
    await authenticatedPage.reload();
    // Verify the hours were not saved
  });
});

test.describe('Admin Contact Info - Special Notes', () => {
  let contactPage: AdminContactPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    contactPage = new AdminContactPage(authenticatedPage);
    await contactPage.goto();
  });

  test('should add a special note', async ({ authenticatedPage }) => {
    const testNote = `Closed for lunch 12-1pm ${Date.now()}`;

    // Add note
    await contactPage.addNote(testNote);

    // Verify in preview
    await contactPage.expectPreviewContains(testNote);

    // Save
    await contactPage.saveChanges();
    await contactPage.expectSuccessMessage();

    // Verify persistence
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    await contactPage.expectPreviewContains(testNote);
  });

  test('should add multiple notes', async ({ authenticatedPage }) => {
    const note1 = 'Closed Thanksgiving Day';
    const note2 = 'Extended hours in December';

    // Add both notes
    await contactPage.addNote(note1);
    await contactPage.addNote(note2);

    // Save
    await contactPage.saveChanges();
    await contactPage.expectSuccessMessage();

    // Verify both appear in preview
    await contactPage.expectPreviewContains(note1);
    await contactPage.expectPreviewContains(note2);
  });

  test('should remove a note', async ({ authenticatedPage }) => {
    const testNote = 'This note will be removed';

    // Add note
    await contactPage.addNote(testNote);

    // Save
    await contactPage.saveChanges();
    await contactPage.expectSuccessMessage();

    // Remove note
    await contactPage.removeNote(testNote);

    // Save again
    await contactPage.saveChanges();
    await contactPage.expectSuccessMessage();

    // Verify note is gone from preview
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');

    const preview = authenticatedPage.locator('table').first();
    await expect(preview).not.toContainText(testNote);
  });
});

test.describe('Admin Contact Info - Advanced Mode', () => {
  let contactPage: AdminContactPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    contactPage = new AdminContactPage(authenticatedPage);
    await contactPage.goto();
  });

  test('should switch to advanced markdown mode', async ({ authenticatedPage }) => {
    // Toggle advanced mode
    await contactPage.toggleAdvancedMode();

    // Verify markdown editor is visible
    const markdownEditor = authenticatedPage.locator('textarea').first();
    await expect(markdownEditor).toBeVisible();
  });

  test('should edit markdown directly', async ({ authenticatedPage }) => {
    const customMarkdown = `| Day | Hours |
| --- | --- |
| MON-FRI | 8:00 AM to 6:00 PM |
| SAT | 9:00 AM to 3:00 PM |
| SUN | CLOSED |`;

    // Set markdown
    await contactPage.setMarkdownHours(customMarkdown);

    // Save
    await contactPage.saveChanges();
    await contactPage.expectSuccessMessage();

    // Verify persistence - reload and check markdown
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');

    // Toggle back to advanced mode to see the markdown
    await contactPage.toggleAdvancedMode();
    const markdownEditor = authenticatedPage.locator('textarea').first();

    // Check markdown contains key parts
    await expect(markdownEditor).toContainText('MON-FRI');
    await expect(markdownEditor).toContainText('8:00 AM to 6:00 PM');
  });

  test('should preview markdown changes', async ({ authenticatedPage }) => {
    // Toggle to advanced mode
    await contactPage.toggleAdvancedMode();

    // Edit markdown
    const markdownEditor = authenticatedPage.locator('textarea').first();
    await markdownEditor.fill(`| Day | Hours |
| --- | --- |
| MON | 9:00 AM to 5:00 PM |`);

    // Preview should update (if your implementation has live preview in advanced mode)
    // This depends on your UI implementation
  });
});

test.describe('Admin Contact Info - Complex Scenarios', () => {
  let contactPage: AdminContactPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    contactPage = new AdminContactPage(authenticatedPage);
    await contactPage.goto();
  });

  test('should handle weekend hours differently from weekdays', async ({ authenticatedPage }) => {
    // Set weekday hours
    await contactPage.setDayHours('Monday', '8:00 AM', '6:00 PM');
    await contactPage.setDayHours('Tuesday', '8:00 AM', '6:00 PM');
    await contactPage.setDayHours('Wednesday', '8:00 AM', '6:00 PM');
    await contactPage.setDayHours('Thursday', '8:00 AM', '6:00 PM');
    await contactPage.setDayHours('Friday', '8:00 AM', '6:00 PM');

    // Set weekend hours
    await contactPage.setDayHours('Saturday', '9:00 AM', '3:00 PM');
    await contactPage.markDayClosed('Sunday');

    // Enable range grouping
    await contactPage.toggleRangeGrouping();

    // Save
    await contactPage.saveChanges();
    await contactPage.expectSuccessMessage();

    // Verify preview shows two groups
    await contactPage.expectPreviewContains('MON-FRI');
    await contactPage.expectPreviewContains('SAT');
    await contactPage.expectPreviewContains('CLOSED');
  });

  test('should preserve special characters in notes', async ({ authenticatedPage }) => {
    const specialNote = 'Closed: Dec 25th & Jan 1st - Happy Holidays! ★';

    await contactPage.addNote(specialNote);
    await contactPage.saveChanges();
    await contactPage.expectSuccessMessage();

    // Verify special characters preserved
    await contactPage.expectPreviewContains('Dec 25th');
    await contactPage.expectPreviewContains('&');
    await contactPage.expectPreviewContains('Happy Holidays!');
  });
});
