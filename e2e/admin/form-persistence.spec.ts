import { expect, test } from "../fixtures/auth";

/**
 * Critical E2E Tests for Admin Form Persistence
 *
 * These tests specifically check for the bug where admin form changes
 * don't persist after save. Each test follows the pattern:
 *
 * 1. Navigate to admin page
 * 2. Get current value
 * 3. Make a change
 * 4. Save
 * 5. Reload page
 * 6. Verify change persisted
 * 7. Restore original value
 *
 * These tests catch the "mutation succeeded but refetch failed" bug
 * and other persistence issues.
 */

test.describe("Admin Form Persistence - Hero Banner", () => {
    test("should persist hero banner title changes", async ({ authenticatedPage }) => {
        await authenticatedPage.goto("/admin/hero");
        await authenticatedPage.waitForLoadState("networkidle");

        // Find first banner title input
        const titleInput = authenticatedPage
            .locator("input[name*=\"title\"], input[placeholder*=\"title\" i]")
            .first();

        // Get original value
        const originalTitle = await titleInput.inputValue();

        // Make a change
        const testTitle = `TEST-${Date.now()}`;
        await titleInput.fill(testTitle);

        // Wait for change detection
        await authenticatedPage.waitForTimeout(500);

        // Find and click save button
        const saveButton = authenticatedPage.getByRole("button", { name: /save/i });
        await expect(saveButton).toBeEnabled();
        await saveButton.click();

        // Wait for save to complete
        await authenticatedPage.waitForTimeout(1000);

        // Reload the page
        await authenticatedPage.reload();
        await authenticatedPage.waitForLoadState("networkidle");

        // Verify the change persisted
        const updatedTitleInput = authenticatedPage
            .locator("input[name*=\"title\"], input[placeholder*=\"title\" i]")
            .first();
        const persistedTitle = await updatedTitleInput.inputValue();

        expect(persistedTitle).toBe(testTitle);

        // Restore original value
        await updatedTitleInput.fill(originalTitle);
        await authenticatedPage.waitForTimeout(500);

        const restoreSaveButton = authenticatedPage.getByRole("button", { name: /save/i });
        await restoreSaveButton.click();
        await authenticatedPage.waitForTimeout(1000);
    });

    test("should persist banner isActive toggle", async ({ authenticatedPage }) => {
        await authenticatedPage.goto("/admin/hero");
        await authenticatedPage.waitForLoadState("networkidle");

        // Find first active checkbox
        const checkbox = authenticatedPage
            .locator("input[type=\"checkbox\"]")
            .first();

        // Get original state
        const wasChecked = await checkbox.isChecked();

        // Toggle
        await checkbox.click();
        await authenticatedPage.waitForTimeout(500);

        // Save
        const saveButton = authenticatedPage.getByRole("button", { name: /save/i });
        await saveButton.click();
        await authenticatedPage.waitForTimeout(1000);

        // Reload
        await authenticatedPage.reload();
        await authenticatedPage.waitForLoadState("networkidle");

        // Verify toggle persisted
        const persistedCheckbox = authenticatedPage
            .locator("input[type=\"checkbox\"]")
            .first();
        const isNowChecked = await persistedCheckbox.isChecked();

        expect(isNowChecked).toBe(!wasChecked);

        // Restore
        await persistedCheckbox.click();
        await authenticatedPage.waitForTimeout(500);
        const restoreSaveButton = authenticatedPage.getByRole("button", { name: /save/i });
        await restoreSaveButton.click();
        await authenticatedPage.waitForTimeout(1000);
    });
});

test.describe("Admin Form Persistence - Contact Info", () => {
    test("should persist contact hours changes", async ({ authenticatedPage }) => {
        await authenticatedPage.goto("/admin/contact");
        await authenticatedPage.waitForLoadState("networkidle");

        // Find first hours input (likely Monday or Sunday)
        const hoursInput = authenticatedPage
            .locator("input[type=\"text\"], textarea")
            .first();

        // Get original value
        const originalHours = await hoursInput.inputValue();

        // Make a change
        const testHours = `TEST ${Date.now()}`;
        await hoursInput.fill(testHours);
        await authenticatedPage.waitForTimeout(500);

        // Save
        const saveButton = authenticatedPage.getByRole("button", { name: /save/i });
        await expect(saveButton).toBeEnabled();
        await saveButton.click();
        await authenticatedPage.waitForTimeout(1000);

        // Reload
        await authenticatedPage.reload();
        await authenticatedPage.waitForLoadState("networkidle");

        // Verify persistence
        const updatedHoursInput = authenticatedPage
            .locator("input[type=\"text\"], textarea")
            .first();
        const persistedHours = await updatedHoursInput.inputValue();

        expect(persistedHours).toContain("TEST");

        // Restore
        await updatedHoursInput.fill(originalHours);
        await authenticatedPage.waitForTimeout(500);
        const restoreSaveButton = authenticatedPage.getByRole("button", { name: /save/i });
        await restoreSaveButton.click();
        await authenticatedPage.waitForTimeout(1000);
    });
});

test.describe("Admin Form Persistence - About Section", () => {
    test("should persist about section overline changes", async ({ authenticatedPage }) => {
        await authenticatedPage.goto("/admin/homepage/about");
        await authenticatedPage.waitForLoadState("networkidle");

        // Find overline input
        const overlineInput = authenticatedPage
            .locator("input[name*=\"overline\"], input[placeholder*=\"overline\" i]")
            .first();

        if ((await overlineInput.count()) === 0) {
            test.skip();
            return;
        }

        // Get original value
        const originalOverline = await overlineInput.inputValue();

        // Make a change
        const testOverline = `TEST-${Date.now()}`;
        await overlineInput.fill(testOverline);
        await authenticatedPage.waitForTimeout(500);

        // Save
        const saveButton = authenticatedPage.getByRole("button", { name: /save/i });
        await saveButton.click();
        await authenticatedPage.waitForTimeout(1000);

        // Reload
        await authenticatedPage.reload();
        await authenticatedPage.waitForLoadState("networkidle");

        // Verify persistence
        const updatedOverlineInput = authenticatedPage
            .locator("input[name*=\"overline\"], input[placeholder*=\"overline\" i]")
            .first();
        const persistedOverline = await updatedOverlineInput.inputValue();

        expect(persistedOverline).toBe(testOverline);

        // Restore
        await updatedOverlineInput.fill(originalOverline);
        await authenticatedPage.waitForTimeout(500);
        const restoreSaveButton = authenticatedPage.getByRole("button", { name: /save/i });
        await restoreSaveButton.click();
        await authenticatedPage.waitForTimeout(1000);
    });
});

test.describe("Admin Form Persistence - Social Proof", () => {
    test("should persist social proof header changes", async ({ authenticatedPage }) => {
        await authenticatedPage.goto("/admin/homepage/social-proof");
        await authenticatedPage.waitForLoadState("networkidle");

        // Find title or subtitle input
        const headerInput = authenticatedPage
            .locator("input[name*=\"title\"], input[name*=\"subtitle\"]")
            .first();

        if ((await headerInput.count()) === 0) {
            test.skip();
            return;
        }

        // Get original value
        const originalValue = await headerInput.inputValue();

        // Make a change
        const testValue = `TEST-${Date.now()}`;
        await headerInput.fill(testValue);
        await authenticatedPage.waitForTimeout(500);

        // Save
        const saveButton = authenticatedPage.getByRole("button", { name: /save/i });
        await saveButton.click();
        await authenticatedPage.waitForTimeout(1000);

        // Reload
        await authenticatedPage.reload();
        await authenticatedPage.waitForLoadState("networkidle");

        // Verify persistence
        const updatedHeaderInput = authenticatedPage
            .locator("input[name*=\"title\"], input[name*=\"subtitle\"]")
            .first();
        const persistedValue = await updatedHeaderInput.inputValue();

        expect(persistedValue).toBe(testValue);

        // Restore
        await updatedHeaderInput.fill(originalValue);
        await authenticatedPage.waitForTimeout(500);
        const restoreSaveButton = authenticatedPage.getByRole("button", { name: /save/i });
        await restoreSaveButton.click();
        await authenticatedPage.waitForTimeout(1000);
    });
});

test.describe("Admin Form Persistence - Location Section", () => {
    test("should persist location header chip changes", async ({ authenticatedPage }) => {
        await authenticatedPage.goto("/admin/homepage/location");
        await authenticatedPage.waitForLoadState("networkidle");

        // Find chip input
        const chipInput = authenticatedPage
            .locator("input[name*=\"chip\"], input[placeholder*=\"chip\" i]")
            .first();

        if ((await chipInput.count()) === 0) {
            test.skip();
            return;
        }

        // Get original value
        const originalChip = await chipInput.inputValue();

        // Make a change
        const testChip = `TEST-${Date.now()}`;
        await chipInput.fill(testChip);
        await authenticatedPage.waitForTimeout(500);

        // Save
        const saveButton = authenticatedPage.getByRole("button", { name: /save/i });
        await saveButton.click();
        await authenticatedPage.waitForTimeout(1000);

        // Reload
        await authenticatedPage.reload();
        await authenticatedPage.waitForLoadState("networkidle");

        // Verify persistence
        const updatedChipInput = authenticatedPage
            .locator("input[name*=\"chip\"], input[placeholder*=\"chip\" i]")
            .first();
        const persistedChip = await updatedChipInput.inputValue();

        expect(persistedChip).toBe(testChip);

        // Restore
        await updatedChipInput.fill(originalChip);
        await authenticatedPage.waitForTimeout(500);
        const restoreSaveButton = authenticatedPage.getByRole("button", { name: /save/i });
        await restoreSaveButton.click();
        await authenticatedPage.waitForTimeout(1000);
    });
});

test.describe("Admin Form Persistence - Seasonal Content", () => {
    test("should persist seasonal plant name changes", async ({ authenticatedPage }) => {
        await authenticatedPage.goto("/admin/homepage/seasonal");
        await authenticatedPage.waitForLoadState("networkidle");

        // Find first plant name input
        const plantNameInput = authenticatedPage
            .locator("input[name*=\"name\"], input[placeholder*=\"name\" i]")
            .first();

        if ((await plantNameInput.count()) === 0) {
            test.skip();
            return;
        }

        // Get original value
        const originalName = await plantNameInput.inputValue();

        // Make a change
        const testName = `TEST-${Date.now()}`;
        await plantNameInput.fill(testName);
        await authenticatedPage.waitForTimeout(500);

        // Save
        const saveButton = authenticatedPage.getByRole("button", { name: /save/i });
        await saveButton.click();
        await authenticatedPage.waitForTimeout(1000);

        // Reload
        await authenticatedPage.reload();
        await authenticatedPage.waitForLoadState("networkidle");

        // Verify persistence
        const updatedPlantNameInput = authenticatedPage
            .locator("input[name*=\"name\"], input[placeholder*=\"name\" i]")
            .first();
        const persistedName = await updatedPlantNameInput.inputValue();

        expect(persistedName).toBe(testName);

        // Restore
        await updatedPlantNameInput.fill(originalName);
        await authenticatedPage.waitForTimeout(500);
        const restoreSaveButton = authenticatedPage.getByRole("button", { name: /save/i });
        await restoreSaveButton.click();
        await authenticatedPage.waitForTimeout(1000);
    });
});

test.describe("Admin Form Persistence - Cancel Behavior", () => {
    test("should discard changes when cancel is clicked", async ({ authenticatedPage }) => {
        await authenticatedPage.goto("/admin/hero");
        await authenticatedPage.waitForLoadState("networkidle");

        // Find first input
        const titleInput = authenticatedPage
            .locator("input[name*=\"title\"], input[placeholder*=\"title\" i]")
            .first();

        // Get original value
        const originalTitle = await titleInput.inputValue();

        // Make a change
        const testTitle = `TEMP-CHANGE-${Date.now()}`;
        await titleInput.fill(testTitle);
        await authenticatedPage.waitForTimeout(500);

        // Click cancel
        const cancelButton = authenticatedPage.getByRole("button", { name: /cancel/i });
        await cancelButton.click();
        await authenticatedPage.waitForTimeout(500);

        // Verify value reverted
        const revertedTitle = await titleInput.inputValue();
        expect(revertedTitle).toBe(originalTitle);
    });
});
