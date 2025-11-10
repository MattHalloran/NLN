import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { logger, LogLevel } from "../../logger.js";
import { syncHeroBannerLabels, syncSeasonalContentLabels } from "../../utils/imageLabelSync.js";
import type {
    LandingPageContent,
    HeroBanner,
    SeasonalPlant,
    PlantTip,
} from "../../types/landingPage.js";

// In production, data files are in dist folder, in development they're in src
const dataPath = join(
    process.env.PROJECT_DIR || "",
    process.env.NODE_ENV === "production" ? "packages/server/dist/data" : "packages/server/src/data"
);

/**
 * Default landing page content structure
 */
const getDefaultContent = (): LandingPageContent => ({
    metadata: { version: "2.0", lastUpdated: new Date().toISOString() },
    content: {
        hero: {
            banners: [],
            settings: {
                autoPlay: false,
                autoPlayDelay: 5000,
                showDots: true,
                showArrows: true,
                fadeTransition: false,
                fadeTransitionDuration: 500,
            },
            text: {
                title: "",
                subtitle: "",
                description: "",
                businessHours: "",
                trustBadges: [],
                buttons: [],
            },
        },
        services: { title: "", subtitle: "", items: [] },
        seasonal: { plants: [], tips: [] },
        newsletter: { title: "", description: "", disclaimer: "", isActive: false },
        company: { foundedYear: new Date().getFullYear(), description: "" },
    },
    contact: {
        name: "",
        address: { street: "", city: "", state: "", zip: "", full: "", googleMapsUrl: "" },
        phone: { display: "", link: "" },
        email: { address: "", link: "" },
        socialMedia: {},
        hours: {
            monday: "",
            tuesday: "",
            wednesday: "",
            thursday: "",
            friday: "",
            saturday: "",
            sunday: "",
        },
    },
    theme: {
        colors: {
            light: { primary: "", secondary: "", accent: "", background: "", paper: "" },
            dark: { primary: "", secondary: "", accent: "", background: "", paper: "" },
        },
        features: {
            showSeasonalContent: true,
            showNewsletter: true,
            showSocialProof: true,
            enableAnimations: true,
        },
    },
    layout: { sections: [] },
    experiments: { tests: [] },
});

/**
 * Read the consolidated landing page content from file
 */
export const readLandingPageContent = (): LandingPageContent => {
    try {
        const data = readFileSync(join(dataPath, "landing-page-content.json"), "utf8");
        return JSON.parse(data) as LandingPageContent;
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
        const contentPath = join(dataPath, "landing-page-content.json");
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

    // Clone the data so we don't modify the original
    const result: LandingPageContent = JSON.parse(
        JSON.stringify(landingPageData)
    ) as LandingPageContent;

    // Filter active content if requested
    if (onlyActive && result.content?.hero?.banners) {
        result.content.hero.banners = result.content.hero.banners
            .filter((b: HeroBanner) => b.isActive)
            .sort((a: HeroBanner, b: HeroBanner) => a.displayOrder - b.displayOrder);
    }

    if (onlyActive && result.content?.seasonal?.plants) {
        result.content.seasonal.plants = result.content.seasonal.plants
            .filter((p: SeasonalPlant) => p.isActive)
            .sort((a: SeasonalPlant, b: SeasonalPlant) => a.displayOrder - b.displayOrder);
    }

    if (onlyActive && result.content?.seasonal?.tips) {
        result.content.seasonal.tips = result.content.seasonal.tips
            .filter((t: PlantTip) => t.isActive)
            .sort((a: PlantTip, b: PlantTip) => a.displayOrder - b.displayOrder);
    }

    return result;
};
