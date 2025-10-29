/**
 * Migration Tool: Label Existing Hero Banner Images
 *
 * This one-time migration script labels all hero banner images that are currently
 * referenced in landing page JSON files but lack the "hero-banner" label.
 *
 * This prevents these images from being incorrectly identified as "unlabeled" and
 * deleted by cleanup scripts.
 *
 * Usage:
 *   cd /root/NLN/packages/server
 *   npx tsx tools/migrateHeroBannerLabels.ts
 */

import { prisma } from "../src/db/prisma.js";
import { logger, LogLevel } from "../src/logger.js";
import {
    readLandingPageContent,
    readVariantContent,
} from "../src/rest/landingPage/landingPageService.js";
import { readVariants } from "../src/rest/landingPage/variantsService.js";
import {
    syncHeroBannerLabels,
    HERO_BANNER_LABEL,
    normalizeImagePath,
} from "../src/utils/imageLabelSync.js";
import type { LandingPageContent } from "../src/types/landingPage.js";

interface MigrationStats {
    totalImagesProcessed: number;
    imagesLabeled: number;
    imagesNotFound: number;
    variantsProcessed: number;
    errors: string[];
}

/**
 * Main migration function
 */
async function migrate(): Promise<MigrationStats> {
    const stats: MigrationStats = {
        totalImagesProcessed: 0,
        imagesLabeled: 0,
        imagesNotFound: 0,
        variantsProcessed: 0,
        errors: [],
    };

    console.log("=".repeat(80));
    console.log("Hero Banner Image Label Migration");
    console.log("=".repeat(80));
    console.log("");

    try {
        // 1. Process official landing page
        console.log("📄 Processing official landing page...");
        const officialContent = readLandingPageContent();

        if (officialContent.content?.hero?.banners) {
            const bannerCount = officialContent.content.hero.banners.length;
            console.log(`   Found ${bannerCount} hero banner(s)`);

            stats.totalImagesProcessed += bannerCount;

            // Use the sync function to label all hero banners
            await syncHeroBannerLabels(officialContent);

            // Count how many were actually labeled
            for (const banner of officialContent.content.hero.banners) {
                const normalizedSrc = normalizeImagePath(banner.src);
                const imageFile = await prisma.image_file.findUnique({
                    where: { src: normalizedSrc },
                    select: { hash: true },
                });

                if (imageFile) {
                    const label = await prisma.image_labels.findFirst({
                        where: {
                            hash: imageFile.hash,
                            label: HERO_BANNER_LABEL,
                        },
                    });

                    if (label) {
                        stats.imagesLabeled++;
                        console.log(`   ✓ Labeled: ${banner.src}`);
                    } else {
                        stats.errors.push(`Failed to label: ${banner.src}`);
                        console.log(`   ✗ Failed: ${banner.src}`);
                    }
                } else {
                    stats.imagesNotFound++;
                    console.log(`   ⚠ Not found in database: ${banner.src}`);
                }
            }
        } else {
            console.log("   No hero banners found in official content");
        }

        console.log("");

        // 2. Process all variants
        console.log("📦 Processing landing page variants...");
        const variants = readVariants();
        console.log(`   Found ${variants.length} variant(s)`);
        console.log("");

        for (const variant of variants) {
            try {
                const variantContent = readVariantContent(variant.id);

                if (!variantContent) {
                    console.log(`   ⚠ Skipping ${variant.name} (${variant.id}): Content file not found`);
                    continue;
                }

                if (variantContent.content?.hero?.banners) {
                    const bannerCount = variantContent.content.hero.banners.length;
                    console.log(`   Processing: ${variant.name} (${variant.id})`);
                    console.log(`   Found ${bannerCount} hero banner(s)`);

                    stats.totalImagesProcessed += bannerCount;
                    stats.variantsProcessed++;

                    // Label the variant's hero banners
                    await syncHeroBannerLabels(variantContent);

                    // Verify labeling
                    for (const banner of variantContent.content.hero.banners) {
                        const normalizedSrc = normalizeImagePath(banner.src);
                        const imageFile = await prisma.image_file.findUnique({
                            where: { src: normalizedSrc },
                            select: { hash: true },
                        });

                        if (imageFile) {
                            const label = await prisma.image_labels.findFirst({
                                where: {
                                    hash: imageFile.hash,
                                    label: HERO_BANNER_LABEL,
                                },
                            });

                            if (label) {
                                stats.imagesLabeled++;
                                console.log(`      ✓ Labeled: ${banner.src}`);
                            } else {
                                stats.errors.push(`Failed to label (variant ${variant.id}): ${banner.src}`);
                                console.log(`      ✗ Failed: ${banner.src}`);
                            }
                        } else {
                            stats.imagesNotFound++;
                            console.log(`      ⚠ Not found in database: ${banner.src}`);
                        }
                    }

                    console.log("");
                }
            } catch (variantError) {
                const errorMsg = `Error processing variant ${variant.id}: ${variantError instanceof Error ? variantError.message : String(variantError)}`;
                stats.errors.push(errorMsg);
                console.error(`   ✗ ${errorMsg}`);
                console.log("");
            }
        }

        console.log("=".repeat(80));
        console.log("Migration Summary");
        console.log("=".repeat(80));
        console.log(`Total images processed:    ${stats.totalImagesProcessed}`);
        console.log(`Images successfully labeled: ${stats.imagesLabeled}`);
        console.log(`Images not found in DB:    ${stats.imagesNotFound}`);
        console.log(`Variants processed:        ${stats.variantsProcessed}`);
        console.log(`Errors:                    ${stats.errors.length}`);

        if (stats.errors.length > 0) {
            console.log("");
            console.log("Errors:");
            stats.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        console.log("");
        console.log("✅ Migration complete!");
        console.log("");

        return stats;
    } catch (error) {
        console.error("❌ Migration failed:", error);
        throw error;
    }
}

/**
 * Entry point
 */
async function main() {
    try {
        const stats = await migrate();

        // Exit with error code if there were any errors
        if (stats.errors.length > 0) {
            console.log("⚠️  Migration completed with errors");
            process.exit(1);
        }

        process.exit(0);
    } catch (error) {
        logger.log(LogLevel.error, "Fatal error during migration:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
main();
