import { DEFAULT_PORTS, DEFAULT_SERVER_URLS } from "@local/shared";
import { genErrorCode, logger, LogLevel } from "./logger.js";
import { setupDatabase } from "./utils/setupDatabase.js";
import { createApp } from "./app.js";
import { startLandingPageWatcher, stopLandingPageWatcher } from "./utils/landingPageWatcher.js";
import { closeRedis } from "./redisConn.js";
import { closeImageCleanupQueue } from "./worker/imageCleanup/queue.js";
import { closeLabelSyncQueue } from "./worker/labelSync/queue.js";
import { closeEmailQueue } from "./worker/email/queue.js";

const SERVER_URL =
    process.env.SERVER_URL ??
    process.env.VITE_SERVER_URL ??
    (process.env.VITE_SERVER_LOCATION === "local"
        ? DEFAULT_SERVER_URLS.localApi
        : DEFAULT_SERVER_URLS.productionApi);
const configuredServerPort = process.env.PORT_SERVER ?? String(DEFAULT_PORTS.server);
const SERVER_PORT = Number(configuredServerPort);
if (!Number.isSafeInteger(SERVER_PORT) || SERVER_PORT < 1 || SERVER_PORT > 65535) {
    throw new Error(
        `PORT_SERVER must be an integer between 1 and 65535; received ${configuredServerPort}`
    );
}
const SERVER_HEALTHCHECK = `http://localhost:${SERVER_PORT}/healthcheck`;

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

    const app = createApp({ env: process.env });

    // Start Express server
    const server = app.listen(SERVER_PORT, async () => {
        logger.log(LogLevel.info, `🚀 Server running at ${SERVER_URL}`);

        // Always log to console for visibility
        /* eslint-disable no-console */
        console.log(`\n${"=".repeat(60)}`);
        console.log("✅ Server ready and accepting connections");
        console.log(`   Server URL: ${SERVER_URL}`);
        console.log(`   Health check: ${SERVER_HEALTHCHECK}`);
        console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
        console.log(`${"=".repeat(60)}\n`);

        // Self health-check to verify server is responding
        try {
            const response = await fetch(SERVER_HEALTHCHECK);
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
