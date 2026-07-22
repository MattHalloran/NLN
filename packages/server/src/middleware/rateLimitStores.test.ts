import { REST_ROUTES } from "@local/shared";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createRateLimiters } from "./rateLimiter.js";
import {
    createRedisRateLimitStore,
    RedisRateLimitStore,
    type RateLimitStoreFactory,
} from "./rateLimitStores.js";

class FakeRedisRateLimitClient {
    private readonly values = new Map<string, { value: number; expiresAt: number | null }>();

    async get(key: string): Promise<string | null> {
        this.expireIfNeeded(key);
        const entry = this.values.get(key);
        return entry ? String(entry.value) : null;
    }

    async incr(key: string): Promise<number> {
        this.expireIfNeeded(key);
        const entry = this.values.get(key) ?? { value: 0, expiresAt: null };
        entry.value += 1;
        this.values.set(key, entry);
        return entry.value;
    }

    async decr(key: string): Promise<number> {
        this.expireIfNeeded(key);
        const entry = this.values.get(key) ?? { value: 0, expiresAt: null };
        entry.value = Math.max(0, entry.value - 1);
        this.values.set(key, entry);
        return entry.value;
    }

    async del(key: string): Promise<number> {
        return this.values.delete(key) ? 1 : 0;
    }

    async pExpire(key: string, milliseconds: number): Promise<boolean> {
        const entry = this.values.get(key);
        if (!entry) {
            return false;
        }
        entry.expiresAt = Date.now() + milliseconds;
        return true;
    }

    async pTTL(key: string): Promise<number> {
        this.expireIfNeeded(key);
        const entry = this.values.get(key);
        if (!entry) {
            return -2;
        }
        if (!entry.expiresAt) {
            return -1;
        }
        return Math.max(0, entry.expiresAt - Date.now());
    }

    getRaw(key: string): { value: number; expiresAt: number | null } | undefined {
        this.expireIfNeeded(key);
        return this.values.get(key);
    }

    private expireIfNeeded(key: string): void {
        const entry = this.values.get(key);
        if (entry?.expiresAt && entry.expiresAt <= Date.now()) {
            this.values.delete(key);
        }
    }
}

function createFakeRedisStoreFactory(client: FakeRedisRateLimitClient): RateLimitStoreFactory {
    return ({ id, windowMs }) =>
        createRedisRateLimitStore({
            id,
            windowMs,
            getClient: async () => client,
        });
}

describe("rate limit stores", () => {
    it("increments Redis-backed counters with explicit limiter prefixes and TTLs", async () => {
        const client = new FakeRedisRateLimitClient();
        const store = new RedisRateLimitStore({
            id: "login",
            windowMs: 15_000,
            getClient: async () => client,
        });

        const first = await store.increment("203.0.113.50");
        const second = await store.increment("203.0.113.50");

        expect(first.totalHits).toBe(1);
        expect(second.totalHits).toBe(2);
        expect(client.getRaw("rl:login:203.0.113.50")?.value).toBe(2);
        expect(await client.pTTL("rl:login:203.0.113.50")).toBeGreaterThan(0);
    });

    it("isolates counters by limiter prefix even for the same client identity", async () => {
        const client = new FakeRedisRateLimitClient();
        const loginStore = createRedisRateLimitStore({
            id: "login",
            windowMs: 15_000,
            getClient: async () => client,
        });
        const signupStore = createRedisRateLimitStore({
            id: "signup",
            windowMs: 60_000,
            getClient: async () => client,
        });

        await loginStore.increment("203.0.113.51");
        await loginStore.increment("203.0.113.51");
        await signupStore.increment("203.0.113.51");

        expect(client.getRaw("rl:login:203.0.113.51")?.value).toBe(2);
        expect(client.getRaw("rl:signup:203.0.113.51")?.value).toBe(1);
    });

    it("shares Redis-backed counters across recreated app instances", async () => {
        const client = new FakeRedisRateLimitClient();
        const storeFactory = createFakeRedisStoreFactory(client);
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
            .set("X-Forwarded-For", "203.0.113.52");
        const secondResponse = await request(secondApp)
            .get(REST_ROUTES.images.root)
            .set("X-Forwarded-For", "203.0.113.52");

        expect(firstResponse.status).toBe(200);
        expect(secondResponse.status).toBe(200);
        expect(firstResponse.headers["ratelimit-remaining"]).toBe("599");
        expect(secondResponse.headers["ratelimit-remaining"]).toBe("598");
        expect(client.getRaw("rl:public-read:203.0.113.52")?.value).toBe(2);
    });
});
