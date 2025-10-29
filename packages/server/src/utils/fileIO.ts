import { IMAGE_EXTENSION, IMAGE_SIZE } from "@local/shared";
import pkg from "@prisma/client";
import fs from "fs";
import convert from "heic-convert";
import imghash from "imghash";
import path from "path";
import probe from "probe-image-size";
import sharp from "sharp";
import { LogLevel, genErrorCode, logger } from "../logger";
import { AddImageResponse } from "../schema/types";
import { withDistributedLock } from "./distributedLock.js";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// How many times a file name should be checked before giving up
// ex: if 'billy.png' is taken, tries 'billy-1.png', 'billy-2.png', etc.
const MAX_FILE_NAME_ATTEMPTS = 100;
// Max size of a file buffer (how large of a file are you willing to download?)
const MAX_BUFFER_SIZE = 1000000000;
// Location of persistent storage directory
const UPLOAD_DIR = `${process.env.PROJECT_DIR}/assets`;
// Maximum image dimensions (width or height) in pixels
// Images larger than this will be rejected to prevent excessive storage usage
// Note: Each image creates 16 variants (8 sizes × 2 formats), so large images multiply storage
const MAX_IMAGE_DIMENSION = 8192; // 8K resolution
const MIN_IMAGE_DIMENSION = 10; // Minimum dimension to ensure valid images

/**
 * Replaces any invalid characters from a file name
 * @param file Name of file (e.g. 'boop.png', 'images/boop.png')
 * @param defaultFolder Default for file's location (e.g. 'images')
 * @returns Object of shape:
 * - name - name of file, excluding extension and location
 * - ext - extension of file
 * - folder - path of file
 */
export function clean(
    file: string,
    defaultFolder?: string,
): {
    name?: string;
    ext?: string;
    folder?: string;
} {
    const pathRegex = /([^a-z0-9 .\-_/]+)/gi;
    // First, remove any invalid characters
    const cleanPath = file.replace(pathRegex, "");
    const folder =
        path.dirname(cleanPath)?.replace(".", "") ||
        defaultFolder?.replace(pathRegex, "")?.replace(".", "");
    if (!cleanPath || cleanPath.length === 0) {
        return {};
    }
    // If a directory was passed in, instead of a file
    if (!cleanPath.includes(".")) {
        return { folder: folder ?? defaultFolder };
    }
    const { name, ext } = path.parse(path.basename(cleanPath));
    return { name, ext, folder: folder ?? defaultFolder };
}

/**
 * Finds a filename that can be used at the specified path
 * @param file The preferred file name
 * @param defaultFolder Directory the file will be in, if not already part of file name
 * @returns The preferred file name, or the name with the lowest available number appended to it
 * (starting from 0)
 */
export async function findFileName(
    file: string,
    defaultFolder?: string,
): Promise<{
    name?: string;
    ext?: string;
    folder?: string;
}> {
    const { name, ext, folder } = clean(file, defaultFolder);
    // If file name is available, no need to append a number
    if (!fs.existsSync(`${UPLOAD_DIR}/${folder}/${name}${ext}`)) {
        return { name, ext, folder };
    }
    // If file name was not available, start appending a number until one works
    let curr = 0;
    while (curr < MAX_FILE_NAME_ATTEMPTS) {
        const currName = `${name}-${curr}${ext}`;
        if (!fs.existsSync(`${UPLOAD_DIR}/${folder}/${currName}`)) {
            return { name: `${currName}`, ext, folder };
        }
        curr++;
    }
    // If no valid name found after max tries, return null
    return {};
}

/**
 * Convert a file stream into a buffer
 * @param stream File stream
 * @param numBytes Maximum number of bytes to read from stream
 * @returns Buffer of file's contents
 */
function streamToBuffer(
    stream: fs.ReadStream,
    numBytes: number = MAX_BUFFER_SIZE,
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const _buf: Buffer[] = [];

        stream.on("data", (chunk: string | Buffer) => {
            const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
            _buf.push(buffer);
            if (_buf.length >= numBytes) {
                stream.destroy();
            }
        });
        stream.on("end", () => resolve(Buffer.concat(_buf)));
        stream.on("error", (err) => reject(err));
    });
}

/**
 * Finds all image sizes smaller or equal to the image size
 * @param width Width of image
 * @param height Height of image
 * @returns Object with same shape as IMAGE_SIZE, but with invalid sizes removed
 */
function resizeOptions(width: number, height: number): { [key: string]: number } {
    const sizes: { [key: string]: number } = {};
    for (const [key, value] of Object.entries(IMAGE_SIZE)) {
        if (width >= value || height >= value) {
            sizes[key] = value;
        }
    }
    return sizes;
}

/**
 * Saves a file in the specified folder, that folder being located in UPLOAD_DIR
 * @param stream Data stream of file
 * @param filename Name of file, including extension and folder (ex: 'public/boop.png')
 * @param mimetype Mime type of file (e.g. 'image/png', 'application/vnd.ms-excel')
 * @param overwrite Boolean indicating if existing files can be overwritten
 * @param acceptedTypes String or array of accepted file types, in mimetype form (e.g. 'image/png', 'application/vnd.ms-excel')
 * @returns An object containing:
 * - success - True if successful
 * - filename - Name of file that was saved (since naming conflicts might mean that a number was appended)
 */
export async function saveFile(
    stream: any,
    filename: string,
    mimetype: any,
    overwrite?: boolean,
    acceptedTypes?: string[],
) {
    try {
        const { name, ext, folder } = await (overwrite
            ? clean(filename, "public")
            : findFileName(filename));
        if (name === null) {
            throw Error("Could not create a valid file name");
        }
        if (acceptedTypes) {
            if (
                Array.isArray(acceptedTypes) &&
                !acceptedTypes.some((type) => mimetype.startsWith(type) || ext === type)
            ) {
                throw Error("File type not accepted");
            }
        }
        // Download the file
        await stream.pipe(fs.createWriteStream(`${UPLOAD_DIR}/${folder}/${name}${ext}`));
        return {
            success: true,
            filename: `${folder}/${name}${ext}`,
        };
    } catch (error) {
        logger.log(LogLevel.error, "Failed to save file.", { code: genErrorCode("0008"), error });
        return {
            success: false,
            filename: filename ?? "",
        };
    }
}

/**
 * Deletes the specified file from the specified folder (in UPLOAD_DIR)
 * @param file Name of file, including extension (ex: 'boop.png')
 * @returns True if successful
 */
export async function deleteFile(file: string) {
    try {
        const { name, ext, folder } = clean(file);
        // Use async file deletion to avoid blocking event loop
        await fs.promises.unlink(`${UPLOAD_DIR}/${folder}/${name}${ext}`);
        return true;
    } catch (error) {
        logger.log(LogLevel.error, "Failed to delete file", { code: genErrorCode("0009"), error });
        return false;
    }
}

interface SaveImageProps {
    file: Express.Multer.File;
    alt?: string | null;
    description?: string | null;
    labels?: string[] | null;
    errorOnDuplicate?: boolean;
}

/**
 * Saves an image file and its resizes in the specified folder at the server root directory
 * @param file File to save
 * @param alt Alt text for image
 * @param description Description of image
 * @param labels Labels for image. Similar concept to tags, but longer
 * @param errorOnDuplicate If image previously updated, throw error
 * @returns Object of shape { success, src, hash }
 */
export async function saveImage({
    file,
    alt,
    description,
    labels,
    errorOnDuplicate = false,
}: SaveImageProps): Promise<AddImageResponse> {
    let tempFilePath: string | undefined;

    try {
        // Extract Multer file properties
        // Note: buffer is present with memory storage, path is present with disk storage
        const { buffer, path: filePath, originalname, mimetype } = file;

        // Read file buffer from disk if using disk storage
        let image_buffer: Buffer;
        if (buffer) {
            // Memory storage - buffer is directly available
            image_buffer = buffer;
        } else if (filePath) {
            // Disk storage - read from temp file
            tempFilePath = filePath;
            image_buffer = await fs.promises.readFile(filePath);
        } else {
            throw new Error("No file buffer or path available from upload");
        }

        // Make sure that the file is actually an image
        if (!mimetype.startsWith("image/")) {
            throw Error("Invalid mimetype");
        }

        // Make sure image type is supported
        let { ext: extCheck } = path.parse(originalname);
        if (Object.values(IMAGE_EXTENSION).indexOf(extCheck.toLowerCase()) <= 0) {
            throw Error("Image type not supported");
        }

        // Find available filename
        const { name, folder } = await findFileName(originalname, "images");
        if (name === null) {
            throw Error("Could not create a valid file name");
        }

        // Determine image dimensions using the buffer
        const dimensions = probe.sync(image_buffer);
        if (dimensions === null) {
            throw new Error("Could not determine image dimensions");
        }

        // Validate image dimensions to prevent excessive storage usage
        // Each image creates 16 variants (8 sizes × 2 formats), so we must limit size
        const { width, height } = dimensions;
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
            logger.log(LogLevel.warn, "Image dimensions exceed maximum allowed", {
                code: genErrorCode("0020"),
                filename: originalname,
                dimensions: { width, height },
                maxDimension: MAX_IMAGE_DIMENSION,
            });
            throw new Error(
                `Image dimensions (${width}×${height}) exceed maximum allowed (${MAX_IMAGE_DIMENSION}×${MAX_IMAGE_DIMENSION}). Please resize the image before uploading.`,
            );
        }
        if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
            logger.log(LogLevel.warn, "Image dimensions below minimum allowed", {
                code: genErrorCode("0021"),
                filename: originalname,
                dimensions: { width, height },
                minDimension: MIN_IMAGE_DIMENSION,
            });
            throw new Error(
                `Image dimensions (${width}×${height}) are too small. Minimum dimension is ${MIN_IMAGE_DIMENSION}px.`,
            );
        }

        // If image is .heic or .heif, convert to jpg. Thanks, Apple
        if ([".heic", ".heif"].includes(extCheck.toLowerCase())) {
            try {
                const converted_buffer = await convert({
                    buffer: image_buffer, // the HEIC file buffer
                    format: "JPEG", // output format
                    quality: 1, // the jpeg compression quality, between 0 and 1
                });
                extCheck = "jpg";
                image_buffer = Buffer.from(converted_buffer);
            } catch (heicError) {
                logger.log(LogLevel.error, "HEIC conversion failed, skipping file", {
                    code: genErrorCode("0012"),
                    error: heicError,
                    filename: originalname,
                });
                throw new Error("HEIC conversion not available in current environment");
            }
        }
        // Determine image hash
        const hash = await imghash.hash(image_buffer);
        // Check if hash already exists (image previously uploaded)
        const previously_uploaded = await prisma.image.findUnique({ where: { hash } });
        if (previously_uploaded && errorOnDuplicate) {
            throw Error("File has already been uploaded");
        }
        // Generate image files and track metadata
        // NOTE: Current implementation uses upsert for idempotency - if any variant generation
        // fails, re-running the upload will overwrite/complete the variants. This provides
        // eventual consistency. For stronger atomicity, consider: (1) generate all files first,
        // (2) wrap all DB operations in prisma.$transaction(), (3) rollback files on DB failure.
        const full_size_filename = `${folder}/${name}-XXL${extCheck}`;
        const generatedFiles: Array<{ src: string; width: number; height: number }> = [];

        // Track WebP generation for reporting to admin
        let webpSuccesses = 0;
        let webpAttempts = 0;
        const webpFailures: string[] = [];

        // Generate original XXL file
        await sharp(image_buffer).toFile(`${UPLOAD_DIR}/${full_size_filename}`);
        generatedFiles.push({
            src: full_size_filename,
            width: dimensions.width,
            height: dimensions.height,
        });

        // Also generate WebP version of full-size image for better performance
        webpAttempts++;
        try {
            const full_size_webp_filename = `${folder}/${name}-XXL.webp`;
            const webp_info = await sharp(image_buffer)
                .webp({ quality: 85, effort: 4 })
                .toFile(`${UPLOAD_DIR}/${full_size_webp_filename}`);
            generatedFiles.push({
                src: full_size_webp_filename,
                width: webp_info.width,
                height: webp_info.height,
            });
            webpSuccesses++;
        } catch (webpError) {
            webpFailures.push("XXL");
            logger.log(LogLevel.error, "WebP conversion failed for full-size image, continuing with original format", {
                code: genErrorCode("0013"),
                error: webpError,
                filename: originalname,
            });
        }

        // Check if labels are provided to determine unlabeled_since timestamp
        const hasLabels = Array.isArray(labels) && labels.length > 0;

        // Create/update image record and file records
        // Using upsert provides idempotency - if upload is retried, it will complete/overwrite
        await prisma.image.upsert({
            where: { hash },
            create: {
                hash,
                alt,
                description,
                // Set unlabeled_since for new unlabeled images (30-day retention policy)
                unlabeled_since: hasLabels ? null : new Date(),
            },
            update: {
                alt,
                description,
                // Clear unlabeled_since if labels are being added
                ...(hasLabels ? { unlabeled_since: null } : {}),
            },
        });

        // Clear old file records and create new ones for generated files
        await prisma.image_file.deleteMany({ where: { hash } });
        for (const file of generatedFiles) {
            await prisma.image_file.create({
                data: {
                    hash,
                    src: file.src,
                    width: file.width,
                    height: file.height,
                },
            });
        }

        // Create labels if provided
        if (Array.isArray(labels)) {
            await prisma.image_labels.deleteMany({ where: { hash } });
            for (let i = 0; i < labels.length; i++) {
                await prisma.image_labels.create({
                    data: {
                        label: labels[i],
                        index: i,
                        image: { connect: { hash } },
                    },
                });
            }
        }

        // Find resize options
        const sizes = resizeOptions(dimensions.width, dimensions.height);
        for (const [key, value] of Object.entries(sizes)) {
            // XXL reserved for original image
            if (key === "XXL") {
                continue;
            }
            // Use largest dimension for resize
            const sizing_dimension = dimensions.width > dimensions.height ? "width" : "height";

            // Save original format (JPEG/PNG)
            const resize_filename = `${folder}/${name}-${key}${extCheck}`;
            const { width, height } = await sharp(image_buffer)
                .resize({ [sizing_dimension]: value })
                .toFile(`${UPLOAD_DIR}/${resize_filename}`);
            await prisma.image_file.create({
                data: {
                    hash,
                    src: resize_filename,
                    width,
                    height,
                },
            });

            // Also generate WebP version for better performance (typically 30% smaller)
            webpAttempts++;
            try {
                const resize_webp_filename = `${folder}/${name}-${key}.webp`;
                const webp_result = await sharp(image_buffer)
                    .resize({ [sizing_dimension]: value })
                    .webp({ quality: 85, effort: 4 })
                    .toFile(`${UPLOAD_DIR}/${resize_webp_filename}`);
                await prisma.image_file.create({
                    data: {
                        hash,
                        src: resize_webp_filename,
                        width: webp_result.width,
                        height: webp_result.height,
                    },
                });
                webpSuccesses++;
            } catch (webpError) {
                webpFailures.push(key);
                logger.log(LogLevel.error, `WebP conversion failed for ${key} size, continuing with original format`, {
                    code: genErrorCode("0014"),
                    error: webpError,
                    filename: originalname,
                    size: key,
                });
            }
        }

        // Build response with WebP generation status
        const warnings: string[] = [];
        if (webpFailures.length > 0) {
            warnings.push(
                `WebP generation failed for ${webpFailures.length} variant(s): ${webpFailures.join(", ")}. ` +
                `Original format is available but performance may be impacted.`,
            );
        }

        return {
            success: true,
            src: full_size_filename,
            hash,
            width: dimensions.width,
            height: dimensions.height,
            warnings: warnings.length > 0 ? warnings : undefined,
            webpVariantsGenerated: webpSuccesses,
            totalVariantsAttempted: webpAttempts,
        };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            src: null,
            hash: null,
            width: null,
            height: null,
        };
    } finally {
        // Clean up temp file if using disk storage
        if (tempFilePath) {
            try {
                await fs.promises.unlink(tempFilePath);
                logger.log(LogLevel.debug, `Cleaned up temp upload file: ${tempFilePath}`);
            } catch (cleanupError) {
                // Non-critical error - log but don't fail the upload
                logger.log(LogLevel.warn, `Failed to clean up temp file: ${tempFilePath}`, {
                    error: cleanupError,
                });
            }
        }
    }
}

/**
 * Check where an image is being used
 * @param hash Hash of image
 * @returns Object describing usage locations
 */
export async function checkImageUsage(hash: string) {
    const usage = {
        exists: false,
        usedInPlants: [] as string[],
        usedInLabels: [] as string[],
        usedInHeroBanners: false,
        usedInSeasonalContent: false,
        canDelete: true,
        warnings: [] as string[],
    };

    // Check if image exists
    const image = await prisma.image.findUnique({
        where: { hash },
        select: {
            hash: true,
            alt: true,
            files: {
                select: {
                    src: true,
                },
            },
            plant_images: {
                select: {
                    plantId: true,
                },
            },
            image_labels: {
                select: {
                    label: true,
                },
            },
        },
    });

    if (!image) {
        return usage;
    }

    usage.exists = true;

    // Check plant usage
    if (image.plant_images && image.plant_images.length > 0) {
        usage.usedInPlants = image.plant_images.map(
            (pi: { plantId: string }) => pi.plantId,
        );
        usage.warnings.push(
            `Image is used by ${image.plant_images.length} plant(s): ${usage.usedInPlants.join(", ")}`,
        );
    }

    // Check labels
    if (image.image_labels && image.image_labels.length > 0) {
        usage.usedInLabels = image.image_labels.map((il: { label: string }) => il.label);

        // Check for hero banner label
        if (usage.usedInLabels.includes("hero-banner")) {
            usage.usedInHeroBanners = true;
            usage.warnings.push("Image is used in hero banner carousel");
        }

        // Check for seasonal label
        if (usage.usedInLabels.includes("seasonal")) {
            usage.usedInSeasonalContent = true;
            usage.warnings.push("Image is used in seasonal content");
        }

        // Add general label warning if there are other labels
        const otherLabels = usage.usedInLabels.filter(
            (l) => l !== "hero-banner" && l !== "seasonal",
        );
        if (otherLabels.length > 0) {
            usage.warnings.push(
                `Image has ${otherLabels.length} other label(s): ${otherLabels.join(", ")}`,
            );
        }
    }

    // ENHANCED: Double-check JSON files for hero banner and seasonal usage
    // This provides safety in case label sync fails or is out of sync
    try {
        const fs = await import("fs");
        const path = await import("path");

        const dataPath = path.join(
            process.env.PROJECT_DIR || "",
            process.env.NODE_ENV === "production"
                ? "packages/server/dist/data"
                : "packages/server/src/data",
        );

        const contentPath = path.join(dataPath, "landing-page-content.json");

        if (fs.existsSync(contentPath)) {
            const contentData = fs.readFileSync(contentPath, "utf8");
            const content = JSON.parse(contentData);

            // Get all file paths for this image
            const imageSrcPaths = image.files.map((f: { src: string }) => f.src);

            // Check hero banners in JSON
            const heroBanners = content?.content?.hero?.banners || [];
            for (const banner of heroBanners) {
                if (banner.src) {
                    // Normalize paths for comparison
                    const normalizedBannerSrc = banner.src
                        .replace(/^\//, "")
                        .replace(/^images\//, "images/");

                    if (imageSrcPaths.some((src: string) =>
                        src === normalizedBannerSrc ||
                        `images/${banner.src}` === src ||
                        banner.src.includes(path.basename(src))
                    )) {
                        if (!usage.usedInHeroBanners) {
                            usage.usedInHeroBanners = true;
                            usage.warnings.push(
                                "⚠️ Image is used in hero banner carousel (detected in landing page JSON)",
                            );
                        }
                        break;
                    }
                }
            }

            // Check seasonal plants in JSON
            const seasonalPlants = content?.content?.seasonal?.plants || [];
            for (const plant of seasonalPlants) {
                if (plant.image) {
                    const normalizedPlantSrc = plant.image
                        .replace(/^\//, "")
                        .replace(/^images\//, "images/");

                    if (imageSrcPaths.some((src: string) =>
                        src === normalizedPlantSrc ||
                        `images/${plant.image}` === src ||
                        plant.image.includes(path.basename(src))
                    )) {
                        if (!usage.usedInSeasonalContent) {
                            usage.usedInSeasonalContent = true;
                            usage.warnings.push(
                                "⚠️ Image is used in seasonal content (detected in landing page JSON)",
                            );
                        }
                        break;
                    }
                }
            }
        }
    } catch (jsonCheckError) {
        // Log error but don't fail the usage check
        logger.log(LogLevel.warn, "Could not verify JSON usage for image", {
            code: genErrorCode("0022"),
            hash,
            error: jsonCheckError,
        });
    }

    return usage;
}

/**
 * Deletes an image and all resizes, using its hash
 * @param hash Hash of image
 * @param force Force deletion even if image is in use (default: false)
 * @returns Object with success status, deleted file count, and any errors
 */
export async function deleteImage(
    hash: string,
    force: boolean = false,
): Promise<{
    success: boolean;
    deletedFiles: number;
    errors: string[];
    usage?: ReturnType<typeof checkImageUsage> extends Promise<infer T> ? T : never;
}> {
    // Use distributed lock to prevent concurrent deletions of the same image
    const result = await withDistributedLock(
        hash,
        "delete-image",
        async () => await performImageDeletion(hash, force),
        30000, // Wait up to 30 seconds for lock (increased for large images with many variants)
    );

    if (result === null) {
        // Lock couldn't be acquired - another deletion is in progress
        logger.log(LogLevel.warn, "Could not acquire lock for image deletion - operation already in progress", {
            hash,
        });
        return {
            success: false,
            deletedFiles: 0,
            errors: ["Image deletion already in progress by another request. Please try again in a few moments."],
        };
    }

    return result;
}

/**
 * Internal function that performs the actual deletion
 * Separated from deleteImage to allow lock wrapping
 */
async function performImageDeletion(
    hash: string,
    force: boolean = false,
): Promise<{
    success: boolean;
    deletedFiles: number;
    errors: string[];
    usage?: ReturnType<typeof checkImageUsage> extends Promise<infer T> ? T : never;
}> {
    const errors: string[] = [];
    let deletedFiles = 0;

    try {
        // Check image usage first
        const usage = await checkImageUsage(hash);

        if (!usage.exists) {
            errors.push("Image not found");
            return { success: false, deletedFiles: 0, errors, usage };
        }

        // If image is in use and force is false, warn but allow deletion
        // The usage info will be returned to the caller for display
        if (!force && (usage.usedInPlants.length > 0 || usage.usedInLabels.length > 0)) {
            logger.log(LogLevel.warn, "Deleting image that is in use", {
                code: genErrorCode("0015"),
                hash,
                usage,
            });
        }

        // Find all files associated with image
        const imageData = await prisma.image.findUnique({
            where: { hash },
            select: { files: { select: { src: true } } },
        });

        if (!imageData) {
            errors.push("Image data not found");
            return { success: false, deletedFiles: 0, errors, usage };
        }

        // NEW APPROACH: Delete files BEFORE database to prevent orphaned files
        // If file deletion fails, we can retry. If DB is deleted first and file deletion
        // fails, we get orphaned files that require manual cleanup.

        // Track which files were successfully deleted for potential rollback
        const filePaths = imageData.files.map((f) => f.src);
        const failedDeletes: string[] = [];

        if (Array.isArray(imageData.files)) {
            for (const file of imageData.files) {
                try {
                    if (await deleteFile(file.src)) {
                        deletedFiles++;
                        logger.log(LogLevel.debug, `Successfully deleted file: ${file.src}`);
                    } else {
                        failedDeletes.push(file.src);
                        errors.push(`Failed to delete file: ${file.src}`);
                    }
                } catch (fileError) {
                    failedDeletes.push(file.src);
                    errors.push(`Error deleting file ${file.src}: ${fileError}`);
                    logger.log(LogLevel.error, "File deletion error", {
                        code: genErrorCode("0016"),
                        error: fileError,
                        file: file.src,
                    });
                }
            }
        }

        // If any file deletions failed, don't delete from database
        // This prevents broken references to missing files (worse than orphaned files)
        if (failedDeletes.length > 0) {
            logger.log(LogLevel.error, `File deletion incomplete, aborting DB deletion`, {
                code: genErrorCode("0018"),
                hash,
                totalFiles: filePaths.length,
                deletedFiles,
                failedFiles: failedDeletes.length,
            });
            errors.push(
                `Only ${deletedFiles}/${filePaths.length} files deleted. Database record preserved for retry.`,
            );
            return { success: false, deletedFiles, errors, usage };
        }

        // All files deleted successfully, now delete from database
        // Database deletion cascades to image_file, image_labels, plant_images
        // Use retry logic since files are already gone
        const MAX_DB_DELETE_RETRIES = 3;
        const RETRY_DELAY_MS = 1000; // 1 second base delay

        let dbDeletionSuccess = false;
        let lastDbError: unknown = null;

        for (let attempt = 1; attempt <= MAX_DB_DELETE_RETRIES; attempt++) {
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.image.delete({ where: { hash } });
                });

                logger.log(LogLevel.info, `Successfully deleted image and all files`, {
                    hash,
                    filesDeleted: deletedFiles,
                    dbDeleteAttempt: attempt,
                });

                dbDeletionSuccess = true;
                break; // Success, exit retry loop
            } catch (dbError) {
                lastDbError = dbError;

                if (attempt < MAX_DB_DELETE_RETRIES) {
                    const delay = RETRY_DELAY_MS * attempt; // Linear backoff
                    logger.log(LogLevel.warn, `DB deletion attempt ${attempt} failed, retrying in ${delay}ms`, {
                        code: genErrorCode("0019"),
                        hash,
                        attempt,
                        error: dbError,
                    });

                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    // Final attempt failed
                    logger.log(LogLevel.error, `CRITICAL: Files deleted but database deletion failed after ${MAX_DB_DELETE_RETRIES} attempts`, {
                        code: genErrorCode("0019"),
                        hash,
                        deletedFiles,
                        error: dbError,
                        note: "Database still references deleted files. Run orphan cleanup or manual DB cleanup required.",
                    });
                }
            }
        }

        if (!dbDeletionSuccess) {
            errors.push(`Database deletion failed after ${MAX_DB_DELETE_RETRIES} attempts: ${lastDbError}`);
            return { success: false, deletedFiles, errors, usage };
        }

        const success = errors.length === 0;
        return { success, deletedFiles, errors, usage };
    } catch (error) {
        logger.log(LogLevel.error, "Image deletion failed", {
            code: genErrorCode("0017"),
            error,
            hash,
        });
        errors.push(`Database deletion failed: ${error}`);
        return { success: false, deletedFiles, errors };
    }
}

/**
 * Reads all lines from each file in an array of filenames
 * @param files Array of filenames
 * @returns Array of data from each file
 */
export function readFiles(files: string[]): (string | null)[] {
    const data: (string | null)[] = [];
    for (const file of files) {
        const { name, ext, folder } = clean(file, "public");
        const path = `${UPLOAD_DIR}/${folder}/${name}${ext}`;
        if (fs.existsSync(path)) {
            data.push(fs.readFileSync(path, "utf8"));
        } else {
            data.push(null);
        }
    }
    return data;
}

/**
 * Saves a list of files
 * @param files Array of Multer file objects
 * @param overwrite Boolean indicating if existing files should be overwritten
 * @param acceptedTypes String or array of accepted file types, in mimetype form (e.g. 'image/png', 'application/vnd.ms-excel')
 * @returns Array of each filename saved, or null if unsuccessful
 */
export async function saveFiles(
    files: Express.Multer.File[],
    overwrite = true,
    acceptedTypes?: string[],
): Promise<(string | null)[]> {
    const data: (string | null)[] = [];
    for (const file of files) {
        const { buffer, originalname, mimetype } = file;

        // Create a readable stream from buffer for saveFile
        const { Readable } = require("stream");
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const { success, filename: finalFilename } = await saveFile(
            stream,
            originalname,
            mimetype,
            overwrite,
            acceptedTypes,
        );
        data.push(success ? finalFilename : null);
    }
    return data;
}

/**
 * Appends data to the end of a file. Useful for writing to a log file
 * @param file Name of file, including extension (ex: 'boop.txt')
 * @returns True if successful
 */
export async function appendToFile(file: string, data: string) {
    try {
        const { name, ext, folder } = clean(file, "public");
        fs.appendFileSync(`${UPLOAD_DIR}/${folder}/${name}${ext}`, data);
        return true;
    } catch (error) {
        logger.log(LogLevel.error, "Failed to append to file", {
            code: genErrorCode("00010"),
            error,
        });
        return false;
    }
}
