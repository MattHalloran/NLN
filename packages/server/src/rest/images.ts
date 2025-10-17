import { Router, Request, Response } from "express";
import { CODE } from "@local/shared";
import { CustomError } from "../error.js";
import { deleteImage, saveImage } from "../utils/index.js";
import { logger } from "../logger.js";

const router = Router();

/**
 * GET /api/rest/v1/images?label=:label
 * Get images by label
 */
router.get("/", async (req: Request, res: Response) => {
    try {
        const { label } = req.query;
        const { prisma } = req as any;

        if (!label || typeof label !== "string") {
            return res.status(400).json({ error: "Label parameter required" });
        }

        // Get all images with label
        let images = await prisma.image.findMany({
            where: { image_labels: { some: { label } } },
            select: { hash: true, image_labels: { select: { label: true, index: true } } },
        });

        // Sort by position
        images = images.sort((a: any, b: any) => {
            const aIndex = a.image_labels.find((l: any) => l.label === label);
            const bIndex = b.image_labels.find((l: any) => l.label === label);
            return (aIndex?.index ?? 0) - (bIndex?.index ?? 0);
        });

        const imageData = await prisma.image.findMany({
            where: { hash: { in: images.map((i: any) => i.hash) } },
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
    } catch (error: any) {
        logger.error("Get images error:", error);
        return res.status(500).json({ error: "Failed to get images" });
    }
});

/**
 * POST /api/rest/v1/images
 * Add images (admin only, multipart/form-data)
 */
router.post("/", async (req: Request, res: Response) => {
    try {
        const { isAdmin } = req as any;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        const files = (req as any).files || [];
        const { label, alts, descriptions } = req.body;

        if (!files || files.length === 0) {
            return res.status(400).json({ error: "No files provided" });
        }

        const labels = label ? [label] : [];
        const altArray = alts ? (Array.isArray(alts) ? alts : [alts]) : [];
        const descArray = descriptions ? (Array.isArray(descriptions) ? descriptions : [descriptions]) : [];

        const results = [];

        // Loop through every image passed in
        for (let i = 0; i < files.length; i++) {
            results.push(
                await saveImage({
                    file: files[i],
                    alt: altArray[i],
                    description: descArray[i],
                    labels,
                    errorOnDuplicate: false,
                })
            );
        }

        return res.json(results);
    } catch (error: any) {
        logger.error("Add images error:", error);
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

        return res.json({ success: true });
    } catch (error: any) {
        logger.error("Update images error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to update images" });
    }
});

export default router;
