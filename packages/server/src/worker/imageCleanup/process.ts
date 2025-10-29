import { genErrorCode, logger, LogLevel } from "../../logger.js";
import { prisma } from "../../db/prisma.js";
import { deleteFile } from "../../utils/fileIO.js";
import type Bull from "bull";
import fs from "fs";
import path from "path";
import type { LandingPageContent } from "../../types/landingPage.js";

const UPLOAD_DIR = `${process.env.PROJECT_DIR}/assets`;
const RETENTION_DAYS = 30; // Days before unlabeled images are deleted
const BACKUP_RETENTION_DAYS = 90; // Days before old backups are deleted

interface CleanupResult {
    success: boolean;
    deletedImages: number;
    deletedFiles: number;
    orphanedFiles: number;
    orphanedRecords: number;
    errors: string[];
    backupPath?: string;
    durationMs: number;
}

/**
 * Verify that a backup file is valid and complete
 * @param sourcePath Original file path
 * @param backupPath Backup file path
 * @returns True if backup is valid, false otherwise
 */
function verifyBackup(sourcePath: string, backupPath: string): boolean {
    try {
        // Check backup file exists
        if (!fs.existsSync(backupPath)) {
            logger.log(LogLevel.error, `Backup verification failed: file does not exist`, {
                code: genErrorCode("0026"),
                backupPath,
            });
            return false;
        }

        // Get file stats for both source and backup
        const sourceStats = fs.statSync(sourcePath);
        const backupStats = fs.statSync(backupPath);

        // Verify file sizes match
        if (sourceStats.size !== backupStats.size) {
            logger.log(LogLevel.error, `Backup verification failed: file size mismatch`, {
                code: genErrorCode("0027"),
                sourcePath,
                backupPath,
                sourceSize: sourceStats.size,
                backupSize: backupStats.size,
            });
            return false;
        }

        // Verify backup is readable by attempting to read first few bytes
        const testBuffer = Buffer.alloc(Math.min(1024, sourceStats.size));
        const fd = fs.openSync(backupPath, 'r');
        const bytesRead = fs.readSync(fd, testBuffer, 0, testBuffer.length, 0);
        fs.closeSync(fd);

        if (bytesRead === 0 && sourceStats.size > 0) {
            logger.log(LogLevel.error, `Backup verification failed: unable to read backup file`, {
                code: genErrorCode("0028"),
                backupPath,
            });
            return false;
        }

        return true;
    } catch (error) {
        logger.log(LogLevel.error, `Backup verification error`, {
            code: genErrorCode("0029"),
            error,
            sourcePath,
            backupPath,
        });
        return false;
    }
}

/**
 * Check if an image is referenced in landing page JSON
 * This is a safety check in case label sync failed
 *
 * @param imageFiles Array of image file src paths
 * @returns True if image is found in landing page JSON, false otherwise
 */
function isImageReferencedInLandingPageJSON(imageFiles: Array<{ src: string }>): boolean {
    try {
        const contentPath = path.join(process.env.PROJECT_DIR || "", "assets/public/landing-page-content.json");

        if (!fs.existsSync(contentPath)) {
            logger.log(LogLevel.warn, "Landing page content JSON not found for cleanup validation");
            return false; // If JSON doesn't exist, assume image is not referenced
        }

        const contentStr = fs.readFileSync(contentPath, "utf-8");
        const content: LandingPageContent = JSON.parse(contentStr);

        // Extract all image src paths from landing page JSON
        const jsonImagePaths = new Set<string>();

        // Check hero banners
        if (content.content?.hero?.banners) {
            for (const banner of content.content.hero.banners) {
                if (banner.src) {
                    // Normalize path (remove leading slash, ensure images/ prefix)
                    let normalized = banner.src.startsWith("/") ? banner.src.substring(1) : banner.src;
                    if (!normalized.startsWith("images/")) {
                        normalized = `images/${normalized}`;
                    }
                    jsonImagePaths.add(normalized);
                }
            }
        }

        // Check seasonal content (if exists)
        // TODO: Add seasonal content check when structure is defined

        // Check if any of the image file variants match
        for (const file of imageFiles) {
            if (jsonImagePaths.has(file.src)) {
                return true;
            }
        }

        return false;
    } catch (error) {
        logger.log(LogLevel.error, "Error checking landing page JSON for image references", {
            error,
        });
        // On error, assume image might be referenced (safer)
        return true;
    }
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
        orphanedRecords: 0,
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

        // PHASE 3: Clean up orphaned database records (DB records without files)
        await cleanupOrphanedRecords(result);

        // PHASE 4: Clean up old backup directories (90+ days old)
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
                orphaned_records: result.orphanedRecords,
                errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
                status: result.success ? "success" : result.errors.length === result.deletedImages ? "failed" : "partial",
                duration_ms: result.durationMs,
            },
        });

        logger.log(LogLevel.info, "✅ Image cleanup completed", {
            deletedImages: result.deletedImages,
            deletedFiles: result.deletedFiles,
            orphanedFiles: result.orphanedFiles,
            orphanedRecords: result.orphanedRecords,
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
                    orphaned_records: result.orphanedRecords,
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
                // SAFETY CHECK: Verify image is not referenced in landing page JSON
                // This prevents deletion if label sync failed
                if (isImageReferencedInLandingPageJSON(image.files)) {
                    logger.log(LogLevel.warn, `Skipping deletion of image ${image.hash} - still referenced in landing page JSON`, {
                        code: genErrorCode("0030"),
                        hash: image.hash,
                        files: image.files.map((f) => f.src),
                    });
                    result.errors.push(
                        `Image ${image.hash} marked for deletion but still referenced in landing page JSON. Label sync may have failed.`,
                    );
                    continue; // Skip this image
                }

                // Backup and delete all file variants
                let filesDeleted = 0;
                const filePaths = image.files.map((f) => f.src);

                for (const file of image.files) {
                    const srcPath = `${UPLOAD_DIR}/${file.src}`;

                    // Backup file if it exists
                    if (fs.existsSync(srcPath)) {
                        const fileName = path.basename(file.src);
                        const backupPath = `${backupDir}/${fileName}`;

                        try {
                            // Create backup
                            fs.copyFileSync(srcPath, backupPath);

                            // CRITICAL: Verify backup before deleting original
                            if (!verifyBackup(srcPath, backupPath)) {
                                result.errors.push(
                                    `Backup verification failed for ${file.src} - skipping deletion for safety`,
                                );
                                logger.log(LogLevel.error, `Skipping deletion due to backup verification failure`, {
                                    file: file.src,
                                    backupPath,
                                });
                                continue; // Skip deletion of this file
                            }

                            // Backup verified - safe to delete original
                            if (await deleteFile(file.src)) {
                                filesDeleted++;
                                logger.log(LogLevel.debug, `Deleted file ${file.src} (backup verified at ${backupPath})`);
                            } else {
                                result.errors.push(`Failed to delete file: ${file.src}`);
                            }
                        } catch (backupError) {
                            const errorMsg = backupError instanceof Error ? backupError.message : "Unknown error";
                            result.errors.push(`Backup failed for ${file.src}: ${errorMsg}`);
                            logger.log(LogLevel.error, `Backup operation failed`, {
                                file: file.src,
                                error: backupError,
                            });
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

                // Create backup
                fs.copyFileSync(srcPath, backupPath);

                // CRITICAL: Verify backup before deleting original
                if (!verifyBackup(srcPath, backupPath)) {
                    result.errors.push(
                        `Backup verification failed for orphaned file ${file} - skipping deletion for safety`,
                    );
                    logger.log(LogLevel.error, `Skipping orphaned file deletion due to backup verification failure`, {
                        file,
                        backupPath,
                    });
                    continue; // Skip deletion of this file
                }

                // Backup verified - safe to delete (use async for better performance)
                await fs.promises.unlink(srcPath);
                result.orphanedFiles++;

                logger.log(LogLevel.debug, `Deleted orphaned file: ${file} (backup verified)`);
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
 * Clean up orphaned database records (DB records without any files on disk)
 * This can happen if file deletion succeeds but DB deletion fails
 */
async function cleanupOrphanedRecords(result: CleanupResult): Promise<void> {
    try {
        logger.log(LogLevel.info, "Finding orphaned database records...");

        const imagesDir = `${UPLOAD_DIR}/images`;

        // Check if images directory exists
        if (!fs.existsSync(imagesDir)) {
            logger.log(LogLevel.warn, `Images directory does not exist: ${imagesDir}`);
            return;
        }

        // Get all image records with their file variants
        const allImages = await prisma.image.findMany({
            include: {
                files: {
                    select: {
                        src: true,
                    },
                },
            },
        });

        logger.log(LogLevel.info, `Checking ${allImages.length} image records for missing files...`);

        // Find records where ALL variant files are missing
        const orphanedRecords: string[] = [];

        for (const image of allImages) {
            // If image has no file records at all, it's orphaned
            if (image.files.length === 0) {
                orphanedRecords.push(image.hash);
                logger.log(LogLevel.debug, `Found orphaned record with no file variants: ${image.hash}`);
                continue;
            }

            // Check if ALL files are missing on disk
            const existingFiles = image.files.filter((file) => {
                const filePath = `${UPLOAD_DIR}/${file.src}`;
                return fs.existsSync(filePath);
            });

            // If none of the files exist, this is an orphaned record
            if (existingFiles.length === 0) {
                orphanedRecords.push(image.hash);
                logger.log(LogLevel.debug, `Found orphaned record (all ${image.files.length} files missing): ${image.hash}`);
            }
        }

        logger.log(LogLevel.info, `Found ${orphanedRecords.length} orphaned database records`);

        // Delete orphaned records
        for (const hash of orphanedRecords) {
            try {
                // Delete the image record (cascades to files, labels, plant_images)
                await prisma.image.delete({
                    where: { hash },
                });

                result.orphanedRecords++;
                logger.log(LogLevel.debug, `Deleted orphaned database record: ${hash}`);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                result.errors.push(`Error deleting orphaned record ${hash}: ${errorMsg}`);
                logger.log(LogLevel.error, `Error deleting orphaned record ${hash}`, error);
            }
        }

        logger.log(LogLevel.info, `Deleted ${result.orphanedRecords} orphaned database records`);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Failed to clean orphaned records: ${errorMsg}`);
        logger.log(LogLevel.error, "Failed to clean orphaned records", error);
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
