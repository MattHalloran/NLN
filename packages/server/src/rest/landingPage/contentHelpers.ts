import type {
    LandingPageContent,
    HeroBanner,
    SeasonalPlant,
    PlantTip,
} from "../../types/landingPage.js";

/**
 * Filter active content items in landing page content
 */
export const filterActiveContent = (content: LandingPageContent): LandingPageContent => {
    const filtered = { ...content };

    if (filtered.content?.hero?.banners) {
        filtered.content.hero.banners = filtered.content.hero.banners
            .filter((b: HeroBanner) => b.isActive)
            .sort((a: HeroBanner, b: HeroBanner) => a.displayOrder - b.displayOrder);
    }

    if (filtered.content?.seasonal?.plants) {
        filtered.content.seasonal.plants = filtered.content.seasonal.plants
            .filter((p: SeasonalPlant) => p.isActive)
            .sort((a: SeasonalPlant, b: SeasonalPlant) => a.displayOrder - b.displayOrder);
    }

    if (filtered.content?.seasonal?.tips) {
        filtered.content.seasonal.tips = filtered.content.seasonal.tips
            .filter((t: PlantTip) => t.isActive)
            .sort((a: PlantTip, b: PlantTip) => a.displayOrder - b.displayOrder);
    }

    return filtered;
};

/**
 * Get default empty content structure
 */
export const getDefaultContentStructure = (): LandingPageContent["content"] => ({
    hero: {
        banners: [],
        settings: {
            autoPlay: false,
            autoPlayDelay: 5000,
            showDots: true,
            showArrows: true,
            fadeTransition: false,
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
});

/**
 * Initialize empty content structure for landing page
 */
export const initializeEmptyContent = (content?: Partial<LandingPageContent>): LandingPageContent => {
    return {
        content: content?.content || getDefaultContentStructure(),
        theme: content?.theme || {
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
        layout: content?.layout || { sections: [] },
        experiments: content?.experiments || { tests: [] },
        contact: content?.contact || {
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
        metadata: content?.metadata || {
            version: "1.0.0",
            lastUpdated: new Date().toISOString(),
        },
    };
};

/**
 * Set cache headers for content response
 */
export const setCacheHeaders = (
    res: any,
    content: LandingPageContent,
    options: { maxAge?: number; variantId?: string } = {},
) => {
    const { maxAge = 300, variantId } = options;

    const headers: Record<string, string> = {
        "Cache-Control": `public, max-age=${maxAge}`,
        ETag: `"${Buffer.from(JSON.stringify(content)).toString("base64").substring(0, 20)}"`,
        "Last-Modified": content.metadata?.lastUpdated || new Date().toUTCString(),
    };

    if (variantId) {
        headers["X-Variant-ID"] = variantId;
    }

    res.set(headers);
};
