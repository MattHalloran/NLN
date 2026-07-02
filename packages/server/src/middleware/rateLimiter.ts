import { CODE, RATE_LIMITS, REST_PREFIX, REST_ROUTES } from "@local/shared";
import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { logger, LogLevel } from "../logger.js";
import { initializeRedis } from "../redisConn.js";

const mountedRestPath = (route: string): string => route.replace(REST_PREFIX, "");

function rateLimitLogMeta(req: Request, limiter: string): Record<string, unknown> {
    const rateLimitInfo = (
        req as Request & {
            rateLimit?: {
                limit?: number;
                used?: number;
                remaining?: number;
                resetTime?: Date;
                key?: string;
            };
        }
    ).rateLimit;

    return {
        limiter,
        method: req.method,
        path: req.originalUrl || req.path,
        ip: req.ip,
        ips: req.ips,
        xForwardedFor: req.headers["x-forwarded-for"],
        xRealIp: req.headers["x-real-ip"],
        limit: rateLimitInfo?.limit,
        used: rateLimitInfo?.used,
        remaining: rateLimitInfo?.remaining,
        resetTime: rateLimitInfo?.resetTime?.toISOString(),
        key: rateLimitInfo?.key,
    };
}

function sendRateLimitExceeded(
    req: Request,
    res: Response,
    limiter: string,
    error: string,
    extraBody: Record<string, unknown> = {}
): void {
    logger.log(
        LogLevel.warn,
        `Rate limit exceeded for IP: ${req.ip}`,
        rateLimitLogMeta(req, limiter)
    );
    res.status(429).json({ error, code: CODE.RateLimitExceeded.code, ...extraBody });
}

type RateLimitConfig = {
    id: string;
    windowMs: number;
    max: number;
    message: string;
};

const areRateLimitsDisabledForE2E = (): boolean => process.env.E2E_DISABLE_RATE_LIMITS === "true";

const createApiRateLimiter = (
    config: RateLimitConfig,
    options: {
        skip?: (req: Request) => boolean;
        skipSuccessfulRequests?: boolean;
        extraBody?: Record<string, unknown>;
    } = {}
) =>
    rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        message: config.message,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => areRateLimitsDisabledForE2E() || Boolean(options.skip?.(req)),
        skipSuccessfulRequests: options.skipSuccessfulRequests,
        handler: (req, res) => {
            sendRateLimitExceeded(req, res, config.id, config.message, options.extraBody);
        },
    });

export function requestIdentityDiagnostics(req: Request, _res: Response, next: NextFunction): void {
    if (process.env.RATE_LIMIT_DIAGNOSTICS !== "true") {
        next();
        return;
    }

    const shouldLog =
        req.path === mountedRestPath(REST_ROUTES.auth.session) ||
        req.path === mountedRestPath(REST_ROUTES.images.root) ||
        req.path === mountedRestPath(REST_ROUTES.landingPage.root);

    if (shouldLog) {
        logger.log(LogLevel.info, "Request identity diagnostic", {
            method: req.method,
            path: req.originalUrl || req.path,
            ip: req.ip,
            ips: req.ips,
            xForwardedFor: req.headers["x-forwarded-for"],
            xRealIp: req.headers["x-real-ip"],
        });
    }

    next();
}

// Public read API rate limiter - 600 read requests per 15 minutes
export const publicReadApiLimiter = createApiRateLimiter(RATE_LIMITS.publicRead, {
    skip: (req) => req.method !== "GET" && req.method !== "HEAD",
});

// General mutation API rate limiter - 100 state-changing requests per 15 minutes
export const generalMutationApiLimiter = createApiRateLimiter(RATE_LIMITS.generalMutation, {
    skip: (req) => {
        if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
            return true;
        }

        const path = req.path;
        return (
            path === mountedRestPath(REST_ROUTES.auth.login) ||
            path === mountedRestPath(REST_ROUTES.auth.signup) ||
            path === mountedRestPath(REST_ROUTES.auth.requestPasswordChange) ||
            (req.method === "POST" && path === mountedRestPath(REST_ROUTES.images.root)) ||
            path === mountedRestPath(REST_ROUTES.newsletter.subscribe)
        );
    },
});

// Strict rate limiter for login attempts
// In development: 20 requests per 15 minutes (React.StrictMode causes duplicate requests)
// In production: 5 requests per 15 minutes (stricter security)
export const loginLimiter = createApiRateLimiter(
    {
        ...RATE_LIMITS.login,
        max:
            process.env.NODE_ENV === "development"
                ? RATE_LIMITS.login.maxDevelopment
                : RATE_LIMITS.login.maxProduction,
    },
    {
        skipSuccessfulRequests: false,
    }
);

// Password reset request limiter - 3 requests per hour
export const passwordResetLimiter = createApiRateLimiter(RATE_LIMITS.passwordReset);

// Signup rate limiter - 3 signups per hour per IP
export const signupLimiter = createApiRateLimiter(RATE_LIMITS.signup);

// Image upload rate limiter - 25 upload requests per 15 minutes
// Note: Each request can upload multiple files (max 15 per request enforced in handler)
// This prevents disk space exhaustion and CPU overload from Sharp image processing
// Max theoretical: ~375 images per 15 min = ~6000 variants (16 per image)
export const imageUploadLimiter = createApiRateLimiter(RATE_LIMITS.imageUpload, {
    extraBody: {
        retryAfter: RATE_LIMITS.imageUpload.retryAfter,
        tip: RATE_LIMITS.imageUpload.tip,
    },
});

// Newsletter subscription rate limiter - 5 subscriptions per hour
// Prevents spam and abuse while allowing legitimate users to subscribe
export const newsletterSubscribeLimiter = createApiRateLimiter(RATE_LIMITS.newsletterSubscribe, {
    extraBody: {
        retryAfter: RATE_LIMITS.newsletterSubscribe.retryAfter,
    },
});

/**
 * File-count rate limiter - limits total files uploaded, not just requests
 * Prevents burst attacks where attacker makes max-file requests repeatedly
 *
 * Limit: 100 files per 15 minutes per IP
 * This means even if someone makes 25 requests, they can only upload 100 total files
 * (vs 375 files with request-only limiting: 25 requests × 15 files)
 */
export async function imageFileCountLimiter(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const ip = req.ip || "unknown";
        const key = `file-upload-count:${ip}`;
        const { maxFiles, message, retryAfter, tip, windowMs } = RATE_LIMITS.imageFileCount;

        // Get file count from request
        type MulterRequest = Request & { files?: Express.Multer.File[] };
        const fileCount = ((req as MulterRequest).files || []).length;

        if (fileCount === 0) {
            // No files in request, skip limiting
            return next();
        }

        // Get Redis client
        const redis = await initializeRedis();

        // Get current count from Redis
        const currentCountStr = await redis.get(key);
        const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

        // Check if adding these files would exceed limit
        if (currentCount + fileCount > maxFiles) {
            logger.log(
                LogLevel.warn,
                `File upload rate limit exceeded for IP: ${ip} (current: ${currentCount}, attempting: ${fileCount}, limit: ${maxFiles})`
            );
            res.status(429).json({
                error: message,
                code: CODE.FileRateLimitExceeded.code,
                currentCount,
                attemptedFiles: fileCount,
                maxFiles,
                retryAfter,
                tip,
            });
            return;
        }

        // Increment counter in Redis
        const newCount = currentCount + fileCount;
        const ttl = await redis.ttl(key);

        if (ttl <= 0) {
            // Key doesn't exist or has no expiry - set with expiry
            await redis.setEx(key, Math.floor(windowMs / 1000), newCount.toString());
        } else {
            // Key exists - increment and preserve TTL
            await redis.set(key, newCount.toString(), { KEEPTTL: true });
        }

        logger.log(LogLevel.debug, `File upload count for IP ${ip}: ${newCount}/${maxFiles} files`);

        // Continue to next middleware
        next();
    } catch (error) {
        logger.log(LogLevel.error, "Error in file count rate limiter:", error);
        // On error, allow request through but log the error
        next();
    }
}
