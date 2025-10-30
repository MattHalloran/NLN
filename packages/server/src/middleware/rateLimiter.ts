import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { logger, LogLevel } from "../logger.js";
import { initializeRedis } from "../redisConn.js";

// General API rate limiter - 100 requests per 15 minutes
export const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (_req, res) => {
        logger.log(LogLevel.warn, `Rate limit exceeded for IP: ${_req.ip}`);
        res.status(429).json({
            error: "Too many requests from this IP, please try again later.",
        });
    },
});

// Strict rate limiter for login attempts
// In development: 20 requests per 15 minutes (React.StrictMode causes duplicate requests)
// In production: 5 requests per 15 minutes (stricter security)
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === "development" ? 20 : 5,
    message: "Too many login attempts from this IP, please try again after 15 minutes.",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false, // Count all requests, even successful ones
    handler: (req, res) => {
        logger.log(LogLevel.warn, `Login rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: "Too many login attempts from this IP, please try again after 15 minutes.",
            code: "RATE_LIMIT_EXCEEDED",
        });
    },
});

// Password reset request limiter - 3 requests per hour
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: "Too many password reset requests from this IP, please try again after an hour.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.log(LogLevel.warn, `Password reset rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: "Too many password reset requests from this IP, please try again after an hour.",
            code: "RATE_LIMIT_EXCEEDED",
        });
    },
});

// Signup rate limiter - 3 signups per hour per IP
export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 signup requests per hour
    message: "Too many signup attempts from this IP, please try again after an hour.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.log(LogLevel.warn, `Signup rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: "Too many signup attempts from this IP, please try again after an hour.",
            code: "RATE_LIMIT_EXCEEDED",
        });
    },
});

// Image upload rate limiter - 25 upload requests per 15 minutes
// Note: Each request can upload multiple files (max 15 per request enforced in handler)
// This prevents disk space exhaustion and CPU overload from Sharp image processing
// Max theoretical: ~375 images per 15 min = ~6000 variants (16 per image)
export const imageUploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 25, // Limit each IP to 25 upload requests per 15 minutes
    message: "Too many image upload requests. Please wait 15 minutes before uploading more images.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.log(
            LogLevel.warn,
            `Image upload rate limit exceeded for IP: ${req.ip}, User: ${req.userId || "unknown"}`,
        );
        res.status(429).json({
            error: "Too many image upload requests. Please wait before uploading more images.",
            code: "RATE_LIMIT_EXCEEDED",
            retryAfter: "15 minutes",
            tip: "Consider uploading images in smaller batches (up to 15 files per upload).",
        });
    },
});

// Newsletter subscription rate limiter - 5 subscriptions per hour
// Prevents spam and abuse while allowing legitimate users to subscribe
export const newsletterSubscribeLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 newsletter subscriptions per hour
    message: "Too many newsletter subscription attempts. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.log(LogLevel.warn, `Newsletter subscribe rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: "Too many subscription attempts. Please try again later.",
            code: "RATE_LIMIT_EXCEEDED",
            retryAfter: "1 hour",
        });
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
export async function imageFileCountLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const ip = req.ip || "unknown";
        const key = `file-upload-count:${ip}`;
        const windowMs = 15 * 60 * 1000; // 15 minutes
        const maxFiles = 100; // Maximum files per window

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
                `File upload rate limit exceeded for IP: ${ip} (current: ${currentCount}, attempting: ${fileCount}, limit: ${maxFiles})`,
            );
            res.status(429).json({
                error: "Too many files uploaded. Please wait before uploading more images.",
                code: "FILE_RATE_LIMIT_EXCEEDED",
                currentCount,
                attemptedFiles: fileCount,
                maxFiles,
                retryAfter: "15 minutes",
                tip: "You've reached the file upload limit. Wait 15 minutes or upload fewer files per request.",
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
