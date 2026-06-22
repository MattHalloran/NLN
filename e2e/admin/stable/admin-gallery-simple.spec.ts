import {
    APP_LINKS,
    CSRF,
    DEFAULT_SERVER_URLS,
    IMAGE_LABELS,
    REST_ROUTES,
    stripApiPrefix,
} from "@local/shared";
import { test, expect } from "../../fixtures/auth";

const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAGElEQVR4nGMQqQggCTGMaqgY1SAyXDUAALrA3AHTNK46AAAAAElFTkSuQmCC",
    "base64",
);

test.describe("Admin Gallery", () => {
    test("uploads, edits, and publishes a gallery image", async ({ authenticatedPage }) => {
        const imageName = `e2e-gallery-${Date.now()}.png`;
        const altText = `E2E gallery alt ${Date.now()}`;
        const description = "Uploaded and edited by the stable admin E2E suite.";
        let uploadedHash: string | undefined;

        try {
            await authenticatedPage.goto(APP_LINKS.AdminGallery);
            await expect(
                authenticatedPage.getByRole("heading", { name: /^gallery$/i }),
            ).toBeVisible();
            await expect(authenticatedPage.getByText(/reorder and delete images/i)).toBeVisible();

            const uploadResponsePromise = authenticatedPage.waitForResponse(
                (response) =>
                    response.url().includes(stripApiPrefix(REST_ROUTES.images.root)) &&
                    response.request().method() === "POST" &&
                    response.status() === 200,
            );
            await authenticatedPage.locator('input[type="file"]').setInputFiles({
                name: imageName,
                mimeType: "image/png",
                buffer: tinyPng,
            });
            await authenticatedPage.getByRole("button", { name: /upload images/i }).click();
            const uploadResponse = await uploadResponsePromise;
            const uploadBody = (await uploadResponse.json()) as Array<{
                hash?: string;
                success?: boolean;
            }>;
            uploadedHash = uploadBody.find((result) => result.hash)?.hash;
            expect(uploadedHash).toBeTruthy();

            await expect(
                authenticatedPage.getByRole("button", { name: /edit image data/i }).last(),
            ).toBeVisible();
            await authenticatedPage
                .getByRole("button", { name: /edit image data/i })
                .last()
                .click();
            await expect(authenticatedPage.getByRole("dialog")).toBeVisible();
            await expect(
                authenticatedPage.getByRole("heading", { name: "Edit Image Data", exact: true }),
            ).toBeVisible();
            await authenticatedPage.getByLabel(/^alt$/i).fill(altText);
            await authenticatedPage.getByLabel(/^description$/i).fill(description);
            await authenticatedPage
                .getByRole("dialog")
                .getByRole("button", { name: /^save$/i })
                .click();

            const updateResponsePromise = authenticatedPage.waitForResponse(
                (response) =>
                    response.url().includes(stripApiPrefix(REST_ROUTES.images.root)) &&
                    response.request().method() === "PUT" &&
                    response.status() === 200,
            );
            await authenticatedPage.getByRole("button", { name: /^apply$/i }).click();
            await updateResponsePromise;

            await authenticatedPage.goto(APP_LINKS.Gallery);
            await expect(authenticatedPage.getByRole("heading", { name: altText })).toBeVisible();
            await expect(authenticatedPage.getByText(description)).toBeVisible();

            const galleryResponse = await authenticatedPage.request.get(
                `${DEFAULT_SERVER_URLS.localOrigin}${REST_ROUTES.images.byLabel(IMAGE_LABELS.Gallery)}`,
            );
            expect(galleryResponse.status()).toBe(200);
            const galleryImages = (await galleryResponse.json()) as Array<{
                hash: string;
                alt?: string;
                description?: string;
            }>;
            expect(galleryImages).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        hash: uploadedHash,
                        alt: altText,
                        description,
                    }),
                ]),
            );
        } finally {
            if (uploadedHash) {
                const csrfResponse = await authenticatedPage.request.get(
                    `${DEFAULT_SERVER_URLS.localOrigin}${REST_ROUTES.csrfToken}`,
                );
                expect(csrfResponse.ok()).toBe(true);
                const csrfData = await csrfResponse.json();
                const csrfToken = csrfData[CSRF.ResponseTokenField];
                expect(csrfToken).toBeTruthy();

                const cleanupResponse = await authenticatedPage.request.delete(
                    `${DEFAULT_SERVER_URLS.localOrigin}${REST_ROUTES.images.root}/${uploadedHash}?force=true`,
                    {
                        headers: {
                            [CSRF.HeaderName]: csrfToken,
                        },
                    },
                );
                expect(cleanupResponse.ok()).toBe(true);
            }
        }
    });
});
