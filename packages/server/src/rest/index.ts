import { REST_RESOURCE, REST_ROUTES, REST_VERSION_PREFIX } from "@local/shared";
import { Router } from "express";
import multer from "multer";
import path from "path";
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

const router = Router();

// Configure temp directory for uploads
const TEMP_UPLOAD_DIR = path.join(process.env.PROJECT_DIR || "/root/NLN", "temp-uploads");

// Ensure temp directory exists
if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
    fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads using disk storage instead of memory
// This prevents memory exhaustion from large concurrent uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, TEMP_UPLOAD_DIR);
        },
        filename: (req, file, cb) => {
            // Use unique filename to prevent collisions
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
        },
    }),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
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
    res.json({
        name: "New Life Nursery REST API",
        version: "1.0.0",
        endpoints: {
            v1: {
                health: REST_ROUTES.health,
                csrfToken: REST_ROUTES.csrfToken,
                auth: {
                    session: REST_ROUTES.auth.session,
                    login: REST_ROUTES.auth.login,
                    logout: REST_ROUTES.auth.logout,
                    signup: REST_ROUTES.auth.signup,
                    resetPassword: REST_ROUTES.auth.resetPassword,
                    requestPasswordChange: REST_ROUTES.auth.requestPasswordChange,
                },
                // ARCHIVED: Customer management moved to external system
                // customers: {
                //     profile: "/api/rest/v1/customers/profile",
                //     list: "/api/rest/v1/customers",
                //     add: "/api/rest/v1/customers",
                //     update: "/api/rest/v1/customers/:id",
                //     delete: "/api/rest/v1/customers/:id",
                //     changeStatus: "/api/rest/v1/customers/:id/status",
                // },
                images: {
                    getByLabel: REST_ROUTES.images.byLabel(),
                    add: REST_ROUTES.images.root,
                    update: REST_ROUTES.images.root,
                },
                assets: {
                    read: REST_ROUTES.assets.read,
                    write: REST_ROUTES.assets.write,
                },
                dashboard: {
                    stats: REST_ROUTES.dashboard.stats,
                },
                landingPage: REST_ROUTES.landingPage.root,
                // ARCHIVED: plants endpoint removed
            },
        },
    });
});

export default router;
