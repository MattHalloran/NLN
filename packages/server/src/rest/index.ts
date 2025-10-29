import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import landingPageRouter from "./landingPage.js";
import plantsRouter from "./plants.js";
import authRouter from "./auth.js";
// ARCHIVED: import customersRouter from "./customers.js"; // Customer management moved to external system
import imagesRouter from "./images.js";
import assetsRouter from "./assets.js";
import dashboardRouter from "./dashboard.js";
import storageRouter from "./storage.js";
import logsRouter from "./logs.js";
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
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
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
v1Router.get("/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// CSRF token endpoint - clients fetch token before making state-changing requests
v1Router.get("/csrf-token", csrfTokenEndpoint);

// Mount route handlers
v1Router.use("/landing-page", landingPageRouter);
v1Router.use("/plants", plantsRouter);
v1Router.use("/auth", authRouter);
// ARCHIVED: v1Router.use("/customers", customersRouter); // Customer management moved to external system
v1Router.use("/images", upload.array("files"), imagesRouter);
v1Router.use("/assets", upload.array("files"), assetsRouter);
v1Router.use("/dashboard", dashboardRouter);
v1Router.use("/storage", storageRouter);
v1Router.use("/logs", logsRouter);
// ARCHIVED: v1Router.use("/analytics", analyticsRouter); // Old A/B test analytics moved to variant system

// Mount versioned API
router.use("/v1", v1Router);

// Root API info
router.get("/", (_req, res) => {
    res.json({
        name: "New Life Nursery REST API",
        version: "1.0.0",
        endpoints: {
            v1: {
                health: "/api/rest/v1/health",
                csrfToken: "/api/rest/v1/csrf-token",
                auth: {
                    login: "/api/rest/v1/auth/login",
                    logout: "/api/rest/v1/auth/logout",
                    signup: "/api/rest/v1/auth/signup",
                    resetPassword: "/api/rest/v1/auth/reset-password",
                    requestPasswordChange: "/api/rest/v1/auth/request-password-change",
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
                    getByLabel: "/api/rest/v1/images?label=:label",
                    add: "/api/rest/v1/images",
                    update: "/api/rest/v1/images",
                },
                assets: {
                    read: "/api/rest/v1/assets/read",
                    write: "/api/rest/v1/assets/write",
                },
                dashboard: {
                    stats: "/api/rest/v1/dashboard/stats",
                },
                landingPage: "/api/rest/v1/landing-page",
                plants: "/api/rest/v1/plants",
            },
        },
    });
});

export default router;
