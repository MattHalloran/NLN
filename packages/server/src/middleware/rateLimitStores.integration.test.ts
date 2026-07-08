import { REST_ROUTES } from "@local/shared";
import express from "express";
import request from "supertest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { createClient, type RedisClientType } from "redis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createRateLimiters } from "./rateLimiter.js";
import { createRedisRateLimitStore, type RateLimitStoreFactory } from "./rateLimitStores.js";

describe("Redis-backed rate limit stores", () => {
    let container: StartedTestContainer;
    let redisClient: RedisClientType;

    beforeAll(async () => {
        container = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();
        redisClient = createClient({
            url: `redis://${container.getHost()}:${container.getMappedPort(6379)}`,
        });
        await redisClient.connect();
    }, 60_000);

    afterAll(async () => {
        if (redisClient?.isOpen) {
            await redisClient.quit();
        }

        if (container) {
            await container.stop();
        }
    });

    beforeEach(async () => {
        await redisClient.flushAll();
    });

    function createStoreFactory(): RateLimitStoreFactory {
        return ({ id, windowMs }) =>
            createRedisRateLimitStore({
                id,
                windowMs,
                getClient: async () => redisClient,
            });
    }

    it("uses real Redis TTLs and expires counters after the limiter window", async () => {
        const store = createRedisRateLimitStore({
            id: "login",
            windowMs: 200,
            getClient: async () => redisClient,
        });

        const first = await store.increment("203.0.113.70");
        const ttl = await redisClient.pTTL("rl:login:203.0.113.70");

        expect(first.totalHits).toBe(1);
        expect(ttl).toBeGreaterThan(0);
        expect(ttl).toBeLessThanOrEqual(200);

        await new Promise((resolve) => setTimeout(resolve, 260));

        expect(await store.get?.("203.0.113.70")).toBeUndefined();
    });

    it("shares counters across recreated limiter sets backed by the same Redis instance", async () => {
        const storeFactory = createStoreFactory();
        const firstLimiters = createRateLimiters({ storeFactory });
        const secondLimiters = createRateLimiters({ storeFactory });

        const firstApp = express();
        firstApp.set("trust proxy", 1);
        firstApp.use(REST_ROUTES.root, firstLimiters.publicReadApiLimiter);
        firstApp.get(REST_ROUTES.images.root, (_req, res) => res.json({ ok: true }));

        const secondApp = express();
        secondApp.set("trust proxy", 1);
        secondApp.use(REST_ROUTES.root, secondLimiters.publicReadApiLimiter);
        secondApp.get(REST_ROUTES.images.root, (_req, res) => res.json({ ok: true }));

        const firstResponse = await request(firstApp)
            .get(REST_ROUTES.images.root)
            .set("X-Forwarded-For", "203.0.113.71");
        const secondResponse = await request(secondApp)
            .get(REST_ROUTES.images.root)
            .set("X-Forwarded-For", "203.0.113.71");

        expect(firstResponse.status).toBe(200);
        expect(secondResponse.status).toBe(200);
        expect(firstResponse.headers["ratelimit-remaining"]).toBe("599");
        expect(secondResponse.headers["ratelimit-remaining"]).toBe("598");
        expect(await redisClient.get("rl:public-read:203.0.113.71")).toBe("2");
    });
});
