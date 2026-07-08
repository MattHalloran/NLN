import { IMAGE_LABELS, REST_CHILD_PATHS } from "@local/shared";
import express, { type RequestHandler } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createImagesRouter, estimateImageUploadSizeMB, sortImagesByLabelIndex } from "./images.js";

const { auditAdminAction, loggerLog, removeImageLabelRelation } = vi.hoisted(() => ({
    auditAdminAction: vi.fn(),
    loggerLog: vi.fn(),
    removeImageLabelRelation: vi.fn(),
}));

vi.mock("../utils/index.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../utils/index.js")>();

    return {
        ...actual,
        removeImageLabelRelation,
    };
});

vi.mock("../utils/auditLogger.js", () => ({
    AuditEventType: {
        ADMIN_IMAGE_UPDATE: "ADMIN_IMAGE_UPDATE",
    },
    auditAdminAction,
}));

vi.mock("../logger.js", () => ({
    LogLevel: {
        error: "error",
        warn: "warn",
    },
    logger: {
        log: loggerLog,
    },
}));

const createApp = (options: { isAdmin?: boolean; prisma?: unknown } = {}) => {
    const app = express();
    app.use(express.json());
    app.use(((req, _res, next) => {
        req.isAdmin = options.isAdmin ?? true;
        req.prisma = (options.prisma ?? {}) as never;
        next();
    }) as RequestHandler);
    app.use(createImagesRouter());
    return app;
};

describe("image REST helpers", () => {
    beforeEach(() => {
        auditAdminAction.mockReset();
        loggerLog.mockReset();
        removeImageLabelRelation.mockReset();
    });

    it("estimates generated image storage with the route multiplier", () => {
        const oneMiB = 1024 * 1024;

        expect(estimateImageUploadSizeMB([{ size: oneMiB }, { size: oneMiB / 2 }])).toBe(5.25);
    });

    it("sorts images by the filtered label index and strips label metadata", () => {
        const result = sortImagesByLabelIndex([
            {
                hash: "late",
                alt: "Late",
                image_labels: [{ index: 5 }],
            },
            {
                hash: "early",
                alt: "Early",
                image_labels: [{ index: 1 }],
            },
            {
                hash: "default",
                alt: "Default",
                image_labels: [],
            },
        ]);

        expect(result).toEqual([
            { hash: "default", alt: "Default" },
            { hash: "early", alt: "Early" },
            { hash: "late", alt: "Late" },
        ]);
    });

    it("removes an image label without deleting the image asset", async () => {
        removeImageLabelRelation.mockResolvedValue({
            exists: true,
            removed: true,
            remainingLabels: [],
            remainingPlantUsage: 0,
            unlabeled: true,
        });

        const response = await request(createApp())
            .delete(
                REST_CHILD_PATHS.images.label
                    .replace(":hash", "abc123")
                    .replace(":label", IMAGE_LABELS.Gallery)
            )
            .expect(200);

        expect(response.body).toMatchObject({
            success: true,
            hash: "abc123",
            removedLabel: IMAGE_LABELS.Gallery,
            removed: true,
            remainingLabels: [],
            remainingPlantUsage: 0,
            unlabeled: true,
            message: "Removed image from gallery",
        });
        expect(removeImageLabelRelation).toHaveBeenCalledWith(expect.anything(), {
            hash: "abc123",
            label: IMAGE_LABELS.Gallery,
        });
        expect(auditAdminAction).toHaveBeenCalledWith(
            expect.anything(),
            "ADMIN_IMAGE_UPDATE",
            "images",
            undefined,
            expect.objectContaining({ hash: "abc123", removedLabel: IMAGE_LABELS.Gallery })
        );
    });

    it("returns idempotent success when the label is already absent", async () => {
        removeImageLabelRelation.mockResolvedValue({
            exists: true,
            removed: false,
            remainingLabels: [IMAGE_LABELS.HeroBanner],
            remainingPlantUsage: 0,
            unlabeled: false,
        });

        const response = await request(createApp())
            .delete(
                REST_CHILD_PATHS.images.label
                    .replace(":hash", "abc123")
                    .replace(":label", IMAGE_LABELS.Gallery)
            )
            .expect(200);

        expect(response.body).toMatchObject({
            success: true,
            removed: false,
            remainingLabels: [IMAGE_LABELS.HeroBanner],
            unlabeled: false,
            message: "Image was already absent from gallery",
        });
    });

    it("validates label removal route inputs", async () => {
        await request(createApp({ isAdmin: false }))
            .delete(
                REST_CHILD_PATHS.images.label
                    .replace(":hash", "abc123")
                    .replace(":label", IMAGE_LABELS.Gallery)
            )
            .expect(401);

        await request(createApp())
            .delete(
                REST_CHILD_PATHS.images.label
                    .replace(":hash", "abc123")
                    .replace(":label", "unknown")
            )
            .expect(400);

        removeImageLabelRelation.mockResolvedValue({
            exists: false,
            removed: false,
            remainingLabels: [],
            remainingPlantUsage: 0,
            unlabeled: false,
        });

        await request(createApp())
            .delete(
                REST_CHILD_PATHS.images.label
                    .replace(":hash", "missing")
                    .replace(":label", IMAGE_LABELS.Gallery)
            )
            .expect(404);
        expect(removeImageLabelRelation).toHaveBeenCalled();
    });
});
