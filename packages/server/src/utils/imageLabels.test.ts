import { IMAGE_LABELS } from "@local/shared";
import { describe, expect, it, vi } from "vitest";
import { isKnownImageLabel, removeImageLabelRelation } from "./imageLabels.js";

const createPrismaMock = (
    overrides: {
        image?: unknown;
        deletedCount?: number;
        remainingForLabel?: Array<{ id: number }>;
        remainingLabels?: Array<{ label: string }>;
        remainingPlantUsage?: number;
    } = {}
) => {
    const image = Object.prototype.hasOwnProperty.call(overrides, "image")
        ? overrides.image
        : { hash: "image-1" };
    const tx = {
        image: {
            findUnique: vi.fn().mockResolvedValue(image),
            update: vi.fn().mockResolvedValue({}),
        },
        image_labels: {
            deleteMany: vi.fn().mockResolvedValue({ count: overrides.deletedCount ?? 1 }),
            findMany: vi
                .fn()
                .mockResolvedValueOnce(overrides.remainingForLabel ?? [{ id: 8 }, { id: 3 }])
                .mockResolvedValueOnce(overrides.remainingLabels ?? []),
            update: vi.fn().mockResolvedValue({}),
        },
        plant_images: {
            count: vi.fn().mockResolvedValue(overrides.remainingPlantUsage ?? 0),
        },
    };

    return {
        tx,
        prisma: {
            $transaction: vi.fn((callback) => callback(tx)),
        },
    };
};

describe("image label utilities", () => {
    it("recognizes only supported image labels", () => {
        expect(isKnownImageLabel(IMAGE_LABELS.Gallery)).toBe(true);
        expect(isKnownImageLabel(IMAGE_LABELS.HeroBanner)).toBe(true);
        expect(isKnownImageLabel("unknown")).toBe(false);
    });

    it("removes a label, reindexes the collection, and marks an unused image as unlabeled", async () => {
        const { prisma, tx } = createPrismaMock();

        const result = await removeImageLabelRelation(prisma as never, {
            hash: "image-1",
            label: IMAGE_LABELS.Gallery,
        });

        expect(result).toEqual({
            exists: true,
            removed: true,
            remainingLabels: [],
            remainingPlantUsage: 0,
            unlabeled: true,
        });
        expect(tx.image_labels.deleteMany).toHaveBeenCalledWith({
            where: { hash: "image-1", label: IMAGE_LABELS.Gallery },
        });
        expect(tx.image_labels.findMany).toHaveBeenNthCalledWith(1, {
            where: { label: IMAGE_LABELS.Gallery },
            orderBy: [{ index: "asc" }, { id: "asc" }],
            select: { id: true },
        });
        expect(tx.image_labels.update).toHaveBeenNthCalledWith(1, {
            where: { id: 8 },
            data: { index: 0 },
        });
        expect(tx.image_labels.update).toHaveBeenNthCalledWith(2, {
            where: { id: 3 },
            data: { index: 1 },
        });
        expect(tx.image.update).toHaveBeenCalledWith({
            where: { hash: "image-1" },
            data: { unlabeled_since: expect.any(Date) },
        });
    });

    it("preserves active images by clearing unlabeled_since when labels or plant usage remain", async () => {
        const { prisma, tx } = createPrismaMock({
            remainingLabels: [{ label: IMAGE_LABELS.HeroBanner }],
            remainingPlantUsage: 1,
        });

        const result = await removeImageLabelRelation(prisma as never, {
            hash: "image-1",
            label: IMAGE_LABELS.Gallery,
        });

        expect(result).toMatchObject({
            exists: true,
            removed: true,
            remainingLabels: [IMAGE_LABELS.HeroBanner],
            remainingPlantUsage: 1,
            unlabeled: false,
        });
        expect(tx.image.update).toHaveBeenCalledWith({
            where: { hash: "image-1" },
            data: { unlabeled_since: null },
        });
    });

    it("returns idempotent success when the image exists but the label is absent", async () => {
        const { prisma } = createPrismaMock({
            deletedCount: 0,
            remainingLabels: [{ label: IMAGE_LABELS.Gallery }],
        });

        await expect(
            removeImageLabelRelation(prisma as never, {
                hash: "image-1",
                label: IMAGE_LABELS.Seasonal,
            })
        ).resolves.toMatchObject({
            exists: true,
            removed: false,
            remainingLabels: [IMAGE_LABELS.Gallery],
            unlabeled: false,
        });
    });

    it("does not mutate labels when the image is missing", async () => {
        const { prisma, tx } = createPrismaMock({ image: null });

        await expect(
            removeImageLabelRelation(prisma as never, {
                hash: "missing",
                label: IMAGE_LABELS.Gallery,
            })
        ).resolves.toEqual({
            exists: false,
            removed: false,
            remainingLabels: [],
            remainingPlantUsage: 0,
            unlabeled: false,
        });
        expect(tx.image_labels.deleteMany).not.toHaveBeenCalled();
        expect(tx.image.update).not.toHaveBeenCalled();
    });
});
