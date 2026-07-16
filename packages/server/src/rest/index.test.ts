import { REST_RESOURCE, REST_ROUTES, REST_VERSION_PREFIX, UPLOAD_LIMITS } from "@local/shared";
import express, { type Request, type RequestHandler } from "express";
import fs from "fs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createRestApiInfo } from "./apiInfo.js";
import { createRestRouter, createUploadFilesMiddleware } from "./index.js";
import type { RateLimiters } from "../middleware/rateLimiter.js";
import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";

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

describe("REST API manifest", () => {
    it("documents the shared routes exposed by the versioned REST API", () => {
        expect(createRestApiInfo()).toMatchObject({
            name: "New Life Nursery REST API",
            version: "1.0.0",
            endpoints: {
                v1: {
                    health: REST_ROUTES.health,
                    csrfToken: REST_ROUTES.csrfToken,
                    auth: {
                        login: REST_ROUTES.auth.login,
                        session: REST_ROUTES.auth.session,
                    },
                    landingPage: {
                        root: REST_ROUTES.landingPage.root,
                        contactInfo: REST_ROUTES.landingPage.contactInfo,
                        variants: REST_ROUTES.landingPage.variants,
                    },
                    storage: {
                        stats: REST_ROUTES.storage.stats,
                        cleanupPreview: REST_ROUTES.storage.cleanupPreview,
                        orphanedFiles: REST_ROUTES.storage.orphanedFiles,
                    },
                    logs: {
                        root: REST_ROUTES.logs.root,
                        stats: REST_ROUTES.logs.stats,
                    },
                    newsletter: {
                        subscribe: REST_ROUTES.newsletter.subscribe,
                        subscribers: REST_ROUTES.newsletter.subscribers,
                        subscribersExport: REST_ROUTES.newsletter.subscribersExport,
                    },
                },
            },
        });
    });

    it("runs the image upload request limiter before multipart parsing", async () => {
        const uploadFilesMiddleware: RequestHandler = (_req, _res, next) => {
            next(new Error("upload parser should not run for rate-limited requests"));
        };
        const imageUploadRequestLimiter: RequestHandler = (_req, res) => {
            res.status(429).json({ error: "limited" });
        };
        const app = express();

        app.use(
            createRestRouter({
                uploadFilesMiddleware,
                imageUploadRequestLimiter,
            })
        );

        const response = await request(app).post(`${REST_VERSION_PREFIX}${REST_RESOURCE.Images}`);

        expect(response.status).toBe(429);
        expect(response.body).toEqual({ error: "limited" });
    });

    it("wires injected auth route limiters into a fresh router instance", async () => {
        const app = express();
        app.use(
            createRestRouter({
                limiters: createInjectedLimiters({
                    signupLimiter: rateLimitHandler((_req, res) => {
                        res.status(429).json({ error: "signup limited" });
                    }),
                }),
            })
        );

        const response = await request(app).post(
            `${REST_VERSION_PREFIX}${REST_RESOURCE.Auth}/signup`
        );

        expect(response.status).toBe(429);
        expect(response.body).toEqual({ error: "signup limited" });
    });

    it("wires injected newsletter route limiters into a fresh router instance", async () => {
        const app = express();
        app.use(
            createRestRouter({
                limiters: createInjectedLimiters({
                    newsletterSubscribeLimiter: rateLimitHandler((_req, res) => {
                        res.status(429).json({ error: "newsletter limited" });
                    }),
                }),
            })
        );

        const response = await request(app).post(
            `${REST_VERSION_PREFIX}${REST_RESOURCE.Newsletter}/subscribe`
        );

        expect(response.status).toBe(429);
        expect(response.body).toEqual({ error: "newsletter limited" });
    });

    it("wires injected image file-count limiters after upload parsing", async () => {
        const uploadFilesMiddleware: RequestHandler = (req, _res, next) => {
            (req as unknown as { files?: Express.Multer.File[] }).files = [
                { fieldname: "files" } as Express.Multer.File,
            ];
            next();
        };
        const app = express();
        app.use(
            createRestRouter({
                uploadFilesMiddleware,
                limiters: createInjectedLimiters({
                    imageFileCountLimiter: (_req, res) => {
                        res.status(429).json({ error: "file count limited" });
                    },
                }),
            })
        );

        const response = await request(app).post(`${REST_VERSION_PREFIX}${REST_RESOURCE.Images}`);

        expect(response.status).toBe(429);
        expect(response.body).toEqual({ error: "file count limited" });
    });

    it("serves root and versioned health endpoints from a fresh router instance", async () => {
        const app = express();
        app.use(createRestRouter());

        const [root, health] = await Promise.all([
            request(app).get("/"),
            request(app).get(`${REST_VERSION_PREFIX}${REST_RESOURCE.Health}`),
        ]);

        expect(root.status).toBe(200);
        expect(root.body.name).toBe("New Life Nursery REST API");
        expect(health.status).toBe(200);
        expect(health.body.status).toBe("healthy");
    });

    it("creates a disk-backed upload middleware for local parser-order tests", async () => {
        const app = express();
        app.use(rateLimit({ windowMs: 60_000, max: 10_000 }));
        app.post("/upload", createUploadFilesMiddleware(), (req: Request, res) => {
            const files = (req as Request & { files?: Express.Multer.File[] }).files ?? [];
            for (const file of files) {
                fs.unlinkSync(file.path);
            }
            res.json({
                count: files.length,
                fieldname: files[0]?.fieldname,
                storedNameIncludesOriginalName: files[0]?.filename.includes("sample.txt"),
            });
        });

        const response = await request(app)
            .post("/upload")
            .attach("files", Buffer.from("sample"), "sample.txt");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            count: 1,
            fieldname: "files",
            storedNameIncludesOriginalName: true,
        });
    });

    it("rejects uploads that exceed the multipart file-count limit before image processing", async () => {
        const app = express();
        app.post("/upload", createUploadFilesMiddleware(), (_req, res) => {
            res.json({ reachedHandler: true });
        });
        app.use(
            (
                error: Error & { code?: string },
                _req: Request,
                res: express.Response,
                _next: express.NextFunction
            ) => {
                res.status(400).json({ code: error.code, message: error.message });
            }
        );

        const upload = request(app).post("/upload");
        for (let index = 0; index < UPLOAD_LIMITS.maxImageFilesPerRequest + 1; index += 1) {
            upload.attach("files", Buffer.from(`sample-${index}`), `sample-${index}.txt`);
        }

        const response = await upload;

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({ code: "LIMIT_FILE_COUNT" });
        expect(response.body.reachedHandler).toBeUndefined();
    });

    it("rejects uploads that exceed the multipart text-field limit", async () => {
        const app = express();
        app.post("/upload", createUploadFilesMiddleware(), (_req, res) => {
            res.json({ reachedHandler: true });
        });
        app.use(
            (
                error: Error & { code?: string },
                _req: Request,
                res: express.Response,
                _next: express.NextFunction
            ) => {
                res.status(400).json({ code: error.code, message: error.message });
            }
        );

        let upload = request(app)
            .post("/upload")
            .attach("files", Buffer.from("sample"), "sample.txt");
        for (let index = 0; index < UPLOAD_LIMITS.maxUploadTextFieldsPerRequest + 1; index += 1) {
            upload = upload.field(`field-${index}`, `value-${index}`);
        }

        const response = await upload;

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({ code: "LIMIT_FIELD_COUNT" });
        expect(response.body.reachedHandler).toBeUndefined();
    });
});
