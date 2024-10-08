import { ApolloServer } from "apollo-server-express";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { graphqlUploadExpress } from "graphql-upload";
import * as auth from "./auth";
import { context } from "./context";
import { depthLimit } from "./depthLimit";
import { genErrorCode, logger, LogLevel } from "./logger";
import { schema } from "./schema";
import { setupDatabase } from "./utils/setupDatabase";

const SERVER_URL = process.env.VITE_SERVER_LOCATION === "local" ?
    "http://localhost:5330/api" :
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

    // Set up image uploading
    app.use("/api/v1", graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 100 }));

    /**
     * Apollo Server for GraphQL
     */
    const apollo_options = new ApolloServer({
        introspection: process.env.NODE_ENV === "development",
        schema,
        context: (c) => context(c), // Allows request and response to be included in the context
        validationRules: [depthLimit(8)], // Prevents DoS attack from arbitrarily-nested query
        uploads: false,
    });
    // Start server
    await apollo_options.start();
    // Configure server with ExpressJS settings and path
    apollo_options.applyMiddleware({
        app,
        path: "/api/v1",
        cors: false,
    });
    // Start Express server
    app.listen(5330);

    console.info(`🚀 Server running at ${SERVER_URL}`);
};

main();
