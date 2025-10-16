import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import * as auth from "./auth.js";
import { genErrorCode, logger, LogLevel } from "./logger.js";
import { setupDatabase } from "./utils/setupDatabase.js";
import restRouter from "./rest/index.js";

const SERVER_URL =
    process.env.VITE_SERVER_LOCATION === "local"
        ? "http://localhost:5331/api"
        : "https://newlifenurseryinc.com/api";

const main = async () => {
    logger.log(LogLevel.info, "Starting server...");

    // Pre-flight checks: Verify all required environment variables
    const requiredEnvVars = ["JWT_SECRET", "PROJECT_DIR", "ADMIN_EMAIL", "ADMIN_PASSWORD"];
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

    // For parsing application/json and urlencoded data
    app.use(express.json());
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
    app.use(
        cors({
            credentials: true,
            origin: true,
        })
    );

    // For authentication
    app.use(auth.authenticate);

    // Set static folders
    app.use("/api", express.static(`${process.env.PROJECT_DIR}/assets/public`));
    app.use(
        "/api/private",
        auth.requireAdmin,
        express.static(`${process.env.PROJECT_DIR}/assets/private`)
    );
    app.use("/api/images", express.static(`${process.env.PROJECT_DIR}/assets/images`));

    // Mount REST API routes
    app.use(express.json()); // Enable JSON parsing for REST endpoints
    app.use("/api/rest", restRouter);

    // Start Express server
    const server = app.listen(5331, async () => {
        logger.log(LogLevel.info, `🚀 Server running at ${SERVER_URL}`);

        // Always log to console for visibility
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
};

main();
