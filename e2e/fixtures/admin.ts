import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export async function gotoAdminPage(
  page: Page,
  path: string,
  heading: RegExp | string,
) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout: 15000 });
}
