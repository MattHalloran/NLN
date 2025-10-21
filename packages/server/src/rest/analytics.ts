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

// Analytics cache TTL (24 hours)
const ANALYTICS_TTL = 86400;

// Helper functions
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
    } catch (error) {
        logger.error("Error writing A/B tests:", error);
        throw error;
    }
};

const updateTestMetrics = (
    testId: string,
    variantId: string,
    eventType: string,
    metadata?: any
) => {
    try {
        const tests = readABTests();
        const testIndex = tests.findIndex((t: any) => t.id === testId);

        if (testIndex === -1) {
            logger.warn(`A/B test not found: ${testId}`);
            return;
        }

        const test = tests[testIndex];
        const variant = variantId === "variantA" ? "variantA" : "variantB";

        if (!test.metrics[variant]) {
            test.metrics[variant] = {
                views: 0,
                bounces: 0,
                avgTimeOnPage: 0,
                interactions: 0,
                conversions: 0,
            };
        }

        // Update metrics based on event type
        switch (eventType) {
            case "page_view":
                test.metrics[variant].views += 1;
                break;
            case "bounce":
                test.metrics[variant].bounces += 1;
                break;
            case "interaction":
                test.metrics[variant].interactions += 1;
                break;
            case "conversion":
                test.metrics[variant].conversions += 1;
                break;
        }

        // Update average time on page if provided
        if (metadata?.timeOnPage && typeof metadata.timeOnPage === "number") {
            const currentViews = test.metrics[variant].views;
            const currentAvg = test.metrics[variant].avgTimeOnPage || 0;
            test.metrics[variant].avgTimeOnPage =
                (currentAvg * (currentViews - 1) + metadata.timeOnPage) / currentViews;
        }

        test.updatedAt = new Date().toISOString();
        writeABTests(tests);

        logger.info(`Updated metrics for test ${testId}, variant ${variant}, event ${eventType}`);
    } catch (error) {
        logger.error("Error updating test metrics:", error);
    }
};

// GET endpoint to fetch A/B test by ID (public endpoint for variant configuration)
router.get("/ab-test/:testId", async (req: Request, res: Response) => {
    try {
        const { testId } = req.params;

        if (!testId) {
            return res.status(400).json({ error: "Test ID is required" });
        }

        const tests = readABTests();
        const test = tests.find((t: any) => t.id === testId);

        if (!test) {
            return res.status(404).json({ error: "Test not found" });
        }

        // Return only necessary fields for variant configuration (don't expose metrics)
        const publicTest = {
            id: test.id,
            name: test.name,
            status: test.status,
            variantA: test.variantA,
            variantB: test.variantB,
        };

        return res.json(publicTest);
    } catch (error) {
        logger.error("Error fetching A/B test:", error);
        return res.status(500).json({
            error: "Failed to fetch A/B test",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

// POST endpoint to track analytics event (public endpoint)
router.post("/track", async (req: Request, res: Response) => {
    try {
        const { eventType, variantId, testId, sessionId, timestamp, metadata } = req.body;

        if (!eventType || !sessionId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Store event in Redis with session ID for deduplication
        const redis = await initializeRedis();
        const eventKey = `analytics:session:${sessionId}:${eventType}:${timestamp}`;

        // Check if this exact event was already tracked (deduplication)
        const exists = await redis.exists(eventKey);
        if (exists) {
            logger.debug(`Event already tracked: ${eventKey}`);
            return res.json({ success: true, message: "Event already tracked" });
        }

        // Store the event
        await redis.setEx(eventKey, ANALYTICS_TTL, JSON.stringify(req.body));

        // If this is part of an A/B test, update the test metrics
        if (testId && variantId) {
            updateTestMetrics(testId, variantId, eventType, metadata);
        }

        logger.info(`Tracked ${eventType} event for session ${sessionId}`);

        return res.json({ success: true });
    } catch (error) {
        logger.error("Error tracking analytics event:", error);
        return res.status(500).json({
            error: "Failed to track analytics event",
            message: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
        });
    }
});

export default router;
