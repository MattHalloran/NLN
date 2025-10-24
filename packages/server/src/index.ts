import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import * as auth from "./auth.js";
import { genErrorCode, logger, LogLevel } from "./logger.js";
import { setupDatabase } from "./utils/setupDatabase.js";
import restRouter from "./rest/index.js";
import { generalApiLimiter } from "./middleware/rateLimiter.js";
import { csrfProtection, csrfErrorHandler } from "./middleware/csrf.js";

const SERVER_URL =
    process.env.VITE_SERVER_LOCATION === "local"
        ? "http://localhost:5331/api"
        : "https://newlifenurseryinc.com/api";

const main = async () => {
    logger.log(LogLevel.info, "Starting server...");

    // Pre-flight checks: Verify all required environment variables
    const requiredEnvVars = ["JWT_SECRET", "CSRF_SECRET", "PROJECT_DIR", "ADMIN_EMAIL", "ADMIN_PASSWORD"];
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

    // ============================================================================
    // SECURITY: HTTP Security Headers with Helmet
    // ============================================================================
    // Apply helmet early in middleware chain to set security headers on all responses
    app.use(
        helmet({
            // Content Security Policy - controls what resources can be loaded
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    // Scripts: Allow from same origin only (no inline scripts for security)
                    // Note: If you need inline scripts, consider using nonces instead of 'unsafe-inline'
                    scriptSrc: ["'self'"],
                    // Styles: Allow same origin + inline styles (needed for Material-UI and React)
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    // Images: Allow same origin, data URIs, and blob URIs
                    imgSrc: ["'self'", "data:", "blob:"],
                    // API connections: Allow same origin
                    connectSrc: ["'self'"],
                    // Fonts: Allow same origin
                    fontSrc: ["'self'"],
                    // Objects/embeds: Block all
                    objectSrc: ["'none'"],
                    // Media: Allow same origin
                    mediaSrc: ["'self'"],
                    // Frames: Block all (prevents clickjacking)
                    frameSrc: ["'none'"],
                    // Base URI: Restrict to same origin
                    baseUri: ["'self'"],
                    // Form actions: Restrict to same origin
                    formAction: ["'self'"],
                    // Upgrade insecure requests in production
                    ...(process.env.NODE_ENV === "production" && {
                        upgradeInsecureRequests: [],
                    }),
                },
            },

            // HTTP Strict Transport Security (HSTS)
            // Forces browsers to use HTTPS for all future requests
            // Only enable in production when HTTPS is available
            hsts: {
                maxAge: 31536000, // 1 year in seconds
                includeSubDomains: true,
                preload: true,
            },

            // X-Frame-Options: Prevents clickjacking by blocking iframe embedding
            frameguard: {
                action: "deny",
            },

            // X-Content-Type-Options: Prevents MIME-type sniffing
            // Forces browser to respect declared Content-Type
            noSniff: true,

            // X-DNS-Prefetch-Control: Controls DNS prefetching
            dnsPrefetchControl: {
                allow: false,
            },

            // X-Download-Options: Prevents IE from executing downloads in site's context
            ieNoOpen: true,

            // Referrer-Policy: Controls how much referrer information is sent
            referrerPolicy: {
                policy: "strict-origin-when-cross-origin",
            },

            // X-Permitted-Cross-Domain-Policies: Restricts Adobe Flash/PDF cross-domain requests
            permittedCrossDomainPolicies: {
                permittedPolicies: "none",
            },

            // Cross-Origin-Embedder-Policy: Controls embedding of cross-origin resources
            crossOriginEmbedderPolicy: false, // Set to true if you need stronger isolation

            // Cross-Origin-Opener-Policy: Prevents other windows from getting references
            crossOriginOpenerPolicy: {
                policy: "same-origin-allow-popups",
            },

            // Cross-Origin-Resource-Policy: Controls resource sharing
            // In development, allow cross-origin to support localhost:3001 -> localhost:5331
            // In production, use same-origin for security
            crossOriginResourcePolicy: {
                policy: process.env.NODE_ENV === "development" ? "cross-origin" : "same-origin",
            },
        })
    );

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
    app.use(express.raw({ type: 'application/json', limit: '10mb' }));
    app.use((req, _res, next) => {
        if (Buffer.isBuffer(req.body) && req.body.length > 0) {
            try {
                const bodyString = req.body.toString('utf8');
                req.body = JSON.parse(bodyString);
            } catch (error) {
                logger.log(LogLevel.error, "JSON parse error in request body", {
                    code: genErrorCode("0017"),
                    error
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

    // Build allowed origins list based on environment
    const allowedOrigins: string[] = [];

    // Always allow production domains
    allowedOrigins.push("https://newlifenurseryinc.com");
    allowedOrigins.push("https://www.newlifenurseryinc.com");

    // Add additional domains from VIRTUAL_HOST if set
    if (process.env.VIRTUAL_HOST) {
        const virtualHosts = process.env.VIRTUAL_HOST.split(",").map(h => h.trim());
        virtualHosts.forEach(host => {
            if (!allowedOrigins.includes(`https://${host}`)) {
                allowedOrigins.push(`https://${host}`);
            }
        });
    }

    // In development, also allow localhost
    if (process.env.NODE_ENV === "development" || process.env.SERVER_LOCATION === "local") {
        allowedOrigins.push("http://localhost:3001");
        allowedOrigins.push("http://localhost:3000");
        allowedOrigins.push("http://127.0.0.1:3001");
        allowedOrigins.push("http://127.0.0.1:3000");
    }

    logger.log(LogLevel.info, `🔒 CORS configured for origins: ${allowedOrigins.join(", ")}`);

    app.use(
        cors({
            credentials: true,
            origin: (origin, callback) => {
                // Allow requests with no origin (like mobile apps, Postman, curl)
                if (!origin) {
                    return callback(null, true);
                }

                if (allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    logger.log(LogLevel.warn, `🚫 CORS blocked request from origin: ${origin}`);
                    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
                }
            },
        }),
    );

    // Apply rate limiting to all API routes
    app.use("/api/rest", generalApiLimiter);
    logger.log(LogLevel.info, "🛡️  Rate limiting enabled: 100 requests per 15 minutes per IP");

    // Apply CSRF protection to all API routes
    // This middleware automatically exempts GET, HEAD, and OPTIONS requests
    app.use("/api/rest", csrfProtection);
    logger.log(LogLevel.info, "🛡️  CSRF protection enabled for all state-changing requests");

    // For authentication
    app.use(auth.authenticate);

    // Set static folders
    app.use("/api", express.static(`${process.env.PROJECT_DIR}/assets/public`));
    app.use(
        "/api/private",
        auth.requireAdmin,
        express.static(`${process.env.PROJECT_DIR}/assets/private`),
    );
    app.use("/api/images", express.static(`${process.env.PROJECT_DIR}/assets/images`));

    // Mount REST API routes
    app.use("/api/rest", restRouter);

    // CSRF error handler - must be after routes
    app.use(csrfErrorHandler);

    // Start Express server
    const server = app.listen(5331, async () => {
        logger.log(LogLevel.info, `🚀 Server running at ${SERVER_URL}`);

        // Always log to console for visibility
        /* eslint-disable no-console */
        console.log(`\n${"=".repeat(60)}`);
        console.log("✅ Server ready and accepting connections");
        console.log(`   Server URL: ${SERVER_URL}`);
        console.log("   Health check: http://localhost:5331/healthcheck");
        console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
        console.log(`${"=".repeat(60)}\n`);

        // Self health-check to verify server is responding
        try {
            const response = await fetch("http://localhost:5331/healthcheck");
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
    });

    server.on("error", (error: Error & { code?: string }) => {
        if (error.code === "EADDRINUSE") {
            logger.log(LogLevel.error, "Port 5331 is already in use", {
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
    process.on("SIGINT", () => {
        logger.log(LogLevel.info, "Shutting down server...");
        server.close(() => {
            logger.log(LogLevel.info, "Server shutdown complete");
            process.exit(0);
        });
    });

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
