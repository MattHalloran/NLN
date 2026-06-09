import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { generalMutationApiLimiter, loginLimiter, publicReadApiLimiter } from "./rateLimiter.js";

describe("rate limiter middleware", () => {
    it("uses the public read policy for GET requests", async () => {
        const app = express();
        app.set("trust proxy", 1);
        app.use("/api/rest", publicReadApiLimiter);
        app.use("/api/rest", generalMutationApiLimiter);
        app.get("/api/rest/v1/images", (_req, res) => res.json({ ok: true }));

        const response = await request(app).get("/api/rest/v1/images?label=gallery");

        expect(response.status).toBe(200);
        expect(response.headers["ratelimit-limit"]).toBe("600");
    });

    it("uses the general mutation policy for non-auth state-changing requests", async () => {
        const app = express();
        app.set("trust proxy", 1);
        app.use("/api/rest", publicReadApiLimiter);
        app.use("/api/rest", generalMutationApiLimiter);
        app.post("/api/rest/v1/landing-page", (_req, res) => res.json({ ok: true }));

        const response = await request(app).post("/api/rest/v1/landing-page");

        expect(response.status).toBe(200);
        expect(response.headers["ratelimit-limit"]).toBe("100");
    });

    it("uses the strict login policy for credential login attempts", async () => {
        const app = express();
        app.set("trust proxy", 1);
        app.post("/api/rest/v1/auth/login", loginLimiter, (_req, res) => res.json({ ok: true }));

        const response = await request(app).post("/api/rest/v1/auth/login");

        expect(response.status).toBe(200);
        expect(response.headers["ratelimit-limit"]).toBe(
            process.env.NODE_ENV === "development" ? "20" : "5"
        );
    });
});
