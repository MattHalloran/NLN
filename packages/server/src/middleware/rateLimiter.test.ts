import { IMAGE_LABELS, REST_ROUTES } from "@local/shared";
import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createRateLimiters } from "./rateLimiter.js";
import type { RateLimitStoreFactory } from "./rateLimitStores.js";

const throwingStoreFactory: RateLimitStoreFactory = () => ({
    localKeys: false,
    async increment() {
        throw new Error("redis unavailable");
    },
    async decrement() {
        throw new Error("redis unavailable");
    },
    async resetKey() {
        throw new Error("redis unavailable");
    },
});

describe("rate limiter middleware", () => {
    afterEach(() => {
        delete process.env.E2E_DISABLE_RATE_LIMITS;
    });

    it("uses the public read policy for GET requests", async () => {
        const limiters = createRateLimiters();
        const app = express();
        app.set("trust proxy", 1);
        app.use(REST_ROUTES.root, limiters.publicReadApiLimiter);
        app.use(REST_ROUTES.root, limiters.generalMutationApiLimiter);
        app.get(REST_ROUTES.images.root, (_req, res) => res.json({ ok: true }));

        const response = await request(app).get(REST_ROUTES.images.byLabel(IMAGE_LABELS.Gallery));

        expect(response.status).toBe(200);
        expect(response.headers["ratelimit-limit"]).toBe("600");
    });

    it("uses the general mutation policy for non-auth state-changing requests", async () => {
        const limiters = createRateLimiters();
        const app = express();
        app.set("trust proxy", 1);
        app.use(REST_ROUTES.root, limiters.publicReadApiLimiter);
        app.use(REST_ROUTES.root, limiters.generalMutationApiLimiter);
        app.post(REST_ROUTES.landingPage.root, (_req, res) => res.json({ ok: true }));

        const response = await request(app).post(REST_ROUTES.landingPage.root);

        expect(response.status).toBe(200);
        expect(response.headers["ratelimit-limit"]).toBe("100");
    });

    it("uses the strict login policy for credential login attempts", async () => {
        const limiters = createRateLimiters();
        const app = express();
        app.set("trust proxy", 1);
        app.post(REST_ROUTES.auth.login, limiters.loginLimiter, (_req, res) =>
            res.json({ ok: true })
        );

        const response = await request(app).post(REST_ROUTES.auth.login);

        expect(response.status).toBe(200);
        expect(response.headers["ratelimit-limit"]).toBe(
            process.env.NODE_ENV === "development" ? "20" : "5"
        );
    });

    it("can disable rate limiters for managed E2E server runs", async () => {
        process.env.E2E_DISABLE_RATE_LIMITS = "true";

        const limiters = createRateLimiters();
        const app = express();
        app.set("trust proxy", 1);
        app.use(REST_ROUTES.root, limiters.publicReadApiLimiter);
        app.get(REST_ROUTES.images.root, (_req, res) => res.json({ ok: true }));

        const response = await request(app).get(REST_ROUTES.images.byLabel(IMAGE_LABELS.Gallery));

        expect(response.status).toBe(200);
        expect(response.headers["ratelimit-limit"]).toBeUndefined();
    });

    it("keeps independent read buckets for different forwarded test-net client IPs", async () => {
        const limiters = createRateLimiters();
        const app = express();
        app.set("trust proxy", 1);
        app.use(REST_ROUTES.root, limiters.publicReadApiLimiter);
        app.get(REST_ROUTES.images.root, (_req, res) => res.json({ ok: true }));

        const firstClientFirstRequest = await request(app)
            .get(REST_ROUTES.images.root)
            .set("X-Forwarded-For", "203.0.113.20");
        const firstClientSecondRequest = await request(app)
            .get(REST_ROUTES.images.root)
            .set("X-Forwarded-For", "203.0.113.20");
        const secondClientFirstRequest = await request(app)
            .get(REST_ROUTES.images.root)
            .set("X-Forwarded-For", "203.0.113.21");

        expect(firstClientFirstRequest.status).toBe(200);
        expect(firstClientSecondRequest.status).toBe(200);
        expect(secondClientFirstRequest.status).toBe(200);
        expect(firstClientFirstRequest.headers["ratelimit-remaining"]).toBe("599");
        expect(firstClientSecondRequest.headers["ratelimit-remaining"]).toBe("598");
        expect(secondClientFirstRequest.headers["ratelimit-remaining"]).toBe("599");
    });

    it("documents shared buckets when forwarded test-net IPs are not trusted", async () => {
        const limiters = createRateLimiters();
        const app = express();
        app.set("trust proxy", false);
        app.use(REST_ROUTES.root, limiters.publicReadApiLimiter);
        app.get(REST_ROUTES.images.root, (_req, res) => res.json({ ok: true }));

        const firstForwardedClient = await request(app)
            .get(REST_ROUTES.images.root)
            .set("X-Forwarded-For", "203.0.113.30");
        const secondForwardedClient = await request(app)
            .get(REST_ROUTES.images.root)
            .set("X-Forwarded-For", "203.0.113.31");

        expect(firstForwardedClient.status).toBe(200);
        expect(secondForwardedClient.status).toBe(200);
        expect(Number(secondForwardedClient.headers["ratelimit-remaining"])).toBe(
            Number(firstForwardedClient.headers["ratelimit-remaining"]) - 1
        );
    });

    it("creates isolated limiter instances for local tests", async () => {
        const firstLimiters = createRateLimiters();
        const secondLimiters = createRateLimiters();

        const firstApp = express();
        firstApp.set("trust proxy", 1);
        firstApp.use(REST_ROUTES.root, firstLimiters.publicReadApiLimiter);
        firstApp.get(REST_ROUTES.images.root, (_req, res) => res.json({ ok: true }));

        const secondApp = express();
        secondApp.set("trust proxy", 1);
        secondApp.use(REST_ROUTES.root, secondLimiters.publicReadApiLimiter);
        secondApp.get(REST_ROUTES.images.root, (_req, res) => res.json({ ok: true }));

        const firstAppFirstRequest = await request(firstApp)
            .get(REST_ROUTES.images.root)
            .set("X-Forwarded-For", "203.0.113.40");
        const firstAppSecondRequest = await request(firstApp)
            .get(REST_ROUTES.images.root)
            .set("X-Forwarded-For", "203.0.113.40");
        const secondAppFirstRequest = await request(secondApp)
            .get(REST_ROUTES.images.root)
            .set("X-Forwarded-For", "203.0.113.40");

        expect(firstAppFirstRequest.headers["ratelimit-remaining"]).toBe("599");
        expect(firstAppSecondRequest.headers["ratelimit-remaining"]).toBe("598");
        expect(secondAppFirstRequest.headers["ratelimit-remaining"]).toBe("599");
    });

    it.each([
        {
            name: "public read",
            method: "get" as const,
            path: REST_ROUTES.images.root,
            mount: (app: express.Express, limiters: ReturnType<typeof createRateLimiters>) => {
                app.use(REST_ROUTES.root, limiters.publicReadApiLimiter);
                app.get(REST_ROUTES.images.root, (_req, res) => res.json({ ok: true }));
            },
        },
        {
            name: "general mutation",
            method: "post" as const,
            path: REST_ROUTES.landingPage.root,
            mount: (app: express.Express, limiters: ReturnType<typeof createRateLimiters>) => {
                app.use(REST_ROUTES.root, limiters.generalMutationApiLimiter);
                app.post(REST_ROUTES.landingPage.root, (_req, res) => res.json({ ok: true }));
            },
        },
        {
            name: "newsletter subscribe",
            method: "post" as const,
            path: REST_ROUTES.newsletter.subscribe,
            mount: (app: express.Express, limiters: ReturnType<typeof createRateLimiters>) => {
                app.post(
                    REST_ROUTES.newsletter.subscribe,
                    limiters.newsletterSubscribeLimiter,
                    (_req, res) => res.json({ ok: true })
                );
            },
        },
    ])("fails open for $name limits when the shared store is unavailable", async (scenario) => {
        const limiters = createRateLimiters({ storeFactory: throwingStoreFactory });
        const app = express();
        app.set("trust proxy", 1);
        scenario.mount(app, limiters);

        const response = await request(app)[scenario.method](scenario.path);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ ok: true });
    });

    it.each([
        {
            name: "login",
            path: REST_ROUTES.auth.login,
            mount: (app: express.Express, limiters: ReturnType<typeof createRateLimiters>) => {
                app.post(REST_ROUTES.auth.login, limiters.loginLimiter, (_req, res) =>
                    res.json({ ok: true })
                );
            },
        },
        {
            name: "password reset",
            path: REST_ROUTES.auth.requestPasswordChange,
            mount: (app: express.Express, limiters: ReturnType<typeof createRateLimiters>) => {
                app.post(
                    REST_ROUTES.auth.requestPasswordChange,
                    limiters.passwordResetLimiter,
                    (_req, res) => res.json({ ok: true })
                );
            },
        },
        {
            name: "signup",
            path: REST_ROUTES.auth.signup,
            mount: (app: express.Express, limiters: ReturnType<typeof createRateLimiters>) => {
                app.post(REST_ROUTES.auth.signup, limiters.signupLimiter, (_req, res) =>
                    res.json({ ok: true })
                );
            },
        },
        {
            name: "image upload request",
            path: REST_ROUTES.images.root,
            mount: (app: express.Express, limiters: ReturnType<typeof createRateLimiters>) => {
                app.post(REST_ROUTES.images.root, limiters.imageUploadLimiter, (_req, res) =>
                    res.json({ ok: true })
                );
            },
        },
    ])("fails closed for $name limits when the shared store is unavailable", async (scenario) => {
        const limiters = createRateLimiters({ storeFactory: throwingStoreFactory });
        const app = express();
        app.set("trust proxy", 1);
        scenario.mount(app, limiters);
        app.use(
            (
                error: Error,
                _req: express.Request,
                res: express.Response,
                _next: express.NextFunction
            ) => {
                res.status(503).json({ error: error.message });
            }
        );

        const response = await request(app).post(scenario.path);

        expect(response.status).toBe(503);
        expect(response.body.error).toContain("redis unavailable");
    });
});
