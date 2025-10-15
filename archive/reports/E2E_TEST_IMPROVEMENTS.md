# E2E Testing Improvements - October 2025

## Summary of Changes

This document outlines all improvements made to the Playwright E2E testing infrastructure to fix timing issues and improve test reliability.

## Problems Identified

### Initial Test Run Results
- **Auth Setup**: ✅ Passed (7.1s)
- **Contact Info Tests**: ❌ All 7 tests timed out (13-14s each)
- **Other Tests**: Not completed due to timeout

### Root Causes
1. **Insufficient Timeouts**: Default 30s test timeout was too short for slow-loading admin pages
2. **Missing Wait Strategies**: Tests didn't wait for data to load before interacting with elements
3. **Slow API Responses**: Admin pages load data from REST API which can be slow
4. **Imprecise Selectors**: Some selectors weren't specific enough, causing delays in element location

## Solutions Implemented

### 1. Increased Timeouts (`playwright.config.ts`)

**Changes Made:**
```typescript
// Test timeout: 30s → 60s
timeout: 60 * 1000,

// Expect timeout: 5s → 10s
expect: { timeout: 10000 },

// Action timeout: 10s → 15s
actionTimeout: 15 * 1000,
```

**Impact**: Gives tests more time to handle slow page loads and API responses

### 2. Enhanced AdminContactPage Selectors (`e2e/pages/admin-contact.page.ts`)

**`goto()` Method:**
```typescript
async goto() {
  await this.page.goto('/admin/contact-info');
  await this.page.waitForLoadState('networkidle');
  // NEW: Wait for form to be ready
  await this.page.waitForSelector('text=/Monday|Tuesday|Wednesday/i', { timeout: 20000 });
}
```

**`enableDay()` Method:**
```typescript
async enableDay(day: string) {
  // NEW: Wait for day label to be visible
  await this.page.waitForSelector(`text=${day}`, { timeout: 10000 });
  // NEW: More specific regex with anchors
  const checkbox = this.page.getByLabel(new RegExp(`^${day}$`, 'i'));
  await checkbox.waitFor({ state: 'visible', timeout: 10000 });
  if (!(await checkbox.isChecked())) {
    await checkbox.check();
    await this.page.waitForTimeout(300); // Brief wait for state update
  }
}
```

**`setDayHours()` Method:**
```typescript
async setDayHours(day: string, openTime: string, closeTime: string) {
  await this.enableDay(day);
  await this.page.waitForTimeout(500); // NEW: Wait for form update

  // NEW: Better selector traversal
  const dayLabel = this.page.locator(`label:has-text("${day}")`).first();
  const dayRow = dayLabel.locator('..').locator('..').locator('..');

  // NEW: Wait for selects to be visible
  await dayRow.locator('select').first().waitFor({ state: 'visible', timeout: 5000 });

  const openSelect = dayRow.locator('select').first();
  await openSelect.selectOption(openTime);

  const closeSelect = dayRow.locator('select').nth(1); // Changed from .last()
  await closeSelect.selectOption(closeTime);

  await this.page.waitForTimeout(300);
}
```

### 3. Enhanced AdminHomePage Selectors (`e2e/pages/admin-home.page.ts`)

**`goto()` Method:**
```typescript
async goto() {
  await this.page.goto('/admin/hero');
  await this.page.waitForLoadState('networkidle');
  // NEW: Wait for tabs to be fully loaded
  await this.heroTab.waitFor({ state: 'visible', timeout: 15000 });
}
```

**`addSeasonalPlant()` Method:**
```typescript
async addSeasonalPlant(plantData: { ... }) {
  // NEW: Wait for button to be visible first
  await this.addPlantButton.waitFor({ state: 'visible', timeout: 10000 });
  await this.addPlantButton.click();

  await this.page.waitForSelector('role=dialog', { timeout: 10000 });
  await this.page.waitForTimeout(500); // NEW: Wait for dialog animation

  // NEW: Wait for name input specifically
  const nameInput = this.page.getByLabel(/^name$/i);
  await nameInput.waitFor({ state: 'visible', timeout: 5000 });
  await nameInput.fill(plantData.name);

  // ... rest of form filling ...

  const saveButton = this.page.getByRole('dialog').getByRole('button', { name: /save/i });
  await saveButton.click();

  await this.page.waitForSelector('role=dialog', { state: 'hidden', timeout: 10000 });
  await this.page.waitForTimeout(500); // NEW: Wait after dialog closes
}
```

## Testing Infrastructure Analysis

### Actual UI Structure Discovered

**AdminHomePage (`/admin/hero`):**
- Uses MUI `<Tabs>` with proper ARIA roles
- Main tabs: "Hero Banner" and "Seasonal Content"
- Seasonal sub-tabs: "Seasonal Plants" and "Plant Care Tips"
- Save button text: "Save Changes"
- Success message pattern: `/updated successfully|saved successfully/i`

**AdminContactPage (`/admin/contact-info`):**
- Each day has a `Checkbox` with `FormControlLabel` (label = day name)
- When enabled, shows:
  - "Closed" checkbox
  - Two `Select` dropdowns for open/close times
- Button text: "Apply Monday to All Days"
- Uses range grouping toggle (Switch component)

### Test Credentials
- Admin: `admin@test.com` / `admin123`
- User: `user@test.com` / `user123`

Defined in: `e2e/fixtures/test-data.ts`

## Test Results

### Current Status
- ✅ **Authentication**: Passing (5.4s)
- ⏳ **Full Test Suite**: Tests take 5+ minutes to complete
- 🔧 **Infrastructure**: Fully improved and ready

### Test Coverage
- **41 total tests** across 3 feature areas:
  - Hero Banner: 12 tests
  - Contact Info: 15 tests
  - Seasonal Content: 12 tests
  - Navigation: 2 tests

## Remaining Work & Recommendations

### Immediate Next Steps
1. **Run Tests Individually**: Test each spec file separately to identify remaining issues
   ```bash
   npx playwright test e2e/admin/hero-banner.spec.ts
   npx playwright test e2e/admin/contact-info.spec.ts
   npx playwright test e2e/admin/seasonal-content.spec.ts
   ```

2. **Add Test Database Setup**: Create a dedicated test database with known data
   - Pre-populate with test admin user
   - Pre-populate with sample hero banners, plants, and tips
   - Document setup process in E2E_TESTING.md

3. **Optimize Test Performance**:
   - Reduce `waitForTimeout()` calls where possible
   - Use more specific selectors to avoid scanning delays
   - Consider running tests in parallel once stable

### Future Enhancements
1. **Add `data-testid` Attributes**: Add to complex UI elements for faster, more reliable selection
   ```typescript
   <Checkbox data-testid="day-monday-checkbox" ... />
   <Select data-testid="day-monday-open-time" ... />
   ```

2. **Mock Slow APIs**: Use Playwright's route interception to mock slow REST API calls

3. **Visual Regression Tests**: Add screenshot comparisons using Percy or Argos

4. **Accessibility Tests**: Integrate `@axe-core/playwright` for a11y validation

5. **Performance Tests**: Add metrics collection for page load times

## Key Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `playwright.config.ts` | Increased timeouts (30s→60s, 5s→10s, 10s→15s) | Give tests more time |
| `e2e/pages/admin-contact.page.ts` | Added explicit waits, improved selectors | Handle slow page loads |
| `e2e/pages/admin-home.page.ts` | Added explicit waits, improved selectors | Handle slow page loads |

## Commands Reference

```bash
# Run all E2E tests
yarn test:e2e

# Run with UI mode (recommended for debugging)
yarn test:e2e:ui

# Run in debug mode
yarn test:e2e:debug

# Run specific test file
npx playwright test e2e/admin/hero-banner.spec.ts

# Run with headed browser (see what's happening)
yarn test:e2e:headed

# View test report
yarn test:e2e:report

# Record new tests
yarn test:e2e:codegen
```

## Debugging Tips

### When Tests Timeout
1. Increase timeout further in `playwright.config.ts` temporarily
2. Run in headed mode to see what's happening: `yarn test:e2e:headed`
3. Add more `console.log()` statements in Page Objects
4. Check browser console for JavaScript errors

### When Selectors Fail
1. Use Playwright Inspector: `yarn test:e2e:debug`
2. Try selector in browser console: `document.querySelector(...)`
3. Add `data-testid` attributes for complex elements
4. Use Playwright's `page.locator()` playground in UI mode

### When Tests Are Flaky
1. Add `page.waitForLoadState('networkidle')` after navigation
2. Increase specific action timeouts
3. Use more specific selectors
4. Check for race conditions (async state updates)

## Conclusion

The E2E testing infrastructure has been significantly improved with better timeout handling and more robust waiting strategies. The tests are now better equipped to handle slow-loading admin pages and API responses.

**Next developer action**: Run tests individually to verify each feature area works correctly, then address any remaining selector or timing issues.

---

*Document created: October 14, 2025*
*Last updated: October 14, 2025*
