import { beforeEach, describe, it, expect, vi } from "vitest";
import { createClient } from "redis";
import { createMockRedisClient } from "./__mocks__/redis.js";

vi.mock("redis");

describe("redisConn", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
        process.env.REDIS_CONN = "redis:6380";
    });

    it("should parse REDIS_CONN environment variable", () => {
        const redisConn = process.env.REDIS_CONN || "redis:6380";
        const [host, port] = redisConn.split(":");

        expect(host).toBeDefined();
        expect(port).toBeDefined();
        expect(Number(port)).not.toBeNaN();
    });

    it("should have default redis connection string", () => {
        const defaultConn = "redis:6380";
        const [host, port] = defaultConn.split(":");

        expect(host).toBe("redis");
        expect(port).toBe("6380");
    });

    it("should create redis URL from host and port", () => {
        const host = "redis";
        const port = 6380;
        const url = `redis://${host}:${port}`;

        expect(url).toBe("redis://redis:6380");
    });

    it("should reuse one redis client until it is closed", async () => {
        const firstClient = createMockRedisClient();
        vi.mocked(createClient).mockReturnValueOnce(firstClient as never);

        const { initializeRedis } = await import("./redisConn.js");

        const redisA = await initializeRedis();
        const redisB = await initializeRedis();

        expect(redisA).toBe(firstClient);
        expect(redisB).toBe(firstClient);
        expect(createClient).toHaveBeenCalledTimes(1);
        expect(firstClient.connect).toHaveBeenCalledTimes(1);
    });

    it("should quit the open redis client during shutdown", async () => {
        const firstClient = createMockRedisClient();
        const secondClient = createMockRedisClient();
        vi.mocked(createClient)
            .mockReturnValueOnce(firstClient as never)
            .mockReturnValueOnce(secondClient as never);

        const { closeRedis, initializeRedis } = await import("./redisConn.js");

        await initializeRedis();
        await closeRedis();
        const nextClient = await initializeRedis();

        expect(firstClient.quit).toHaveBeenCalledTimes(1);
        expect(nextClient).toBe(secondClient);
        expect(createClient).toHaveBeenCalledTimes(2);
    });

    it("should clear a closed redis client without calling quit", async () => {
        const closedClient = createMockRedisClient();
        closedClient.isOpen = false;
        vi.mocked(createClient).mockReturnValueOnce(closedClient as never);

        const { closeRedis, initializeRedis } = await import("./redisConn.js");

        await initializeRedis();
        await closeRedis();
        await closeRedis();

        expect(closedClient.quit).not.toHaveBeenCalled();
    });
});
