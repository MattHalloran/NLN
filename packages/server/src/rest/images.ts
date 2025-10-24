import { Router, Request, Response } from "express";
import { CODE } from "@local/shared";
import { CustomError } from "../error.js";
import { saveImage } from "../utils/index.js";
import { logger, LogLevel } from "../logger.js";
import { auditAdminAction, AuditEventType } from "../utils/auditLogger.js";

const router = Router();

/**
 * GET /api/rest/v1/images?label=:label
 * Get images by label
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        const { label } = req.query;
        const { prisma } = req;

        if (!label || typeof label !== "string") {
            return res.status(400).json({ error: "Label parameter required" });
        }

        if (!prisma) {
            return res.status(500).json({ error: "Database connection not available" });
        }

        // Get all images with label
        type ImageWithLabels = {
            hash: string;
            image_labels: Array<{ label: string; index: number | null }>;
        };

        const images = await prisma.image.findMany({
            where: { image_labels: { some: { label } } },
            select: { hash: true, image_labels: { select: { label: true, index: true } } },
        });

        // Sort by position
        const sortedImages = (images as ImageWithLabels[]).sort((a, b) => {
            const aIndex = a.image_labels.find((l) => l.label === label);
            const bIndex = b.image_labels.find((l) => l.label === label);
            return (aIndex?.index ?? 0) - (bIndex?.index ?? 0);
        });

        const imageData = await prisma.image.findMany({
            where: { hash: { in: sortedImages.map((i) => i.hash) } },
            select: {
                hash: true,
                alt: true,
                description: true,
                files: {
                    select: {
                        src: true,
                        width: true,
                        height: true,
                    },
                },
            },
        });

        return res.json(imageData);
    } catch (error) {
        logger.log(LogLevel.error, "Get images error:", error);
        return res.status(500).json({ error: "Failed to get images" });
    }
});

/**
 * POST /api/rest/v1/images
 * Add images (admin only, multipart/form-data)
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { isAdmin } = req;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        type MulterRequest = Request & { files?: Express.Multer.File[] };
        const files = (req as MulterRequest).files || [];
        const { label, alts, descriptions } = req.body as {
            label?: string;
            alts?: string | string[];
            descriptions?: string | string[];
        };

        if (!files || files.length === 0) {
            return res.status(400).json({ error: "No files provided" });
        }

        const labels = label ? [label] : [];
        const altArray = alts ? (Array.isArray(alts) ? alts : [alts]) : [];
        const descArray = descriptions
            ? Array.isArray(descriptions)
                ? descriptions
                : [descriptions]
            : [];

        const results = [];

        // Loop through every image passed in
        for (let i = 0; i < files.length; i++) {
            const file: Express.Multer.File | undefined = files[i];
            if (file) {
                const result = await saveImage({
                    file: Promise.resolve(file),
                    alt: altArray[i],
                    description: descArray[i],
                    labels,
                    errorOnDuplicate: false,
                });
                results.push(result);
            }
        }

        // Audit log: image upload
        auditAdminAction(
            req,
            AuditEventType.ADMIN_IMAGE_UPLOAD,
            "images",
            undefined,
            {
                uploadedCount: results.filter((r) => r.success).length,
                label,
            },
        );

        return res.json(results);
    } catch (error) {
        logger.log(LogLevel.error, "Add images error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to add images" });
    }
});

/**
 * PUT /api/rest/v1/images
 * Update images (admin only)
 */
router.put("/", async (req: Request, res: Response) => {
    try {
        const { images } = req.body;
        const { prisma, isAdmin } = req as any;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!images || !Array.isArray(images)) {
            return res.status(400).json({ error: "Images array required" });
        }

        // Loop through update data passed in
        for (let i = 0; i < images.length; i++) {
            const curr = images[i];

            if (curr.label) {
                // Update position in label
                await prisma.image_labels.update({
                    where: { hash_label: { hash: curr.hash, label: curr.label } },
                    data: { index: i },
                });
            }

            // Update alt and description
            await prisma.image.update({
                where: { hash: curr.hash },
                data: {
                    alt: curr.alt,
                    description: curr.description,
                },
            });
        }

        // Audit log: image update
        auditAdminAction(
            req,
            AuditEventType.ADMIN_IMAGE_UPDATE,
            "images",
            undefined,
            { updatedCount: images.length },
        );

        return res.json({ success: true });
    } catch (error: any) {
        logger.log(LogLevel.error, "Update images error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to update images" });
    }
});

export default router;
