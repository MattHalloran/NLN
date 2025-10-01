import { Router, Request, Response } from "express";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { logger } from "../logger.js";
import { initializeRedis } from "../redisConn.js";

const router = Router();
const dataPath = join(__dirname, "../data");

// Cache configuration (same as GraphQL)
const CACHE_KEY = "landing-page-content:v1";
const CACHE_TTL = 3600; // 1 hour

// Helper functions (reusing from GraphQL implementation)
const readHeroBanners = () => {
    try {
        const data = readFileSync(join(dataPath, "hero-banners.json"), "utf8");
        const parsed = JSON.parse(data);
        return {
            banners: parsed.banners || [],
            settings: parsed.settings || {},
        };
    } catch (error) {
        logger.error("Error reading hero banners:", error);
        return { banners: [], settings: {} };
    }
};

const readSeasonalPlants = () => {
    try {
        const data = readFileSync(join(dataPath, "seasonal-plants.json"), "utf8");
        return JSON.parse(data).plants || [];
    } catch (error) {
        logger.error("Error reading seasonal plants:", error);
        return [];
    }
};

const readPlantTips = () => {
    try {
        const data = readFileSync(join(dataPath, "plant-tips.json"), "utf8");
        return JSON.parse(data).tips || [];
    } catch (error) {
        logger.error("Error reading plant tips:", error);
        return [];
    }
};

const readLandingPageSettings = () => {
    try {
        const data = readFileSync(join(dataPath, "landing-page-settings.json"), "utf8");
        return JSON.parse(data);
    } catch (error) {
        logger.error("Error reading landing page settings:", error);
        return {};
    }
};

const readBusinessInfo = () => {
    try {
        const assetsPath = join(process.env.PROJECT_DIR || "", "assets", "public");
        const data = readFileSync(join(assetsPath, "business.json"), "utf8");
        return JSON.parse(data);
    } catch (error) {
        logger.error("Error reading business info:", error);
        return {};
    }
};

const readBusinessHours = () => {
    try {
        const assetsPath = join(process.env.PROJECT_DIR || "", "assets", "public");
        return readFileSync(join(assetsPath, "hours.md"), "utf8");
    } catch (error) {
        logger.error("Error reading business hours:", error);
        return "";
    }
};

// Cache management
const getCachedContent = async () => {
    try {
        const redis = await initializeRedis();
        const cached = await redis.get(CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        logger.error("Error reading from cache:", error);
        return null;
    }
};

const setCachedContent = async (content: any) => {
    try {
        const redis = await initializeRedis();
        await redis.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(content));
        logger.info("Landing page content cached");
    } catch (error) {
        logger.error("Error caching content:", error);
    }
};

const invalidateCache = async () => {
    try {
        const redis = await initializeRedis();
        await redis.del(CACHE_KEY);
        logger.info("Landing page cache invalidated");
    } catch (error) {
        logger.error("Error invalidating cache:", error);
    }
};

// Aggregate content (same logic as GraphQL)
const aggregateLandingPageContent = (onlyActive: boolean = true) => {
    const { banners, settings: heroSettings } = readHeroBanners();
    let seasonalPlants = readSeasonalPlants();
    let plantTips = readPlantTips();
    const settings = readLandingPageSettings();

    // Read contact info
    const businessInfo = readBusinessInfo();
    const businessHours = readBusinessHours();

    // Filter active content if requested
    if (onlyActive) {
        seasonalPlants = seasonalPlants.filter((p: any) => p.isActive);
        plantTips = plantTips.filter((t: any) => t.isActive);
    }

    // Sort by display order
    const heroBanners = banners
        .filter((b: any) => (onlyActive ? b.isActive : true))
        .sort((a: any, b: any) => a.displayOrder - b.displayOrder);

    seasonalPlants.sort((a: any, b: any) => a.displayOrder - b.displayOrder);
    plantTips.sort((a: any, b: any) => a.displayOrder - b.displayOrder);

    return {
        heroBanners,
        heroSettings,
        seasonalPlants,
        plantTips,
        settings,
        contactInfo: {
            business: businessInfo,
            hours: businessHours,
        },
        lastUpdated: new Date().toISOString(),
    };
};

// GET endpoint for landing page content
router.get("/", async (req: Request, res: Response) => {
    try {
        // Parse query params
        const onlyActive = req.query.onlyActive !== "false"; // Default to true

        // Try cache first
        const cached = await getCachedContent();
        if (cached) {
            logger.info("Returning cached landing page content");

            // Set cache headers for browser caching
            res.set({
                "Cache-Control": "public, max-age=300", // 5 minutes browser cache
                ETag: `"${Buffer.from(JSON.stringify(cached)).toString("base64").substring(0, 20)}"`,
                "Last-Modified": cached.lastUpdated || new Date().toUTCString(),
            });

            return res.json(cached);
        }

        // Generate fresh content
        logger.info("Generating fresh landing page content");
        const content = aggregateLandingPageContent(onlyActive);

        // Cache it
        await setCachedContent(content);

        // Set cache headers
        res.set({
            "Cache-Control": "public, max-age=300",
            ETag: `"${Buffer.from(JSON.stringify(content)).toString("base64").substring(0, 20)}"`,
            "Last-Modified": content.lastUpdated,
        });

        return res.json(content);
    } catch (error) {
        logger.error("Error fetching landing page content:", error);
        return res.status(500).json({
            error: "Failed to fetch landing page content",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// POST endpoint to invalidate cache (admin only)
router.post("/invalidate-cache", async (req: Request, res: Response) => {
    try {
        // Check admin access (using the auth middleware)
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        await invalidateCache();
        return res.json({ success: true, message: "Cache invalidated successfully" });
    } catch (error) {
        logger.error("Error invalidating cache:", error);
        return res.status(500).json({
            error: "Failed to invalidate cache",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// PUT endpoint to update entire landing page content (admin only)
router.put("/", async (req: Request, res: Response) => {
    try {
        // Check admin access (using the auth middleware)
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const { heroBanners, heroSettings, seasonalPlants, plantTips, settings, contactInfo } =
            req.body;

        const updatedSections: string[] = [];

        // Update hero banners if provided
        if (heroBanners) {
            try {
                const heroData = { banners: heroBanners, settings: heroSettings || {} };
                const heroPath = join(dataPath, "hero-banners.json");
                writeFileSync(heroPath, JSON.stringify(heroData, null, 2), "utf8");
                logger.info("Hero banners updated successfully");
                updatedSections.push("heroBanners");
            } catch (error) {
                logger.error("Error updating hero banners:", error);
                return res.status(500).json({
                    error: "Failed to update hero banners",
                    message:
                        process.env.NODE_ENV === "development"
                            ? (error as Error).message
                            : undefined,
                });
            }
        }

        // Update hero settings if provided (and heroBanners wasn't provided)
        if (heroSettings && !heroBanners) {
            try {
                // Read existing banners and update settings
                const { banners } = readHeroBanners();
                const heroData = { banners, settings: heroSettings };
                const heroPath = join(dataPath, "hero-banners.json");
                writeFileSync(heroPath, JSON.stringify(heroData, null, 2), "utf8");
                logger.info("Hero settings updated successfully");
                updatedSections.push("heroSettings");
            } catch (error) {
                logger.error("Error updating hero settings:", error);
                return res.status(500).json({
                    error: "Failed to update hero settings",
                    message:
                        process.env.NODE_ENV === "development"
                            ? (error as Error).message
                            : undefined,
                });
            }
        }

        // Update seasonal plants if provided
        if (seasonalPlants) {
            try {
                const plantsData = { plants: seasonalPlants };
                const plantsPath = join(dataPath, "seasonal-plants.json");
                writeFileSync(plantsPath, JSON.stringify(plantsData, null, 2), "utf8");
                logger.info("Seasonal plants updated successfully");
                updatedSections.push("seasonalPlants");
            } catch (error) {
                logger.error("Error updating seasonal plants:", error);
                return res.status(500).json({
                    error: "Failed to update seasonal plants",
                    message:
                        process.env.NODE_ENV === "development"
                            ? (error as Error).message
                            : undefined,
                });
            }
        }

        // Update plant tips if provided
        if (plantTips) {
            try {
                const tipsData = { tips: plantTips };
                const tipsPath = join(dataPath, "plant-tips.json");
                writeFileSync(tipsPath, JSON.stringify(tipsData, null, 2), "utf8");
                logger.info("Plant tips updated successfully");
                updatedSections.push("plantTips");
            } catch (error) {
                logger.error("Error updating plant tips:", error);
                return res.status(500).json({
                    error: "Failed to update plant tips",
                    message:
                        process.env.NODE_ENV === "development"
                            ? (error as Error).message
                            : undefined,
                });
            }
        }

        // Update general settings if provided
        if (settings) {
            try {
                const settingsPath = join(dataPath, "landing-page-settings.json");
                writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
                logger.info("Landing page settings updated successfully");
                updatedSections.push("settings");
            } catch (error) {
                logger.error("Error updating landing page settings:", error);
                return res.status(500).json({
                    error: "Failed to update landing page settings",
                    message:
                        process.env.NODE_ENV === "development"
                            ? (error as Error).message
                            : undefined,
                });
            }
        }

        // Update contact info if provided
        if (contactInfo) {
            const assetsPath = join(process.env.PROJECT_DIR || "", "assets", "public");

            // Update business info if provided
            if (contactInfo.business) {
                try {
                    const businessPath = join(assetsPath, "business.json");
                    writeFileSync(
                        businessPath,
                        JSON.stringify(contactInfo.business, null, 2),
                        "utf8"
                    );
                    logger.info("Business info updated successfully");
                    updatedSections.push("contactInfo.business");
                } catch (error) {
                    logger.error("Error updating business info:", error);
                    return res.status(500).json({
                        error: "Failed to update business info",
                        message:
                            process.env.NODE_ENV === "development"
                                ? (error as Error).message
                                : undefined,
                    });
                }
            }

            // Update hours if provided
            if (contactInfo.hours) {
                try {
                    const hoursPath = join(assetsPath, "hours.md");
                    writeFileSync(hoursPath, contactInfo.hours, "utf8");
                    logger.info("Business hours updated successfully");
                    updatedSections.push("contactInfo.hours");
                } catch (error) {
                    logger.error("Error updating business hours:", error);
                    return res.status(500).json({
                        error: "Failed to update business hours",
                        message:
                            process.env.NODE_ENV === "development"
                                ? (error as Error).message
                                : undefined,
                    });
                }
            }
        }

        if (updatedSections.length === 0) {
            return res.status(400).json({ error: "No valid content sections provided for update" });
        }

        // Invalidate cache after successful updates
        await invalidateCache();

        return res.json({
            success: true,
            message: "Landing page content updated successfully",
            updatedSections,
        });
    } catch (error) {
        logger.error("Error updating landing page content:", error);
        return res.status(500).json({
            error: "Failed to update landing page content",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// PUT endpoint to update contact information (admin only)
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

        const assetsPath = join(process.env.PROJECT_DIR || "", "assets", "public");

        // Update business info if provided
        if (business) {
            try {
                const businessPath = join(assetsPath, "business.json");
                writeFileSync(businessPath, JSON.stringify(business, null, 2), "utf8");
                logger.info("Business info updated successfully");
            } catch (error) {
                logger.error("Error updating business info:", error);
                return res.status(500).json({
                    error: "Failed to update business info",
                    message:
                        process.env.NODE_ENV === "development"
                            ? (error as Error).message
                            : undefined,
                });
            }
        }

        // Update hours if provided
        if (hours) {
            try {
                const hoursPath = join(assetsPath, "hours.md");
                writeFileSync(hoursPath, hours, "utf8");
                logger.info("Business hours updated successfully");
            } catch (error) {
                logger.error("Error updating business hours:", error);
                return res.status(500).json({
                    error: "Failed to update business hours",
                    message:
                        process.env.NODE_ENV === "development"
                            ? (error as Error).message
                            : undefined,
                });
            }
        }

        // Invalidate cache after successful update
        await invalidateCache();

        return res.json({
            success: true,
            message: "Contact information updated successfully",
            updated: {
                business: !!business,
                hours: !!hours,
            },
        });
    } catch (error) {
        logger.error("Error updating contact info:", error);
        return res.status(500).json({
            error: "Failed to update contact information",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

export default router;
