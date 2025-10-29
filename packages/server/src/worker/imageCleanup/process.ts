import { genErrorCode, logger, LogLevel } from "../../logger.js";
import { prisma } from "../../db/prisma.js";
import { deleteFile } from "../../utils/fileIO.js";
import type Bull from "bull";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = `${process.env.PROJECT_DIR}/assets`;
const RETENTION_DAYS = 30; // Days before unlabeled images are deleted
const BACKUP_RETENTION_DAYS = 90; // Days before old backups are deleted

interface CleanupResult {
    success: boolean;
    deletedImages: number;
    deletedFiles: number;
    orphanedFiles: number;
    errors: string[];
    backupPath?: string;
    durationMs: number;
}

/**
 * Image cleanup worker process
 * Runs weekly to clean up unlabeled images and orphaned files
 */
export async function imageCleanupProcess(job: Bull.Job): Promise<CleanupResult> {
    const startTime = Date.now();
    const result: CleanupResult = {
        success: false,
        deletedImages: 0,
        deletedFiles: 0,
        orphanedFiles: 0,
        errors: [],
        durationMs: 0,
    };

    try {
        logger.log(LogLevel.info, "🧹 Starting automated image cleanup...", {
            retentionDays: RETENTION_DAYS,
        });

        // Create backup directory
        const backupDir = `${UPLOAD_DIR}/../backups/auto-cleanup-${new Date().toISOString().split("T")[0]}`;
        fs.mkdirSync(backupDir, { recursive: true });
        result.backupPath = backupDir;
        logger.log(LogLevel.info, `Created backup directory: ${backupDir}`);

        // PHASE 1: Clean up unlabeled images (30+ days old)
        await cleanupUnlabeledImages(result, backupDir);

        // PHASE 2: Clean up orphaned files (files without DB records)
        await cleanupOrphanedFiles(result, backupDir);

        // PHASE 3: Clean up old backup directories (90+ days old)
        await cleanupOldBackups(result);

        // Calculate duration
        result.durationMs = Date.now() - startTime;
        result.success = result.errors.length === 0;

        // Log cleanup results to database
        await prisma.cleanup_log.create({
            data: {
                type: "image_cleanup",
                deleted_images: result.deletedImages,
                deleted_files: result.deletedFiles,
                orphaned_files: result.orphanedFiles,
                errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
                status: result.success ? "success" : result.errors.length === result.deletedImages ? "failed" : "partial",
                duration_ms: result.durationMs,
            },
        });

        logger.log(LogLevel.info, "✅ Image cleanup completed", {
            deletedImages: result.deletedImages,
            deletedFiles: result.deletedFiles,
            orphanedFiles: result.orphanedFiles,
            errors: result.errors.length,
            durationMs: result.durationMs,
        });

        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.log(LogLevel.error, "Image cleanup failed", {
            code: genErrorCode("0025"),
            error: errorMessage,
        });

        result.errors.push(`Cleanup failed: ${errorMessage}`);
        result.durationMs = Date.now() - startTime;

        // Log failure to database
        try {
            await prisma.cleanup_log.create({
                data: {
                    type: "image_cleanup",
                    deleted_images: result.deletedImages,
                    deleted_files: result.deletedFiles,
                    orphaned_files: result.orphanedFiles,
                    errors: JSON.stringify(result.errors),
                    status: "failed",
                    duration_ms: result.durationMs,
                },
            });
        } catch (dbError) {
            logger.log(LogLevel.error, "Failed to log cleanup failure to database", dbError);
        }

        return result;
    }
}

/**
 * Clean up unlabeled images that have been unlabeled for 30+ days
 */
async function cleanupUnlabeledImages(result: CleanupResult, backupDir: string): Promise<void> {
    try {
        // Calculate cutoff date (30 days ago)
        const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

        logger.log(LogLevel.info, `Finding images unlabeled since before ${cutoffDate.toISOString()}...`);

        // Find unlabeled images older than retention period
        const unlabeledImages = await prisma.image.findMany({
            where: {
                unlabeled_since: {
                    lt: cutoffDate,
                    not: null,
                },
                // Double-check they have no labels or plant associations
                image_labels: {
                    none: {},
                },
                plant_images: {
                    none: {},
                },
            },
            include: {
                files: {
                    select: {
                        src: true,
                    },
                },
            },
        });

        logger.log(LogLevel.info, `Found ${unlabeledImages.length} unlabeled images to delete`);

        // Delete each unlabeled image
        for (const image of unlabeledImages) {
            try {
                // Backup and delete all file variants
                let filesDeleted = 0;
                const filePaths = image.files.map((f) => f.src);

                for (const file of image.files) {
                    const srcPath = `${UPLOAD_DIR}/${file.src}`;

                    // Backup file if it exists
                    if (fs.existsSync(srcPath)) {
                        const fileName = path.basename(file.src);
                        const backupPath = `${backupDir}/${fileName}`;
                        fs.copyFileSync(srcPath, backupPath);

                        // Delete file
                        if (await deleteFile(file.src)) {
                            filesDeleted++;
                        } else {
                            result.errors.push(`Failed to delete file: ${file.src}`);
                        }
                    }
                }

                // Only delete DB record if all files were deleted
                if (filesDeleted === filePaths.length) {
                    await prisma.image.delete({
                        where: { hash: image.hash },
                    });

                    result.deletedImages++;
                    result.deletedFiles += filesDeleted;

                    logger.log(LogLevel.debug, `Deleted image ${image.hash} (${filesDeleted} files)`);
                } else {
                    result.errors.push(
                        `Skipped DB deletion for ${image.hash}: only ${filesDeleted}/${filePaths.length} files deleted`,
                    );
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                result.errors.push(`Error deleting image ${image.hash}: ${errorMsg}`);
                logger.log(LogLevel.error, `Error deleting image ${image.hash}`, error);
            }
        }

        logger.log(LogLevel.info, `Deleted ${result.deletedImages} unlabeled images (${result.deletedFiles} files)`);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Failed to clean unlabeled images: ${errorMsg}`);
        logger.log(LogLevel.error, "Failed to clean unlabeled images", error);
    }
}

/**
 * Clean up orphaned files (files on disk but not in database)
 */
async function cleanupOrphanedFiles(result: CleanupResult, backupDir: string): Promise<void> {
    try {
        logger.log(LogLevel.info, "Finding orphaned files...");

        const imagesDir = `${UPLOAD_DIR}/images`;

        // Check if images directory exists
        if (!fs.existsSync(imagesDir)) {
            logger.log(LogLevel.warn, `Images directory does not exist: ${imagesDir}`);
            return;
        }

        // Get all files on disk
        const diskFiles = fs.readdirSync(imagesDir);

        // Get all file paths from database
        const dbFiles = await prisma.image_file.findMany({
            select: { src: true },
        });

        const dbFilePaths = new Set(dbFiles.map((f) => path.basename(f.src)));

        // Find orphaned files (on disk but not in DB)
        const orphanedFiles = diskFiles.filter((file) => !dbFilePaths.has(file));

        logger.log(LogLevel.info, `Found ${orphanedFiles.length} orphaned files`);

        // Delete each orphaned file
        for (const file of orphanedFiles) {
            try {
                const srcPath = `${imagesDir}/${file}`;
                const backupPath = `${backupDir}/orphaned_${file}`;

                // Backup file
                fs.copyFileSync(srcPath, backupPath);

                // Delete file
                fs.unlinkSync(srcPath);
                result.orphanedFiles++;

                logger.log(LogLevel.debug, `Deleted orphaned file: ${file}`);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                result.errors.push(`Error deleting orphaned file ${file}: ${errorMsg}`);
                logger.log(LogLevel.error, `Error deleting orphaned file ${file}`, error);
            }
        }

        logger.log(LogLevel.info, `Deleted ${result.orphanedFiles} orphaned files`);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Failed to clean orphaned files: ${errorMsg}`);
        logger.log(LogLevel.error, "Failed to clean orphaned files", error);
    }
}

/**
 * Clean up old backup directories (90+ days old)
 * Prevents unbounded growth of backup storage
 */
async function cleanupOldBackups(result: CleanupResult): Promise<void> {
    try {
        logger.log(LogLevel.info, "Cleaning up old backup directories...");

        const backupsDir = `${UPLOAD_DIR}/../backups`;

        // Check if backups directory exists
        if (!fs.existsSync(backupsDir)) {
            logger.log(LogLevel.info, "No backups directory found, skipping backup cleanup");
            return;
        }

        // Get all backup directories
        const backupDirs = fs.readdirSync(backupsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        const cutoffDate = new Date(Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        let deletedBackups = 0;

        for (const dirName of backupDirs) {
            try {
                // Extract date from directory name (format: auto-cleanup-YYYY-MM-DD)
                const dateMatch = dirName.match(/auto-cleanup-(\d{4}-\d{2}-\d{2})/);

                if (!dateMatch) {
                    logger.log(LogLevel.debug, `Skipping non-standard backup directory: ${dirName}`);
                    continue;
                }

                const backupDate = new Date(dateMatch[1]);

                // Check if backup is older than retention period
                if (backupDate < cutoffDate) {
                    const backupPath = path.join(backupsDir, dirName);

                    // Recursively delete directory and contents
                    fs.rmSync(backupPath, { recursive: true, force: true });
                    deletedBackups++;

                    logger.log(LogLevel.info, `Deleted old backup: ${dirName} (age: ${Math.floor((Date.now() - backupDate.getTime()) / (24 * 60 * 60 * 1000))} days)`);
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                result.errors.push(`Error deleting backup directory ${dirName}: ${errorMsg}`);
                logger.log(LogLevel.error, `Error deleting backup directory ${dirName}`, error);
            }
        }

        logger.log(LogLevel.info, `Deleted ${deletedBackups} old backup directories (retention: ${BACKUP_RETENTION_DAYS} days)`);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Failed to clean old backups: ${errorMsg}`);
        logger.log(LogLevel.error, "Failed to clean old backups", error);
    }
}
