import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { logger, LogLevel } from "../../logger.js";
import type { LandingPageContent, LandingPageVariant } from "../../types/landingPage.js";

// In production, data files are in dist folder, in development they're in src
const dataPath = join(
    process.env.PROJECT_DIR || "",
    process.env.NODE_ENV === "production" ? "packages/server/dist/data" : "packages/server/src/data",
);

/**
 * Read all variants from the variants.json file
 */
export const readVariants = (): LandingPageVariant[] => {
    try {
        const data = readFileSync(join(dataPath, "variants.json"), "utf8");
        const parsed = JSON.parse(data);
        return Object.values(parsed);
    } catch (error) {
        logger.log(LogLevel.error, "Error reading variants:", error);
        return [];
    }
};

/**
 * Write variants to the variants.json file
 */
export const writeVariants = (variants: LandingPageVariant[]): void => {
    try {
        const variantsPath = join(dataPath, "variants.json");
        // Store as object with variant IDs as keys
        const variantsObj: Record<string, LandingPageVariant> = {};
        variants.forEach((variant) => {
            variantsObj[variant.id] = variant;
        });
        writeFileSync(variantsPath, JSON.stringify(variantsObj, null, 2), "utf8");
        logger.info("Variants updated successfully");
    } catch (error) {
        logger.log(LogLevel.error, "Error writing variants:", error);
        throw error;
    }
};

/**
 * Read variant landing page content file
 */
export const readVariantContent = (variantId: string): LandingPageContent | null => {
    try {
        const fileName = `landing-page-variant-${variantId}.json`;
        const data = readFileSync(join(dataPath, fileName), "utf8");
        return JSON.parse(data) as LandingPageContent;
    } catch (error) {
        logger.log(LogLevel.error, `Error reading variant content ${variantId}:`, error);
        return null;
    }
};

/**
 * Write variant landing page content file
 */
export const writeVariantContent = (variantId: string, content: LandingPageContent): void => {
    try {
        const fileName = `landing-page-variant-${variantId}.json`;
        const filePath = join(dataPath, fileName);
        const dataToWrite: LandingPageContent = {
            ...content,
            metadata: {
                ...content.metadata,
                lastUpdated: new Date().toISOString(),
            },
        };
        writeFileSync(filePath, JSON.stringify(dataToWrite, null, 2), "utf8");
        logger.info(`Variant content ${variantId} updated successfully`);
    } catch (error) {
        logger.log(LogLevel.error, `Error writing variant content ${variantId}:`, error);
        throw error;
    }
};

/**
 * Delete variant content file
 */
export const deleteVariantContent = (variantId: string): void => {
    try {
        const variantFile = join(dataPath, `landing-page-variant-${variantId}.json`);

        try {
            unlinkSync(variantFile);
            logger.info(`Variant content file for ${variantId} deleted`);
        } catch (err) {
            logger.warn(`Could not delete ${variantFile}:`, err);
        }
    } catch (error) {
        logger.log(LogLevel.error, `Error deleting variant content for ${variantId}:`, error);
    }
};

/**
 * Get all enabled variants
 */
export const getEnabledVariants = (): LandingPageVariant[] => {
    const variants = readVariants();
    return variants.filter((v) => v.status === "enabled");
};

/**
 * Assign variant based on traffic allocation (weighted random)
 */
export const assignVariantWeighted = (variants: LandingPageVariant[]): LandingPageVariant | null => {
    if (variants.length === 0) {
        return null;
    }

    const totalAllocation = variants.reduce((sum, v) => sum + v.trafficAllocation, 0);
    if (totalAllocation === 0) {
        return null;
    }

    const random = Math.random() * totalAllocation;
    let cumulative = 0;

    for (const variant of variants) {
        cumulative += variant.trafficAllocation;
        if (random <= cumulative) {
            return variant;
        }
    }

    // Fallback to last variant
    return variants[variants.length - 1];
};

/**
 * Validate traffic allocation (must sum to 100 for enabled variants)
 */
export const validateTrafficAllocation = (variants: LandingPageVariant[]): boolean => {
    const enabledVariants = variants.filter((v) => v.status === "enabled");
    const total = enabledVariants.reduce((sum, v) => sum + v.trafficAllocation, 0);
    return Math.abs(total - 100) < 0.01; // Allow for floating point errors
};
