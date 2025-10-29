/**
 * Image Label Synchronization
 *
 * This module manages automatic labeling of images referenced in JSON configuration files
 * (landing page content, variants). This prevents these images from being incorrectly
 * identified as "unlabeled" and deleted by cleanup scripts.
 *
 * Key functions:
 * - syncHeroBannerLabels: Add/remove "hero-banner" labels based on landing page content
 * - syncVariantImageLabels: Handle variant-specific image labeling
 */

import { prisma } from "../db/prisma.js";
import { logger, LogLevel } from "../logger.js";
import type { LandingPageContent, HeroBanner } from "../types/landingPage.js";

/**
 * Label identifier for hero banner images
 */
export const HERO_BANNER_LABEL = "hero-banner";

/**
 * Label identifier for seasonal content images
 */
export const SEASONAL_LABEL = "seasonal";

/**
 * Normalize an image src path from JSON to database format
 *
 * JSON paths: "/hero-butterfly-XXL.jpg" or "images/hero-butterfly-XXL.jpg"
 * DB paths: "images/hero-butterfly-XXL.jpg"
 *
 * @param src - Image src from JSON
 * @returns Normalized path matching database format
 */
export function normalizeImagePath(src: string): string {
    if (!src) return "";

    // Remove leading slash if present
    let normalized = src.startsWith("/") ? src.substring(1) : src;

    // Add images/ prefix if not present
    if (!normalized.startsWith("images/")) {
        normalized = `images/${normalized}`;
    }

    return normalized;
}

/**
 * Find image hash by its file path in the database
 *
 * @param src - Normalized image path (e.g., "images/hero-butterfly-XXL.jpg")
 * @returns Image hash if found, null otherwise
 */
async function findImageHashBySrc(src: string): Promise<string | null> {
    try {
        const imageFile = await prisma.image_file.findUnique({
            where: { src },
            select: { hash: true },
        });

        return imageFile?.hash || null;
    } catch (error) {
        logger.log(LogLevel.error, `Error finding image hash for src ${src}:`, error);
        return null;
    }
}

/**
 * Add a label to an image if it doesn't already exist
 * Also clears the unlabeled_since timestamp if set
 *
 * @param hash - Image hash
 * @param label - Label to add (e.g., "hero-banner")
 * @param index - Optional index for ordering within the label
 */
async function addImageLabel(hash: string, label: string, index: number = 0): Promise<void> {
    try {
        // Check if label already exists
        const existing = await prisma.image_labels.findFirst({
            where: { hash, label },
        });

        if (existing) {
            // Update index if different
            if (existing.index !== index) {
                await prisma.image_labels.update({
                    where: { id: existing.id },
                    data: { index },
                });
                logger.info(`Updated label "${label}" index for image ${hash} to ${index}`);
            }
        } else {
            // Create new label
            await prisma.image_labels.create({
                data: {
                    hash,
                    label,
                    index,
                },
            });

            logger.info(`Added label "${label}" to image ${hash}`);
        }

        // Clear unlabeled_since timestamp since image is now labeled
        await prisma.image.update({
            where: { hash },
            data: { unlabeled_since: null },
        });
    } catch (error) {
        logger.log(LogLevel.error, `Error adding label "${label}" to image ${hash}:`, error);
        throw error;
    }
}

/**
 * Remove a specific label from an image
 * Sets unlabeled_since timestamp if this was the last label
 *
 * @param hash - Image hash
 * @param label - Label to remove
 */
async function removeImageLabel(hash: string, label: string): Promise<void> {
    try {
        const deleted = await prisma.image_labels.deleteMany({
            where: { hash, label },
        });

        if (deleted.count > 0) {
            logger.info(`Removed label "${label}" from image ${hash}`);

            // Check if image now has zero labels
            const remainingLabels = await prisma.image_labels.count({
                where: { hash },
            });

            if (remainingLabels === 0) {
                // No labels left - mark for eventual cleanup
                await prisma.image.update({
                    where: { hash },
                    data: { unlabeled_since: new Date() },
                });

                logger.info(`Image ${hash} now unlabeled - set unlabeled_since timestamp (30-day retention)`);
            }
        }
    } catch (error) {
        logger.log(LogLevel.error, `Error removing label "${label}" from image ${hash}:`, error);
        throw error;
    }
}

/**
 * Get all image hashes that currently have a specific label
 *
 * @param label - Label to search for
 * @returns Array of image hashes
 */
async function getHashesWithLabel(label: string): Promise<string[]> {
    try {
        const labelRecords = await prisma.image_labels.findMany({
            where: { label },
            select: { hash: true },
        });

        return labelRecords.map((record: { hash: string }) => record.hash);
    } catch (error) {
        logger.log(LogLevel.error, `Error getting hashes with label "${label}":`, error);
        return [];
    }
}

/**
 * Synchronize hero banner labels based on landing page content
 *
 * This function:
 * 1. Extracts all hero banner image paths from the content
 * 2. Finds corresponding image hashes in the database
 * 3. Adds "hero-banner" label to images currently in use
 * 4. Removes "hero-banner" label from images no longer in use
 *
 * @param content - Landing page content with hero banners
 */
export async function syncHeroBannerLabels(content?: LandingPageContent): Promise<{ added: number; removed: number }> {
    try {
        // Read content from file if not provided
        let landingPageContent: LandingPageContent;
        if (!content) {
            const { readLandingPageContent } = await import("../rest/landingPage/landingPageService.js");
            landingPageContent = readLandingPageContent();
        } else {
            landingPageContent = content;
        }

        // Extract all hero banner src paths
        const heroBanners: HeroBanner[] = landingPageContent.content?.hero?.banners || [];
        const bannerSrcPaths = heroBanners.map((banner) => banner.src);

        // Normalize paths and find corresponding image hashes
        const currentHeroHashes: Set<string> = new Set();

        for (let i = 0; i < bannerSrcPaths.length; i++) {
            const src = bannerSrcPaths[i];
            if (!src) continue;

            const normalizedSrc = normalizeImagePath(src);
            const hash = await findImageHashBySrc(normalizedSrc);

            if (hash) {
                currentHeroHashes.add(hash);
                // Add label with index matching banner order
                await addImageLabel(hash, HERO_BANNER_LABEL, i);
            } else {
                logger.warn(`Hero banner image not found in database: ${src} (normalized: ${normalizedSrc})`);
            }
        }

        // Find all images that previously had the hero-banner label
        const previousHeroHashes = await getHashesWithLabel(HERO_BANNER_LABEL);

        // Remove hero-banner label from images no longer in use
        let removed = 0;
        for (const hash of previousHeroHashes) {
            if (!currentHeroHashes.has(hash)) {
                await removeImageLabel(hash, HERO_BANNER_LABEL);
                removed++;
            }
        }

        const added = currentHeroHashes.size;

        logger.info(
            `Hero banner label sync complete: ${added} images labeled, ${removed} labels removed`,
        );

        return { added, removed };
    } catch (error) {
        logger.log(LogLevel.error, "Error syncing hero banner labels:", error);
        throw error;
    }
}

/**
 * Sync seasonal content labels with current landing page content
 * This ensures seasonal content images are properly labeled
 *
 * @param content - Optional landing page content. If not provided, reads from file
 * @returns Object with counts of added and removed labels
 */
export async function syncSeasonalContentLabels(content?: LandingPageContent): Promise<{ added: number; removed: number }> {
    try {
        // Read content from file if not provided
        let landingPageContent: LandingPageContent;
        if (!content) {
            const { readLandingPageContent } = await import("../rest/landingPage/landingPageService.js");
            landingPageContent = readLandingPageContent();
        } else {
            landingPageContent = content;
        }

        // Extract seasonal plants with images
        const seasonalPlants = landingPageContent.content?.seasonal?.plants || [];
        const currentSeasonalHashes: Set<string> = new Set();

        // Process each seasonal plant that has an image
        for (let i = 0; i < seasonalPlants.length; i++) {
            const plant = seasonalPlants[i];

            // Skip if no imageHash (plant uses icon only)
            if (!plant.imageHash) continue;

            currentSeasonalHashes.add(plant.imageHash);

            // Add seasonal label with index matching plant order
            await addImageLabel(plant.imageHash, SEASONAL_LABEL, i);
        }

        // Find all images that previously had the seasonal label
        const previousSeasonalHashes = await getHashesWithLabel(SEASONAL_LABEL);

        // Remove seasonal label from images no longer in use
        let removed = 0;
        for (const hash of previousSeasonalHashes) {
            if (!currentSeasonalHashes.has(hash)) {
                await removeImageLabel(hash, SEASONAL_LABEL);
                removed++;
            }
        }

        const added = currentSeasonalHashes.size;

        logger.info(
            `Seasonal content label sync complete: ${added} images labeled, ${removed} labels removed`,
        );

        return { added, removed };
    } catch (error) {
        logger.log(LogLevel.error, "Error syncing seasonal content labels:", error);
        throw error;
    }
}

/**
 * Synchronize all JSON-referenced image labels for a landing page variant
 * This handles hero banners and any other JSON-stored image references
 *
 * @param content - Landing page content (variant or official)
 * @param variantId - Optional variant ID for variant-specific labeling
 */
export async function syncVariantImageLabels(
    content: LandingPageContent,
    variantId?: string,
): Promise<void> {
    try {
        // For now, only hero banners are stored in JSON
        // Future: add support for seasonal images, service icons, etc.
        await syncHeroBannerLabels(content);

        // If this is a variant, we could add variant-specific labels here
        if (variantId) {
            logger.info(`Synced image labels for variant: ${variantId}`);
        }
    } catch (error) {
        logger.log(LogLevel.error, "Error syncing variant image labels:", error);
        throw error;
    }
}

/**
 * Remove all labels for a specific variant
 * Used when deleting a variant
 *
 * @param variantId - Variant ID
 */
export async function removeVariantLabels(variantId: string): Promise<void> {
    try {
        const variantLabel = `variant-${variantId}`;
        await prisma.image_labels.deleteMany({
            where: { label: variantLabel },
        });

        logger.info(`Removed all labels for variant: ${variantId}`);
    } catch (error) {
        logger.log(LogLevel.error, `Error removing labels for variant ${variantId}:`, error);
        throw error;
    }
}
