import { Router, Request, Response } from "express";
import { CODE } from "@local/shared";
import { CustomError } from "../error.js";
import { logger, LogLevel } from "../logger.js";
import { getNextCleanupTime, triggerManualCleanup } from "../worker/imageCleanup/queue.js";
import fs from "fs";
import path from "path";

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
            },
            policy: {
                retentionDays: 30,
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

        // Get last 20 cleanup runs
        const history = await prisma.cleanup_log.findMany({
            orderBy: { created_at: "desc" },
            take: 20,
        });

        return res.json(history);
    } catch (error: any) {
        logger.log(LogLevel.error, "Get cleanup history error:", error);
        if (error instanceof CustomError) {
            return res.status(401).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: "Failed to get cleanup history" });
    }
});

export default router;
