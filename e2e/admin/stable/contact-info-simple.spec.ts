import { test, expect } from "../../fixtures/auth";
import { gotoAdminPage } from "../../fixtures/admin";
import type { Page } from "@playwright/test";
import { APP_LINKS } from "@local/shared";

/**
 * Simplified E2E Tests for Admin Contact Info Management
 *
 * Focus on reliable, testable functionality
 */

const openContactInfo = (page: Page) =>
  gotoAdminPage(page, APP_LINKS.AdminContactInfo, /contact information/i);

test.describe("Contact Info - Basic Display", () => {
  test("should load admin contact page successfully", async ({ authenticatedPage }) => {
    await openContactInfo(authenticatedPage);
  });

  test("should display business hours section", async ({ authenticatedPage }) => {
    await openContactInfo(authenticatedPage);

    await expect(authenticatedPage.getByText("Business Hours Management")).toBeVisible();
    await expect(authenticatedPage.getByText("Set Business Hours")).toBeVisible();
    await expect(authenticatedPage.getByTestId("day-enabled-monday")).toBeVisible();
    await expect(authenticatedPage.getByTestId("day-enabled-sunday")).toBeVisible();
  });

  test("should show form controls", async ({ authenticatedPage }) => {
    await openContactInfo(authenticatedPage);

    await expect(authenticatedPage.getByTestId("apply-monday-to-all")).toBeVisible();
    await expect(authenticatedPage.getByTestId("add-note-button")).toBeVisible();
    await expect(authenticatedPage.getByTestId("save-changes-button")).toBeVisible();
    await expect(authenticatedPage.getByTestId("revert-changes-button")).toBeVisible();
  });
});

test.describe("Contact Info - Form Interactions", () => {
  test("should have save button", async ({ authenticatedPage }) => {
    await openContactInfo(authenticatedPage);

    await expect(authenticatedPage.getByTestId("save-changes-button")).toBeVisible();
    await expect(authenticatedPage.getByTestId("save-changes-button")).toContainText(/save changes/i);
  });

  test("should display day checkboxes or switches", async ({ authenticatedPage }) => {
    await openContactInfo(authenticatedPage);

    await expect(authenticatedPage.getByTestId("day-enabled-monday")).toBeVisible();
    await expect(authenticatedPage.getByTestId("day-enabled-tuesday")).toBeVisible();
    await expect(authenticatedPage.getByTestId("day-enabled-wednesday")).toBeVisible();
    await expect(authenticatedPage.getByTestId("day-enabled-thursday")).toBeVisible();
    await expect(authenticatedPage.getByTestId("day-enabled-friday")).toBeVisible();
    await expect(authenticatedPage.getByTestId("day-enabled-saturday")).toBeVisible();
    await expect(authenticatedPage.getByTestId("day-enabled-sunday")).toBeVisible();
  });

  test("should show time selectors", async ({ authenticatedPage }) => {
    await openContactInfo(authenticatedPage);

    await expect(authenticatedPage.getByTestId("open-time-monday")).toBeVisible();
    await expect(authenticatedPage.getByTestId("close-time-monday")).toBeVisible();
  });
});

test.describe("Contact Info - Advanced Features", () => {
  test("should have range grouping toggle", async ({ authenticatedPage }) => {
    await openContactInfo(authenticatedPage);

    await expect(authenticatedPage.getByLabel(/group ranges/i)).toBeVisible();
  });

  test("should display business hours preview and special notes", async ({ authenticatedPage }) => {
    await openContactInfo(authenticatedPage);

    await expect(authenticatedPage.getByRole("heading", { name: /preview/i })).toBeVisible();
    await expect(authenticatedPage.getByRole("heading", { name: /special notes/i })).toBeVisible();
    await expect(authenticatedPage.getByRole("table")).toContainText(/hours/i);
  });
});

test.describe("Contact Info - Navigation", () => {
  test("should navigate from home to contact page", async ({ authenticatedPage }) => {
    await authenticatedPage.goto(APP_LINKS.Admin);
    await expect(authenticatedPage.getByRole("heading", { name: "Contact Info" })).toBeVisible();

    await authenticatedPage.getByRole("heading", { name: "Contact Info" }).click();

    await expect(authenticatedPage).toHaveURL(/\/admin\/contact-info/);
    await expect(
      authenticatedPage.getByRole("heading", { name: /contact information/i }),
    ).toBeVisible();
  });
});
