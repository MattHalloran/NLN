import { test, expect } from "../../fixtures/auth";
import { gotoAdminPage } from "../../fixtures/admin";
import type { Page } from "@playwright/test";
import { APP_LINKS, REST_ROUTES, stripApiPrefix } from "@local/shared";

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
        await expect(authenticatedPage.getByTestId("save-changes-button")).toContainText(
            /save changes/i,
        );
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

    test("should display business hours preview and special notes", async ({
        authenticatedPage,
    }) => {
        await openContactInfo(authenticatedPage);

        await expect(authenticatedPage.getByRole("heading", { name: /preview/i })).toBeVisible();
        await expect(
            authenticatedPage.getByRole("heading", { name: /special notes/i }),
        ).toBeVisible();
        await expect(authenticatedPage.getByRole("table")).toContainText(/hours/i);
    });

    test("should save a special note and return it from the persisted document", async ({
        authenticatedPage,
    }) => {
        await openContactInfo(authenticatedPage);

        const note = `E2E persisted note ${Date.now()}`;
        await authenticatedPage.getByTestId("add-note-button").click();
        await authenticatedPage.locator('[data-testid^="note-input-"] input').last().fill(note);

        const saveResponse = authenticatedPage.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.landingPage.contactInfo)) &&
                response.request().method() === "PUT" &&
                response.status() === 200,
        );
        await authenticatedPage.getByTestId("save-changes-button").click();
        const responseBody = await (await saveResponse).json();

        expect(JSON.stringify(responseBody.data.contact)).toContain(note);
    });

    test("should keep unsaved contact edits visible when the save request fails", async ({
        authenticatedPage,
    }) => {
        await openContactInfo(authenticatedPage);

        const note = `E2E failed save note ${Date.now()}`;
        await authenticatedPage.getByTestId("add-note-button").click();
        const noteInput = authenticatedPage.locator('[data-testid^="note-input-"] input').last();
        await noteInput.fill(note);

        await authenticatedPage.route(
            `**${REST_ROUTES.landingPage.contactInfo}**`,
            async (route) => {
                if (route.request().method() === "PUT") {
                    await route.fulfill({
                        status: 500,
                        contentType: "application/json",
                        body: JSON.stringify({ error: "Injected E2E contact save failure" }),
                    });
                    return;
                }

                await route.fallback();
            },
        );

        const saveResponse = authenticatedPage.waitForResponse(
            (response) =>
                response.url().includes(stripApiPrefix(REST_ROUTES.landingPage.contactInfo)) &&
                response.request().method() === "PUT",
        );
        await authenticatedPage.getByTestId("save-changes-button").click();

        expect((await saveResponse).status()).toBe(500);
        await expect(
            authenticatedPage.getByText(/failed to update contact information/i),
        ).toBeVisible();
        await expect(noteInput).toHaveValue(note);
        await expect(authenticatedPage.getByTestId("save-changes-button")).toBeEnabled();
    });
});

test.describe("Contact Info - Navigation", () => {
    test("should navigate from home to contact page", async ({ authenticatedPage }) => {
        await authenticatedPage.goto(APP_LINKS.Admin);
        await expect(
            authenticatedPage.getByRole("heading", { name: "Contact Info" }),
        ).toBeVisible();

        await authenticatedPage.getByRole("heading", { name: "Contact Info" }).click();

        await expect(authenticatedPage).toHaveURL(/\/admin\/contact-info/);
        await expect(
            authenticatedPage.getByRole("heading", { name: /contact information/i }),
        ).toBeVisible();
    });
});
