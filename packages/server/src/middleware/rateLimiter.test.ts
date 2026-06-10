import { REST_ROUTES } from "@local/shared";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { generalMutationApiLimiter, loginLimiter, publicReadApiLimiter } from "./rateLimiter.js";

describe("rate limiter middleware", () => {
    it("uses the public read policy for GET requests", async () => {
        const app = express();
        app.set("trust proxy", 1);
        app.use(REST_ROUTES.root, publicReadApiLimiter);
        app.use(REST_ROUTES.root, generalMutationApiLimiter);
        app.get(REST_ROUTES.images.root, (_req, res) => res.json({ ok: true }));

        const response = await request(app).get(REST_ROUTES.images.byLabel("gallery"));

        expect(response.status).toBe(200);
        expect(response.headers["ratelimit-limit"]).toBe("600");
    });

    it("uses the general mutation policy for non-auth state-changing requests", async () => {
        const app = express();
        app.set("trust proxy", 1);
        app.use(REST_ROUTES.root, publicReadApiLimiter);
        app.use(REST_ROUTES.root, generalMutationApiLimiter);
        app.post(REST_ROUTES.landingPage.root, (_req, res) => res.json({ ok: true }));

        const response = await request(app).post(REST_ROUTES.landingPage.root);

        expect(response.status).toBe(200);
        expect(response.headers["ratelimit-limit"]).toBe("100");
    });

    it("uses the strict login policy for credential login attempts", async () => {
        const app = express();
        app.set("trust proxy", 1);
        app.post(REST_ROUTES.auth.login, loginLimiter, (_req, res) => res.json({ ok: true }));

        const response = await request(app).post(REST_ROUTES.auth.login);

        expect(response.status).toBe(200);
        expect(response.headers["ratelimit-limit"]).toBe(
            process.env.NODE_ENV === "development" ? "20" : "5"
        );
    });
});
