import { beforeEach, describe, expect, it, vi } from "vitest";
import { LANDING_PAGE_CACHE_KEY } from "../../config/paths.js";
import { getCachedContent, invalidateCache, setCachedContent } from "./landingPageCache.js";
import type { LandingPageContent } from "../../types/landingPage.js";

const redisMock = vi.hoisted(() => ({
    failConnect: false,
    store: new Map<string, string>(),
}));

vi.mock("../../redisConn.js", () => ({
    initializeRedis: async () => {
        if (redisMock.failConnect) {
            throw new Error("Redis unavailable");
        }

        return {
            get: async (key: string) => redisMock.store.get(key) ?? null,
            setEx: async (_key: string, _ttl: number, value: string) => {
                redisMock.store.set(_key, value);
            },
            del: async (key: string) => {
                redisMock.store.delete(key);
            },
        };
    },
}));

const content = {
    metadata: {
        version: "2.0",
        lastUpdated: "2026-01-01T00:00:00.000Z",
    },
    content: {
        hero: {
            banners: [],
            settings: {},
            text: {},
        },
    },
} as unknown as LandingPageContent;

describe("landing page cache", () => {
    beforeEach(() => {
        redisMock.failConnect = false;
        redisMock.store.clear();
    });

    it("stores and reads cached content", async () => {
        await setCachedContent(content);

        await expect(getCachedContent()).resolves.toEqual(content);
    });

    it("returns null when no cached content exists", async () => {
        await expect(getCachedContent()).resolves.toBeNull();
    });

    it("invalidates cached content", async () => {
        redisMock.store.set(LANDING_PAGE_CACHE_KEY, JSON.stringify(content));

        await invalidateCache();

        await expect(getCachedContent()).resolves.toBeNull();
    });

    it("handles Redis failures without throwing", async () => {
        redisMock.failConnect = true;

        await expect(getCachedContent()).resolves.toBeNull();
        await expect(setCachedContent(content)).resolves.toBeUndefined();
        await expect(invalidateCache()).resolves.toBeUndefined();
    });
});
