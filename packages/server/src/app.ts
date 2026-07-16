import { CACHE_LIMITS, REST_ROUTES, STATIC_API_PATHS } from "@local/shared";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type RequestHandler } from "express";
import helmet from "helmet";
import path from "path";
import * as auth from "./auth.js";
import { logger, LogLevel } from "./logger.js";
import { createRestRouter } from "./rest/index.js";
import {
    createRateLimiters,
    requestIdentityDiagnostics,
    type RateLimiterDeps,
    type RateLimiters,
} from "./middleware/rateLimiter.js";
import { csrfErrorHandler, csrfProtection } from "./middleware/csrf.js";
import { ASSETS_DIR, IMAGE_ASSETS_DIR } from "./config/paths.js";
import {
    buildAllowedCorsOrigins,
    buildCorsOptions,
    buildHelmetOptions,
} from "./config/runtimePolicy.js";
import { applyTrustProxy } from "./config/proxyTrust.js";

type RuntimeEnv = NodeJS.ProcessEnv | Partial<Record<string, string>>;

export type CreateAppOptions = {
    env?: RuntimeEnv;
    attachPrismaMiddleware?: RequestHandler;
    authenticateMiddleware?: RequestHandler;
    csrfProtectionMiddleware?: RequestHandler;
    limiters?: RateLimiters;
    rateLimiterDeps?: Partial<RateLimiterDeps>;
    uploadFilesMiddleware?: RequestHandler;
};

export function createApp(options: CreateAppOptions = {}) {
    const env = options.env ?? process.env;
    const app = express();
    const limiters =
        options.limiters ??
        createRateLimiters({
            ...options.rateLimiterDeps,
            env: options.rateLimiterDeps?.env ?? env,
        });

    applyTrustProxy(app, env);

    // ============================================================================
    // SECURITY: HTTP Security Headers with Helmet
    // ============================================================================
    // Apply helmet early in middleware chain to set security headers on all responses.
    app.use(helmet(buildHelmetOptions(env)));

    logger.log(LogLevel.info, "🛡️  HTTP security headers enabled (helmet.js)");
    logger.log(
        LogLevel.info,
        `   - Content Security Policy (CSP)
   - HTTP Strict Transport Security (HSTS)
   - X-Frame-Options (clickjacking protection)
   - X-Content-Type-Options (MIME sniffing protection)
   - Referrer-Policy
   - Cross-Origin policies`
    );

    // For parsing application/json - use raw body parser to completely bypass body-parser.
    // This avoids body-parser's buggy handling of special characters like '!'.
    app.use(express.raw({ type: "application/json", limit: "10mb" }));
    app.use((req, _res, next) => {
        if (Buffer.isBuffer(req.body) && req.body.length > 0) {
            try {
                const bodyString = req.body.toString("utf8");
                req.body = JSON.parse(bodyString);
            } catch (error) {
                logger.log(LogLevel.error, "JSON parse error in request body", {
                    error,
                });
            }
        }
        next();
    });
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser(env.JWT_SECRET));

    app.use(options.attachPrismaMiddleware ?? auth.attachPrisma);

    app.get("/healthcheck", (_req, res) => {
        res.status(200).send("OK");
    });

    // CORS must be configured before authentication middleware so preflight requests work.
    const allowedOrigins = buildAllowedCorsOrigins(env);

    logger.log(LogLevel.info, `🔒 CORS configured for origins: ${allowedOrigins.join(", ")}`);

    const corsOptions = buildCorsOptions(env, (origin) => {
        logger.log(LogLevel.warn, `🚫 CORS blocked request from origin: ${origin}`);
    });

    app.options("*", cors(corsOptions));
    app.use(cors(corsOptions));

    // Apply coarse API limits before authentication so an attacker cannot force
    // unbounded authorization work. Route-specific limiters remain inside the router.
    app.use(REST_ROUTES.root, requestIdentityDiagnostics);
    app.use(REST_ROUTES.root, limiters.publicReadApiLimiter);
    app.use(REST_ROUTES.root, limiters.generalMutationApiLimiter);
    logger.log(
        LogLevel.info,
        "🛡️  Rate limiting enabled: reads 600/15m, mutations 100/15m per client"
    );

    app.use(options.authenticateMiddleware ?? auth.authenticate);
    logger.log(LogLevel.info, "🔐 Authentication middleware enabled");

    app.use(REST_ROUTES.root, options.csrfProtectionMiddleware ?? csrfProtection);
    logger.log(LogLevel.info, "🛡️  CSRF protection enabled for all state-changing requests");

    app.use(STATIC_API_PATHS.publicAssets, express.static(path.join(ASSETS_DIR, "public")));
    app.use(
        STATIC_API_PATHS.privateAssets,
        auth.requireAdmin,
        express.static(path.join(ASSETS_DIR, "private"))
    );

    app.use(
        STATIC_API_PATHS.images,
        express.static(IMAGE_ASSETS_DIR, {
            maxAge: "30d",
            etag: true,
            lastModified: true,
            cacheControl: true,
            setHeaders: (res, filePath) => {
                const fileName = path.basename(filePath);
                const isUuidBased =
                    /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/i.test(fileName);

                if (isUuidBased) {
                    res.setHeader(
                        "Cache-Control",
                        `public, max-age=${CACHE_LIMITS.immutableAssetMaxAgeSeconds}, immutable`
                    );
                } else {
                    res.setHeader("Cache-Control", "public, max-age=2592000, must-revalidate");
                }
            },
        })
    );

    app.use(
        REST_ROUTES.root,
        createRestRouter({
            limiters,
            uploadFilesMiddleware: options.uploadFilesMiddleware,
        })
    );

    app.use(csrfErrorHandler);

    return app;
}
