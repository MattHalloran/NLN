import {
    createTimestampedId,
    REST_RESOURCE,
    REST_VERSION_PREFIX,
    UPLOAD_LIMITS,
} from "@local/shared";
import { Router } from "express";
import multer from "multer";
import fs from "fs";
import landingPageRouter from "./landingPage.js";
// ARCHIVED: import plantsRouter from "./plants.js"; // Plants feature removed
import authRouter from "./auth.js";
// ARCHIVED: import customersRouter from "./customers.js"; // Customer management moved to external system
import imagesRouter from "./images.js";
import assetsRouter from "./assets.js";
import dashboardRouter from "./dashboard.js";
import storageRouter from "./storage.js";
import logsRouter from "./logs.js";
import newsletterRouter from "./newsletter.js";
// ARCHIVED: import analyticsRouter from "./analytics.js"; // Old A/B test analytics moved to variant system
import { csrfTokenEndpoint } from "../middleware/csrf.js";
import { TEMP_UPLOAD_DIR } from "../config/paths.js";
import { createRestApiInfo } from "./apiInfo.js";

const router = Router();

// Configure temp directory for uploads
// Ensure temp directory exists
if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
    fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads using disk storage instead of memory
// This prevents memory exhaustion from large concurrent uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, TEMP_UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
            // Use unique filename to prevent collisions
            const uniqueSuffix = createTimestampedId("upload");
            cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
        },
    }),
    limits: {
        fileSize: UPLOAD_LIMITS.maxUploadFileSizeBytes,
    },
});

// API versioning
const v1Router = Router();

// Health check for REST API
v1Router.get(REST_RESOURCE.Health, (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// CSRF token endpoint - clients fetch token before making state-changing requests
v1Router.get(REST_RESOURCE.CsrfToken, csrfTokenEndpoint);

// Mount route handlers
v1Router.use(REST_RESOURCE.LandingPage, landingPageRouter);
// ARCHIVED: v1Router.use("/plants", plantsRouter); // Plants feature removed
v1Router.use(REST_RESOURCE.Auth, authRouter);
// ARCHIVED: v1Router.use("/customers", customersRouter); // Customer management moved to external system
v1Router.use(REST_RESOURCE.Images, upload.array("files"), imagesRouter);
v1Router.use(REST_RESOURCE.Assets, upload.array("files"), assetsRouter);
v1Router.use(REST_RESOURCE.Dashboard, dashboardRouter);
v1Router.use(REST_RESOURCE.Storage, storageRouter);
v1Router.use(REST_RESOURCE.Logs, logsRouter);
v1Router.use(REST_RESOURCE.Newsletter, newsletterRouter);
// ARCHIVED: v1Router.use("/analytics", analyticsRouter); // Old A/B test analytics moved to variant system

// Mount versioned API
router.use(REST_VERSION_PREFIX, v1Router);

// Root API info
router.get("/", (_req, res) => {
    res.json(createRestApiInfo());
});

export default router;
