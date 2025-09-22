import { createYoga } from "graphql-yoga";
import { useDepthLimit } from "@envelop/depth-limit";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { AsyncLocalStorage } from "async_hooks";
import * as auth from "./auth.js";
import { context } from "./context.js";
import { genErrorCode, logger, LogLevel } from "./logger.js";
import { schema } from "./schema/index.js";
import { setupDatabase } from "./utils/setupDatabase.js";
import restRouter from "./rest/index.js";

const SERVER_URL = process.env.VITE_SERVER_LOCATION === "local" ?
    "http://localhost:5331/api" :
    "https://newlifenurseryinc.com/api";

const main = async () => {
    console.info("Starting server...");

    // Check for required .env variables
    if (["JWT_SECRET"].some(name => !process.env[name])) {
        logger.log(LogLevel.error, "🚨 JWT_SECRET not in environment variables. Stopping server", { code: genErrorCode("0007") });
        process.exit(1);
    }

    await setupDatabase();

    const app = express();

    // // For parsing application/json
    // app.use(express.json());
    // // For parsing application/xwww-
    // app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser(process.env.JWT_SECRET));

    // Set up health check endpoint
    app.get("/healthcheck", (_req, res) => {
        res.status(200).send("OK");
    });

    // For authentication
    app.use(auth.authenticate);

    // Cross-Origin access. Accepts requests from localhost and dns
    // If you want a public server, set origin to true instead
    const origins: Array<string | RegExp> = [];
    if (process.env.VITE_SERVER_LOCATION === "local") {
        origins.push(
            /^http:\/\/localhost(?::[0-9]+)?$/,
            /^http:\/\/192.168.0.[0-9]{1,2}(?::[0-9]+)?$/,
            "https://studio.apollographql.com",
        );
    }
    else {
        origins.push(
            "http://newlifenurseryinc.com",
            "http://www.newlifenurseryinc.com",
            "https://newlifenurseryinc.com",
            "https://www.newlifenurseryinc.com",
        );
    }
    app.use(cors({
        credentials: true,
        origin: true,
    }));
    // app.use(cors({
    //     credentials: true,
    //     origin: true,
    // }))

    // Set static folders
    app.use("/api", express.static(`${process.env.PROJECT_DIR}/assets/public`));
    app.use("/api/private", auth.requireAdmin, express.static(`${process.env.PROJECT_DIR}/assets/private`));
    app.use("/api/images", express.static(`${process.env.PROJECT_DIR}/assets/images`));

    // Mount REST API routes
    app.use(express.json()); // Enable JSON parsing for REST endpoints
    app.use("/api/rest", restRouter);
    
    /**
     * AsyncLocalStorage for Express req/res
     */
    const asyncLocalStorage = new AsyncLocalStorage();

    /**
     * GraphQL Yoga Server
     */
    const yoga = createYoga({
        schema,
        context: async () => {
            // Get Express req/res from AsyncLocalStorage
            const store: any = asyncLocalStorage.getStore();
            if (!store || !store.req || !store.res) {
                console.error('Express request/response not available in context');
                throw new Error('Express request/response not available');
            }
            return context({ req: store.req, res: store.res });
        },
        plugins: [
            useDepthLimit({
                maxDepth: 8,
                ignore: ['__schema', '__type'] // Ignore introspection fields
            })
        ],
        landingPage: process.env.NODE_ENV === "development",
        graphqlEndpoint: '/api/v1',
        cors: false,
        multipart: true, // Enable file uploads
        maskedErrors: process.env.NODE_ENV === "production"
    });

    // Configure GraphQL Yoga with Express using AsyncLocalStorage
    app.use('/api/v1', (req, res, next) => {
        // Store Express req/res in AsyncLocalStorage
        asyncLocalStorage.run({ req, res }, async () => {
            // Call yoga's handle method properly
            try {
                await yoga.handle(req, res);
            } catch (error) {
                next(error);
            }
        });
    });
    
    // Start Express server
    const server = app.listen(5331, () => {
        console.info(`🚀 Server running at ${SERVER_URL}`);
    });

    server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
            logger.log(LogLevel.error, `Port 5331 is already in use`, { code: genErrorCode("0015") });
        } else {
            logger.log(LogLevel.error, `Server failed to start: ${error.message}`, { code: genErrorCode("0016"), error });
        }
        process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.info('Shutting down server...');
        server.close(() => {
            console.info('Server shutdown complete');
            process.exit(0);
        });
    });
};

main();
