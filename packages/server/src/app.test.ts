import { REST_ROUTES } from "@local/shared";
import type { RequestHandler } from "express";
import type { RateLimitRequestHandler } from "express-rate-limit";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { getClientIdentity, getClientRateLimitKey } from "./middleware/clientIdentity.js";
import type { RateLimiters } from "./middleware/rateLimiter.js";

const passThrough = Object.assign(
    ((_req, _res, next) => {
        next();
    }) as RequestHandler,
    {
        getKey: () => undefined,
        resetKey: () => undefined,
    }
) as RateLimitRequestHandler;

const rateLimitHandler = (handler: RequestHandler): RateLimitRequestHandler =>
    Object.assign(handler, {
        getKey: () => undefined,
        resetKey: () => undefined,
    }) as RateLimitRequestHandler;

function createInjectedLimiters(overrides: Partial<RateLimiters> = {}): RateLimiters {
    return {
        publicReadApiLimiter: passThrough,
        generalMutationApiLimiter: passThrough,
        loginLimiter: passThrough,
        passwordResetLimiter: passThrough,
        signupLimiter: passThrough,
        imageUploadLimiter: passThrough,
        newsletterSubscribeLimiter: passThrough,
        imageFileCountLimiter: passThrough,
        ...overrides,
    };
}

const testEnv = {
    APP_RUNTIME: "development",
    JWT_SECRET: "test-secret",
    SERVER_LOCATION: "local",
    TRUST_PROXY_HOPS: "1",
};

describe("createApp", () => {
    it("configures trust proxy before REST rate limiters read the client identity", async () => {
        const observedIps: Array<string | undefined> = [];
        const app = createApp({
            env: testEnv,
            rateLimiterDeps: {
                getKey: (req) => {
                    observedIps.push(getClientIdentity(req).ip);
                    return getClientRateLimitKey(req);
                },
            },
        });

        const response = await request(app)
            .get(REST_ROUTES.health)
            .set("X-Forwarded-For", "203.0.113.10");

        expect(response.status).toBe(200);
        expect(observedIps).toContain("203.0.113.10");
    });

    it("uses injected app dependencies without starting production side effects", async () => {
        const order: string[] = [];
        const app = createApp({
            env: testEnv,
            attachPrismaMiddleware: (_req, _res, next) => {
                order.push("prisma");
                next();
            },
            authenticateMiddleware: (_req, _res, next) => {
                order.push("auth");
                next();
            },
            csrfProtectionMiddleware: (_req, _res, next) => {
                order.push("csrf");
                next();
            },
            limiters: createInjectedLimiters({
                publicReadApiLimiter: rateLimitHandler((_req, _res, next) => {
                    order.push("public-read");
                    next();
                }),
                generalMutationApiLimiter: rateLimitHandler((_req, _res, next) => {
                    order.push("general-mutation");
                    next();
                }),
            }),
        });

        const response = await request(app).get(REST_ROUTES.health);

        expect(response.status).toBe(200);
        expect(order).toEqual(["prisma", "auth", "public-read", "general-mutation", "csrf"]);
    });
});
