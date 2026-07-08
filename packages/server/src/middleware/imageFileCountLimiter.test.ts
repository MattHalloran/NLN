import express, { type RequestHandler } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createImageFileCountLimiter } from "./rateLimiter.js";

class FakeRedis {
    values = new Map<string, number>();
    ttls = new Map<string, number>();
    failDecrBy = false;

    async sendCommand<T = number>(args: string[]): Promise<T> {
        const [command, key, amount] = args;
        if (!key || !amount) {
            throw new Error("Invalid Redis command");
        }

        const delta = Number.parseInt(amount, 10);
        const current = this.values.get(key) ?? 0;

        if (command === "INCRBY") {
            const next = current + delta;
            this.values.set(key, next);
            return next as T;
        }

        if (command === "DECRBY") {
            if (this.failDecrBy) {
                throw new Error("rollback unavailable");
            }
            const next = Math.max(0, current - delta);
            this.values.set(key, next);
            return next as T;
        }

        throw new Error(`Unsupported Redis command: ${command}`);
    }

    async ttl(key: string): Promise<number> {
        return this.ttls.has(key) ? this.ttls.get(key)! : -1;
    }

    async pExpire(key: string, milliseconds: number): Promise<boolean> {
        this.ttls.set(key, Math.ceil(milliseconds / 1000));
        return true;
    }

    reset(): void {
        this.values.clear();
        this.ttls.clear();
        this.failDecrBy = false;
    }
}

const redisClient = new FakeRedis();

function createAppWithFiles(
    fileCount: number,
    options: Parameters<typeof createImageFileCountLimiter>[0] = {}
) {
    const app = express();
    const attachFiles: RequestHandler = (req, _res, next) => {
        (req as unknown as { files?: Express.Multer.File[] }).files = Array.from(
            { length: fileCount },
            () => ({ fieldname: "files" }) as Express.Multer.File
        );
        next();
    };

    app.set("trust proxy", 1);
    app.post(
        "/upload",
        attachFiles,
        createImageFileCountLimiter({
            getRedisClient: async () => redisClient,
            ...options,
        }),
        (_req, res) => {
            res.json({ ok: true });
        }
    );

    return app;
}

describe("image file-count rate limiter", () => {
    beforeEach(() => {
        redisClient.reset();
    });

    it("uses the shared rate-limit Redis key namespace and forwarded client identity", async () => {
        const response = await request(createAppWithFiles(2))
            .post("/upload")
            .set("X-Forwarded-For", "203.0.113.60");

        expect(response.status).toBe(200);
        expect(redisClient.values.get("rl:image-file-count:203.0.113.60")).toBe(2);
        expect(redisClient.ttls.get("rl:image-file-count:203.0.113.60")).toBe(900);
    });

    it("rolls back attempted files when the file-count limit is exceeded", async () => {
        redisClient.values.set("rl:image-file-count:203.0.113.61", 99);
        redisClient.ttls.set("rl:image-file-count:203.0.113.61", 900);

        const response = await request(createAppWithFiles(2))
            .post("/upload")
            .set("X-Forwarded-For", "203.0.113.61");

        expect(response.status).toBe(429);
        expect(response.body).toMatchObject({
            currentCount: 99,
            attemptedFiles: 2,
            maxFiles: 100,
        });
        expect(redisClient.values.get("rl:image-file-count:203.0.113.61")).toBe(99);
    });

    it("fails open when Redis is unavailable after multipart parsing", async () => {
        const response = await request(
            createAppWithFiles(2, {
                getRedisClient: async () => {
                    throw new Error("redis unavailable");
                },
            })
        )
            .post("/upload")
            .set("X-Forwarded-For", "203.0.113.62");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ ok: true });
    });

    it("still blocks an over-limit request if rollback fails after increment", async () => {
        redisClient.values.set("rl:image-file-count:203.0.113.63", 99);
        redisClient.ttls.set("rl:image-file-count:203.0.113.63", 900);
        redisClient.failDecrBy = true;

        const response = await request(createAppWithFiles(2))
            .post("/upload")
            .set("X-Forwarded-For", "203.0.113.63");

        expect(response.status).toBe(429);
        expect(response.body).toMatchObject({
            currentCount: 99,
            attemptedFiles: 2,
            maxFiles: 100,
        });
        expect(redisClient.values.get("rl:image-file-count:203.0.113.63")).toBe(101);
    });
});
