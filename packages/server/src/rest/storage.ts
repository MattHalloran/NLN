import { Router, Request, Response } from "express";
import { CODE, MAX_IMAGE_STORAGE_MB } from "@local/shared";
import { CustomError } from "../error.js";
import { logger, LogLevel } from "../logger.js";
import { getNextCleanupTime, triggerManualCleanup, getCleanupJobStatus } from "../worker/imageCleanup/queue.js";
import fs from "fs";
import path from "path";
import { auditAdminAction, AuditEventType } from "../utils/auditLogger.js";

const router = Router();

// Storage stats cache
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cachedStats: any = null;
let cacheTimestamp: number = 0;

/**
 * Invalidate the storage stats cache
 * Call this after operations that affect storage (e.g., cleanup)
 */
export function invalidateStorageStatsCache(): void {
    cachedStats = null;
    cacheTimestamp = 0;
    logger.log(LogLevel.debug, "Storage stats cache invalidated");
}

/**
 * GET /api/rest/v1/storage/stats
 * Get storage statistics (admin only)
 */
router.get("/stats", async (req: Request, res: Response) => {
    try {
        const { isAdmin, prisma } = req as any;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!prisma) {
            return res.status(500).json({ error: "Database connection not available" });
        }

        // Check cache first
        const now = Date.now();
        const cacheAge = now - cacheTimestamp;

        if (cachedStats && cacheAge < CACHE_TTL_MS) {
            logger.log(LogLevel.debug, `Serving cached storage stats (age: ${Math.round(cacheAge / 1000)}s)`);
            return res.json(cachedStats);
        }

        // Image statistics
        const totalImages = await prisma.image.count();
        const unlabeledImages = await prisma.image.count({
            where: {
                image_labels: { none: {} },
                plant_images: { none: {} },
            },
        });

        const retentionDays = 30;
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        const unlabeledOverRetention = await prisma.image.count({
            where: {
                unlabeled_since: {
                    lt: cutoffDate,
                    not: null,
                },
                image_labels: { none: {} },
                plant_images: { none: {} },
            },
        });

        const labeledImages = totalImages - unlabeledImages;

        // File statistics
        const totalFiles = await prisma.image_file.count();

        // Calculate storage size
        const imagesDir = `${process.env.PROJECT_DIR}/assets/images`;
        let totalSizeMB = 0;
        let filesOnDisk = 0;

        if (fs.existsSync(imagesDir)) {
            const files = fs.readdirSync(imagesDir);
            filesOnDisk = files.length;

            for (const file of files) {
                try {
                    const stats = fs.statSync(path.join(imagesDir, file));
                    totalSizeMB += stats.size;
                } catch (error) {
                    logger.log(LogLevel.warn, `Could not stat file: ${file}`, error);
                }
            }
        }

        totalSizeMB = Math.round((totalSizeMB / 1024 / 1024) * 100) / 100; // Convert to MB with 2 decimals

        // Orphaned files (on disk but not in DB)
        const dbFiles = await prisma.image_file.findMany({ select: { src: true } });
        const dbFilePaths = new Set(dbFiles.map((f: { src: string }) => path.basename(f.src)));
        let orphanedFiles = 0;

        if (fs.existsSync(imagesDir)) {
            const diskFiles = fs.readdirSync(imagesDir);
            orphanedFiles = diskFiles.filter((file) => !dbFilePaths.has(file)).length;
        }

        // Last cleanup info
        const lastCleanup = await prisma.cleanup_log.findFirst({
            orderBy: { created_at: "desc" },
        });

        // Next cleanup time
        const nextScheduledRun = await getNextCleanupTime();

        // Calculate additional metrics
        const averageImageSizeMB = totalImages > 0 ? totalSizeMB / totalImages : 0;
        const storageUsedPercent = (totalSizeMB / MAX_IMAGE_STORAGE_MB) * 100;

        // Get job status
        const jobStatus = await getCleanupJobStatus();

        // Build response object
        const stats = {
            images: {
                total: totalImages,
                labeled: labeledImages,
                unlabeled: unlabeledImages,
                unlabeledOverRetention: unlabeledOverRetention,
            },
            storage: {
                totalSizeMB,
                totalFiles,
                filesOnDisk,
                orphanedFiles,
                maxStorageMB: MAX_IMAGE_STORAGE_MB,
                availableStorageMB: Math.max(0, MAX_IMAGE_STORAGE_MB - totalSizeMB),
                usagePercent: Math.min(100, storageUsedPercent),
                averageImageSizeMB: Math.round(averageImageSizeMB * 100) / 100,
            },
            cleanup: {
                lastRun: lastCleanup?.created_at || null,
                lastRunStatus: lastCleanup?.status || null,
                lastRunDeletedImages: lastCleanup?.deleted_images || 0,
                lastRunDeletedFiles: lastCleanup?.deleted_files || 0,
                lastRunOrphanedFiles: lastCleanup?.orphaned_files || 0,
                lastRunOrphanedRecords: (lastCleanup as any)?.orphaned_records || 0,
                lastRunDurationMs: lastCleanup?.duration_ms || null,
                lastRunErrors: lastCleanup?.errors ? JSON.parse(lastCleanup.errors) : [],
                nextScheduledRun,
                jobStatus,
            },
            policy: {
                retentionDays: 30,
                backupRetentionDays: 90,
                frequency: "weekly",
                schedule: "Sundays at 2:00 AM",
            },
        };

        // Cache the result
        cachedStats = stats;
        cacheTimestamp = now;
        logger.log(LogLevel.debug, "Storage stats cached for 5 minutes");

        return res.json(stats);
    } catch (error: any) {
        logger.log(LogLevel.error, "Get storage stats error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to get storage stats" });
    }
});

/**
 * POST /api/rest/v1/storage/cleanup
 * Trigger manual cleanup (admin only)
 */
router.post("/cleanup", async (req: Request, res: Response) => {
    try {
        const { isAdmin } = req;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        logger.log(LogLevel.info, "Manual cleanup triggered by admin");

        // Invalidate storage stats cache (cleanup will change stats)
        invalidateStorageStatsCache();

        // Trigger cleanup job
        const job = await triggerManualCleanup();

        return res.json({
            success: true,
            message: "Cleanup job started",
            jobId: job.id,
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Trigger cleanup error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to trigger cleanup" });
    }
});

/**
 * GET /api/rest/v1/storage/cleanup/history
 * Get cleanup history (admin only)
 */
router.get("/cleanup/history", async (req: Request, res: Response) => {
    try {
        const { isAdmin, prisma } = req as any;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!prisma) {
            return res.status(500).json({ error: "Database connection not available" });
        }

        // Get optional filters from query params
        const { status, limit = 20, offset = 0 } = req.query;

        // Build where clause
        const where: any = {};
        if (status && typeof status === "string") {
            where.status = status;
        }

        // Get total count
        const total = await prisma.cleanup_log.count({ where });

        // Get cleanup runs with pagination
        const history = await prisma.cleanup_log.findMany({
            where,
            orderBy: { created_at: "desc" },
            take: Number(limit),
            skip: Number(offset),
        });

        return res.json({
            history,
            pagination: {
                total,
                limit: Number(limit),
                offset: Number(offset),
                hasMore: total > Number(offset) + Number(limit),
            },
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Get cleanup history error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to get cleanup history" });
    }
});

/**
 * GET /api/rest/v1/storage/cleanup/preview
 * Preview what would be deleted in cleanup (dry-run mode) (admin only)
 */
router.get("/cleanup/preview", async (req: Request, res: Response) => {
    try {
        const { isAdmin, prisma } = req as any;

        // Must be admin
        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!prisma) {
            return res.status(500).json({ error: "Database connection not available" });
        }

        const retentionDays = 30;
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

        // Find unlabeled images that would be deleted
        const unlabeledImages = await prisma.image.findMany({
            where: {
                unlabeled_since: {
                    lt: cutoffDate,
                    not: null,
                },
                image_labels: { none: {} },
                plant_images: { none: {} },
            },
            include: {
                files: {
                    select: {
                        src: true,
                    },
                },
            },
            take: 100, // Limit preview to 100 images
        });

        // Calculate estimated storage to be freed
        const imagesDir = `${process.env.PROJECT_DIR}/assets/images`;
        let estimatedFreedMB = 0;

        for (const image of unlabeledImages) {
            for (const file of image.files) {
                const filePath = path.join(imagesDir, path.basename(file.src));
                if (fs.existsSync(filePath)) {
                    const stats = fs.statSync(filePath);
                    estimatedFreedMB += stats.size / (1024 * 1024);
                }
            }
        }

        // Calculate age breakdown
        const now = Date.now();
        const ageBreakdown = {
            "30-60days": 0,
            "60-90days": 0,
            "90+days": 0,
        };

        for (const image of unlabeledImages) {
            if (image.unlabeled_since) {
                const ageInDays = (now - new Date(image.unlabeled_since).getTime()) / (1000 * 60 * 60 * 24);
                if (ageInDays < 60) {
                    ageBreakdown["30-60days"]++;
                } else if (ageInDays < 90) {
                    ageBreakdown["60-90days"]++;
                } else {
                    ageBreakdown["90+days"]++;
                }
            }
        }

        // Find orphaned files
        const dbFiles = await prisma.image_file.findMany({ select: { src: true } });
        const dbFilePaths = new Set(dbFiles.map((f: { src: string }) => path.basename(f.src)));
        let orphanedFileCount = 0;
        let orphanedFilesSizeMB = 0;

        if (fs.existsSync(imagesDir)) {
            const diskFiles = fs.readdirSync(imagesDir);
            for (const file of diskFiles) {
                if (!dbFilePaths.has(file)) {
                    orphanedFileCount++;
                    try {
                        const stats = fs.statSync(path.join(imagesDir, file));
                        orphanedFilesSizeMB += stats.size / (1024 * 1024);
                    } catch (error) {
                        // Skip files that can't be read
                    }
                }
            }
        }

        // Find orphaned records
        const allImages = await prisma.image.findMany({
            include: {
                files: { select: { src: true } },
            },
        });

        let orphanedRecordCount = 0;
        for (const image of allImages) {
            if (image.files.length === 0) {
                orphanedRecordCount++;
                continue;
            }

            const existingFiles = image.files.filter((file: { src: string }) => {
                const filePath = `${process.env.PROJECT_DIR}/assets/${file.src}`;
                return fs.existsSync(filePath);
            });

            if (existingFiles.length === 0) {
                orphanedRecordCount++;
            }
        }

        return res.json({
            unlabeledImages: {
                count: unlabeledImages.length,
                estimatedFreedMB: Math.round(estimatedFreedMB * 100) / 100,
                ageBreakdown,
                samples: unlabeledImages.slice(0, 10).map((img: any) => ({
                    hash: img.hash,
                    alt: img.alt,
                    unlabeledSince: img.unlabeled_since,
                    fileCount: img.files.length,
                })),
            },
            orphanedFiles: {
                count: orphanedFileCount,
                estimatedFreedMB: Math.round(orphanedFilesSizeMB * 100) / 100,
            },
            orphanedRecords: {
                count: orphanedRecordCount,
            },
            totalEstimatedFreedMB: Math.round((estimatedFreedMB + orphanedFilesSizeMB) * 100) / 100,
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Get cleanup preview error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to get cleanup preview" });
    }
});

/**
 * GET /api/rest/v1/storage/orphaned-files
 * Get detailed list of orphaned files (admin only)
 */
router.get("/orphaned-files", async (req: Request, res: Response) => {
    try {
        const { isAdmin, prisma } = req as any;

        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!prisma) {
            return res.status(500).json({ error: "Database connection not available" });
        }

        const imagesDir = `${process.env.PROJECT_DIR}/assets/images`;

        if (!fs.existsSync(imagesDir)) {
            return res.json({ orphanedFiles: [] });
        }

        // Get all files on disk
        const diskFiles = fs.readdirSync(imagesDir);

        // Get all file paths from database
        const dbFiles = await prisma.image_file.findMany({
            select: { src: true },
        });

        const dbFilePaths = new Set(dbFiles.map((f: { src: string }) => path.basename(f.src)));

        // Find orphaned files with details
        const orphanedFiles = [];
        for (const file of diskFiles) {
            if (!dbFilePaths.has(file)) {
                try {
                    const filePath = path.join(imagesDir, file);
                    const stats = fs.statSync(filePath);
                    orphanedFiles.push({
                        name: file,
                        sizeMB: Math.round((stats.size / (1024 * 1024)) * 100) / 100,
                        lastModified: stats.mtime,
                    });
                } catch (error) {
                    logger.log(LogLevel.warn, `Could not stat orphaned file: ${file}`, error);
                }
            }
        }

        // Sort by size (largest first)
        orphanedFiles.sort((a, b) => b.sizeMB - a.sizeMB);

        return res.json({
            orphanedFiles,
            totalCount: orphanedFiles.length,
            totalSizeMB: Math.round(orphanedFiles.reduce((sum, f) => sum + f.sizeMB, 0) * 100) / 100,
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Get orphaned files error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to get orphaned files" });
    }
});

/**
 * GET /api/rest/v1/storage/orphaned-records
 * Get detailed list of orphaned database records (admin only)
 */
router.get("/orphaned-records", async (req: Request, res: Response) => {
    try {
        const { isAdmin, prisma } = req as any;

        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!prisma) {
            return res.status(500).json({ error: "Database connection not available" });
        }

        const imagesDir = `${process.env.PROJECT_DIR}/assets/images`;

        // Get all image records with their file variants
        const allImages = await prisma.image.findMany({
            include: {
                files: {
                    select: {
                        src: true,
                    },
                },
                image_labels: {
                    select: {
                        label: true,
                    },
                },
            },
        });

        // Find records where ALL variant files are missing
        const orphanedRecords = [];

        for (const image of allImages) {
            // If image has no file records at all, it's orphaned
            if (image.files.length === 0) {
                orphanedRecords.push({
                    hash: image.hash,
                    alt: image.alt,
                    labels: image.image_labels.map((l: { label: string }) => l.label),
                    fileCount: 0,
                    reason: "No file records",
                });
                continue;
            }

            // Check if ALL files are missing on disk
            const existingFiles = image.files.filter((file: { src: string }) => {
                const filePath = `${imagesDir}/${path.basename(file.src)}`;
                return fs.existsSync(filePath);
            });

            // If none of the files exist, this is an orphaned record
            if (existingFiles.length === 0) {
                orphanedRecords.push({
                    hash: image.hash,
                    alt: image.alt,
                    labels: image.image_labels.map((l: { label: string }) => l.label),
                    fileCount: image.files.length,
                    reason: "All files missing on disk",
                });
            }
        }

        return res.json({
            orphanedRecords,
            totalCount: orphanedRecords.length,
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Get orphaned records error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to get orphaned records" });
    }
});

/**
 * DELETE /api/rest/v1/storage/orphaned-files
 * Clean up orphaned files only (admin only)
 */
router.delete("/orphaned-files", async (req: Request, res: Response) => {
    try {
        const { isAdmin, prisma } = req as any;

        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!prisma) {
            return res.status(500).json({ error: "Database connection not available" });
        }

        const imagesDir = `${process.env.PROJECT_DIR}/assets/images`;
        let deletedCount = 0;
        let deletedSizeMB = 0;
        const errors: string[] = [];

        if (fs.existsSync(imagesDir)) {
            const diskFiles = fs.readdirSync(imagesDir);
            const dbFiles = await prisma.image_file.findMany({ select: { src: true } });
            const dbFilePaths = new Set(dbFiles.map((f: { src: string }) => path.basename(f.src)));

            const orphanedFiles = diskFiles.filter((file) => !dbFilePaths.has(file));

            for (const file of orphanedFiles) {
                try {
                    const filePath = path.join(imagesDir, file);
                    const stats = fs.statSync(filePath);
                    deletedSizeMB += stats.size / (1024 * 1024);

                    await fs.promises.unlink(filePath);
                    deletedCount++;
                    logger.log(LogLevel.info, `Deleted orphaned file: ${file}`);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : "Unknown error";
                    errors.push(`Failed to delete ${file}: ${errorMsg}`);
                    logger.log(LogLevel.error, `Error deleting orphaned file ${file}`, error);
                }
            }
        }

        // Audit log
        auditAdminAction(
            req,
            AuditEventType.ADMIN_IMAGE_DELETE,
            "storage",
            undefined,
            { deletedOrphanedFiles: deletedCount, freedMB: Math.round(deletedSizeMB * 100) / 100 },
        );

        // Invalidate cache
        invalidateStorageStatsCache();

        return res.json({
            success: true,
            deletedCount,
            freedMB: Math.round(deletedSizeMB * 100) / 100,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Delete orphaned files error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to delete orphaned files" });
    }
});

/**
 * DELETE /api/rest/v1/storage/orphaned-records
 * Clean up orphaned database records only (admin only)
 */
router.delete("/orphaned-records", async (req: Request, res: Response) => {
    try {
        const { isAdmin, prisma } = req as any;

        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!prisma) {
            return res.status(500).json({ error: "Database connection not available" });
        }

        const imagesDir = `${process.env.PROJECT_DIR}/assets/images`;
        let deletedCount = 0;
        const errors: string[] = [];

        // Get all image records with their file variants
        const allImages = await prisma.image.findMany({
            include: {
                files: { select: { src: true } },
            },
        });

        const orphanedHashes: string[] = [];

        for (const image of allImages) {
            // If image has no file records at all, it's orphaned
            if (image.files.length === 0) {
                orphanedHashes.push(image.hash);
                continue;
            }

            // Check if ALL files are missing on disk
            const existingFiles = image.files.filter((file: { src: string }) => {
                const filePath = `${process.env.PROJECT_DIR}/assets/${file.src}`;
                return fs.existsSync(filePath);
            });

            if (existingFiles.length === 0) {
                orphanedHashes.push(image.hash);
            }
        }

        // Delete orphaned records
        for (const hash of orphanedHashes) {
            try {
                await prisma.image.delete({
                    where: { hash },
                });
                deletedCount++;
                logger.log(LogLevel.info, `Deleted orphaned record: ${hash}`);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                errors.push(`Failed to delete record ${hash}: ${errorMsg}`);
                logger.log(LogLevel.error, `Error deleting orphaned record ${hash}`, error);
            }
        }

        // Audit log
        auditAdminAction(
            req,
            AuditEventType.ADMIN_IMAGE_DELETE,
            "storage",
            undefined,
            { deletedOrphanedRecords: deletedCount },
        );

        // Invalidate cache
        invalidateStorageStatsCache();

        return res.json({
            success: true,
            deletedCount,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Delete orphaned records error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to delete orphaned records" });
    }
});

/**
 * GET /api/rest/v1/storage/recent-activity
 * Get recent storage-related activity (admin only)
 */
router.get("/recent-activity", async (req: Request, res: Response) => {
    try {
        const { isAdmin, prisma } = req as any;

        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        if (!prisma) {
            return res.status(500).json({ error: "Database connection not available" });
        }

        // Get recent images (last 10)
        const recentImages = await prisma.image.findMany({
            orderBy: { created_at: "desc" },
            take: 10,
            include: {
                image_labels: {
                    select: { label: true },
                },
            },
        });

        // Get recently unlabeled images (last 10)
        const recentlyUnlabeled = await prisma.image.findMany({
            where: {
                unlabeled_since: { not: null },
            },
            orderBy: { unlabeled_since: "desc" },
            take: 10,
            select: {
                hash: true,
                alt: true,
                unlabeled_since: true,
            },
        });

        // Get recent cleanup runs (last 5)
        const recentCleanups = await prisma.cleanup_log.findMany({
            orderBy: { created_at: "desc" },
            take: 5,
            select: {
                created_at: true,
                status: true,
                deleted_images: true,
                deleted_files: true,
            },
        });

        return res.json({
            recentUploads: recentImages.map((img: any) => ({
                hash: img.hash,
                alt: img.alt,
                createdAt: img.created_at,
                labels: img.image_labels.map((l: { label: string }) => l.label),
            })),
            recentlyUnlabeled: recentlyUnlabeled.map((img: any) => ({
                hash: img.hash,
                alt: img.alt,
                unlabeledSince: img.unlabeled_since,
            })),
            recentCleanups,
        });
    } catch (error: any) {
        logger.log(LogLevel.error, "Get recent activity error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to get recent activity" });
    }
});

/**
 * GET /api/rest/v1/storage/job-status
 * Get current cleanup job status (admin only)
 */
router.get("/job-status", async (req: Request, res: Response) => {
    try {
        const { isAdmin } = req;

        if (!isAdmin) {
            throw new CustomError(CODE.Unauthorized);
        }

        const status = await getCleanupJobStatus();

        return res.json(status);
    } catch (error: any) {
        logger.log(LogLevel.error, "Get job status error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to get job status" });
    }
});

export default router;
