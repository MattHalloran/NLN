/**
 * Landing Page REST API Integration Tests
 *
 * Tests landing page CRUD endpoints with consolidated landing-page-content.json file system
 * These tests verify admin functionality for managing hero banners, seasonal content, and contact info
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import express, { Express } from "express";
import request from "supertest";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { REST_ROUTES } from "@local/shared";
import * as auth from "../auth.js";
import {
    mockHeroBanners,
    mockHeroSettings,
    mockSeasonalPlants,
    mockPlantTips,
    mockUpdateData,
    mockContactInfoUpdate,
} from "../__tests__/fixtures/landingPage.js";
import {
    createTestProjectDir,
    startPostgresTestDatabase,
    stopPostgresTestDatabase,
} from "../__tests__/integrationUtils.js";
import { invalidateCache } from "./landingPage/landingPageCache.js";

describe("Landing Page API Integration Tests", () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;
    let app: Express;
    let adminCookie: string;
    let userCookie: string;
    let testProject: ReturnType<typeof createTestProjectDir>;
    let landingPageFile: string;

    beforeAll(async () => {
        testProject = createTestProjectDir("nln-landing-page-integration");
        landingPageFile = join(testProject.dataDir, "landing-page-content.json");

        const database = await startPostgresTestDatabase("test_landing_page_db");
        container = database.container;
        prisma = database.prisma;
        process.env.JWT_SECRET = "test-jwt-secret-key";
        process.env.SITE_NAME = "test.example.com";
        process.env.PROJECT_DIR = testProject.projectDir;

        // Clean up seed data
        await prisma.customer_roles.deleteMany();
        await prisma.email.deleteMany();
        await prisma.phone.deleteMany();
        await prisma.customer.deleteMany();
        await prisma.role.deleteMany();

        await Promise.all(
            [
                { hash: "test-hero-1-hash", src: "images/test-hero-1.jpg" },
                { hash: "test-hero-2-hash", src: "images/test-hero-2.jpg" },
                { hash: "test-hero-3-hash", src: "images/test-hero-3.jpg" },
                { hash: "updated-hero-hash", src: "images/updated.jpg" },
            ].map((image) =>
                prisma.image.create({
                    data: {
                        hash: image.hash,
                        alt: image.src,
                        files: {
                            create: {
                                src: image.src,
                                width: 1920,
                                height: 1080,
                            },
                        },
                    },
                })
            )
        );

        // Create test roles
        const adminRole = await prisma.role.create({
            data: {
                title: "Admin",
            },
        });

        // Create admin user
        const hashedPassword = await bcrypt.hash("admin123", 10);
        const adminCustomer = await prisma.customer.create({
            data: {
                firstName: "Admin",
                lastName: "User",
                accountApproved: true,
                password: hashedPassword,
                emails: {
                    create: {
                        emailAddress: "admin@test.com",
                    },
                },
            },
        });

        await prisma.customer_roles.create({
            data: {
                customerId: adminCustomer.id,
                roleId: adminRole.id,
            },
        });

        // Create regular user
        await prisma.customer.create({
            data: {
                firstName: "Regular",
                lastName: "User",
                accountApproved: true,
                password: hashedPassword,
                emails: {
                    create: {
                        emailAddress: "user@test.com",
                    },
                },
            },
        });

        // Setup Express app
        const { default: restRouter } = await import("./index.js");
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));
        app.use(cookieParser(process.env.JWT_SECRET));
        // Attach TEST prisma instance, not the global one
        app.use((req: any, _res, next) => {
            req.prisma = prisma; // Use test prisma instance
            next();
        });
        app.use(auth.authenticate);
        app.use(REST_ROUTES.root, restRouter);

        // Login as admin and get cookie
        const adminLoginRes = await request(app)
            .post(REST_ROUTES.auth.login)
            .send({ email: "admin@test.com", password: "admin123" });

        adminCookie = adminLoginRes.headers["set-cookie"][0];

        // Login as regular user and get cookie
        const userLoginRes = await request(app)
            .post(REST_ROUTES.auth.login)
            .send({ email: "user@test.com", password: "admin123" });

        userCookie = userLoginRes.headers["set-cookie"][0];
    }, 120000);

    afterAll(async () => {
        await stopPostgresTestDatabase(prisma, container);
        testProject?.cleanup();
    });

    beforeEach(async () => {
        await invalidateCache();

        // Reset landing page content to initial test state with new consolidated structure
        const testContent = {
            metadata: {
                version: "2.0",
                lastUpdated: new Date().toISOString(),
            },
            content: {
                hero: {
                    banners: mockHeroBanners,
                    settings: mockHeroSettings,
                    text: {
                        title: "Test Hero",
                        subtitle: "Test Subtitle",
                        description: "Test Description",
                        businessHours: "",
                        trustBadges: [],
                        buttons: [],
                    },
                },
                services: { title: "", subtitle: "", items: [] },
                seasonal: {
                    plants: mockSeasonalPlants,
                    tips: mockPlantTips,
                },
                newsletter: { title: "", description: "", disclaimer: "", isActive: false },
                company: { foundedYear: 2000, description: "" },
            },
            contact: {
                name: "Test Nursery",
                address: { street: "", city: "", state: "", zip: "", full: "", googleMapsUrl: "" },
                phone: { display: "", link: "" },
                email: { address: "", link: "" },
                socialMedia: {},
                hours: {
                    monday: "",
                    tuesday: "",
                    wednesday: "",
                    thursday: "",
                    friday: "",
                    saturday: "",
                    sunday: "",
                },
            },
            theme: {
                colors: {
                    light: { primary: "", secondary: "", accent: "", background: "", paper: "" },
                    dark: { primary: "", secondary: "", accent: "", background: "", paper: "" },
                },
                features: {
                    showSeasonalContent: true,
                    showNewsletter: true,
                    showSocialProof: true,
                    enableAnimations: true,
                },
            },
            layout: { sections: [] },
            experiments: { tests: [] },
        };
        writeFileSync(landingPageFile, JSON.stringify(testContent, null, 2), "utf8");
        await invalidateCache();
    });

    describe("GET /api/rest/v1/landing-page", () => {
        it("should return all landing page content", async () => {
            const res = await request(app).get(`${REST_ROUTES.landingPage.root}?abTest=false`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("metadata");
            expect(res.body).toHaveProperty("content");
            expect(res.body.content).toHaveProperty("hero");
            expect(res.body.content.hero).toHaveProperty("banners");
            expect(res.body.content.hero).toHaveProperty("settings");
            expect(res.body.content).toHaveProperty("seasonal");
            expect(res.body.content.seasonal).toHaveProperty("plants");
            expect(res.body.content.seasonal).toHaveProperty("tips");
        });

        it("should return only active content by default", async () => {
            const res = await request(app).get(`${REST_ROUTES.landingPage.root}?abTest=false`);

            expect(res.status).toBe(200);

            // Should only include active banners
            const activeBanners = res.body.content.hero.banners;
            expect(activeBanners.length).toBe(2); // Only 2 active banners in mock data
            expect(activeBanners.every((b: any) => b.isActive)).toBe(true);

            // Should only include active plants
            const activePlants = res.body.content.seasonal.plants;
            expect(activePlants.length).toBe(2);
            expect(activePlants.every((p: any) => p.isActive)).toBe(true);

            // Should only include active tips
            const activeTips = res.body.content.seasonal.tips;
            expect(activeTips.length).toBe(2);
            expect(activeTips.every((t: any) => t.isActive)).toBe(true);
        });

        it("should return all content when onlyActive=false", async () => {
            const res = await request(app).get(
                `${REST_ROUTES.landingPage.root}?onlyActive=false&abTest=false`
            );

            expect(res.status).toBe(200);

            // Should include all banners (including inactive)
            expect(res.body.content.hero.banners.length).toBe(3);

            // Should include all plants (including inactive)
            expect(res.body.content.seasonal.plants.length).toBe(3);

            // Should include all tips (including inactive)
            expect(res.body.content.seasonal.tips.length).toBe(3);
        });

        it("should sort content by displayOrder", async () => {
            const res = await request(app).get(
                `${REST_ROUTES.landingPage.root}?onlyActive=false&abTest=false`
            );

            expect(res.status).toBe(200);

            // Check hero banners are sorted
            const banners = res.body.content.hero.banners;
            for (let i = 0; i < banners.length - 1; i++) {
                expect(banners[i].displayOrder).toBeLessThanOrEqual(banners[i + 1].displayOrder);
            }

            // Check plants are sorted
            const plants = res.body.content.seasonal.plants;
            for (let i = 0; i < plants.length - 1; i++) {
                expect(plants[i].displayOrder).toBeLessThanOrEqual(plants[i + 1].displayOrder);
            }
        });

        it("should set proper cache headers", async () => {
            const res = await request(app).get(`${REST_ROUTES.landingPage.root}?abTest=false`);

            expect(res.status).toBe(200);
            expect(res.headers["cache-control"]).toContain("public");
            expect(res.headers).toHaveProperty("etag");
            expect(res.headers).toHaveProperty("last-modified");
        });
    });

    describe("PUT /api/rest/v1/landing-page", () => {
        it("should require admin authentication", async () => {
            const res = await request(app).put(REST_ROUTES.landingPage.root).send(mockUpdateData);

            expect(res.status).toBe(403);
        });

        it("should reject non-admin users", async () => {
            const res = await request(app)
                .put(REST_ROUTES.landingPage.root)
                .set("Cookie", userCookie)
                .send(mockUpdateData);

            expect(res.status).toBe(403);
        });

        it("should update hero banners successfully", async () => {
            const res = await request(app)
                .put(REST_ROUTES.landingPage.root)
                .set("Cookie", adminCookie)
                .send(mockUpdateData);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.updatedSections).toContain("heroBanners");

            // Verify file was updated in consolidated structure
            const fileContent = JSON.parse(readFileSync(landingPageFile, "utf8"));
            expect(fileContent.content.hero.banners).toEqual(mockUpdateData.heroBanners);
            expect(fileContent.content.hero.settings).toEqual(mockUpdateData.heroSettings);
        });

        it("should update only hero settings without changing banners", async () => {
            const newSettings = {
                autoPlay: false,
                autoPlayDelay: 10000,
                showDots: false,
                showArrows: false,
                fadeTransition: true,
            };

            const res = await request(app)
                .put(REST_ROUTES.landingPage.root)
                .set("Cookie", adminCookie)
                .send({ heroSettings: newSettings });

            expect(res.status).toBe(200);
            expect(res.body.updatedSections).toContain("heroSettings");

            // Verify settings were updated but banners remained the same
            const fileContent = JSON.parse(readFileSync(landingPageFile, "utf8"));
            expect(fileContent.content.hero.settings).toEqual(newSettings);
            expect(fileContent.content.hero.banners).toEqual(mockHeroBanners); // Should be unchanged
        });

        it("should update seasonal plants successfully", async () => {
            const newPlants = [
                {
                    id: "new-plant",
                    name: "New Test Plant",
                    description: "Updated plant data",
                    season: "Winter",
                    careLevel: "Easy",
                    icon: "star",
                    displayOrder: 1,
                    isActive: true,
                },
            ];

            const res = await request(app)
                .put(REST_ROUTES.landingPage.root)
                .set("Cookie", adminCookie)
                .send({ seasonalPlants: newPlants });

            expect(res.status).toBe(200);
            expect(res.body.updatedSections).toContain("seasonalPlants");

            // Verify file was updated in consolidated structure
            const fileContent = JSON.parse(readFileSync(landingPageFile, "utf8"));
            expect(fileContent.content.seasonal.plants).toEqual(newPlants);
        });

        it("should update plant tips successfully", async () => {
            const newTips = [
                {
                    id: "new-tip",
                    title: "New Test Tip",
                    description: "Updated tip data",
                    category: "Pruning",
                    season: "Summer",
                    displayOrder: 1,
                    isActive: true,
                },
            ];

            const res = await request(app)
                .put(REST_ROUTES.landingPage.root)
                .set("Cookie", adminCookie)
                .send({ plantTips: newTips });

            expect(res.status).toBe(200);
            expect(res.body.updatedSections).toContain("plantTips");

            // Verify file was updated in consolidated structure
            const fileContent = JSON.parse(readFileSync(landingPageFile, "utf8"));
            expect(fileContent.content.seasonal.tips).toEqual(newTips);
        });

        it("should update multiple sections at once", async () => {
            const multiUpdate = {
                heroBanners: mockUpdateData.heroBanners,
                heroSettings: mockUpdateData.heroSettings,
                seasonalPlants: mockSeasonalPlants,
                plantTips: mockPlantTips,
            };

            const res = await request(app)
                .put(REST_ROUTES.landingPage.root)
                .set("Cookie", adminCookie)
                .send(multiUpdate);

            expect(res.status).toBe(200);
            expect(res.body.updatedSections).toContain("heroBanners");
            expect(res.body.updatedSections).toContain("seasonalPlants");
            expect(res.body.updatedSections).toContain("plantTips");
        });

        it("should return error when no valid sections provided", async () => {
            const res = await request(app)
                .put(REST_ROUTES.landingPage.root)
                .set("Cookie", adminCookie)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toContain("No valid content sections provided");
        });
    });

    describe("PUT /api/rest/v1/landing-page/contact-info", () => {
        it("should require admin authentication", async () => {
            const res = await request(app)
                .put(REST_ROUTES.landingPage.contactInfo)
                .send(mockContactInfoUpdate);

            expect(res.status).toBe(403);
        });

        it("should update business hours successfully", async () => {
            const res = await request(app)
                .put(REST_ROUTES.landingPage.contactInfo)
                .set("Cookie", adminCookie)
                .send(mockContactInfoUpdate);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.updated.hours).toBe(true);

            // Verify hours were updated in the consolidated landing-page-content.json
            const fileContent = JSON.parse(readFileSync(landingPageFile, "utf8"));
            expect(fileContent.contact.hours).toBe(mockContactInfoUpdate.hours);
        });

        it("should return error when neither business nor hours provided", async () => {
            const res = await request(app)
                .put(REST_ROUTES.landingPage.contactInfo)
                .set("Cookie", adminCookie)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toContain("Either business or hours data must be provided");
        });
    });

    describe("POST /api/rest/v1/landing-page/invalidate-cache", () => {
        it("should require admin authentication", async () => {
            const res = await request(app).post(REST_ROUTES.landingPage.invalidateCache);

            expect(res.status).toBe(403);
        });

        it("should invalidate cache successfully for admin", async () => {
            const res = await request(app)
                .post(REST_ROUTES.landingPage.invalidateCache)
                .set("Cookie", adminCookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain("Cache invalidated successfully");
        });

        it("should reject non-admin users", async () => {
            const res = await request(app)
                .post(REST_ROUTES.landingPage.invalidateCache)
                .set("Cookie", userCookie);

            expect(res.status).toBe(403);
        });
    });

    describe("Cache Behavior", () => {
        it("should serve from cache on subsequent requests", async () => {
            // First request - cache miss
            const res1 = await request(app).get(`${REST_ROUTES.landingPage.root}?abTest=false`);
            expect(res1.status).toBe(200);
            const etag1 = res1.headers["etag"];

            // Second request - cache hit (should have same ETag)
            const res2 = await request(app).get(`${REST_ROUTES.landingPage.root}?abTest=false`);
            expect(res2.status).toBe(200);
            const etag2 = res2.headers["etag"];

            expect(etag1).toBe(etag2);
        });

        it("should invalidate cache after content update", async () => {
            // Get initial content (with onlyActive=false to get all items including inactive)
            const res1 = await request(app).get(
                `${REST_ROUTES.landingPage.root}?abTest=false&onlyActive=false`
            );
            const content1 = res1.body;

            expect(res1.status).toBe(200);
            expect(content1.content.hero.banners).toMatchObject(mockHeroBanners);

            // Update content
            const updateRes = await request(app)
                .put(REST_ROUTES.landingPage.root)
                .set("Cookie", adminCookie)
                .send(mockUpdateData);

            expect(updateRes.status).toBe(200);

            // Get content again - should reflect the update (cache was invalidated)
            const res2 = await request(app).get(
                `${REST_ROUTES.landingPage.root}?abTest=false&onlyActive=false`
            );
            const content2 = res2.body;

            expect(res2.status).toBe(200);
            // Content should be different (updated hero banners)
            expect(content2.content.hero.banners).toMatchObject(mockUpdateData.heroBanners);
            expect(content2.content.hero.banners).not.toEqual(content1.content.hero.banners);
            // Metadata should have a newer lastUpdated timestamp
            expect(content2.metadata.lastUpdated).not.toBe(content1.metadata.lastUpdated);
        });
    });

    describe("Error Handling", () => {
        it("should handle invalid JSON in request body", async () => {
            const res = await request(app)
                .put(REST_ROUTES.landingPage.root)
                .set("Cookie", adminCookie)
                .set("Content-Type", "application/json")
                .send("{ invalid json }");

            expect(res.status).toBe(400);
        });
    });
});
