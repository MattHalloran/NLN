/**
 * REST API integration tests
 *
 * Tests API endpoints with real database and server instance
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import express, { Express } from "express";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import cookieParser from "cookie-parser";
import { COOKIE, REST_ROUTES } from "@local/shared";
import restRouter from "./index.js";
import * as auth from "../auth.js";
import { loginLimiter, passwordResetLimiter, signupLimiter } from "../middleware/rateLimiter.js";
import {
    startPostgresTestDatabase,
    stopPostgresTestDatabase,
} from "../__tests__/integrationUtils.js";

describe("REST API Integration Tests", () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;
    let app: Express;

    beforeAll(async () => {
        const database = await startPostgresTestDatabase("test_api_db");
        container = database.container;
        prisma = database.prisma;
        process.env.JWT_SECRET = "test-jwt-secret-key";
        process.env.SITE_NAME = "test.example.com";

        // Clean up any seed data from migrations
        await prisma.order_item.deleteMany();
        await prisma.order.deleteMany();
        await prisma.feedback.deleteMany();
        await prisma.customer_roles.deleteMany();
        await prisma.email.deleteMany();
        await prisma.phone.deleteMany();
        await prisma.customer.deleteMany();
        await prisma.address.deleteMany();
        await prisma.business_discounts.deleteMany();
        await prisma.business.deleteMany();
        await prisma.role.deleteMany();
        await prisma.sku_discounts.deleteMany();
        await prisma.plant_trait.deleteMany();
        await prisma.plant_images.deleteMany();
        await prisma.sku.deleteMany();
        await prisma.plant.deleteMany();
        await prisma.discount.deleteMany();
        await prisma.image_file.deleteMany();
        await prisma.image_labels.deleteMany();
        await prisma.image.deleteMany();
        await prisma.queue_task.deleteMany();

        // Setup Express app
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
    }, 120000);

    afterAll(async () => {
        await stopPostgresTestDatabase(prisma, container);
    });

    beforeEach(async () => {
        for (const limiter of [loginLimiter, passwordResetLimiter, signupLimiter]) {
            limiter.resetKey("::/56");
            limiter.resetKey("127.0.0.1");
        }

        // Clean up database between tests using TRUNCATE to handle foreign keys
        // TRUNCATE CASCADE will automatically truncate dependent tables
        const tables = [
            "order_item",
            "order",
            "feedback",
            "customer_roles",
            "email",
            "phone",
            "customer",
            "address",
            "business_discounts",
            "business",
            "role",
            "sku_discounts",
            "plant_trait",
            "plant_images",
            "sku",
            "plant",
            "discount",
            "image_file",
            "image_labels",
            "image",
            "queue_task",
        ];

        for (const table of tables) {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
        }
    });

    describe("Health Check", () => {
        it("should return healthy status", async () => {
            const response = await request(app).get(REST_ROUTES.health);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("status", "healthy");
            expect(response.body).toHaveProperty("timestamp");
        });
    });

    describe("API Root", () => {
        it("should return API information", async () => {
            const response = await request(app).get(REST_ROUTES.root);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("name", "New Life Nursery REST API");
            expect(response.body).toHaveProperty("version");
            expect(response.body).toHaveProperty("endpoints");
        });
    });

    describe("Authentication Endpoints", () => {
        describe("POST /api/rest/v1/auth/signup", () => {
            beforeEach(async () => {
                // Create customer role
                await prisma.role.create({
                    data: {
                        title: "Customer",
                        description: "Customer role",
                    },
                });
            });

            it("should register a new customer", async () => {
                const response = await request(app).post(REST_ROUTES.auth.signup).send({
                    firstName: "John",
                    lastName: "Doe",
                    pronouns: "he/him",
                    theme: "light",
                    email: "john@example.com",
                    phone: "1234567890",
                    password: "SecurePassword123!",
                    business: "Test Business",
                    accountApproved: false,
                    marketingEmails: true,
                });

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty("id");
                expect(response.body).toHaveProperty("emailVerified", false);
                expect(response.body).toHaveProperty("roles");

                // Verify customer was created in database
                const customer = await prisma.customer.findFirst({
                    where: { firstName: "John", lastName: "Doe" },
                    include: { emails: true },
                });
                expect(customer).toBeDefined();
                expect(customer?.emails[0]?.emailAddress).toBe("john@example.com");
            });

            it("should set authentication cookie on signup", async () => {
                const response = await request(app).post(REST_ROUTES.auth.signup).send({
                    firstName: "Jane",
                    lastName: "Smith",
                    pronouns: "she/her",
                    theme: "light",
                    email: "jane@example.com",
                    phone: "9876543210",
                    password: "AnotherPassword456!",
                    business: "Jane Business",
                    accountApproved: false,
                    marketingEmails: true,
                });

                expect(response.status).toBe(200);
                expect(response.headers["set-cookie"]).toBeDefined();
            });

            it("should reject signup with missing fields", async () => {
                const response = await request(app).post(REST_ROUTES.auth.signup).send({
                    firstName: "Incomplete",
                    // Missing required fields
                });

                expect(response.status).toBe(400);
            });

            it("should reject duplicate email", async () => {
                await request(app).post(REST_ROUTES.auth.signup).send({
                    firstName: "First",
                    lastName: "User",
                    pronouns: "they/them",
                    theme: "light",
                    email: "duplicate@example.com",
                    phone: "1111111111",
                    password: "Password123!",
                    business: "Business",
                    accountApproved: false,
                    marketingEmails: true,
                });

                const response = await request(app).post(REST_ROUTES.auth.signup).send({
                    firstName: "Second",
                    lastName: "User",
                    pronouns: "they/them",
                    theme: "light",
                    email: "duplicate@example.com",
                    phone: "2222222222",
                    password: "Password456!",
                    business: "Other Business",
                    accountApproved: false,
                    marketingEmails: true,
                });

                expect(response.status).toBe(400);
                expect(response.body).toMatchObject({
                    error: expect.stringMatching(/email.*already exists/i),
                });
            });
        });

        describe("POST /api/rest/v1/auth/login", () => {
            beforeEach(async () => {
                // Create customer role
                const role = await prisma.role.create({
                    data: {
                        title: "Customer",
                        description: "Customer role",
                    },
                });

                // Create test customer
                await prisma.customer.create({
                    data: {
                        firstName: "Test",
                        lastName: "User",
                        password: bcrypt.hashSync("TestPassword123!", 10),
                        accountApproved: true,
                        emailVerified: true,
                        status: "Unlocked",
                        emails: {
                            create: {
                                emailAddress: "test@example.com",
                            },
                        },
                        roles: {
                            create: {
                                roleId: role.id,
                            },
                        },
                    },
                });
            });

            it("should login with valid credentials", async () => {
                const response = await request(app).post(REST_ROUTES.auth.login).send({
                    email: "test@example.com",
                    password: "TestPassword123!",
                });

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty("id");
                expect(response.body).toHaveProperty("emailVerified", true);
                expect(response.body).toHaveProperty("accountApproved", true);
                expect(response.headers["set-cookie"]).toBeDefined();
            });

            it("should reject invalid password", async () => {
                const response = await request(app).post(REST_ROUTES.auth.login).send({
                    email: "test@example.com",
                    password: "WrongPassword",
                });

                expect(response.status).toBe(401);
            });

            it("should reject non-existent user", async () => {
                const response = await request(app).post(REST_ROUTES.auth.login).send({
                    email: "nonexistent@example.com",
                    password: "AnyPassword",
                });

                expect(response.status).toBe(401);
            });
        });

        describe("GET /api/rest/v1/auth/session", () => {
            let customerId: string;

            beforeEach(async () => {
                const role = await prisma.role.create({
                    data: {
                        title: "Customer",
                        description: "Customer role",
                    },
                });

                const customer = await prisma.customer.create({
                    data: {
                        firstName: "Session",
                        lastName: "User",
                        password: bcrypt.hashSync("TestPassword123!", 10),
                        accountApproved: true,
                        emailVerified: true,
                        status: "Unlocked",
                        emails: {
                            create: {
                                emailAddress: "session@example.com",
                            },
                        },
                        roles: {
                            create: {
                                roleId: role.id,
                            },
                        },
                    },
                });
                customerId = customer.id;
            });

            it("should return signed-out state without a cookie", async () => {
                const response = await request(app).get(REST_ROUTES.auth.session);

                expect(response.status).toBe(200);
                expect(response.body).toEqual({ authenticated: false, user: null });
            });

            it("should return session data with a valid cookie", async () => {
                const agent = request.agent(app);
                await agent.post(REST_ROUTES.auth.login).send({
                    email: "session@example.com",
                    password: "TestPassword123!",
                });

                const response = await agent.get(REST_ROUTES.auth.session);

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty("authenticated", true);
                expect(response.body.user).toHaveProperty("id", customerId);
                expect(response.body.user).toHaveProperty("emailVerified", true);
            });

            it("should clear stale cookies and return signed-out state", async () => {
                const token = jwt.sign(
                    {
                        customerId: randomUUID(),
                        businessId: "",
                        roles: ["customer"],
                        isCustomer: true,
                        isAdmin: false,
                        exp: Math.floor(Date.now() / 1000) + 3600,
                    },
                    process.env.JWT_SECRET ?? ""
                );

                const response = await request(app)
                    .get(REST_ROUTES.auth.session)
                    .set("Cookie", [`${COOKIE.Jwt}=${token}`]);

                expect(response.status).toBe(200);
                expect(response.body).toEqual({ authenticated: false, user: null });
                const setCookie = response.headers["set-cookie"];
                const serializedCookies = Array.isArray(setCookie)
                    ? setCookie.join(";")
                    : setCookie;

                expect(serializedCookies).toContain(`${COOKIE.Jwt}=`);
            });
        });

        describe("POST /api/rest/v1/auth/logout", () => {
            it("should logout and clear cookie", async () => {
                const response = await request(app).post(REST_ROUTES.auth.logout);

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty("success", true);
            });
        });

        describe("POST /api/rest/v1/auth/request-password-change", () => {
            beforeEach(async () => {
                await prisma.customer.create({
                    data: {
                        firstName: "Reset",
                        lastName: "User",
                        password: bcrypt.hashSync("OldPassword", 10),
                        emails: {
                            create: {
                                emailAddress: "reset@example.com",
                            },
                        },
                    },
                });
            });

            it("should request password change", async () => {
                const response = await request(app)
                    .post(REST_ROUTES.auth.requestPasswordChange)
                    .send({
                        email: "reset@example.com",
                    });

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty("success", true);

                // Verify reset code was stored
                const customer = await prisma.customer.findFirst({
                    where: {
                        emails: {
                            some: {
                                emailAddress: "reset@example.com",
                            },
                        },
                    },
                });
                expect(customer?.resetPasswordCode).toBeDefined();
            });

            it("should reject invalid email format", async () => {
                const response = await request(app)
                    .post(REST_ROUTES.auth.requestPasswordChange)
                    .send({
                        email: "invalid-email",
                    });

                expect(response.status).toBe(400);
            });
        });
    });

    // ARCHIVED: Plant endpoint tests removed (plants feature no longer in use)

    describe("Error Handling", () => {
        it("should return 404 for non-existent endpoint", async () => {
            const response = await request(app).get(`${REST_ROUTES.v1}/nonexistent`);

            expect(response.status).toBe(404);
        });

        it("should handle malformed JSON", async () => {
            const response = await request(app)
                .post(REST_ROUTES.auth.login)
                .set("Content-Type", "application/json")
                .send("{ invalid json }");

            expect(response.status).toBe(400);
        });
    });

    describe("CORS and Security Headers", () => {
        it("should include CORS headers", async () => {
            const response = await request(app)
                .options(REST_ROUTES.health)
                .set("Origin", "http://localhost:3000");

            // Verify CORS headers are present
            expect(response.headers).toBeDefined();
        });
    });
});
