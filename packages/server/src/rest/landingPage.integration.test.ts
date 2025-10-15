/**
 * Landing Page REST API Integration Tests
 *
 * Tests landing page CRUD endpoints with file system operations
 * These tests verify admin functionality for managing hero banners, seasonal content, and contact info
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import express, { Express } from "express";
import request from "supertest";
import bcrypt from "bcrypt";
import { exec } from "child_process";
import { promisify } from "util";
import cookieParser from "cookie-parser";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import restRouter from "./index.js";
import * as auth from "../auth.js";
import {
    mockHeroBanners,
    mockHeroSettings,
    mockSeasonalPlants,
    mockPlantTips,
    mockUpdateData,
    mockContactInfoUpdate,
} from "../__tests__/fixtures/landingPage.js";

const execAsync = promisify(exec);

describe("Landing Page API Integration Tests", () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;
    let app: Express;
    let connectionString: string;
    let adminCookie: string;
    let userCookie: string;

    // File paths
    const DATA_PATH = join(__dirname, "../data");
    const ASSETS_PATH = join(process.cwd(), "../../assets/public");
    const HERO_BANNERS_FILE = join(DATA_PATH, "hero-banners.json");
    const SEASONAL_PLANTS_FILE = join(DATA_PATH, "seasonal-plants.json");
    const PLANT_TIPS_FILE = join(DATA_PATH, "plant-tips.json");
    const BUSINESS_FILE = join(ASSETS_PATH, "business.json");
    const HOURS_FILE = join(ASSETS_PATH, "hours.md");

    // Backup original files
    let originalHeroBanners: string;
    let originalSeasonalPlants: string;
    let originalPlantTips: string;
    let originalBusinessInfo: string;
    let originalHours: string;

    beforeAll(async () => {
        // Start PostgreSQL container
        container = await new PostgreSqlContainer("postgres:16-alpine")
            .withDatabase("test_landing_page_db")
            .withUsername("test_user")
            .withPassword("test_password")
            .withReuse(false)
            .start();

        connectionString = container.getConnectionUri();
        process.env.DB_URL = connectionString;
        process.env.JWT_SECRET = "test-jwt-secret-key";
        process.env.SITE_NAME = "test.example.com";
        process.env.PROJECT_DIR = join(process.cwd(), "../../");

        // Initialize Prisma client
        prisma = new PrismaClient({
            datasources: {
                db: {
                    url: connectionString,
                },
            },
        });

        // Run migrations
        await execAsync(`DATABASE_URL="${connectionString}" npx prisma migrate deploy`, {
            cwd: "/root/NLN/packages/server",
        });

        await prisma.$connect();

        // Clean up seed data
        await prisma.customer_roles.deleteMany();
        await prisma.customer.deleteMany();
        await prisma.role.deleteMany();

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
                name: "Admin User",
                emails: ["admin@test.com"],
                accountApproved: true,
                password: hashedPassword,
            },
        });

        await prisma.customer_roles.create({
            data: {
                customerId: adminCustomer.id,
                roleId: adminRole.id,
            },
        });

        // Create regular user
        const userCustomer = await prisma.customer.create({
            data: {
                name: "Regular User",
                emails: ["user@test.com"],
                accountApproved: true,
                password: hashedPassword,
            },
        });

        // Setup Express app
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: false }));
        app.use(cookieParser(process.env.JWT_SECRET));
        app.use(auth.attachPrisma);
        app.use(auth.authenticate);
        app.use("/api/rest", restRouter);

        // Login as admin and get cookie
        const adminLoginRes = await request(app)
            .post("/api/rest/v1/auth/login")
            .send({ email: "admin@test.com", password: "admin123" });

        adminCookie = adminLoginRes.headers["set-cookie"][0];

        // Login as regular user and get cookie
        const userLoginRes = await request(app)
            .post("/api/rest/v1/auth/login")
            .send({ email: "user@test.com", password: "admin123" });

        userCookie = userLoginRes.headers["set-cookie"][0];

        // Backup original data files (if they exist)
        if (existsSync(HERO_BANNERS_FILE)) {
            originalHeroBanners = readFileSync(HERO_BANNERS_FILE, "utf8");
        }
        if (existsSync(SEASONAL_PLANTS_FILE)) {
            originalSeasonalPlants = readFileSync(SEASONAL_PLANTS_FILE, "utf8");
        }
        if (existsSync(PLANT_TIPS_FILE)) {
            originalPlantTips = readFileSync(PLANT_TIPS_FILE, "utf8");
        }
        if (existsSync(BUSINESS_FILE)) {
            originalBusinessInfo = readFileSync(BUSINESS_FILE, "utf8");
        }
        if (existsSync(HOURS_FILE)) {
            originalHours = readFileSync(HOURS_FILE, "utf8");
        }
    }, 120000);

    afterAll(async () => {
        // Restore original files
        if (originalHeroBanners) {
            writeFileSync(HERO_BANNERS_FILE, originalHeroBanners, "utf8");
        }
        if (originalSeasonalPlants) {
            writeFileSync(SEASONAL_PLANTS_FILE, originalSeasonalPlants, "utf8");
        }
        if (originalPlantTips) {
            writeFileSync(PLANT_TIPS_FILE, originalPlantTips, "utf8");
        }
        if (originalBusinessInfo) {
            writeFileSync(BUSINESS_FILE, originalBusinessInfo, "utf8");
        }
        if (originalHours) {
            writeFileSync(HOURS_FILE, originalHours, "utf8");
        }

        await prisma.$disconnect();
        if (container) {
            await container.stop();
        }
    });

    beforeEach(async () => {
        // Reset data files to initial test state
        writeFileSync(
            HERO_BANNERS_FILE,
            JSON.stringify({ banners: mockHeroBanners, settings: mockHeroSettings }, null, 2),
            "utf8"
        );
        writeFileSync(
            SEASONAL_PLANTS_FILE,
            JSON.stringify({ plants: mockSeasonalPlants }, null, 2),
            "utf8"
        );
        writeFileSync(
            PLANT_TIPS_FILE,
            JSON.stringify({ tips: mockPlantTips }, null, 2),
            "utf8"
        );
    });

    describe("GET /api/rest/v1/landing-page", () => {
        it("should return all landing page content", async () => {
            const res = await request(app).get("/api/rest/v1/landing-page");

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("heroBanners");
            expect(res.body).toHaveProperty("heroSettings");
            expect(res.body).toHaveProperty("seasonalPlants");
            expect(res.body).toHaveProperty("plantTips");
            expect(res.body).toHaveProperty("contactInfo");
            expect(res.body).toHaveProperty("lastUpdated");
        });

        it("should return only active content by default", async () => {
            const res = await request(app).get("/api/rest/v1/landing-page");

            expect(res.status).toBe(200);

            // Should only include active banners
            const activeBanners = res.body.heroBanners;
            expect(activeBanners.length).toBe(2); // Only 2 active banners in mock data
            expect(activeBanners.every((b: any) => b.isActive)).toBe(true);

            // Should only include active plants
            const activePlants = res.body.seasonalPlants;
            expect(activePlants.length).toBe(2);
            expect(activePlants.every((p: any) => p.isActive)).toBe(true);

            // Should only include active tips
            const activeTips = res.body.plantTips;
            expect(activeTips.length).toBe(2);
            expect(activeTips.every((t: any) => t.isActive)).toBe(true);
        });

        it("should return all content when onlyActive=false", async () => {
            const res = await request(app).get("/api/rest/v1/landing-page?onlyActive=false");

            expect(res.status).toBe(200);

            // Should include all banners (including inactive)
            expect(res.body.heroBanners.length).toBe(3);

            // Should include all plants (including inactive)
            expect(res.body.seasonalPlants.length).toBe(3);

            // Should include all tips (including inactive)
            expect(res.body.plantTips.length).toBe(3);
        });

        it("should sort content by displayOrder", async () => {
            const res = await request(app).get("/api/rest/v1/landing-page?onlyActive=false");

            expect(res.status).toBe(200);

            // Check hero banners are sorted
            const banners = res.body.heroBanners;
            for (let i = 0; i < banners.length - 1; i++) {
                expect(banners[i].displayOrder).toBeLessThanOrEqual(banners[i + 1].displayOrder);
            }

            // Check plants are sorted
            const plants = res.body.seasonalPlants;
            for (let i = 0; i < plants.length - 1; i++) {
                expect(plants[i].displayOrder).toBeLessThanOrEqual(plants[i + 1].displayOrder);
            }
        });

        it("should include contact info", async () => {
            const res = await request(app).get("/api/rest/v1/landing-page");

            expect(res.status).toBe(200);
            expect(res.body.contactInfo).toHaveProperty("business");
            expect(res.body.contactInfo).toHaveProperty("hours");
            expect(typeof res.body.contactInfo.hours).toBe("string");
        });

        it("should set proper cache headers", async () => {
            const res = await request(app).get("/api/rest/v1/landing-page");

            expect(res.status).toBe(200);
            expect(res.headers["cache-control"]).toContain("public");
            expect(res.headers).toHaveProperty("etag");
            expect(res.headers).toHaveProperty("last-modified");
        });
    });

    describe("PUT /api/rest/v1/landing-page", () => {
        it("should require admin authentication", async () => {
            const res = await request(app)
                .put("/api/rest/v1/landing-page")
                .send(mockUpdateData);

            expect(res.status).toBe(403);
        });

        it("should reject non-admin users", async () => {
            const res = await request(app)
                .put("/api/rest/v1/landing-page")
                .set("Cookie", userCookie)
                .send(mockUpdateData);

            expect(res.status).toBe(403);
        });

        it("should update hero banners successfully", async () => {
            const res = await request(app)
                .put("/api/rest/v1/landing-page")
                .set("Cookie", adminCookie)
                .send(mockUpdateData);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.updatedSections).toContain("heroBanners");

            // Verify file was updated
            const fileContent = JSON.parse(readFileSync(HERO_BANNERS_FILE, "utf8"));
            expect(fileContent.banners).toEqual(mockUpdateData.heroBanners);
            expect(fileContent.settings).toEqual(mockUpdateData.heroSettings);
        });

        it("should update only hero settings without changing banners", async () => {
            const newSettings = { autoPlay: false, autoPlayDelay: 10000, showDots: false, showArrows: false, fadeTransition: true };

            const res = await request(app)
                .put("/api/rest/v1/landing-page")
                .set("Cookie", adminCookie)
                .send({ heroSettings: newSettings });

            expect(res.status).toBe(200);
            expect(res.body.updatedSections).toContain("heroSettings");

            // Verify settings were updated but banners remained the same
            const fileContent = JSON.parse(readFileSync(HERO_BANNERS_FILE, "utf8"));
            expect(fileContent.settings).toEqual(newSettings);
            expect(fileContent.banners).toEqual(mockHeroBanners); // Should be unchanged
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
                .put("/api/rest/v1/landing-page")
                .set("Cookie", adminCookie)
                .send({ seasonalPlants: newPlants });

            expect(res.status).toBe(200);
            expect(res.body.updatedSections).toContain("seasonalPlants");

            // Verify file was updated
            const fileContent = JSON.parse(readFileSync(SEASONAL_PLANTS_FILE, "utf8"));
            expect(fileContent.plants).toEqual(newPlants);
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
                .put("/api/rest/v1/landing-page")
                .set("Cookie", adminCookie)
                .send({ plantTips: newTips });

            expect(res.status).toBe(200);
            expect(res.body.updatedSections).toContain("plantTips");

            // Verify file was updated
            const fileContent = JSON.parse(readFileSync(PLANT_TIPS_FILE, "utf8"));
            expect(fileContent.tips).toEqual(newTips);
        });

        it("should update multiple sections at once", async () => {
            const multiUpdate = {
                heroBanners: mockUpdateData.heroBanners,
                heroSettings: mockUpdateData.heroSettings,
                seasonalPlants: mockSeasonalPlants,
                plantTips: mockPlantTips,
            };

            const res = await request(app)
                .put("/api/rest/v1/landing-page")
                .set("Cookie", adminCookie)
                .send(multiUpdate);

            expect(res.status).toBe(200);
            expect(res.body.updatedSections).toContain("heroBanners");
            expect(res.body.updatedSections).toContain("seasonalPlants");
            expect(res.body.updatedSections).toContain("plantTips");
        });

        it("should return error when no valid sections provided", async () => {
            const res = await request(app)
                .put("/api/rest/v1/landing-page")
                .set("Cookie", adminCookie)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toContain("No valid content sections provided");
        });
    });

    describe("PUT /api/rest/v1/landing-page/contact-info", () => {
        it("should require admin authentication", async () => {
            const res = await request(app)
                .put("/api/rest/v1/landing-page/contact-info")
                .send(mockContactInfoUpdate);

            expect(res.status).toBe(403);
        });

        it("should update business hours successfully", async () => {
            const res = await request(app)
                .put("/api/rest/v1/landing-page/contact-info")
                .set("Cookie", adminCookie)
                .send(mockContactInfoUpdate);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.updated.hours).toBe(true);

            // Verify file was updated
            const fileContent = readFileSync(HOURS_FILE, "utf8");
            expect(fileContent).toBe(mockContactInfoUpdate.hours);
        });

        it("should return error when neither business nor hours provided", async () => {
            const res = await request(app)
                .put("/api/rest/v1/landing-page/contact-info")
                .set("Cookie", adminCookie)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toContain("Either business or hours data must be provided");
        });
    });

    describe("POST /api/rest/v1/landing-page/invalidate-cache", () => {
        it("should require admin authentication", async () => {
            const res = await request(app).post("/api/rest/v1/landing-page/invalidate-cache");

            expect(res.status).toBe(403);
        });

        it("should invalidate cache successfully for admin", async () => {
            const res = await request(app)
                .post("/api/rest/v1/landing-page/invalidate-cache")
                .set("Cookie", adminCookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain("Cache invalidated successfully");
        });

        it("should reject non-admin users", async () => {
            const res = await request(app)
                .post("/api/rest/v1/landing-page/invalidate-cache")
                .set("Cookie", userCookie);

            expect(res.status).toBe(403);
        });
    });

    describe("Cache Behavior", () => {
        it("should serve from cache on subsequent requests", async () => {
            // First request - cache miss
            const res1 = await request(app).get("/api/rest/v1/landing-page");
            expect(res1.status).toBe(200);
            const etag1 = res1.headers["etag"];

            // Second request - cache hit (should have same ETag)
            const res2 = await request(app).get("/api/rest/v1/landing-page");
            expect(res2.status).toBe(200);
            const etag2 = res2.headers["etag"];

            expect(etag1).toBe(etag2);
        });

        it("should invalidate cache after content update", async () => {
            // Get initial content
            const res1 = await request(app).get("/api/rest/v1/landing-page");
            const etag1 = res1.headers["etag"];

            // Update content
            await request(app)
                .put("/api/rest/v1/landing-page")
                .set("Cookie", adminCookie)
                .send(mockUpdateData);

            // Get content again - should have different ETag
            const res2 = await request(app).get("/api/rest/v1/landing-page");
            const etag2 = res2.headers["etag"];

            expect(etag1).not.toBe(etag2);
        });
    });

    describe("Error Handling", () => {
        it("should handle invalid JSON in request body", async () => {
            const res = await request(app)
                .put("/api/rest/v1/landing-page")
                .set("Cookie", adminCookie)
                .set("Content-Type", "application/json")
                .send("{ invalid json }");

            expect(res.status).toBe(400);
        });

        it("should return development error messages in development mode", async () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = "development";

            // Make an invalid request
            const res = await request(app)
                .put("/api/rest/v1/landing-page")
                .set("Cookie", adminCookie)
                .send({ heroBanners: "not-an-array" }); // Invalid data type

            // Should have error message in development
            expect(res.status).toBe(500);

            process.env.NODE_ENV = originalEnv;
        });
    });
});
