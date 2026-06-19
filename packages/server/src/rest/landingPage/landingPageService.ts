import {
    createDefaultLandingPageContent,
    filterActiveLandingPageContent,
    normalizeLandingPageContent,
} from "@local/shared";
import { readFileSync, writeFileSync } from "fs";
import { logger, LogLevel } from "../../logger.js";
import { syncHeroBannerLabels, syncSeasonalContentLabels } from "../../utils/imageLabelSync.js";
import type { LandingPageContent } from "../../types/landingPage.js";
import { landingPageContentPath } from "../../config/paths.js";

/**
 * Default landing page content structure
 */
const getDefaultContent = (): LandingPageContent => createDefaultLandingPageContent();

/**
 * Read the consolidated landing page content from file
 */
export const readLandingPageContent = (): LandingPageContent => {
    try {
        const data = readFileSync(landingPageContentPath(), "utf8");
        return normalizeLandingPageContent(JSON.parse(data) as LandingPageContent);
    } catch (error) {
        logger.log(LogLevel.error, "Error reading landing page content:", error);
        return getDefaultContent();
    }
};

/**
 * Write the consolidated landing page content to file
 *
 * IMPORTANT: This function now synchronizes image labels to prevent
 * hero banner images from being incorrectly marked as "unlabeled" and
 * deleted by cleanup scripts.
 */
export const writeLandingPageContent = async (content: LandingPageContent): Promise<void> => {
    try {
        const contentPath = landingPageContentPath();
        const dataToWrite: LandingPageContent = {
            ...content,
            metadata: {
                ...content.metadata,
                lastUpdated: new Date().toISOString(),
            },
        };

        // CRITICAL: Synchronize image labels BEFORE writing file
        // This ensures hero banner and seasonal content images are labeled correctly and prevents orphaning
        // If label sync fails, the file write is aborted (no partial state)
        await syncHeroBannerLabels(dataToWrite);
        logger.info("Image labels synchronized for hero banners");

        await syncSeasonalContentLabels(dataToWrite);
        logger.info("Image labels synchronized for seasonal content");

        // Only write the JSON file after successful label sync
        writeFileSync(contentPath, JSON.stringify(dataToWrite, null, 2), "utf8");
        logger.info("Landing page content updated successfully");
    } catch (error) {
        logger.log(LogLevel.error, "Error updating landing page content:", error);
        throw error;
    }
};

/**
 * Aggregate content from the structure and optionally filter active content
 * @param onlyActive - If true, only return active banners, plants, and tips (sorted by displayOrder)
 */
export const aggregateLandingPageContent = (onlyActive: boolean = true): LandingPageContent => {
    const landingPageData = readLandingPageContent();

    return onlyActive ? filterActiveLandingPageContent(landingPageData) : landingPageData;
};
