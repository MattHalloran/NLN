import {
    APP_LINKS,
    CSRF,
    DEFAULT_SERVER_URLS,
    IMAGE_LABELS,
    REST_ROUTES,
    stripApiPrefix,
} from "@local/shared";
import type { Page } from "@playwright/test";
import sharp from "sharp";
import { test, expect } from "../../fixtures/auth";

const createPngImageBuffer = async (seed: number, variant: "checker" | "stripes") => {
    const width = 64;
    const height = 64;
    const bytesPerPixel = 3;
    const pixels = Buffer.alloc(width * height * bytesPerPixel);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const offset = (y * width + x) * bytesPerPixel;
            const value =
                (seed * 1103515245 + x * 374761393 + y * 668265263 + (x * y + 1) * 2246822519) >>>
                0;
            const block = ((x >> 3) + (y >> 3) + seed) % 3;
            const red =
                variant === "checker"
                    ? (value + block * 83) % 256
                    : (value >>> 16) % 160;
            const green =
                variant === "checker"
                    ? (value >>> 8) % 180
                    : (value + block * 59) % 256;
            const blue =
                variant === "checker"
                    ? (value >>> 16) % 160
                    : (value >>> 8) % 256;

            pixels[offset] = red;
            pixels[offset + 1] = green;
            pixels[offset + 2] = blue;
        }
    }

    return sharp(pixels, {
        raw: {
            width,
            height,
            channels: bytesPerPixel,
        },
    })
        .png()
        .toBuffer();
};

const dragByHtml5Events = async (page: Page, sourceTestId: string, targetTestId: string) => {
    await page.evaluate(
        async ({ sourceTestId, targetTestId }) => {
            const source = document.querySelector(`[data-testid="${sourceTestId}"]`);
            const target = document.querySelector(`[data-testid="${targetTestId}"]`);
            if (!source || !target) {
                throw new Error(`Unable to find drag source ${sourceTestId} or target ${targetTestId}`);
            }

            const dataTransfer = new DataTransfer();
            const dispatchDragEvent = (element: Element, type: string) => {
                const event = new DragEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    dataTransfer,
                    clientX: element.getBoundingClientRect().left + element.getBoundingClientRect().width / 2,
                    clientY: element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2,
                });
                element.dispatchEvent(event);
            };

            dispatchDragEvent(source, "dragstart");
            dispatchDragEvent(target, "dragenter");
            dispatchDragEvent(target, "dragover");
            dispatchDragEvent(target, "drop");
            dispatchDragEvent(source, "dragend");
        },
        { sourceTestId, targetTestId },
    );
};

const deleteUploadedImages = async (authenticatedPage: Page, hashes: string[]) => {
    if (hashes.length === 0) return;

    const csrfResponse = await authenticatedPage.request.get(
        `${DEFAULT_SERVER_URLS.localOrigin}${REST_ROUTES.csrfToken}`,
    );
    expect(csrfResponse.ok()).toBe(true);
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData[CSRF.ResponseTokenField];
    expect(csrfToken).toBeTruthy();

    for (const hash of hashes) {
        const cleanupResponse = await authenticatedPage.request.delete(
            `${DEFAULT_SERVER_URLS.localOrigin}${REST_ROUTES.images.root}/${hash}?force=true`,
            {
                headers: {
                    [CSRF.HeaderName]: csrfToken,
                },
            },
        );
        expect(cleanupResponse.ok()).toBe(true);
    }
};

const waitForGalleryHashes = async (authenticatedPage: Page, hashes: string[]) => {
    await expect
        .poll(async () => {
            const response = await authenticatedPage.request.get(
                `${DEFAULT_SERVER_URLS.localOrigin}${REST_ROUTES.images.byLabel(IMAGE_LABELS.Gallery)}`,
            );
            if (!response.ok()) return [];
            const images = (await response.json()) as Array<{ hash: string }>;
            return images.map((image) => image.hash);
        })
        .toEqual(expect.arrayContaining(hashes));
};

const gotoAdminGalleryWithHashes = async (authenticatedPage: Page, hashes: string[]) => {
    const responsePromise = authenticatedPage.waitForResponse(async (response) => {
        if (
            !response.url().includes(stripApiPrefix(REST_ROUTES.images.root)) ||
            !response.url().includes(`label=${IMAGE_LABELS.Gallery}`) ||
            response.request().method() !== "GET" ||
            response.status() !== 200
        ) {
            return false;
        }

        const images = (await response.json()) as Array<{ hash: string }>;
        const responseHashes = images.map((image) => image.hash);
        return hashes.every((hash) => responseHashes.includes(hash));
    });

    await authenticatedPage.goto(APP_LINKS.AdminGallery);
    await responsePromise;
};

test.describe("Admin Gallery", () => {
    test("uploads, edits, and publishes a gallery image", async ({ authenticatedPage }) => {
        const runId = Date.now();
        const imageName = `e2e-gallery-${runId}.png`;
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
                buffer: await createPngImageBuffer(runId, "checker"),
            });
            await authenticatedPage.getByRole("button", { name: /upload images/i }).click();
            const uploadResponse = await uploadResponsePromise;
            const uploadBody = (await uploadResponse.json()) as Array<{
                hash?: string;
                success?: boolean;
            }>;
            uploadedHash = uploadBody.find((result) => result.hash)?.hash;
            expect(uploadedHash).toBeTruthy();
            await waitForGalleryHashes(authenticatedPage, [uploadedHash]);
            await gotoAdminGalleryWithHashes(authenticatedPage, [uploadedHash]);

            const uploadedCard = authenticatedPage.getByTestId(`gallery-image-card-${uploadedHash}`);
            await expect(uploadedCard).toBeVisible();
            await uploadedCard.getByRole("button", { name: /edit image data/i }).click();
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
            await expect(authenticatedPage.getByText(description).first()).toBeVisible();

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

            await authenticatedPage.goto(APP_LINKS.AdminGallery);
            await authenticatedPage
                .getByTestId(`gallery-image-card-${uploadedHash}`)
                .getByRole("button", { name: /delete image/i })
                .click();
            const deleteDialog = authenticatedPage.getByRole("dialog", {
                name: /remove from gallery/i,
            });
            await expect(deleteDialog).toBeVisible();
            const removeLabelResponsePromise = authenticatedPage.waitForResponse(
                (response) =>
                    response.url().includes(
                        `${stripApiPrefix(REST_ROUTES.images.root)}/${uploadedHash}/labels/${IMAGE_LABELS.Gallery}`,
                    ) &&
                    response.request().method() === "DELETE" &&
                    response.status() === 200,
            );
            await deleteDialog.getByRole("button", { name: /^remove$/i }).click();
            await removeLabelResponsePromise;
        } finally {
            if (uploadedHash) {
                await deleteUploadedImages(authenticatedPage, [uploadedHash]);
            }
        }
    });

    test("reorders gallery images by dragging cards and persists the new order", async ({
        authenticatedPage,
    }) => {
        const runId = Date.now();
        const uploadedHashes: string[] = [];

        try {
            await authenticatedPage.goto(APP_LINKS.AdminGallery);
            await expect(
                authenticatedPage.getByRole("heading", { name: /^gallery$/i }),
            ).toBeVisible();

            const uploadResponsePromise = authenticatedPage.waitForResponse(
                (response) =>
                    response.url().includes(stripApiPrefix(REST_ROUTES.images.root)) &&
                    response.request().method() === "POST" &&
                    response.status() === 200,
            );
            await authenticatedPage.locator('input[type="file"]').setInputFiles([
                {
                    name: `e2e-gallery-order-a-${runId}.png`,
                    mimeType: "image/png",
                    buffer: await createPngImageBuffer(runId, "checker"),
                },
                {
                    name: `e2e-gallery-order-b-${runId}.png`,
                    mimeType: "image/png",
                    buffer: await createPngImageBuffer(runId + 1, "stripes"),
                },
            ]);
            await authenticatedPage.getByRole("button", { name: /upload images/i }).click();
            const uploadBody = (await (await uploadResponsePromise).json()) as Array<{
                hash?: string;
                success?: boolean;
            }>;
            uploadedHashes.push(
                ...uploadBody
                    .filter((result) => result.success && result.hash)
                    .map((result) => result.hash as string),
            );
            expect(uploadedHashes).toHaveLength(2);
            await waitForGalleryHashes(authenticatedPage, uploadedHashes);
            await gotoAdminGalleryWithHashes(authenticatedPage, uploadedHashes);

            const firstCard = authenticatedPage.getByTestId(
                `gallery-image-card-${uploadedHashes[0]}`,
            );
            const secondCard = authenticatedPage.getByTestId(
                `gallery-image-card-${uploadedHashes[1]}`,
            );
            await expect(firstCard).toBeVisible();
            await expect(secondCard).toBeVisible();

            await dragByHtml5Events(
                authenticatedPage,
                `gallery-image-card-${uploadedHashes[1]}`,
                `gallery-image-card-${uploadedHashes[0]}`,
            );
            await expect
                .poll(() =>
                    authenticatedPage.evaluate(
                        ({ firstTestId, secondTestId }) => {
                            const firstElement = document.querySelector(
                                `[data-testid="${firstTestId}"]`,
                            );
                            const secondElement = document.querySelector(
                                `[data-testid="${secondTestId}"]`,
                            );
                            if (!firstElement || !secondElement) return false;

                            return Boolean(
                                secondElement.compareDocumentPosition(firstElement) &
                                    Node.DOCUMENT_POSITION_FOLLOWING,
                            );
                        },
                        {
                            firstTestId: `gallery-image-card-${uploadedHashes[0]}`,
                            secondTestId: `gallery-image-card-${uploadedHashes[1]}`,
                        },
                    ),
                )
                .toBe(true);

            const updateResponsePromise = authenticatedPage.waitForResponse(
                (response) =>
                    response.url().includes(stripApiPrefix(REST_ROUTES.images.root)) &&
                    response.request().method() === "PUT" &&
                    response.status() === 200,
            );
            await authenticatedPage.getByRole("button", { name: /^apply$/i }).click();
            const updateResponse = await updateResponsePromise;
            const updatePayload = updateResponse.request().postDataJSON() as {
                images: Array<{ hash: string }>;
            };

            const savedHashes = updatePayload.images.map((image) => image.hash);
            expect(savedHashes.indexOf(uploadedHashes[1])).toBeLessThan(
                savedHashes.indexOf(uploadedHashes[0]),
            );

            const galleryResponse = await authenticatedPage.request.get(
                `${DEFAULT_SERVER_URLS.localOrigin}${REST_ROUTES.images.byLabel(IMAGE_LABELS.Gallery)}`,
            );
            expect(galleryResponse.status()).toBe(200);
            const galleryImages = (await galleryResponse.json()) as Array<{ hash: string }>;
            const persistedHashes = galleryImages.map((image) => image.hash);
            expect(persistedHashes.indexOf(uploadedHashes[1])).toBeLessThan(
                persistedHashes.indexOf(uploadedHashes[0]),
            );
        } finally {
            await deleteUploadedImages(authenticatedPage, uploadedHashes);
        }
    });
});
