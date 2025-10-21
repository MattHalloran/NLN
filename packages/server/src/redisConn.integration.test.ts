/**
 * Redis integration tests using Testcontainers
 *
 * Tests Redis connection and operations against a real Redis instance
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { createClient, RedisClientType } from "redis";

describe("Redis Integration Tests", () => {
    let container: StartedTestContainer;
    let redisClient: RedisClientType;
    let connectionUrl: string;

    beforeAll(async () => {
        // Start Redis container
        container = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();

        const host = container.getHost();
        const port = container.getMappedPort(6379);
        connectionUrl = `redis://${host}:${port}`;

        console.log("Test Redis started:", connectionUrl);

        // Create Redis client
        redisClient = createClient({ url: connectionUrl });
        await redisClient.connect();
    }, 60000); // 60 second timeout

    afterAll(async () => {
        if (redisClient) {
            await redisClient.quit();
        }
        if (container) {
            await container.stop();
            console.log("Test Redis stopped");
        }
    });

    beforeEach(async () => {
        // Clean up Redis between tests
        await redisClient.flushAll();
    });

    describe("Connection Tests", () => {
        it("should have a valid connection URL", () => {
            expect(connectionUrl).toBeDefined();
            expect(connectionUrl).toContain("redis://");
        });

        it("should be able to connect to Redis", async () => {
            const pong = await redisClient.ping();
            expect(pong).toBe("PONG");
        });

        it("should be able to get container info", () => {
            const host = container.getHost();
            const port = container.getMappedPort(6379);

            expect(host).toBeDefined();
            expect(port).toBeGreaterThan(0);
        });
    });

    describe("String Operations", () => {
        it("should set and get a string value", async () => {
            await redisClient.set("test:key", "test value");
            const value = await redisClient.get("test:key");
            expect(value).toBe("test value");
        });

        it("should set value with expiration", async () => {
            await redisClient.set("test:expiring", "expires soon", { EX: 2 });
            let value = await redisClient.get("test:expiring");
            expect(value).toBe("expires soon");

            // Wait for expiration (add buffer for timing)
            await new Promise((resolve) => setTimeout(resolve, 2200));
            value = await redisClient.get("test:expiring");
            expect(value).toBeNull();
        });

        it("should delete a key", async () => {
            await redisClient.set("test:delete", "will be deleted");
            let value = await redisClient.get("test:delete");
            expect(value).toBe("will be deleted");

            await redisClient.del("test:delete");
            value = await redisClient.get("test:delete");
            expect(value).toBeNull();
        });

        it("should increment a counter", async () => {
            await redisClient.set("test:counter", "5");
            const result = await redisClient.incr("test:counter");
            expect(result).toBe(6);

            const value = await redisClient.get("test:counter");
            expect(value).toBe("6");
        });

        it("should handle multiple keys", async () => {
            await redisClient.mSet({
                "test:key1": "value1",
                "test:key2": "value2",
                "test:key3": "value3",
            });

            const values = await redisClient.mGet(["test:key1", "test:key2", "test:key3"]);
            expect(values).toEqual(["value1", "value2", "value3"]);
        });
    });

    describe("Hash Operations", () => {
        it("should set and get hash fields", async () => {
            await redisClient.hSet("test:user:1", {
                name: "John Doe",
                email: "john@example.com",
                age: "30",
            });

            const name = await redisClient.hGet("test:user:1", "name");
            expect(name).toBe("John Doe");

            const allFields = await redisClient.hGetAll("test:user:1");
            expect(allFields).toEqual({
                name: "John Doe",
                email: "john@example.com",
                age: "30",
            });
        });

        it("should check if hash field exists", async () => {
            await redisClient.hSet("test:hash", "field1", "value1");

            const exists = await redisClient.hExists("test:hash", "field1");
            expect(exists).toBe(true);

            const notExists = await redisClient.hExists("test:hash", "field2");
            expect(notExists).toBe(false);
        });

        it("should delete hash field", async () => {
            await redisClient.hSet("test:hash", {
                field1: "value1",
                field2: "value2",
            });

            await redisClient.hDel("test:hash", "field1");

            const exists = await redisClient.hExists("test:hash", "field1");
            expect(exists).toBe(false);

            const field2 = await redisClient.hGet("test:hash", "field2");
            expect(field2).toBe("value2");
        });
    });

    describe("List Operations", () => {
        it("should push and pop from list", async () => {
            await redisClient.rPush("test:list", ["item1", "item2", "item3"]);

            const length = await redisClient.lLen("test:list");
            expect(length).toBe(3);

            const item = await redisClient.lPop("test:list");
            expect(item).toBe("item1");

            const remaining = await redisClient.lLen("test:list");
            expect(remaining).toBe(2);
        });

        it("should get range from list", async () => {
            await redisClient.rPush("test:list", ["a", "b", "c", "d", "e"]);

            const range = await redisClient.lRange("test:list", 1, 3);
            expect(range).toEqual(["b", "c", "d"]);
        });

        it("should trim list", async () => {
            await redisClient.rPush("test:list", ["1", "2", "3", "4", "5"]);
            await redisClient.lTrim("test:list", 0, 2);

            const items = await redisClient.lRange("test:list", 0, -1);
            expect(items).toEqual(["1", "2", "3"]);
        });
    });

    describe("Set Operations", () => {
        it("should add and check members in set", async () => {
            await redisClient.sAdd("test:set", ["member1", "member2", "member3"]);

            const isMember = await redisClient.sIsMember("test:set", "member1");
            expect(isMember).toBe(true);

            const notMember = await redisClient.sIsMember("test:set", "member4");
            expect(notMember).toBe(false);
        });

        it("should get all members of set", async () => {
            await redisClient.sAdd("test:set", ["a", "b", "c"]);

            const members = await redisClient.sMembers("test:set");
            expect(members).toHaveLength(3);
            expect(members).toContain("a");
            expect(members).toContain("b");
            expect(members).toContain("c");
        });

        it("should remove member from set", async () => {
            await redisClient.sAdd("test:set", ["x", "y", "z"]);
            await redisClient.sRem("test:set", "y");

            const members = await redisClient.sMembers("test:set");
            expect(members).toHaveLength(2);
            expect(members).not.toContain("y");
        });

        it("should get set cardinality", async () => {
            await redisClient.sAdd("test:set", ["1", "2", "3", "4"]);

            const count = await redisClient.sCard("test:set");
            expect(count).toBe(4);
        });
    });

    describe("Sorted Set Operations", () => {
        it("should add and get members with scores", async () => {
            await redisClient.zAdd("test:leaderboard", [
                { score: 100, value: "player1" },
                { score: 200, value: "player2" },
                { score: 150, value: "player3" },
            ]);

            const rank = await redisClient.zRank("test:leaderboard", "player2");
            expect(rank).toBe(2); // Highest score, 0-indexed

            const score = await redisClient.zScore("test:leaderboard", "player2");
            expect(score).toBe(200);
        });

        it("should get range by score", async () => {
            await redisClient.zAdd("test:scores", [
                { score: 50, value: "low" },
                { score: 100, value: "medium" },
                { score: 200, value: "high" },
            ]);

            const range = await redisClient.zRangeByScore("test:scores", 50, 150);
            expect(range).toEqual(["low", "medium"]);
        });

        it("should increment score", async () => {
            await redisClient.zAdd("test:scores", { score: 10, value: "item" });

            const newScore = await redisClient.zIncrBy("test:scores", 5, "item");
            expect(newScore).toBe(15);
        });
    });

    describe("Key Operations", () => {
        it("should check key existence", async () => {
            await redisClient.set("test:exists", "value");

            const exists = await redisClient.exists("test:exists");
            expect(exists).toBe(1);

            const notExists = await redisClient.exists("test:notexists");
            expect(notExists).toBe(0);
        });

        it("should get all keys matching pattern", async () => {
            await redisClient.set("user:1", "john");
            await redisClient.set("user:2", "jane");
            await redisClient.set("product:1", "laptop");

            const userKeys = await redisClient.keys("user:*");
            expect(userKeys).toHaveLength(2);
            expect(userKeys).toContain("user:1");
            expect(userKeys).toContain("user:2");
        });

        it("should set TTL on key", async () => {
            await redisClient.set("test:ttl", "value");
            await redisClient.expire("test:ttl", 10);

            const ttl = await redisClient.ttl("test:ttl");
            expect(ttl).toBeGreaterThan(0);
            expect(ttl).toBeLessThanOrEqual(10);
        });
    });

    describe("Session Storage Simulation", () => {
        it("should store and retrieve session data", async () => {
            const sessionId = "session:user:123";
            const sessionData = {
                userId: "123",
                username: "testuser",
                email: "test@example.com",
                loginTime: Date.now().toString(),
            };

            // Store session
            await redisClient.hSet(sessionId, sessionData);
            await redisClient.expire(sessionId, 3600); // 1 hour expiration

            // Retrieve session
            const retrieved = await redisClient.hGetAll(sessionId);
            expect(retrieved).toEqual(sessionData);

            // Update session field
            await redisClient.hSet(sessionId, "lastActivity", Date.now().toString());

            const updated = await redisClient.hGet(sessionId, "lastActivity");
            expect(updated).toBeDefined();
        });
    });

    describe("Cache Simulation", () => {
        it("should cache and retrieve data with TTL", async () => {
            const cacheKey = "cache:plants:featured";
            const cacheData = JSON.stringify([
                { id: "1", name: "Rose" },
                { id: "2", name: "Lavender" },
            ]);

            // Cache data with 5 second TTL
            await redisClient.set(cacheKey, cacheData, { EX: 5 });

            // Retrieve from cache
            const cached = await redisClient.get(cacheKey);
            expect(cached).toBe(cacheData);

            const parsed = JSON.parse(cached!);
            expect(parsed).toHaveLength(2);
            expect(parsed[0].name).toBe("Rose");
        });

        it("should invalidate cache", async () => {
            await redisClient.set("cache:data", "old data");

            // Invalidate cache
            await redisClient.del("cache:data");

            const value = await redisClient.get("cache:data");
            expect(value).toBeNull();
        });
    });

    describe("Queue Simulation", () => {
        it("should simulate job queue with list", async () => {
            const queueName = "queue:email";

            // Add jobs to queue
            await redisClient.rPush(queueName, [
                JSON.stringify({ id: "1", to: "user1@example.com", subject: "Welcome" }),
                JSON.stringify({ id: "2", to: "user2@example.com", subject: "Reset Password" }),
            ]);

            // Get queue length
            const length = await redisClient.lLen(queueName);
            expect(length).toBe(2);

            // Process job (pop from queue)
            const job = await redisClient.lPop(queueName);
            expect(job).toBeDefined();

            const jobData = JSON.parse(job!);
            expect(jobData.to).toBe("user1@example.com");

            // Remaining jobs
            const remaining = await redisClient.lLen(queueName);
            expect(remaining).toBe(1);
        });
    });

    describe("Rate Limiting Simulation", () => {
        it("should implement simple rate limiting", async () => {
            const userId = "user:123";
            const rateLimitKey = `ratelimit:${userId}`;
            const maxRequests = 5;
            const windowSeconds = 10;

            // Track requests
            for (let i = 0; i < 3; i++) {
                await redisClient.incr(rateLimitKey);
            }

            // Set expiration on first request
            await redisClient.expire(rateLimitKey, windowSeconds);

            const requests = await redisClient.get(rateLimitKey);
            expect(parseInt(requests!)).toBe(3);
            expect(parseInt(requests!)).toBeLessThanOrEqual(maxRequests);

            // Add more requests
            await redisClient.incr(rateLimitKey);
            await redisClient.incr(rateLimitKey);

            const totalRequests = await redisClient.get(rateLimitKey);
            expect(parseInt(totalRequests!)).toBe(5);

            // Check if rate limit exceeded
            const currentCount = parseInt((await redisClient.get(rateLimitKey))!);
            const isRateLimited = currentCount >= maxRequests;
            expect(isRateLimited).toBe(true);
        });
    });

    describe("Error Handling", () => {
        it("should handle non-existent keys gracefully", async () => {
            const value = await redisClient.get("nonexistent:key");
            expect(value).toBeNull();
        });

        it("should handle invalid operations", async () => {
            await redisClient.set("test:string", "value");

            // Try to use string as list
            await expect(redisClient.lPush("test:string", "item")).rejects.toThrow();
        });
    });
});
