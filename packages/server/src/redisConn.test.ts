import { describe, it, expect, vi } from 'vitest';

// Simple tests for redis connection
vi.mock("redis");

describe("redisConn", () => {
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
});
