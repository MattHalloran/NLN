import { Router, Request, Response } from "express";
import { merge } from "lodash";
import { logger, LogLevel } from "../logger.js";
import { auditAdminAction, AuditEventType } from "../utils/auditLogger.js";
import type {
    LandingPageContent,
    HeroBanner,
    SeasonalPlant,
    PlantTip,
    HeroSettings,
    BusinessContactData,
    LandingPageVariant,
} from "../types/landingPage.js";
import {
    readLandingPageContent,
    writeLandingPageContent,
    aggregateLandingPageContent,
} from "./landingPage/landingPageService.js";
import { getCachedContent, setCachedContent, invalidateCache } from "./landingPage/landingPageCache.js";
import {
    readVariants,
    writeVariants,
    readVariantContent,
    writeVariantContent,
    deleteVariantContent,
    getEnabledVariants,
    assignVariantWeighted,
    validateTrafficAllocation,
} from "./landingPage/variantsService.js";

// Extend Express Request to include auth properties
interface AuthenticatedRequest extends Request {
    isAdmin?: boolean;
}

const router = Router();

// GET endpoint for landing page content with variant-based A/B testing support
router.get("/", async (req: Request, res: Response) => {
    try {
        // Parse query params
        const onlyActive = req.query.onlyActive !== "false"; // Default to true
        const abTest = req.query.abTest as string | undefined;
        const variantId = req.query.variantId as string | undefined;

        // If abTest=false, return official landing page (no A/B testing)
        if (abTest === "false") {
            logger.info("Returning official landing page (A/B testing disabled via query param)");
            const content = aggregateLandingPageContent(onlyActive);

            res.set({
                "Cache-Control": "public, max-age=300",
                ETag: `"${Buffer.from(JSON.stringify(content)).toString("base64").substring(0, 20)}"`,
                "Last-Modified": content.metadata.lastUpdated,
            });

            return res.json(content);
        }

        // NEW VARIANT SYSTEM: If variantId is provided
        if (variantId) {
            const variants = readVariants();
            const requestedVariant = variants.find((v) => v.id === variantId);

            if (requestedVariant && requestedVariant.status === "enabled") {
                const variantContent = readVariantContent(variantId);

                if (variantContent) {
                    logger.info(`Returning variant ${variantId}`);

                    // Add metadata about which variant is being served
                    const contentWithMeta: LandingPageContent = {
                        ...variantContent,
                        _meta: {
                            variantId,
                        },
                    };

                    // Filter active content if requested
                    if (onlyActive) {
                        if (contentWithMeta.content?.hero?.banners) {
                            contentWithMeta.content.hero.banners =
                                contentWithMeta.content.hero.banners
                                    .filter((b: HeroBanner) => b.isActive)
                                    .sort(
                                        (a: HeroBanner, b: HeroBanner) =>
                                            a.displayOrder - b.displayOrder,
                                    );
                        }

                        if (contentWithMeta.content?.seasonal?.plants) {
                            contentWithMeta.content.seasonal.plants =
                                contentWithMeta.content.seasonal.plants
                                    .filter((p: SeasonalPlant) => p.isActive)
                                    .sort(
                                        (a: SeasonalPlant, b: SeasonalPlant) =>
                                            a.displayOrder - b.displayOrder,
                                    );
                        }

                        if (contentWithMeta.content?.seasonal?.tips) {
                            contentWithMeta.content.seasonal.tips =
                                contentWithMeta.content.seasonal.tips
                                    .filter((t: PlantTip) => t.isActive)
                                    .sort(
                                        (a: PlantTip, b: PlantTip) =>
                                            a.displayOrder - b.displayOrder,
                                    );
                        }
                    }

                    try {
                        res.set({
                            "Cache-Control": "public, max-age=60", // Shorter cache for variants
                            "X-Variant-ID": variantId,
                        });

                        return res.json(contentWithMeta);
                    } catch (jsonError) {
                        logger.log(LogLevel.error, "Error sending variant JSON response:", jsonError);
                        logger.log(LogLevel.error, "Content object keys:", Object.keys(contentWithMeta));
                        throw jsonError;
                    }
                }

                logger.warn(
                    `Variant content file not found for ${variantId}. Falling through to new assignment.`,
                );
            } else {
                logger.info(
                    `Variant ${variantId} not found or not enabled. Assigning new variant.`,
                );
            }
        }

        // Check for enabled variants and assign one
        const enabledVariants = getEnabledVariants();

        if (enabledVariants.length > 0) {
            const assignedVariant = assignVariantWeighted(enabledVariants);

            if (assignedVariant) {
                const variantContent = readVariantContent(assignedVariant.id);

                if (variantContent) {
                    logger.info(`New visitor: Assigned to variant ${assignedVariant.id}`);

                    const contentWithMeta: LandingPageContent = {
                        ...variantContent,
                        _meta: {
                            variantId: assignedVariant.id,
                        },
                    };

                    // Filter active content if requested
                    if (onlyActive) {
                        if (contentWithMeta.content?.hero?.banners) {
                            contentWithMeta.content.hero.banners =
                                contentWithMeta.content.hero.banners
                                    .filter((b: HeroBanner) => b.isActive)
                                    .sort(
                                        (a: HeroBanner, b: HeroBanner) =>
                                            a.displayOrder - b.displayOrder,
                                    );
                        }

                        if (contentWithMeta.content?.seasonal?.plants) {
                            contentWithMeta.content.seasonal.plants =
                                contentWithMeta.content.seasonal.plants
                                    .filter((p: SeasonalPlant) => p.isActive)
                                    .sort(
                                        (a: SeasonalPlant, b: SeasonalPlant) =>
                                            a.displayOrder - b.displayOrder,
                                    );
                        }

                        if (contentWithMeta.content?.seasonal?.tips) {
                            contentWithMeta.content.seasonal.tips =
                                contentWithMeta.content.seasonal.tips
                                    .filter((t: PlantTip) => t.isActive)
                                    .sort(
                                        (a: PlantTip, b: PlantTip) =>
                                            a.displayOrder - b.displayOrder,
                                    );
                        }
                    }

                    try {
                        res.set({
                            "Cache-Control": "public, max-age=60",
                            "X-Variant-ID": assignedVariant.id,
                        });

                        return res.json(contentWithMeta);
                    } catch (jsonError) {
                        logger.log(LogLevel.error, "Error sending auto-assigned variant JSON response:", jsonError);
                        logger.log(LogLevel.error, "Content object keys:", Object.keys(contentWithMeta));
                        throw jsonError;
                    }
                }

                logger.warn(
                    `Variant content file not found for ${assignedVariant.id}. Falling back to official content.`,
                );
            }
        }

        // No enabled variants - return official landing page
        logger.info("No enabled variants. Returning official landing page");

        // Try cache first for official content
        const cached = await getCachedContent();
        if (cached) {
            logger.info("Returning cached official landing page content");

            res.set({
                "Cache-Control": "public, max-age=300",
                ETag: `"${Buffer.from(JSON.stringify(cached)).toString("base64").substring(0, 20)}"`,
                "Last-Modified": cached.metadata.lastUpdated || new Date().toUTCString(),
            });

            return res.json(cached);
        }

        // Generate fresh content
        const content = aggregateLandingPageContent(onlyActive);

        // Cache it
        await setCachedContent(content);

        res.set({
            "Cache-Control": "public, max-age=300",
            ETag: `"${Buffer.from(JSON.stringify(content)).toString("base64").substring(0, 20)}"`,
            "Last-Modified": content.metadata.lastUpdated,
        });

        return res.json(content);
    } catch (error) {
        logger.log(LogLevel.error, "Error fetching landing page content:", error);
        return res.status(500).json({
            error: "Failed to fetch landing page content",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// POST endpoint to invalidate cache (admin only)
router.post("/invalidate-cache", async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Check admin access (using the auth middleware)
        if (!req.isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        await invalidateCache();
        return res.json({ success: true, message: "Cache invalidated successfully" });
    } catch (error) {
        logger.log(LogLevel.error, "Error invalidating cache:", error);
        return res.status(500).json({
            error: "Failed to invalidate cache",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// PUT endpoint to update entire landing page content (admin only)
// Supports editing variants via query params: ?variantId=xxx
router.put("/", async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Check admin access (using the auth middleware)
        if (!req.isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const { heroBanners, heroSettings, seasonalPlants, plantTips, seasonalHeader, seasonalSections, newsletterButtonText, settings, contactInfo, about, socialProof, location } =
            req.body as {
                heroBanners?: HeroBanner[];
                heroSettings?: HeroSettings;
                seasonalPlants?: SeasonalPlant[];
                plantTips?: PlantTip[];
                seasonalHeader?: { title: string; subtitle: string };
                seasonalSections?: {
                    plants: { currentSeasonTitle: string; otherSeasonTitleTemplate: string };
                    tips: { title: string };
                };
                newsletterButtonText?: string;
                settings?: Record<string, unknown>;
                contactInfo?: { business?: BusinessContactData; hours?: string };
                about?: {
                    story: {
                        overline: string;
                        title: string;
                        subtitle: string;
                        paragraphs: string[];
                        cta: { text: string; link: string };
                    };
                    values: {
                        title: string;
                        items: Array<{
                            icon: string;
                            title: string;
                            description: string;
                        }>;
                    };
                    mission: {
                        title: string;
                        quote: string;
                        attribution: string;
                    };
                };
                socialProof?: {
                    header: {
                        title: string;
                        subtitle: string;
                    };
                    stats: Array<{
                        number: string;
                        label: string;
                        subtext: string;
                    }>;
                    mission: {
                        title: string;
                        quote: string;
                        attribution: string;
                    };
                    strengths: {
                        title: string;
                        items: Array<{
                            icon: string;
                            title: string;
                            description: string;
                            highlight: string;
                        }>;
                    };
                    clientTypes: {
                        title: string;
                        items: Array<{
                            icon: string;
                            label: string;
                        }>;
                    };
                    footer: {
                        description: string;
                        chips: string[];
                    };
                };
                location?: {
                    header: {
                        title: string;
                        subtitle: string;
                        chip: string;
                    };
                    map: {
                        style: "gradient" | "embedded";
                        showGetDirectionsButton: boolean;
                        buttonText: string;
                    };
                    contactMethods: {
                        sectionTitle: string;
                        order: ("phone" | "address" | "email")[];
                        descriptions: {
                            phone: string;
                            address: string;
                            email: string;
                        };
                    };
                    businessHours: {
                        title: string;
                        chip: string;
                    };
                    visitInfo: {
                        sectionTitle: string;
                        items: Array<{
                            id: string;
                            title: string;
                            icon: string;
                            description: string;
                            displayOrder: number;
                            isActive: boolean;
                        }>;
                    };
                    cta: {
                        title: string;
                        description: string;
                        buttons: Array<{
                            id: string;
                            text: string;
                            variant: "contained" | "outlined" | "text";
                            color: "primary" | "secondary";
                            action: "directions" | "contact" | "external";
                            url?: string;
                            displayOrder: number;
                            isActive: boolean;
                        }>;
                    };
                };
            };

        const updatedSections: string[] = [];

        const variantId = req.query.variantId as string | undefined;

        let currentContent: LandingPageContent;
        let isVariant = false;
        let activeVariantId: string | undefined;

        // Editing a variant by variantId
        if (variantId) {
            const variantContent = readVariantContent(variantId);
            if (!variantContent) {
                return res.status(404).json({ error: `Variant ${variantId} not found` });
            }
            currentContent = variantContent;
            isVariant = true;
            activeVariantId = variantId;
            logger.info(`Editing variant ${variantId}`);
        }
        // Editing official landing page
        else {
            currentContent = readLandingPageContent();
            logger.info("Editing official landing page");
        }

        // Update hero banners if provided
        if (heroBanners) {
            currentContent.content = currentContent.content || {
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
            };
            currentContent.content.hero = currentContent.content.hero || {
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
            };
            currentContent.content.hero.banners = heroBanners;
            updatedSections.push("heroBanners");
        }

        // Update hero settings if provided
        if (heroSettings) {
            currentContent.content = currentContent.content || {
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
            };
            currentContent.content.hero = currentContent.content.hero || {
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
            };
            currentContent.content.hero.settings = heroSettings;
            updatedSections.push("heroSettings");
        }

        // Update seasonal plants if provided
        if (seasonalPlants) {
            logger.info(`Received ${seasonalPlants.length} seasonal plants to save`);
            // Log first plant to debug image field handling
            if (seasonalPlants.length > 0) {
                logger.info(`First plant data: ${JSON.stringify(seasonalPlants[0])}`);
            }

            currentContent.content = currentContent.content || {
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
            };
            currentContent.content.seasonal = currentContent.content.seasonal || {
                plants: [],
                tips: [],
            };
            currentContent.content.seasonal.plants = seasonalPlants;
            updatedSections.push("seasonalPlants");
        }

        // Update plant tips if provided
        if (plantTips) {
            currentContent.content = currentContent.content || {
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
            };
            currentContent.content.seasonal = currentContent.content.seasonal || {
                plants: [],
                tips: [],
            };
            currentContent.content.seasonal.tips = plantTips;
            updatedSections.push("plantTips");
        }

        // Update seasonal header text if provided
        if (seasonalHeader) {
            currentContent.content = currentContent.content || {
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
            };
            currentContent.content.seasonal = currentContent.content.seasonal || {
                plants: [],
                tips: [],
            };
            currentContent.content.seasonal.header = seasonalHeader;
            updatedSections.push("seasonalHeader");
        }

        // Update seasonal sections text if provided
        if (seasonalSections) {
            currentContent.content = currentContent.content || {
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
            };
            currentContent.content.seasonal = currentContent.content.seasonal || {
                plants: [],
                tips: [],
            };
            currentContent.content.seasonal.sections = seasonalSections;
            updatedSections.push("seasonalSections");
        }

        // Update newsletter button text if provided
        if (newsletterButtonText !== undefined) {
            currentContent.content = currentContent.content || {
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
            };
            currentContent.content.newsletter = currentContent.content.newsletter || {
                title: "",
                description: "",
                disclaimer: "",
                isActive: false,
            };
            currentContent.content.newsletter.buttonText = newsletterButtonText;
            updatedSections.push("newsletterButtonText");
        }

        // Update general settings if provided
        if (settings) {
            const settingsData = settings;
            currentContent.content = currentContent.content || {
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
            };
            currentContent.theme = currentContent.theme || {
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
            };
            currentContent.layout = currentContent.layout || { sections: [] };
            currentContent.experiments = currentContent.experiments || { tests: [] };

            if (settingsData.hero) {
                currentContent.content.hero = currentContent.content.hero || {
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
                };
                currentContent.content.hero.text =
                    settingsData.hero as typeof currentContent.content.hero.text;
            }
            if (settingsData.newsletter) {
                currentContent.content.newsletter =
                    settingsData.newsletter as typeof currentContent.content.newsletter;
            }
            if (settingsData.companyInfo) {
                currentContent.content.company =
                    settingsData.companyInfo as typeof currentContent.content.company;
            }
            if (settingsData.services) {
                currentContent.content.services =
                    settingsData.services as typeof currentContent.content.services;
            }
            if (settingsData.colors) {
                currentContent.theme.colors =
                    settingsData.colors as typeof currentContent.theme.colors;
            }
            if (settingsData.features) {
                currentContent.theme.features =
                    settingsData.features as typeof currentContent.theme.features;
            }
            if (settingsData.sections) {
                currentContent.layout.sections =
                    settingsData.sections as typeof currentContent.layout.sections;
            }
            if (settingsData.abTesting) {
                currentContent.experiments.abTesting = settingsData.abTesting;
            }
            updatedSections.push("settings");
        }

        // Update contact info if provided
        if (contactInfo) {
            currentContent.contact = currentContent.contact || {
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
            };

            if (contactInfo.business) {
                const business = contactInfo.business;
                if (business.BUSINESS_NAME) {
                    currentContent.contact.name =
                        business.BUSINESS_NAME.Short || business.BUSINESS_NAME.Long || "";
                }
                if (business.ADDRESS) {
                    const addressParts = business.ADDRESS.Label.split(" ");
                    const zip = addressParts[addressParts.length - 1] || "";
                    const state = addressParts[addressParts.length - 2] || "";
                    const city = addressParts[addressParts.length - 3] || "";
                    const street = addressParts.slice(0, addressParts.length - 3).join(" ");

                    currentContent.contact.address = {
                        street,
                        city,
                        state,
                        zip,
                        full: business.ADDRESS.Label,
                        googleMapsUrl: business.ADDRESS.Link,
                    };
                }
                if (business.PHONE) {
                    currentContent.contact.phone = {
                        display: business.PHONE.Label,
                        link: business.PHONE.Link,
                    };
                }
                if (business.EMAIL) {
                    currentContent.contact.email = {
                        address: business.EMAIL.Label,
                        link: business.EMAIL.Link,
                    };
                }
                updatedSections.push("contactInfo.business");
            }

            if (contactInfo.hours) {
                currentContent.contact.hours = contactInfo.hours;
                updatedSections.push("contactInfo.hours");
            }
        }

        // Update about section if provided
        if (about) {
            currentContent.content = currentContent.content || {
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
            };
            currentContent.content.about = about;
            updatedSections.push("about");
            logger.info(`Updated about section with ${about.values.items.length} value items`);
        }

        // Update social proof section if provided
        if (socialProof) {
            currentContent.content = currentContent.content || {
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
            };
            currentContent.content.socialProof = socialProof;
            updatedSections.push("socialProof");
            logger.info(`Updated social proof section with ${socialProof.stats.length} stats, ${socialProof.strengths.items.length} strengths, ${socialProof.clientTypes.items.length} client types`);
        }

        // Update location section if provided
        if (location) {
            currentContent.content = currentContent.content || {
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
            };
            currentContent.content.location = location;
            updatedSections.push("location");
            logger.info(`Updated location section with ${location.visitInfo.items.length} visit info items and ${location.cta.buttons.length} CTA buttons`);
        }

        if (updatedSections.length === 0) {
            return res.status(400).json({ error: "No valid content sections provided for update" });
        }

        // Write updated content
        try {
            if (activeVariantId) {
                // Write variant content
                writeVariantContent(activeVariantId, currentContent);

                // Update variant's lastModified timestamp
                const variants = readVariants();
                const variantIndex = variants.findIndex((v) => v.id === activeVariantId);
                if (variantIndex !== -1) {
                    variants[variantIndex].lastModified = new Date().toISOString();
                    variants[variantIndex].updatedAt = new Date().toISOString();
                    writeVariants(variants);
                }
            } else {
                // Write official landing page (now async with image label sync)
                await writeLandingPageContent(currentContent);
            }
        } catch (error) {
            logger.log(LogLevel.error, "Error writing landing page content:", error);
            return res.status(500).json({
                error: "Failed to write landing page content",
                message:
                    process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
            });
        }

        // Invalidate cache to ensure fresh data is served on next request
        try {
            await invalidateCache();
            logger.info("Cache invalidated after content update");
        } catch (error) {
            logger.log(LogLevel.error, "Error invalidating cache (non-fatal):", error);
            // Continue even if cache invalidation fails - write succeeded
        }

        // Audit log: content update
        auditAdminAction(
            req,
            AuditEventType.ADMIN_CONTENT_UPDATE,
            activeVariantId ? `variant/${activeVariantId}` : "landing-page",
            undefined,
            {
                updatedSections,
                isVariant,
            },
        );

        return res.json({
            success: true,
            message: activeVariantId
                ? `Variant ${activeVariantId} updated successfully`
                : "Landing page content updated successfully",
            updatedSections,
            isVariant,
            variantId: activeVariantId,
        });
    } catch (error) {
        logger.log(LogLevel.error, "Error updating landing page content:", error);
        return res.status(500).json({
            error: "Failed to update landing page content",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// PUT endpoint to update contact information (admin only)
// Supports editing variants via query params: ?variantId=xxx
router.put("/contact-info", async (req: Request, res: Response) => {
    try {
        // Check admin access (using the auth middleware)
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const { business, hours } = req.body;

        if (!business && !hours) {
            return res
                .status(400)
                .json({ error: "Either business or hours data must be provided" });
        }

        const variantId = req.query.variantId as string | undefined;

        let currentContent: LandingPageContent;
        let isVariant = false;
        let activeVariantId: string | undefined;

        // Editing a variant by variantId
        if (variantId) {
            const variantContent = readVariantContent(variantId);
            if (!variantContent) {
                return res.status(404).json({ error: `Variant ${variantId} not found` });
            }
            currentContent = variantContent;
            isVariant = true;
            activeVariantId = variantId;
        }
        // Editing official landing page
        else {
            currentContent = readLandingPageContent();
        }

        currentContent.contact = currentContent.contact || {};

        // Update business info if provided
        if (business) {
            if (business.BUSINESS_NAME) {
                currentContent.contact.name =
                    business.BUSINESS_NAME.Short || business.BUSINESS_NAME.Long;
            }
            if (business.ADDRESS) {
                const addressParts = business.ADDRESS.Label.split(" ");
                const zip = addressParts[addressParts.length - 1];
                const state = addressParts[addressParts.length - 2];
                const city = addressParts[addressParts.length - 3];
                const street = addressParts.slice(0, addressParts.length - 3).join(" ");

                currentContent.contact.address = {
                    street,
                    city,
                    state,
                    zip,
                    full: business.ADDRESS.Label,
                    googleMapsUrl: business.ADDRESS.Link,
                };
            }
            if (business.PHONE) {
                currentContent.contact.phone = {
                    display: business.PHONE.Label,
                    link: business.PHONE.Link,
                };
            }
            if (business.FAX) {
                currentContent.contact.fax = {
                    display: business.FAX.Label,
                    link: business.FAX.Link,
                };
            }
            if (business.EMAIL) {
                currentContent.contact.email = {
                    address: business.EMAIL.Label,
                    link: business.EMAIL.Link,
                };
            }
            if (business.SOCIAL) {
                currentContent.contact.social = {
                    facebook: business.SOCIAL.Facebook,
                    instagram: business.SOCIAL.Instagram,
                };
            }
            if (business.WEBSITE) {
                currentContent.contact.website = business.WEBSITE;
            }
        }

        // Update hours if provided
        if (hours) {
            currentContent.contact.hours = hours;
        }

        // Write updated content
        try {
            if (activeVariantId) {
                // NEW SYSTEM: Write variant content
                writeVariantContent(activeVariantId, currentContent);

                // Update variant's lastModified timestamp
                const variants = readVariants();
                const variantIndex = variants.findIndex((v) => v.id === activeVariantId);
                if (variantIndex !== -1) {
                    variants[variantIndex].lastModified = new Date().toISOString();
                    variants[variantIndex].updatedAt = new Date().toISOString();
                    writeVariants(variants);
                }
            } else {
                // Write official landing page (now async with image label sync)
                await writeLandingPageContent(currentContent);
            }
        } catch (error) {
            logger.log(LogLevel.error, "Error writing landing page content:", error);
            return res.status(500).json({
                error: "Failed to write landing page content",
                message:
                    process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
            });
        }

        // Invalidate cache to ensure fresh data is served on next request
        try {
            await invalidateCache();
            logger.info("Cache invalidated after content update");
        } catch (error) {
            logger.log(LogLevel.error, "Error invalidating cache (non-fatal):", error);
            // Continue even if cache invalidation fails - write succeeded
        }

        return res.json({
            success: true,
            message: activeVariantId
                ? `Variant ${activeVariantId} contact info updated successfully`
                : "Contact information updated successfully",
            updated: {
                business: !!business,
                hours: !!hours,
            },
            isVariant,
            variantId: activeVariantId,
        });
    } catch (error) {
        logger.log(LogLevel.error, "Error updating contact info:", error);
        return res.status(500).json({
            error: "Failed to update contact information",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// ============================================================================
// VARIANT-FIRST A/B TESTING SYSTEM
// ============================================================================

// PUT endpoint to update landing page settings with deep merge (admin only)
// Supports editing variants via query params: ?variantId=xxx
// UPDATED: Now accepts the same nested structure as GET /landing-page returns
router.put("/settings", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const updates = req.body;

        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No settings provided for update" });
        }

        const variantId = req.query.variantId as string | undefined;

        let currentContent: LandingPageContent;
        let isVariant = false;
        let activeVariantId: string | undefined;

        // Editing a variant by variantId
        if (variantId) {
            const variantContent = readVariantContent(variantId);
            if (!variantContent) {
                return res.status(404).json({ error: `Variant ${variantId} not found` });
            }
            currentContent = variantContent;
            isVariant = true;
            activeVariantId = variantId;
        }
        // Editing official landing page
        else {
            currentContent = readLandingPageContent();
        }

        // Initialize nested structures if they don't exist
        currentContent.content = currentContent.content || {};
        currentContent.theme = currentContent.theme || {};
        currentContent.layout = currentContent.layout || {};
        currentContent.experiments = currentContent.experiments || {};

        // NEW: Accept nested structure matching LandingPageContent
        // Deep merge content, theme, layout, and experiments sections
        if (updates.content) {
            currentContent.content = merge(currentContent.content, updates.content);
        }
        if (updates.theme) {
            currentContent.theme = merge(currentContent.theme, updates.theme);
        }
        if (updates.layout) {
            currentContent.layout = merge(currentContent.layout, updates.layout);
        }
        if (updates.experiments) {
            currentContent.experiments = merge(currentContent.experiments, updates.experiments);
        }

        // Write updated content
        try {
            if (activeVariantId) {
                // NEW SYSTEM: Write variant content
                writeVariantContent(activeVariantId, currentContent);

                // Update variant's lastModified timestamp
                const variants = readVariants();
                const variantIndex = variants.findIndex((v) => v.id === activeVariantId);
                if (variantIndex !== -1) {
                    variants[variantIndex].lastModified = new Date().toISOString();
                    variants[variantIndex].updatedAt = new Date().toISOString();
                    writeVariants(variants);
                }
            } else {
                // Write official landing page (now async with image label sync)
                await writeLandingPageContent(currentContent);
            }
        } catch (error) {
            logger.log(LogLevel.error, "Error writing landing page content:", error);
            return res.status(500).json({
                error: "Failed to write landing page content",
                message:
                    process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
            });
        }

        // Invalidate cache
        await invalidateCache();

        return res.json({
            success: true,
            message: activeVariantId
                ? `Variant ${activeVariantId} settings updated successfully`
                : "Landing page settings updated successfully",
            updatedFields: Object.keys(updates),
            isVariant,
            variantId: activeVariantId,
        });
    } catch (error) {
        logger.log(LogLevel.error, "Error updating landing page settings:", error);
        return res.status(500).json({
            error: "Failed to update landing page settings",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// PUT endpoint to update section configuration (admin only)
// Supports editing variants via query params: ?variantId=xxx
router.put("/sections", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const { sections } = req.body;

        if (!sections || !sections.order || !sections.enabled) {
            return res.status(400).json({ error: "Invalid section configuration" });
        }

        const variantId = req.query.variantId as string | undefined;

        let currentContent: LandingPageContent;
        let isVariant = false;
        let activeVariantId: string | undefined;

        // Editing a variant by variantId
        if (variantId) {
            const variantContent = readVariantContent(variantId);
            if (!variantContent) {
                return res.status(404).json({ error: `Variant ${variantId} not found` });
            }
            currentContent = variantContent;
            isVariant = true;
            activeVariantId = variantId;
        }
        // Editing official landing page
        else {
            currentContent = readLandingPageContent();
        }

        currentContent.layout = currentContent.layout || {};

        // Update sections
        currentContent.layout.sections = sections;

        // Write updated content
        try {
            if (activeVariantId) {
                // NEW SYSTEM: Write variant content
                writeVariantContent(activeVariantId, currentContent);

                // Update variant's lastModified timestamp
                const variants = readVariants();
                const variantIndex = variants.findIndex((v) => v.id === activeVariantId);
                if (variantIndex !== -1) {
                    variants[variantIndex].lastModified = new Date().toISOString();
                    variants[variantIndex].updatedAt = new Date().toISOString();
                    writeVariants(variants);
                }
            } else {
                // Write official landing page (now async with image label sync)
                await writeLandingPageContent(currentContent);
            }
        } catch (error) {
            logger.log(LogLevel.error, "Error writing landing page content:", error);
            return res.status(500).json({
                error: "Failed to write landing page content",
                message:
                    process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
            });
        }

        // Invalidate cache
        await invalidateCache();

        return res.json({
            success: true,
            message: activeVariantId
                ? `Variant ${activeVariantId} sections updated successfully`
                : "Section configuration updated successfully",
            isVariant,
            variantId: activeVariantId,
        });
    } catch (error) {
        logger.log(LogLevel.error, "Error updating section configuration:", error);
        return res.status(500).json({
            error: "Failed to update section configuration",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// ============================================================================
// VARIANT-FIRST A/B TESTING API ENDPOINTS
// ============================================================================

// GET endpoint to retrieve all variants (admin only)
router.get("/variants", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const variants = readVariants();
        return res.json(variants);
    } catch (error) {
        logger.log(LogLevel.error, "Error fetching variants:", error);
        return res.status(500).json({
            error: "Failed to fetch variants",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// GET endpoint to retrieve a specific variant (admin only)
router.get("/variants/:id", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const variants = readVariants();
        const variant = variants.find((v) => v.id === req.params.id);

        if (!variant) {
            return res.status(404).json({ error: "Variant not found" });
        }

        return res.json(variant);
    } catch (error) {
        logger.log(LogLevel.error, "Error fetching variant:", error);
        return res.status(500).json({
            error: "Failed to fetch variant",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// POST endpoint to create a new variant (admin only)
router.post("/variants", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const { name, description, trafficAllocation, copyFromVariantId } = req.body as {
            name?: string;
            description?: string;
            trafficAllocation?: number;
            copyFromVariantId?: string;
        };

        if (!name) {
            return res.status(400).json({ error: "Variant name is required" });
        }

        const variants = readVariants();

        const newVariant: LandingPageVariant = {
            id: `variant-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name,
            description: description || "",
            status: "disabled", // Start disabled by default
            isOfficial: false,
            trafficAllocation: trafficAllocation || 0,
            metrics: {
                views: 0,
                conversions: 0,
                bounces: 0,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Copy content from another variant or from official landing page
        let sourceContent: LandingPageContent | null = null;

        if (copyFromVariantId) {
            sourceContent = readVariantContent(copyFromVariantId);
            if (!sourceContent) {
                return res
                    .status(404)
                    .json({ error: `Source variant ${copyFromVariantId} not found` });
            }
        } else {
            // Copy from official landing page
            sourceContent = readLandingPageContent();
        }

        try {
            writeVariantContent(newVariant.id, sourceContent);
            logger.info(`Created variant content file for ${newVariant.id}`);
        } catch (error) {
            logger.log(LogLevel.error, "Error creating variant content file:", error);
            return res.status(500).json({
                error: "Failed to create variant content file",
                message:
                    process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
            });
        }

        variants.push(newVariant);
        writeVariants(variants);

        // Audit log: variant created
        auditAdminAction(req, AuditEventType.ADMIN_VARIANT_CREATE, `variant/${newVariant.id}`, undefined, {
            name,
            description,
            copyFrom: copyFromVariantId || "official",
        });

        return res.status(201).json(newVariant);
    } catch (error) {
        logger.log(LogLevel.error, "Error creating variant:", error);
        return res.status(500).json({
            error: "Failed to create variant",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// PUT endpoint to update a variant (admin only)
router.put("/variants/:id", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const variants = readVariants();
        const variantIndex = variants.findIndex((v) => v.id === req.params.id);

        if (variantIndex === -1) {
            return res.status(404).json({ error: "Variant not found" });
        }

        const { name, description, status, trafficAllocation } = req.body;

        // Update the variant
        variants[variantIndex] = {
            ...variants[variantIndex],
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(status && { status }),
            ...(trafficAllocation !== undefined && { trafficAllocation }),
            updatedAt: new Date().toISOString(),
        };

        // Validate traffic allocation if status is being changed to enabled
        if (status === "enabled") {
            const tempVariants = [...variants];
            if (!validateTrafficAllocation(tempVariants)) {
                return res.status(400).json({
                    error: "Traffic allocation must sum to 100% for all enabled variants",
                });
            }
        }

        writeVariants(variants);

        // Invalidate cache
        await invalidateCache();

        // Audit log: variant updated
        auditAdminAction(
            req,
            AuditEventType.ADMIN_VARIANT_UPDATE,
            `variant/${req.params.id}`,
            undefined,
            { name, status, trafficAllocation },
        );

        return res.json(variants[variantIndex]);
    } catch (error) {
        logger.log(LogLevel.error, "Error updating variant:", error);
        return res.status(500).json({
            error: "Failed to update variant",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// DELETE endpoint to delete a variant (admin only)
router.delete("/variants/:id", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const variants = readVariants();
        const variantIndex = variants.findIndex((v) => v.id === req.params.id);

        if (variantIndex === -1) {
            return res.status(404).json({ error: "Variant not found" });
        }

        const variant = variants[variantIndex];

        // Cannot delete the official variant
        if (variant.isOfficial) {
            return res.status(400).json({ error: "Cannot delete the official variant" });
        }

        // Cannot delete an enabled variant
        if (variant.status === "enabled") {
            return res
                .status(400)
                .json({ error: "Cannot delete an enabled variant. Disable it first." });
        }

        // Delete variant content file
        deleteVariantContent(req.params.id);

        // Remove from variants array
        variants.splice(variantIndex, 1);
        writeVariants(variants);

        // Audit log: variant deleted
        auditAdminAction(req, AuditEventType.ADMIN_VARIANT_DELETE, `variant/${req.params.id}`, undefined, {
            variantName: variant.name,
        });

        return res.json({
            success: true,
            message: "Variant and content file deleted successfully",
        });
    } catch (error) {
        logger.log(LogLevel.error, "Error deleting variant:", error);
        return res.status(500).json({
            error: "Failed to delete variant",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// POST endpoint to promote a variant to official (admin only)
router.post("/variants/:id/promote", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const variants = readVariants();
        const variantIndex = variants.findIndex((v) => v.id === req.params.id);

        if (variantIndex === -1) {
            return res.status(404).json({ error: "Variant not found" });
        }

        const variant = variants[variantIndex];

        // Get the variant content
        const variantContent = readVariantContent(variant.id);
        if (!variantContent) {
            return res.status(404).json({ error: "Variant content not found" });
        }

        // Find and demote the current official variant
        const currentOfficialIndex = variants.findIndex((v) => v.isOfficial);
        if (currentOfficialIndex !== -1) {
            variants[currentOfficialIndex].isOfficial = false;
            variants[currentOfficialIndex].updatedAt = new Date().toISOString();
            logger.info(
                `Demoted variant ${variants[currentOfficialIndex].id} from official status`,
            );
        }

        // Promote the new variant
        variants[variantIndex].isOfficial = true;
        variants[variantIndex].updatedAt = new Date().toISOString();

        // Copy variant content to the official landing page (with image label sync)
        await writeLandingPageContent(variantContent);
        logger.info(
            `Promoted variant ${variant.id} to official. Content copied to landing-page-content.json`,
        );

        writeVariants(variants);

        // Invalidate cache
        await invalidateCache();

        // Audit log: variant promoted to official
        auditAdminAction(
            req,
            AuditEventType.ADMIN_VARIANT_PROMOTE,
            `variant/${req.params.id}`,
            { previousOfficial: currentOfficialIndex !== -1 ? variants[currentOfficialIndex].id : null },
            { newOfficial: variant.id, variantName: variant.name },
        );

        return res.json({
            success: true,
            message: "Variant promoted to official successfully",
            variant: variants[variantIndex],
        });
    } catch (error) {
        logger.log(LogLevel.error, "Error promoting variant:", error);
        return res.status(500).json({
            error: "Failed to promote variant",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// POST endpoint to track variant analytics events
router.post("/variants/:id/track", async (req: Request, res: Response) => {
    try {
        const { eventType } = req.body as {
            eventType?: "view" | "conversion" | "bounce";
        };

        if (!eventType) {
            return res.status(400).json({ error: "eventType is required" });
        }

        const variants = readVariants();
        const variantIndex = variants.findIndex((v) => v.id === req.params.id);

        if (variantIndex === -1) {
            return res.status(404).json({ error: "Variant not found" });
        }

        // Increment the appropriate metric
        const metricKey =
            eventType === "view" ? "views" : eventType === "conversion" ? "conversions" : "bounces";
        variants[variantIndex].metrics[metricKey]++;
        variants[variantIndex].updatedAt = new Date().toISOString();

        try {
            writeVariants(variants);
            logger.info(`Tracked ${eventType} for variant ${req.params.id}`);
        } catch (writeError) {
            logger.log(LogLevel.error, "Error writing variants during analytics tracking:", writeError);
            throw writeError;
        }

        return res.json({ success: true, metrics: variants[variantIndex].metrics });
    } catch (error) {
        logger.log(LogLevel.error, "Error tracking variant event:", error);
        return res.status(500).json({
            error: "Failed to track variant event",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// POST endpoint to toggle variant status (enable/disable) (admin only)
router.post("/variants/:id/toggle", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const variants = readVariants();
        const variantIndex = variants.findIndex((v) => v.id === req.params.id);

        if (variantIndex === -1) {
            return res.status(404).json({ error: "Variant not found" });
        }

        // Toggle status
        const newStatus = variants[variantIndex].status === "enabled" ? "disabled" : "enabled";
        variants[variantIndex].status = newStatus;
        variants[variantIndex].updatedAt = new Date().toISOString();

        // Validate traffic allocation if enabling
        if (newStatus === "enabled" && !validateTrafficAllocation(variants)) {
            return res.status(400).json({
                error: "Traffic allocation must sum to 100% for all enabled variants",
            });
        }

        writeVariants(variants);

        // Invalidate cache
        await invalidateCache();

        return res.json(variants[variantIndex]);
    } catch (error) {
        logger.log(LogLevel.error, "Error toggling variant status:", error);
        return res.status(500).json({
            error: "Failed to toggle variant status",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

export default router;
