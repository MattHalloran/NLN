import { test as setup } from "@playwright/test";
import { setupAuth } from "./fixtures/auth";

/**
 * Global Setup: Admin Authentication
 *
 * This file runs once before all tests to set up authentication.
 * It logs in as an admin user and saves the auth state to a file.
 * All subsequent tests reuse this authentication state.
 *
 * Benefits:
 * - Faster test execution (login only once)
 * - More reliable (avoids repeated login operations)
 * - Cleaner test code (no login boilerplate in each test)
 */

setup("authenticate as admin", async ({ page }) => {
  await setupAuth(page);
});
