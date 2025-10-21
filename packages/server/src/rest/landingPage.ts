import { Router, Request, Response } from "express";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { logger } from "../logger.js";
import { initializeRedis } from "../redisConn.js";

const router = Router();
// In production, data files are in dist folder, in development they're in src
const dataPath = join(
    process.env.PROJECT_DIR || "",
    process.env.NODE_ENV === "production" ? "packages/server/dist/data" : "packages/server/src/data"
);

// Cache configuration (same as GraphQL)
const CACHE_KEY = "landing-page-content:v1";
const CACHE_TTL = 3600; // 1 hour

// Helper function to read the consolidated landing page content
const readLandingPageContent = () => {
    try {
        const data = readFileSync(join(dataPath, "landing-page-content.json"), "utf8");
        return JSON.parse(data);
    } catch (error) {
        logger.error("Error reading landing page content:", error);
        return {
            metadata: {},
            content: {},
            contact: {},
            theme: {},
            layout: {},
            experiments: {},
        };
    }
};

// Helper function to write the consolidated landing page content
const writeLandingPageContent = (content: any) => {
    try {
        const contentPath = join(dataPath, "landing-page-content.json");
        const dataToWrite = {
            ...content,
            metadata: {
                ...content.metadata,
                lastUpdated: new Date().toISOString(),
            },
        };
        writeFileSync(contentPath, JSON.stringify(dataToWrite, null, 2), "utf8");
        logger.info("Landing page content updated successfully");
    } catch (error) {
        logger.error("Error writing landing page content:", error);
        throw error;
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

// Aggregate content from the new structure and return it in the new format
const aggregateLandingPageContent = (onlyActive: boolean = true) => {
    const landingPageData = readLandingPageContent();

    // Clone the data so we don't modify the original
    const result = JSON.parse(JSON.stringify(landingPageData));

    // Filter active content if requested
    if (onlyActive && result.content?.hero?.banners) {
        result.content.hero.banners = result.content.hero.banners
            .filter((b: any) => b.isActive)
            .sort((a: any, b: any) => a.displayOrder - b.displayOrder);
    }

    if (onlyActive && result.content?.seasonal?.plants) {
        result.content.seasonal.plants = result.content.seasonal.plants
            .filter((p: any) => p.isActive)
            .sort((a: any, b: any) => a.displayOrder - b.displayOrder);
    }

    if (onlyActive && result.content?.seasonal?.tips) {
        result.content.seasonal.tips = result.content.seasonal.tips
            .filter((t: any) => t.isActive)
            .sort((a: any, b: any) => a.displayOrder - b.displayOrder);
    }

    return result;
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

        // Read current content
        const currentContent = readLandingPageContent();

        // Update hero banners if provided
        if (heroBanners) {
            currentContent.content = currentContent.content || {};
            currentContent.content.hero = currentContent.content.hero || {};
            currentContent.content.hero.banners = heroBanners;
            updatedSections.push("heroBanners");
        }

        // Update hero settings if provided
        if (heroSettings) {
            currentContent.content = currentContent.content || {};
            currentContent.content.hero = currentContent.content.hero || {};
            currentContent.content.hero.settings = heroSettings;
            updatedSections.push("heroSettings");
        }

        // Update seasonal plants if provided
        if (seasonalPlants) {
            currentContent.content = currentContent.content || {};
            currentContent.content.seasonal = currentContent.content.seasonal || {};
            currentContent.content.seasonal.plants = seasonalPlants;
            updatedSections.push("seasonalPlants");
        }

        // Update plant tips if provided
        if (plantTips) {
            currentContent.content = currentContent.content || {};
            currentContent.content.seasonal = currentContent.content.seasonal || {};
            currentContent.content.seasonal.tips = plantTips;
            updatedSections.push("plantTips");
        }

        // Update general settings if provided
        if (settings) {
            currentContent.content = currentContent.content || {};
            currentContent.theme = currentContent.theme || {};
            currentContent.layout = currentContent.layout || {};
            currentContent.experiments = currentContent.experiments || {};

            if (settings.hero) {
                currentContent.content.hero = currentContent.content.hero || {};
                currentContent.content.hero.text = settings.hero;
            }
            if (settings.newsletter) {
                currentContent.content.newsletter = settings.newsletter;
            }
            if (settings.companyInfo) {
                currentContent.content.company = settings.companyInfo;
            }
            if (settings.services) {
                currentContent.content.services = settings.services;
            }
            if (settings.colors) {
                currentContent.theme.colors = settings.colors;
            }
            if (settings.features) {
                currentContent.layout.features = settings.features;
            }
            if (settings.sections) {
                currentContent.layout.sections = settings.sections;
            }
            if (settings.abTesting) {
                currentContent.experiments.abTesting = settings.abTesting;
            }
            updatedSections.push("settings");
        }

        // Update contact info if provided
        if (contactInfo) {
            currentContent.contact = currentContent.contact || {};

            if (contactInfo.business) {
                const business = contactInfo.business;
                if (business.BUSINESS_NAME) {
                    currentContent.contact.name = business.BUSINESS_NAME.Short || business.BUSINESS_NAME.Long;
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
                        display: business.EMAIL.Label,
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
                updatedSections.push("contactInfo.business");
            }

            if (contactInfo.hours) {
                currentContent.contact.hours = contactInfo.hours;
                updatedSections.push("contactInfo.hours");
            }
        }

        if (updatedSections.length === 0) {
            return res.status(400).json({ error: "No valid content sections provided for update" });
        }

        // Write updated content
        try {
            writeLandingPageContent(currentContent);
        } catch (error) {
            logger.error("Error writing landing page content:", error);
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
            logger.error("Error invalidating cache (non-fatal):", error);
            // Continue even if cache invalidation fails - write succeeded
        }

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

        // Read current content
        const currentContent = readLandingPageContent();
        currentContent.contact = currentContent.contact || {};

        // Update business info if provided
        if (business) {
            if (business.BUSINESS_NAME) {
                currentContent.contact.name = business.BUSINESS_NAME.Short || business.BUSINESS_NAME.Long;
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
                    display: business.EMAIL.Label,
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
            writeLandingPageContent(currentContent);
        } catch (error) {
            logger.error("Error writing landing page content:", error);
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
            logger.error("Error invalidating cache (non-fatal):", error);
            // Continue even if cache invalidation fails - write succeeded
        }

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

// Helper functions for A/B testing
const readABTests = () => {
    try {
        const data = readFileSync(join(dataPath, "ab-tests.json"), "utf8");
        return JSON.parse(data).tests || [];
    } catch (error) {
        logger.error("Error reading A/B tests:", error);
        return [];
    }
};

const writeABTests = (tests: any[]) => {
    try {
        const testsPath = join(dataPath, "ab-tests.json");
        writeFileSync(testsPath, JSON.stringify({ tests }, null, 2), "utf8");
        logger.info("A/B tests updated successfully");
    } catch (error) {
        logger.error("Error writing A/B tests:", error);
        throw error;
    }
};

// Helper function to deep merge objects
const deepMerge = (target: any, source: any): any => {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach((key) => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    output[key] = source[key];
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                output[key] = source[key];
            }
        });
    }
    return output;
};

const isObject = (item: any): boolean => {
    return item && typeof item === "object" && !Array.isArray(item);
};

// PUT endpoint to update landing page settings with deep merge (admin only)
router.put("/settings", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const updates = req.body;

        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No settings provided for update" });
        }

        // Read current content
        const currentContent = readLandingPageContent();
        currentContent.content = currentContent.content || {};
        currentContent.theme = currentContent.theme || {};
        currentContent.layout = currentContent.layout || {};
        currentContent.experiments = currentContent.experiments || {};

        // Map old settings format to new structure
        if (updates.hero) {
            currentContent.content.hero = currentContent.content.hero || {};
            currentContent.content.hero.text = deepMerge(currentContent.content.hero.text || {}, updates.hero);
        }
        if (updates.newsletter) {
            currentContent.content.newsletter = deepMerge(currentContent.content.newsletter || {}, updates.newsletter);
        }
        if (updates.companyInfo) {
            currentContent.content.company = deepMerge(currentContent.content.company || {}, updates.companyInfo);
        }
        if (updates.services) {
            currentContent.content.services = deepMerge(currentContent.content.services || {}, updates.services);
        }
        if (updates.colors) {
            currentContent.theme.colors = deepMerge(currentContent.theme.colors || {}, updates.colors);
        }
        if (updates.features) {
            currentContent.layout.features = deepMerge(currentContent.layout.features || {}, updates.features);
        }
        if (updates.sections) {
            currentContent.layout.sections = deepMerge(currentContent.layout.sections || {}, updates.sections);
        }
        if (updates.abTesting) {
            currentContent.experiments.abTesting = deepMerge(currentContent.experiments.abTesting || {}, updates.abTesting);
        }

        // Write updated content
        try {
            writeLandingPageContent(currentContent);
        } catch (error) {
            logger.error("Error writing landing page content:", error);
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
            message: "Landing page settings updated successfully",
            updatedFields: Object.keys(updates),
        });
    } catch (error) {
        logger.error("Error updating landing page settings:", error);
        return res.status(500).json({
            error: "Failed to update landing page settings",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// PUT endpoint to update section configuration (admin only)
router.put("/sections", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const { sections } = req.body;

        if (!sections || !sections.order || !sections.enabled) {
            return res.status(400).json({ error: "Invalid section configuration" });
        }

        // Read current content
        const currentContent = readLandingPageContent();
        currentContent.layout = currentContent.layout || {};

        // Update sections
        currentContent.layout.sections = sections;

        // Write updated content
        try {
            writeLandingPageContent(currentContent);
        } catch (error) {
            logger.error("Error writing landing page content:", error);
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
            message: "Section configuration updated successfully",
        });
    } catch (error) {
        logger.error("Error updating section configuration:", error);
        return res.status(500).json({
            error: "Failed to update section configuration",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// GET endpoint to retrieve all A/B tests (admin only)
router.get("/ab-tests", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const tests = readABTests();
        return res.json(tests);
    } catch (error) {
        logger.error("Error fetching A/B tests:", error);
        return res.status(500).json({
            error: "Failed to fetch A/B tests",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// GET endpoint to retrieve a specific A/B test (admin only)
router.get("/ab-tests/:id", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const tests = readABTests();
        const test = tests.find((t: any) => t.id === req.params.id);

        if (!test) {
            return res.status(404).json({ error: "A/B test not found" });
        }

        return res.json(test);
    } catch (error) {
        logger.error("Error fetching A/B test:", error);
        return res.status(500).json({
            error: "Failed to fetch A/B test",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// POST endpoint to create a new A/B test (admin only)
router.post("/ab-tests", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const { name, description, variantA, variantB } = req.body;

        if (!name || !variantA || !variantB) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const tests = readABTests();

        const newTest = {
            id: `test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name,
            description,
            status: "draft",
            variantA,
            variantB,
            metrics: {
                variantA: {
                    views: 0,
                    bounces: 0,
                    avgTimeOnPage: 0,
                    interactions: 0,
                    conversions: 0,
                },
                variantB: {
                    views: 0,
                    bounces: 0,
                    avgTimeOnPage: 0,
                    interactions: 0,
                    conversions: 0,
                },
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        tests.push(newTest);
        writeABTests(tests);

        return res.status(201).json(newTest);
    } catch (error) {
        logger.error("Error creating A/B test:", error);
        return res.status(500).json({
            error: "Failed to create A/B test",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// PUT endpoint to update an A/B test (admin only)
router.put("/ab-tests/:id", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const tests = readABTests();
        const testIndex = tests.findIndex((t: any) => t.id === req.params.id);

        if (testIndex === -1) {
            return res.status(404).json({ error: "A/B test not found" });
        }

        // Update the test
        tests[testIndex] = {
            ...tests[testIndex],
            ...req.body,
            id: req.params.id, // Ensure ID doesn't change
            updatedAt: new Date().toISOString(),
        };

        writeABTests(tests);

        return res.json(tests[testIndex]);
    } catch (error) {
        logger.error("Error updating A/B test:", error);
        return res.status(500).json({
            error: "Failed to update A/B test",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// DELETE endpoint to delete an A/B test (admin only)
router.delete("/ab-tests/:id", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const tests = readABTests();
        const testIndex = tests.findIndex((t: any) => t.id === req.params.id);

        if (testIndex === -1) {
            return res.status(404).json({ error: "A/B test not found" });
        }

        // Check if test is active
        const currentContent = readLandingPageContent();
        if (currentContent.experiments?.abTesting?.activeTestId === req.params.id) {
            return res.status(400).json({ error: "Cannot delete an active test. Stop it first." });
        }

        tests.splice(testIndex, 1);
        writeABTests(tests);

        return res.json({ success: true });
    } catch (error) {
        logger.error("Error deleting A/B test:", error);
        return res.status(500).json({
            error: "Failed to delete A/B test",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// POST endpoint to start an A/B test (admin only)
router.post("/ab-tests/:id/start", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const tests = readABTests();
        const testIndex = tests.findIndex((t: any) => t.id === req.params.id);

        if (testIndex === -1) {
            return res.status(404).json({ error: "A/B test not found" });
        }

        // Update settings to enable A/B testing and set active test
        const currentContent = readLandingPageContent();
        currentContent.experiments = currentContent.experiments || {};
        currentContent.experiments.abTesting = {
            enabled: true,
            activeTestId: req.params.id,
        };

        // Write updated content
        try {
            writeLandingPageContent(currentContent);
        } catch (error) {
            logger.error("Error writing landing page content:", error);
            return res.status(500).json({
                error: "Failed to write landing page content",
                message:
                    process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
            });
        }

        // Update test status
        tests[testIndex].status = "active";
        tests[testIndex].startDate = new Date().toISOString();
        tests[testIndex].updatedAt = new Date().toISOString();

        writeABTests(tests);

        // Invalidate cache
        await invalidateCache();

        return res.json(tests[testIndex]);
    } catch (error) {
        logger.error("Error starting A/B test:", error);
        return res.status(500).json({
            error: "Failed to start A/B test",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// POST endpoint to stop an A/B test (admin only)
router.post("/ab-tests/:id/stop", async (req: Request, res: Response) => {
    try {
        if (!(req as any).isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const tests = readABTests();
        const testIndex = tests.findIndex((t: any) => t.id === req.params.id);

        if (testIndex === -1) {
            return res.status(404).json({ error: "A/B test not found" });
        }

        // Update settings to disable A/B testing
        const currentContent = readLandingPageContent();
        currentContent.experiments = currentContent.experiments || {};
        currentContent.experiments.abTesting = {
            enabled: false,
            activeTestId: null,
        };

        // Write updated content
        try {
            writeLandingPageContent(currentContent);
        } catch (error) {
            logger.error("Error writing landing page content:", error);
            return res.status(500).json({
                error: "Failed to write landing page content",
                message:
                    process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
            });
        }

        // Update test status
        tests[testIndex].status = "completed";
        tests[testIndex].endDate = new Date().toISOString();
        tests[testIndex].updatedAt = new Date().toISOString();

        writeABTests(tests);

        // Invalidate cache
        await invalidateCache();

        return res.json(tests[testIndex]);
    } catch (error) {
        logger.error("Error stopping A/B test:", error);
        return res.status(500).json({
            error: "Failed to stop A/B test",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

export default router;
