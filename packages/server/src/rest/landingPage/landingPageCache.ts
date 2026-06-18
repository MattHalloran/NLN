import { CACHE_LIMITS } from "@local/shared";
import { logger, LogLevel } from "../../logger.js";
import { initializeRedis } from "../../redisConn.js";
import type { LandingPageContent } from "../../types/landingPage.js";
import { LANDING_PAGE_CACHE_KEY } from "../../config/paths.js";

/**
 * Get cached landing page content from Redis
 */
export const getCachedContent = async (): Promise<LandingPageContent | null> => {
    try {
        const redis = await initializeRedis();
        const cached = await redis.get(LANDING_PAGE_CACHE_KEY);
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
        await redis.setEx(
            LANDING_PAGE_CACHE_KEY,
            CACHE_LIMITS.landingPageTtlSeconds,
            JSON.stringify(content)
        );
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
        await redis.del(LANDING_PAGE_CACHE_KEY);
        logger.info("Landing page cache invalidated");
    } catch (error) {
        logger.log(LogLevel.error, "Error invalidating cache:", error);
    }
};
