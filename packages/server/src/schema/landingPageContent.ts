import { readFileSync, writeFileSync } from "fs";
import { GraphQLError } from "graphql";
import { join } from "path";
import { Context } from "../context.js";
import { initializeRedis } from "../redisConn.js";

const dataPath = join(__dirname, "../data");

// TypeScript interfaces
interface HeroBanner {
    id: string;
    src: string;
    alt: string;
    description: string;
    width: number;
    height: number;
    displayOrder: number;
    isActive: boolean;
}

interface HeroSettings {
    autoPlay: boolean;
    autoPlayDelay: number;
    showDots: boolean;
    showArrows: boolean;
    fadeTransition: boolean;
}

interface TrustBadge {
    icon: string;
    text: string;
}

interface HeroButton {
    text: string;
    link: string;
    type: string;
}

interface HeroContent {
    title: string;
    subtitle: string;
    description: string;
    businessHours: string;
    trustBadges: TrustBadge[];
    buttons: HeroButton[];
}

interface NewsletterSettings {
    title: string;
    description: string;
    disclaimer: string;
    isActive: boolean;
}

interface CompanyInfo {
    foundedYear: number;
    description: string;
}

interface ColorScheme {
    primary: string;
    secondary: string;
    accent: string;
}

interface FeatureToggles {
    showSeasonalContent: boolean;
    showNewsletter: boolean;
    showSocialProof: boolean;
    enableAnimations: boolean;
}

interface LandingPageSettings {
    hero: HeroContent;
    newsletter: NewsletterSettings;
    companyInfo: CompanyInfo;
    colors: ColorScheme;
    features: FeatureToggles;
}

interface SeasonalPlant {
    id: string;
    name: string;
    description: string;
    season: string;
    careLevel: string;
    icon: string;
    displayOrder: number;
    isActive: boolean;
}

interface PlantTip {
    id: string;
    title: string;
    description: string;
    category: string;
    season: string;
    displayOrder: number;
    isActive: boolean;
}

interface BusinessName {
    Short: string;
    Long: string;
}

interface LabelLink {
    Label: string;
    Link: string;
}

interface SocialLinks {
    Facebook?: string;
    Instagram?: string;
    Twitter?: string;
    LinkedIn?: string;
}

interface BusinessInfo {
    BUSINESS_NAME: BusinessName;
    ADDRESS: LabelLink;
    PHONE: LabelLink;
    FAX?: LabelLink;
    EMAIL: LabelLink;
    SOCIAL?: SocialLinks;
    WEBSITE?: string;
}

interface ContactInfo {
    business: BusinessInfo;
    hours: string;
}

interface LandingPageContent {
    heroBanners: HeroBanner[];
    heroSettings: HeroSettings;
    seasonalPlants: SeasonalPlant[];
    plantTips: PlantTip[];
    settings: LandingPageSettings;
    contactInfo: ContactInfo;
    lastUpdated: string;
}

// Cache configuration
const CACHE_KEY = "landing-page-content:v1";
const CACHE_TTL = 3600; // 1 hour in seconds

// Helper functions to read JSON files
const readHeroBanners = (): { banners: HeroBanner[], settings: HeroSettings } => {
    try {
        const data = readFileSync(join(dataPath, "hero-banners.json"), "utf8");
        const parsed = JSON.parse(data);
        return {
            banners: parsed.banners || [],
            settings: parsed.settings || {}
        };
    } catch (error) {
        console.error("Error reading hero banners:", error);
        return { banners: [], settings: {} as HeroSettings };
    }
};

const readSeasonalPlants = (): SeasonalPlant[] => {
    try {
        const data = readFileSync(join(dataPath, "seasonal-plants.json"), "utf8");
        return JSON.parse(data).plants || [];
    } catch (error) {
        console.error("Error reading seasonal plants:", error);
        return [];
    }
};

const readPlantTips = (): PlantTip[] => {
    try {
        const data = readFileSync(join(dataPath, "plant-tips.json"), "utf8");
        return JSON.parse(data).tips || [];
    } catch (error) {
        console.error("Error reading plant tips:", error);
        return [];
    }
};

const readLandingPageSettings = (): LandingPageSettings => {
    try {
        const data = readFileSync(join(dataPath, "landing-page-settings.json"), "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading landing page settings:", error);
        return {} as LandingPageSettings;
    }
};

const readBusinessInfo = (): BusinessInfo => {
    try {
        const assetsPath = join(process.env.PROJECT_DIR || "", "assets", "public");
        const data = readFileSync(join(assetsPath, "business.json"), "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading business info:", error);
        return {} as BusinessInfo;
    }
};

const readBusinessHours = (): string => {
    try {
        const assetsPath = join(process.env.PROJECT_DIR || "", "assets", "public");
        return readFileSync(join(assetsPath, "hours.md"), "utf8");
    } catch (error) {
        console.error("Error reading business hours:", error);
        return "";
    }
};

// Cache management functions
const invalidateCache = async (): Promise<void> => {
    try {
        const redis = await initializeRedis();
        await redis.del(CACHE_KEY);
        console.log("Landing page cache invalidated");
    } catch (error) {
        console.error("Error invalidating cache:", error);
    }
};

const getCachedContent = async (): Promise<LandingPageContent | null> => {
    try {
        const redis = await initializeRedis();
        const cached = await redis.get(CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.error("Error reading from cache:", error);
        return null;
    }
};

const setCachedContent = async (content: LandingPageContent): Promise<void> => {
    try {
        const redis = await initializeRedis();
        await redis.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(content));
        console.log("Landing page content cached");
    } catch (error) {
        console.error("Error caching content:", error);
    }
};

// Main content aggregation function
const aggregateLandingPageContent = (onlyActive: boolean = true): LandingPageContent => {
    const { banners, settings: heroSettings } = readHeroBanners();
    let seasonalPlants = readSeasonalPlants();
    let plantTips = readPlantTips();
    const settings = readLandingPageSettings();
    
    // Read contact info
    const businessInfo = readBusinessInfo();
    const businessHours = readBusinessHours();

    // Filter active content if requested
    if (onlyActive) {
        seasonalPlants = seasonalPlants.filter(p => p.isActive);
        plantTips = plantTips.filter(t => t.isActive);
    }

    // Sort by display order
    const heroBanners = banners
        .filter(b => onlyActive ? b.isActive : true)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    
    seasonalPlants.sort((a, b) => a.displayOrder - b.displayOrder);
    plantTips.sort((a, b) => a.displayOrder - b.displayOrder);

    return {
        heroBanners,
        heroSettings,
        seasonalPlants,
        plantTips,
        settings,
        contactInfo: {
            business: businessInfo,
            hours: businessHours
        },
        lastUpdated: new Date().toISOString()
    };
};

export const typeDef = /* GraphQL */ `
    type HeroBanner {
        id: ID!
        src: String!
        alt: String!
        description: String!
        width: Int!
        height: Int!
        displayOrder: Int!
        isActive: Boolean!
    }

    type HeroSettings {
        autoPlay: Boolean!
        autoPlayDelay: Int!
        showDots: Boolean!
        showArrows: Boolean!
        fadeTransition: Boolean!
    }

    type TrustBadge {
        icon: String!
        text: String!
    }

    type HeroButton {
        text: String!
        link: String!
        type: String!
    }

    type HeroContent {
        title: String!
        subtitle: String!
        description: String!
        businessHours: String!
        trustBadges: [TrustBadge!]!
        buttons: [HeroButton!]!
    }

    type NewsletterSettings {
        title: String!
        description: String!
        disclaimer: String!
        isActive: Boolean!
    }

    type CompanyInfo {
        foundedYear: Int!
        description: String!
    }

    type ColorScheme {
        primary: String!
        secondary: String!
        accent: String!
    }

    type FeatureToggles {
        showSeasonalContent: Boolean!
        showNewsletter: Boolean!
        showSocialProof: Boolean!
        enableAnimations: Boolean!
    }

    type LandingPageSettings {
        hero: HeroContent!
        newsletter: NewsletterSettings!
        companyInfo: CompanyInfo!
        colors: ColorScheme!
        features: FeatureToggles!
    }

    type BusinessName {
        Short: String!
        Long: String!
    }

    type LabelLink {
        Label: String!
        Link: String!
    }

    type SocialLinks {
        Facebook: String
        Instagram: String
        Twitter: String
        LinkedIn: String
    }

    type BusinessInfo {
        BUSINESS_NAME: BusinessName!
        ADDRESS: LabelLink!
        PHONE: LabelLink!
        FAX: LabelLink
        EMAIL: LabelLink!
        SOCIAL: SocialLinks
        WEBSITE: String
    }

    type ContactInfo {
        business: BusinessInfo!
        hours: String!
    }

    type LandingPageContent {
        heroBanners: [HeroBanner!]!
        heroSettings: HeroSettings!
        seasonalPlants: [SeasonalPlant!]!
        plantTips: [PlantTip!]!
        settings: LandingPageSettings!
        contactInfo: ContactInfo!
        lastUpdated: String!
    }

    extend type Query {
        landingPageContent(onlyActive: Boolean): LandingPageContent!
    }

    extend type Mutation {
        invalidateLandingPageCache: Boolean!
    }
`;

export const resolvers = {
    Query: {
        landingPageContent: async (_: any, args: { onlyActive?: boolean }): Promise<LandingPageContent> => {
            const onlyActive = args.onlyActive !== false; // Default to true

            // Try to get from cache first
            const cached = await getCachedContent();
            if (cached) {
                console.log("Returning cached landing page content");
                return cached;
            }

            // Generate fresh content if not in cache
            console.log("Generating fresh landing page content and caching it");
            const content = aggregateLandingPageContent(onlyActive);
            
            // Cache the new content
            await setCachedContent(content);
            
            return content;
        },
    },
    Mutation: {
        invalidateLandingPageCache: async (_: any, _args: {}, context: Context): Promise<boolean> => {
            // Admin authorization check
            if (!context.req.isAdmin) {
                throw new GraphQLError("Admin access required");
            }

            await invalidateCache();
            return true;
        },
    },
};

// Export cache invalidation function for use in other resolvers
export { invalidateCache };