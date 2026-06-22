import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import { Express } from "express";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import request from "supertest";
import { COOKIE, REST_ROUTES, TIME_MS } from "@local/shared";
import {
    createRestTestApp,
    createTestProjectDir,
    startPostgresTestDatabase,
    stopPostgresTestDatabase,
    truncatePublicTables,
} from "../__tests__/integrationUtils.js";

describe("Storage API Integration Tests", () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;
    let app: Express;
    let adminCookie: string;
    let userCookie: string;
    let testProject: ReturnType<typeof createTestProjectDir>;
    let imagesDir: string;

    const authCookie = (params: { customerId: string; roles: string[]; isAdmin: boolean }) => {
        const token = jwt.sign(
            {
                iat: Math.floor(Date.now() / 1000),
                iss: "https://test.example.com/",
                customerId: params.customerId,
                roles: params.roles,
                isCustomer: true,
                isAdmin: params.isAdmin,
                exp: Math.floor(Date.now() / 1000) + 3600,
            },
            process.env.JWT_SECRET ?? ""
        );

        return `${COOKIE.Jwt}=${token}`;
    };

    const writeImageFile = (fileName: string, content = "test-image-data") => {
        fs.mkdirSync(imagesDir, { recursive: true });
        fs.writeFileSync(path.join(imagesDir, fileName), content);
    };

    beforeAll(async () => {
        const database = await startPostgresTestDatabase("test_storage_db");
        container = database.container;
        prisma = database.prisma;
        process.env.JWT_SECRET = "test-jwt-secret-key";
        process.env.SITE_NAME = "test.example.com";

        testProject = createTestProjectDir("storage-api");
        process.env.PROJECT_DIR = testProject.projectDir;
        imagesDir = path.join(testProject.projectDir, "assets/images");
        fs.mkdirSync(imagesDir, { recursive: true });

        vi.resetModules();
        app = await createRestTestApp(prisma);
    }, 120000);

    afterAll(async () => {
        testProject?.cleanup();
        await stopPostgresTestDatabase(prisma, container);
    });

    beforeEach(async () => {
        await truncatePublicTables(prisma);
        fs.rmSync(imagesDir, { recursive: true, force: true });
        fs.mkdirSync(imagesDir, { recursive: true });

        const adminRole = await prisma.role.create({ data: { title: "Admin" } });
        const customerRole = await prisma.role.create({ data: { title: "Customer" } });
        const adminCustomer = await prisma.customer.create({
            data: {
                firstName: "Storage",
                lastName: "Admin",
                accountApproved: true,
                emailVerified: true,
                emails: { create: { emailAddress: "storage-admin@test.com" } },
                roles: { create: { roleId: adminRole.id } },
            },
        });
        const regularCustomer = await prisma.customer.create({
            data: {
                firstName: "Storage",
                lastName: "User",
                accountApproved: true,
                emailVerified: true,
                emails: { create: { emailAddress: "storage-user@test.com" } },
                roles: { create: { roleId: customerRole.id } },
            },
        });

        adminCookie = authCookie({
            customerId: adminCustomer.id,
            roles: ["admin"],
            isAdmin: true,
        });
        userCookie = authCookie({
            customerId: regularCustomer.id,
            roles: ["customer"],
            isAdmin: false,
        });
    });

    it("requires admin access for storage inspection and cleanup endpoints", async () => {
        await expect(request(app).get(REST_ROUTES.storage.cleanupPreview)).resolves.toHaveProperty(
            "status",
            401
        );
        await expect(
            request(app).get(REST_ROUTES.storage.cleanupHistory).set("Cookie", userCookie)
        ).resolves.toHaveProperty("status", 401);
        await expect(
            request(app).get(REST_ROUTES.storage.orphanedFiles).set("Cookie", userCookie)
        ).resolves.toHaveProperty("status", 401);
        await expect(
            request(app).delete(REST_ROUTES.storage.orphanedRecords).set("Cookie", userCookie)
        ).resolves.toHaveProperty("status", 401);
    });

    it("previews stale unlabeled images, orphaned files, and orphaned records", async () => {
        const staleDate = new Date(Date.now() - 45 * TIME_MS.Day);
        await prisma.image.create({
            data: {
                hash: "stale-unlabeled",
                alt: "Stale unlabeled",
                unlabeled_since: staleDate,
                files: {
                    create: {
                        src: "images/stale-unlabeled.jpg",
                        width: 10,
                        height: 10,
                    },
                },
            },
        });
        await prisma.image.create({
            data: {
                hash: "record-without-files",
                alt: "Record without files",
                unlabeled_since: staleDate,
            },
        });
        writeImageFile("stale-unlabeled.jpg", "stale");
        writeImageFile("orphaned-on-disk.jpg", "orphan");

        const response = await request(app)
            .get(REST_ROUTES.storage.cleanupPreview)
            .set("Cookie", adminCookie);

        expect(response.status).toBe(200);
        expect(response.body.unlabeledImages).toMatchObject({
            count: 2,
            ageBreakdown: {
                "30-60days": 2,
                "60-90days": 0,
                "90+days": 0,
            },
        });
        expect(response.body.unlabeledImages.samples).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    hash: "stale-unlabeled",
                    fileCount: 1,
                }),
                expect.objectContaining({
                    hash: "record-without-files",
                    fileCount: 0,
                }),
            ])
        );
        expect(response.body.orphanedFiles.count).toBe(1);
        expect(response.body.orphanedRecords.count).toBe(1);
    });

    it("lists and deletes orphaned files without deleting database-backed files", async () => {
        await prisma.image.create({
            data: {
                hash: "backed-image",
                alt: "Backed image",
                files: {
                    create: {
                        src: "images/backed-image.jpg",
                        width: 10,
                        height: 10,
                    },
                },
            },
        });
        writeImageFile("backed-image.jpg", "keep");
        writeImageFile("orphaned-on-disk.jpg", "delete");

        const listResponse = await request(app)
            .get(REST_ROUTES.storage.orphanedFiles)
            .set("Cookie", adminCookie);

        expect(listResponse.status).toBe(200);
        expect(listResponse.body).toMatchObject({
            totalCount: 1,
            orphanedFiles: [expect.objectContaining({ name: "orphaned-on-disk.jpg" })],
        });

        const deleteResponse = await request(app)
            .delete(REST_ROUTES.storage.orphanedFiles)
            .set("Cookie", adminCookie);

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body).toMatchObject({
            success: true,
            deletedCount: 1,
        });
        expect(fs.existsSync(path.join(imagesDir, "orphaned-on-disk.jpg"))).toBe(false);
        expect(fs.existsSync(path.join(imagesDir, "backed-image.jpg"))).toBe(true);
    });

    it("lists and deletes orphaned image records without deleting valid records", async () => {
        await prisma.image.create({
            data: {
                hash: "valid-image",
                alt: "Valid image",
                files: {
                    create: {
                        src: "images/valid-image.jpg",
                        width: 10,
                        height: 10,
                    },
                },
            },
        });
        await prisma.image.create({
            data: {
                hash: "missing-file-image",
                alt: "Missing file image",
                files: {
                    create: {
                        src: "images/missing-file-image.jpg",
                        width: 10,
                        height: 10,
                    },
                },
            },
        });
        await prisma.image.create({
            data: {
                hash: "no-file-records",
                alt: "No file records",
            },
        });
        writeImageFile("valid-image.jpg", "keep");

        const listResponse = await request(app)
            .get(REST_ROUTES.storage.orphanedRecords)
            .set("Cookie", adminCookie);

        expect(listResponse.status).toBe(200);
        expect(listResponse.body.totalCount).toBe(2);
        expect(listResponse.body.orphanedRecords).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ hash: "missing-file-image" }),
                expect.objectContaining({ hash: "no-file-records" }),
            ])
        );

        const deleteResponse = await request(app)
            .delete(REST_ROUTES.storage.orphanedRecords)
            .set("Cookie", adminCookie);

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body).toMatchObject({
            success: true,
            deletedCount: 2,
        });
        await expect(
            prisma.image.findUnique({ where: { hash: "valid-image" } })
        ).resolves.toBeTruthy();
        await expect(
            prisma.image.findUnique({ where: { hash: "missing-file-image" } })
        ).resolves.toBeNull();
        await expect(
            prisma.image.findUnique({ where: { hash: "no-file-records" } })
        ).resolves.toBeNull();
    });

    it("returns cleanup history with status filtering and pagination metadata", async () => {
        await prisma.cleanup_log.createMany({
            data: [
                {
                    type: "manual",
                    deleted_images: 1,
                    deleted_files: 2,
                    status: "success",
                    duration_ms: 100,
                },
                {
                    type: "scheduled",
                    deleted_images: 0,
                    deleted_files: 0,
                    status: "failed",
                    errors: JSON.stringify(["boom"]),
                    duration_ms: 50,
                },
            ],
        });

        const response = await request(app)
            .get(`${REST_ROUTES.storage.cleanupHistory}?status=success&limit=1&offset=0`)
            .set("Cookie", adminCookie);

        expect(response.status).toBe(200);
        expect(response.body.pagination).toMatchObject({
            total: 1,
            limit: 1,
            offset: 0,
            hasMore: false,
        });
        expect(response.body.history).toHaveLength(1);
        expect(response.body.history[0]).toMatchObject({
            type: "manual",
            status: "success",
            deleted_images: 1,
            deleted_files: 2,
        });
    });
});
