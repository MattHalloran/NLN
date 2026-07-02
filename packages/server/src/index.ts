import {
    DEFAULT_PORTS,
    DEFAULT_SERVER_URLS,
    CACHE_LIMITS,
    REST_ROUTES,
    STATIC_API_PATHS,
} from "@local/shared";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import * as auth from "./auth.js";
import { genErrorCode, logger, LogLevel } from "./logger.js";
import { setupDatabase } from "./utils/setupDatabase.js";
import restRouter from "./rest/index.js";
import {
    generalMutationApiLimiter,
    publicReadApiLimiter,
    requestIdentityDiagnostics,
} from "./middleware/rateLimiter.js";
import { csrfProtection, csrfErrorHandler } from "./middleware/csrf.js";
import { startLandingPageWatcher, stopLandingPageWatcher } from "./utils/landingPageWatcher.js";
import { ASSETS_DIR, IMAGE_ASSETS_DIR } from "./config/paths.js";
import { closeRedis } from "./redisConn.js";
import { closeImageCleanupQueue } from "./worker/imageCleanup/queue.js";
import { closeLabelSyncQueue } from "./worker/labelSync/queue.js";
import { closeEmailQueue } from "./worker/email/queue.js";
import {
    buildAllowedCorsOrigins,
    buildCorsOptions,
    buildHelmetOptions,
} from "./config/runtimePolicy.js";

const SERVER_URL =
    process.env.SERVER_URL ??
    process.env.VITE_SERVER_URL ??
    (process.env.VITE_SERVER_LOCATION === "local"
        ? DEFAULT_SERVER_URLS.localApi
        : DEFAULT_SERVER_URLS.productionApi);
const SERVER_PORT = DEFAULT_PORTS.server;

const main = async () => {
    logger.log(LogLevel.info, "Starting server...");

    // Pre-flight checks: Verify all required environment variables
    const requiredEnvVars = [
        "JWT_SECRET",
        "CSRF_SECRET",
        "PROJECT_DIR",
        "ADMIN_EMAIL",
        "ADMIN_PASSWORD",
    ];
    const missingVars = requiredEnvVars.filter((name) => !process.env[name]);

    if (missingVars.length > 0) {
        const errorMsg = `Missing required environment variables: ${missingVars.join(", ")}`;
        logger.log(LogLevel.error, `🚨 ${errorMsg}. Stopping server`, {
            code: genErrorCode("0007"),
        });
        console.error(`\n❌ ${errorMsg}`);
        console.error("   Check your .env file in packages/server/\n");
        process.exit(1);
    }

    await setupDatabase();

    const app = express();
    app.set("trust proxy", 1);
    logger.log(LogLevel.info, "🔁 Express trust proxy configured: 1 hop");

    // ============================================================================
    // SECURITY: HTTP Security Headers with Helmet
    // ============================================================================
    // Apply helmet early in middleware chain to set security headers on all responses
    app.use(helmet(buildHelmetOptions()));

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

    // For parsing application/json - use raw body parser to completely bypass body-parser
    // This avoids body-parser's buggy handling of special characters like '!'
    app.use(express.raw({ type: "application/json", limit: "10mb" }));
    app.use((req, _res, next) => {
        if (Buffer.isBuffer(req.body) && req.body.length > 0) {
            try {
                const bodyString = req.body.toString("utf8");
                req.body = JSON.parse(bodyString);
            } catch (error) {
                logger.log(LogLevel.error, "JSON parse error in request body", {
                    code: genErrorCode("0017"),
                    error,
                });
            }
        }
        next();
    });
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser(process.env.JWT_SECRET));

    // Attach Prisma client to request
    app.use(auth.attachPrisma);

    // Set up health check endpoint
    app.get("/healthcheck", (_req, res) => {
        res.status(200).send("OK");
    });

    // Cross-Origin access. Accepts requests from localhost and dns
    // IMPORTANT: CORS must be configured BEFORE authentication middleware
    // to properly handle preflight requests and cross-origin credentials

    const allowedOrigins = buildAllowedCorsOrigins();

    logger.log(LogLevel.info, `🔒 CORS configured for origins: ${allowedOrigins.join(", ")}`);

    const corsOptions = buildCorsOptions(process.env, (origin) => {
        logger.log(LogLevel.warn, `🚫 CORS blocked request from origin: ${origin}`);
    });

    app.options("*", cors(corsOptions));
    app.use(cors(corsOptions));

    // CRITICAL: Authentication MUST come before CSRF protection
    // Reason: CSRF tokens are bound to session identifiers (userId or IP)
    // - If user is authenticated, session ID = req.customerId
    // - If user is not authenticated, session ID = req.ip
    // Authentication middleware sets req.customerId, so it must run FIRST
    // to ensure consistent session identifiers during both token generation and validation
    app.use(auth.authenticate);
    logger.log(LogLevel.info, "🔐 Authentication middleware enabled");

    // Apply rate limiting to API routes. Reads and mutations have separate buckets.
    app.use(REST_ROUTES.root, requestIdentityDiagnostics);
    app.use(REST_ROUTES.root, publicReadApiLimiter);
    app.use(REST_ROUTES.root, generalMutationApiLimiter);
    logger.log(
        LogLevel.info,
        "🛡️  Rate limiting enabled: reads 600/15m, mutations 100/15m per client"
    );

    // Apply CSRF protection to all API routes
    // This middleware automatically exempts GET, HEAD, and OPTIONS requests
    app.use(REST_ROUTES.root, csrfProtection);
    logger.log(LogLevel.info, "🛡️  CSRF protection enabled for all state-changing requests");

    // Set static folders
    app.use(STATIC_API_PATHS.publicAssets, express.static(path.join(ASSETS_DIR, "public")));
    app.use(
        STATIC_API_PATHS.privateAssets,
        auth.requireAdmin,
        express.static(path.join(ASSETS_DIR, "private"))
    );

    // Image serving with optimized caching
    // Images use UUID-based filenames (immutable) or semantic names that change infrequently
    // Strategy: 30-day cache with ETag validation for balance of performance and freshness
    app.use(
        STATIC_API_PATHS.images,
        express.static(IMAGE_ASSETS_DIR, {
            maxAge: "30d", // Browser caches for 30 days
            etag: true, // Enable ETag for conditional requests
            lastModified: true, // Include Last-Modified header
            cacheControl: true, // Set Cache-Control headers
            setHeaders: (res, filePath) => {
                // Most images are UUID-based (immutable), but some have semantic names
                // For UUID-based files, we can be more aggressive with caching
                const fileName = path.basename(filePath);
                const isUuidBased =
                    /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/i.test(fileName);

                if (isUuidBased) {
                    // UUID-based filenames are effectively immutable (won't be reused)
                    res.setHeader(
                        "Cache-Control",
                        `public, max-age=${CACHE_LIMITS.immutableAssetMaxAgeSeconds}, immutable`
                    );
                } else {
                    // Semantic filenames might be reused, use moderate caching
                    res.setHeader("Cache-Control", "public, max-age=2592000, must-revalidate");
                }
            },
        })
    );

    // Mount REST API routes
    app.use(REST_ROUTES.root, restRouter);

    // CSRF error handler - must be after routes
    app.use(csrfErrorHandler);

    // Start Express server
    const server = app.listen(SERVER_PORT, async () => {
        logger.log(LogLevel.info, `🚀 Server running at ${SERVER_URL}`);

        // Always log to console for visibility
        /* eslint-disable no-console */
        console.log(`\n${"=".repeat(60)}`);
        console.log("✅ Server ready and accepting connections");
        console.log(`   Server URL: ${SERVER_URL}`);
        console.log(`   Health check: ${DEFAULT_SERVER_URLS.localHealthcheck}`);
        console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
        console.log(`${"=".repeat(60)}\n`);

        // Self health-check to verify server is responding
        try {
            const response = await fetch(DEFAULT_SERVER_URLS.localHealthcheck);
            if (response.ok) {
                console.log("✅ Health check passed - server is responding\n");
            } else {
                console.error(`⚠️  Health check returned status: ${response.status}\n`);
            }
            /* eslint-enable no-console */
        } catch (error) {
            const err = error as Error;
            console.error(`⚠️  Health check failed: ${err.message}\n`);
        }

        // Start watching landing page content file for changes
        // This will auto-sync image labels when the file is modified
        startLandingPageWatcher();
    });

    server.on("error", (error: Error & { code?: string }) => {
        if (error.code === "EADDRINUSE") {
            logger.log(LogLevel.error, `Port ${SERVER_PORT} is already in use`, {
                code: genErrorCode("0015"),
            });
        } else {
            logger.log(LogLevel.error, `Server failed to start: ${error.message}`, {
                code: genErrorCode("0016"),
                error,
            });
        }
        process.exit(1);
    });

    // Graceful shutdown
    const shutdown = (signal: NodeJS.Signals) => {
        logger.log(LogLevel.info, `Shutting down server after ${signal}...`);

        // Stop file watcher
        stopLandingPageWatcher();

        server.close(() => {
            void Promise.all([closeImageCleanupQueue(), closeLabelSyncQueue(), closeEmailQueue()])
                .then(() => closeRedis())
                .catch((error: Error) => {
                    logger.log(LogLevel.error, "Server shutdown cleanup failed", {
                        code: genErrorCode("0018"),
                        error,
                    });
                })
                .finally(() => {
                    logger.log(LogLevel.info, "Server shutdown complete");
                    process.exit(0);
                });
        });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Global error handlers to catch uncaught errors
    process.on("uncaughtException", (error: Error) => {
        logger.log(LogLevel.error, "🔥 UNCAUGHT EXCEPTION:", {
            code: genErrorCode("UNCAUGHT"),
            error: error.message,
            stack: error.stack,
        });
        console.error("\n🔥 UNCAUGHT EXCEPTION:");
        console.error(error);
        console.error("\nStack trace:", error.stack);
        // Don't exit - let nodemon handle restart
    });

    process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
        logger.log(LogLevel.error, "🔥 UNHANDLED PROMISE REJECTION:", {
            code: genErrorCode("UNHANDLED_PROMISE"),
            reason: reason instanceof Error ? reason.message : String(reason),
            stack: reason instanceof Error ? reason.stack : undefined,
        });
        console.error("\n🔥 UNHANDLED PROMISE REJECTION at:", promise);
        console.error("Reason:", reason);
        if (reason instanceof Error) {
            console.error("Stack trace:", reason.stack);
        }
        // Don't exit - let nodemon handle restart
    });
};

void main();
// Trigger rebuild 2
