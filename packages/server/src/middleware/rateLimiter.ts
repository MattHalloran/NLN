import { CODE, RATE_LIMITS } from "@local/shared";
import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { logger, LogLevel } from "../logger.js";
import { initializeRedis } from "../redisConn.js";
import {
    getClientIdentity,
    getClientIp,
    getClientRateLimitKey,
    requestIdentityDiagnostics,
} from "./clientIdentity.js";
import {
    createRateLimitRedisKey,
    createRateLimitStoreFactory,
    type RateLimitStoreFactory,
    type RateLimitStoreId,
} from "./rateLimitStores.js";
import { RATE_LIMIT_POLICIES, resolveRateLimitPolicy } from "./rateLimitPolicies.js";

type ImageFileCountRedisClient = {
    pExpire(key: string, milliseconds: number): Promise<boolean | number>;
    sendCommand<T = unknown>(args: string[]): Promise<T>;
    ttl(key: string): Promise<number>;
};

function rateLimitLogMeta(req: Request, limiter: string): Record<string, unknown> {
    const identity = getClientIdentity(req);
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
        ip: identity.ip,
        ips: identity.ips,
        xForwardedFor: identity.forwardedFor,
        xRealIp: identity.realIp,
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
        `Rate limit exceeded for IP: ${getClientIp(req)}`,
        rateLimitLogMeta(req, limiter)
    );
    res.status(429).json({ error, code: CODE.RateLimitExceeded.code, ...extraBody });
}

type RateLimitConfig = {
    id: RateLimitStoreId;
    windowMs: number;
    max: number;
    message: string;
    passOnStoreError?: boolean;
};

export type RateLimiters = {
    publicReadApiLimiter: RateLimitRequestHandler;
    generalMutationApiLimiter: RateLimitRequestHandler;
    loginLimiter: RateLimitRequestHandler;
    passwordResetLimiter: RateLimitRequestHandler;
    signupLimiter: RateLimitRequestHandler;
    imageUploadLimiter: RateLimitRequestHandler;
    newsletterSubscribeLimiter: RateLimitRequestHandler;
    imageFileCountLimiter: RequestHandler;
};

export type RateLimiterDeps = {
    env: NodeJS.ProcessEnv;
    getKey: (req: Request) => string;
    getRedisClient: () => Promise<ImageFileCountRedisClient>;
    storeFactory: RateLimitStoreFactory;
};

const createDefaultRateLimitStoreFactory = (env: NodeJS.ProcessEnv): RateLimitStoreFactory =>
    createRateLimitStoreFactory({
        env,
        getRedisClient: initializeRedis,
    });

const areRateLimitsDisabledForE2E = (env: NodeJS.ProcessEnv): boolean =>
    env.E2E_DISABLE_RATE_LIMITS === "true";

const createApiRateLimiter = (
    config: RateLimitConfig,
    deps: RateLimiterDeps,
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
        keyGenerator: deps.getKey,
        store: deps.storeFactory({ id: config.id, windowMs: config.windowMs }),
        passOnStoreError: config.passOnStoreError ?? true,
        skip: (req) => areRateLimitsDisabledForE2E(deps.env) || Boolean(options.skip?.(req)),
        skipSuccessfulRequests: options.skipSuccessfulRequests,
        handler: (req, res) => {
            sendRateLimitExceeded(req, res, config.id, config.message, options.extraBody);
        },
    });
export { requestIdentityDiagnostics };

/**
 * File-count rate limiter - limits total files uploaded, not just requests
 * Prevents burst attacks where attacker makes max-file requests repeatedly
 *
 * Limit: 100 files per 15 minutes per IP
 * This means even if someone makes 25 requests, they can only upload 100 total files
 * (vs 375 files with request-only limiting: 25 requests × 15 files)
 */
export function createImageFileCountLimiter(
    options: {
        getKey?: (req: Request) => string;
        getRedisClient?: () => Promise<ImageFileCountRedisClient>;
    } = {}
): RequestHandler {
    const getKey = options.getKey ?? getClientRateLimitKey;
    const getRedisClient = options.getRedisClient ?? initializeRedis;

    return async function imageFileCountLimiter(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const identityKey = getKey(req);
            const key = createRateLimitRedisKey(RATE_LIMITS.imageFileCount.id, identityKey);
            const { maxFiles, message, retryAfter, tip, windowMs } = RATE_LIMITS.imageFileCount;

            // Get file count from request
            type MulterRequest = Request & { files?: Express.Multer.File[] };
            const fileCount = ((req as MulterRequest).files || []).length;

            if (fileCount === 0) {
                // No files in request, skip limiting
                return next();
            }

            // Get Redis client
            const redis = await getRedisClient();

            const newCountRaw = await redis.sendCommand<number>([
                "INCRBY",
                key,
                fileCount.toString(),
            ]);
            const newCount = Number(newCountRaw);
            const currentCount = newCount - fileCount;

            // Check if adding these files would exceed limit
            if (newCount > maxFiles) {
                try {
                    await redis.sendCommand(["DECRBY", key, fileCount.toString()]);
                } catch (rollbackError) {
                    logger.log(
                        LogLevel.error,
                        "Error rolling back file-count rate limit increment:",
                        rollbackError
                    );
                }
                logger.log(
                    LogLevel.warn,
                    `File upload rate limit exceeded for IP: ${getClientIp(req)} (current: ${currentCount}, attempting: ${fileCount}, limit: ${maxFiles})`
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

            const ttl = await redis.ttl(key);

            if (ttl <= 0) {
                await redis.pExpire(key, windowMs);
            }

            logger.log(
                LogLevel.debug,
                `File upload count for IP ${getClientIp(req)}: ${newCount}/${maxFiles} files`
            );

            // Continue to next middleware
            next();
        } catch (error) {
            logger.log(LogLevel.error, "Error in file count rate limiter:", error);
            // File-count limiting is a secondary upload guard. Keep it fail-open so Redis blips
            // do not strand already-parsed multipart requests.
            next();
        }
    };
}

export function createRateLimiters(options: Partial<RateLimiterDeps> = {}): RateLimiters {
    const env = options.env ?? process.env;
    const deps: RateLimiterDeps = {
        env,
        getRedisClient: options.getRedisClient ?? initializeRedis,
        getKey: options.getKey ?? getClientRateLimitKey,
        storeFactory: options.storeFactory ?? createDefaultRateLimitStoreFactory(env),
    };

    // Public read API rate limiter - 600 read requests per 15 minutes
    const publicReadApiLimiter = createApiRateLimiter(
        resolveRateLimitPolicy("publicRead", env),
        deps,
        {
            skip: (req) => req.method !== "GET" && req.method !== "HEAD",
        }
    );

    // General mutation API rate limiter - 100 state-changing requests per 15 minutes
    const generalMutationPolicy = RATE_LIMIT_POLICIES.generalMutation;
    const generalMutationApiLimiter = createApiRateLimiter(
        resolveRateLimitPolicy("generalMutation", env),
        deps,
        {
            skip: (req) => {
                if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
                    return true;
                }

                return Boolean(generalMutationPolicy.mountedExclusions?.includes(req.path));
            },
        }
    );

    // Strict rate limiter for login attempts
    // In development: 20 requests per 15 minutes (React.StrictMode causes duplicate requests)
    // In production: 5 requests per 15 minutes (stricter security)
    const loginLimiter = createApiRateLimiter(resolveRateLimitPolicy("login", env), deps, {
        skipSuccessfulRequests: false,
    });

    // Password reset request limiter - 3 requests per hour
    const passwordResetLimiter = createApiRateLimiter(
        resolveRateLimitPolicy("passwordReset", env),
        deps
    );

    // Signup rate limiter - 3 signups per hour per IP
    const signupLimiter = createApiRateLimiter(resolveRateLimitPolicy("signup", env), deps);

    // Image upload rate limiter - 25 upload requests per 15 minutes
    // Note: Each request can upload multiple files (max 15 per request enforced in handler)
    // This prevents disk space exhaustion and CPU overload from Sharp image processing
    // Max theoretical: ~375 images per 15 min = ~6000 variants (16 per image)
    const imageUploadLimiter = createApiRateLimiter(
        resolveRateLimitPolicy("imageUpload", env),
        deps,
        {
            extraBody: {
                retryAfter: RATE_LIMITS.imageUpload.retryAfter,
                tip: RATE_LIMITS.imageUpload.tip,
            },
        }
    );

    // Newsletter subscription rate limiter - 5 subscriptions per hour
    // Prevents spam and abuse while allowing legitimate users to subscribe
    const newsletterSubscribeLimiter = createApiRateLimiter(
        resolveRateLimitPolicy("newsletterSubscribe", env),
        deps,
        {
            extraBody: {
                retryAfter: RATE_LIMITS.newsletterSubscribe.retryAfter,
            },
        }
    );

    return {
        publicReadApiLimiter,
        generalMutationApiLimiter,
        loginLimiter,
        passwordResetLimiter,
        signupLimiter,
        imageUploadLimiter,
        newsletterSubscribeLimiter,
        imageFileCountLimiter: createImageFileCountLimiter(deps),
    };
}
