import { logger, LogLevel } from "../../logger.js";
import { initializeRedis } from "../../redisConn.js";
import type { LandingPageContent } from "../../types/landingPage.js";

// Cache configuration
const CACHE_KEY = "landing-page-content:v1";
const CACHE_TTL = 3600; // 1 hour

/**
 * Get cached landing page content from Redis
 */
export const getCachedContent = async (): Promise<LandingPageContent | null> => {
    try {
        const redis = await initializeRedis();
        const cached = await redis.get(CACHE_KEY);
        return cached ? (JSON.parse(cached) as LandingPageContent) : null;
    } catch (error) {
        logger.log(LogLevel.error, "Error reading from cache:", error);
        return null;
    }
};

/**
 * Set landing page content in Redis cache
 */
export const setCachedContent = async (content: LandingPageContent): Promise<void> => {
    try {
        const redis = await initializeRedis();
        await redis.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(content));
        logger.info("Landing page content cached");
    } catch (error) {
        logger.log(LogLevel.error, "Error caching content:", error);
    }
};

/**
 * Invalidate the landing page cache
 */
export const invalidateCache = async (): Promise<void> => {
    try {
        const redis = await initializeRedis();
        await redis.del(CACHE_KEY);
        logger.info("Landing page cache invalidated");
    } catch (error) {
        logger.log(LogLevel.error, "Error invalidating cache:", error);
    }
};
