import { Router } from "express";
import landingPageRouter from "./landingPage.js";
import plantsRouter from "./plants.js";

const router = Router();

// API versioning
const v1Router = Router();

// Health check for REST API
v1Router.get("/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Mount route handlers
v1Router.use("/landing-page", landingPageRouter);
v1Router.use("/plants", plantsRouter);

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
                landingPage: "/api/rest/v1/landing-page",
                plants: "/api/rest/v1/plants",
            },
        },
    });
});

export default router;
