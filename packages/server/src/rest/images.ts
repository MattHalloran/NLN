import { Router, Request, Response } from "express";
import { CODE, MAX_IMAGE_STORAGE_MB } from "@local/shared";
import { CustomError } from "../error.js";
import { saveImage, deleteImage, checkImageUsage } from "../utils/index.js";
import { logger, LogLevel } from "../logger.js";
import { auditAdminAction, AuditEventType } from "../utils/auditLogger.js";
import { imageUploadLimiter } from "../middleware/rateLimiter.js";
import fs from "fs";
import path from "path";

const router = Router();

/**
 * Calculate current storage usage in MB for the images directory
 * @returns Current storage in MB, or 0 if directory doesn't exist
 */
function calculateCurrentStorageMB(): number {
    try {
        const imagesDir = `${process.env.PROJECT_DIR}/assets/images`;
        if (!fs.existsSync(imagesDir)) {
            return 0;
        }

        let totalBytes = 0;
        const files = fs.readdirSync(imagesDir);

        for (const file of files) {
            try {
                const stats = fs.statSync(path.join(imagesDir, file));
                totalBytes += stats.size;
            } catch (error) {
                // Skip files that can't be read
                logger.log(LogLevel.warn, `Could not stat file during quota check: ${file}`, error);
            }
        }

        return Math.round((totalBytes / 1024 / 1024) * 100) / 100; // Convert to MB with 2 decimals
    } catch (error) {
        logger.log(LogLevel.error, "Error calculating storage usage:", error);
        return 0;
    }
}

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

        // Optimized: Single query with join and sorting
        // Get all images with the specified label, sorted by index
        const images = await prisma.image.findMany({
            where: {
                image_labels: {
                    some: { label },
                },
            },
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
                image_labels: {
                    where: { label },
                    select: { index: true },
                },
            },
        });

        // Sort by the label's index (extracted from the filtered image_labels)
        // Each image should have exactly one matching label after filtering
        const sortedImages = images.sort((a, b) => {
            const aIndex = a.image_labels[0]?.index ?? 0;
            const bIndex = b.image_labels[0]?.index ?? 0;
            return aIndex - bIndex;
        });

        // Remove the image_labels field from response (not needed by client)
        const imageData = sortedImages.map(({ image_labels, ...rest }) => rest);

        return res.json(imageData);
    } catch (error) {
        logger.log(LogLevel.error, "Get images error:", error);
        return res.status(500).json({ error: "Failed to get images" });
    }
});

/**
 * POST /api/rest/v1/images
 * Add images (admin only, multipart/form-data)
 * Rate limited: 25 upload requests per 15 minutes
 * Max files per request: 15
 */
router.post("/", imageUploadLimiter, async (req: Request, res: Response) => {
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

        // Limit files per request to prevent resource exhaustion
        // Each image generates 16 variants (8 sizes × 2 formats)
        const MAX_FILES_PER_REQUEST = 15;
        if (files.length > MAX_FILES_PER_REQUEST) {
            logger.log(
                LogLevel.warn,
                `Upload rejected: ${files.length} files exceeds limit of ${MAX_FILES_PER_REQUEST}`,
            );
            return res.status(400).json({
                error: `Too many files in single request. Maximum ${MAX_FILES_PER_REQUEST} files per upload.`,
                filesProvided: files.length,
                maxAllowed: MAX_FILES_PER_REQUEST,
                tip: "Split your upload into multiple batches.",
            });
        }

        // Check storage quota before processing upload
        const currentStorageMB = calculateCurrentStorageMB();
        // Conservative estimate: 100MB per image (includes all variants)
        const estimatedUploadSizeMB = files.length * 100;
        const projectedStorageMB = currentStorageMB + estimatedUploadSizeMB;

        if (projectedStorageMB > MAX_IMAGE_STORAGE_MB) {
            logger.log(
                LogLevel.warn,
                `Upload rejected: Storage quota exceeded (current: ${currentStorageMB}MB, estimated upload: ${estimatedUploadSizeMB}MB, quota: ${MAX_IMAGE_STORAGE_MB}MB)`,
            );
            return res.status(507).json({
                error: "Insufficient storage: Upload would exceed storage quota",
                currentStorageMB: Math.round(currentStorageMB),
                estimatedUploadSizeMB,
                quotaMB: MAX_IMAGE_STORAGE_MB,
                availableMB: Math.round(MAX_IMAGE_STORAGE_MB - currentStorageMB),
                tip: "Delete unused images or contact administrator to increase quota.",
            });
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
                    file,
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

/**
 * DELETE /api/rest/v1/images/:hash
 * Delete an image and all its variants (admin only)
 *
 * Query params:
 * - force: Set to "true" to delete even if image is in use (default: false)
 */
router.delete("/:hash", async (req: Request, res: Response) => {
    try {
        const { hash } = req.params;
        const { force } = req.query;
        const { isAdmin } = req;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!hash || typeof hash !== "string") {
            return res.status(400).json({ error: "Image hash required" });
        }

        // Check if image is in use first
        const usage = await checkImageUsage(hash);

        if (!usage.exists) {
            return res.status(404).json({ error: "Image not found" });
        }

        // Block deletion if image is in use (unless force=true)
        const isInUse = usage.usedInPlants.length > 0 || usage.usedInLabels.length > 0;
        if (isInUse && force !== "true") {
            logger.log(LogLevel.warn, "Blocked deletion of in-use image", {
                hash,
                usage,
            });

            return res.status(409).json({
                error: "Cannot delete image while in use",
                usage: {
                    usedInPlants: usage.usedInPlants,
                    usedInLabels: usage.usedInLabels,
                    warnings: usage.warnings,
                },
                hint: "Remove image from all galleries/labels first, or add ?force=true to force deletion",
            });
        }

        // Delete the image
        const result = await deleteImage(hash, force === "true");

        if (!result.success) {
            logger.log(LogLevel.error, "Image deletion failed", {
                hash,
                errors: result.errors,
            });

            // If image not found, return 404
            if (result.errors.includes("Image not found")) {
                return res.status(404).json({
                    error: "Image not found",
                    errors: result.errors,
                });
            }

            return res.status(500).json({
                error: "Failed to delete image",
                errors: result.errors,
                deletedFiles: result.deletedFiles,
                usage: result.usage,
            });
        }

        // Audit log: image deletion
        auditAdminAction(
            req,
            AuditEventType.ADMIN_IMAGE_DELETE,
            "images",
            undefined,
            {
                hash,
                deletedFiles: result.deletedFiles,
                usage: result.usage,
            },
        );

        return res.json({
            success: true,
            deletedFiles: result.deletedFiles,
            usage: result.usage,
            message: `Successfully deleted image and ${result.deletedFiles} file(s)`,
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Delete image error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to delete image" });
    }
});

/**
 * GET /api/rest/v1/images/:hash/usage
 * Check where an image is being used (admin only)
 */
router.get("/:hash/usage", async (req: Request, res: Response) => {
    try {
        const { hash } = req.params;
        const { isAdmin } = req;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!hash || typeof hash !== "string") {
            return res.status(400).json({ error: "Image hash required" });
        }

        const usage = await checkImageUsage(hash);

        if (!usage.exists) {
            return res.status(404).json({ error: "Image not found" });
        }

        return res.json(usage);
    } catch (error: any) {
        logger.log(LogLevel.error, "Check image usage error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to check image usage" });
    }
});

export default router;
