/**
 * Dashboard REST API Integration Tests
 *
 * Tests dashboard stats endpoint with real database
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
import restRouter from "./index.js";
import * as auth from "../auth.js";

const execAsync = promisify(exec);

describe("Dashboard API Integration Tests", () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;
    let app: Express;
    let connectionString: string;
    let adminCookie: string;
    let userCookie: string;

    beforeAll(async () => {
        // Start PostgreSQL container
        container = await new PostgreSqlContainer("postgres:16-alpine")
            .withDatabase("test_dashboard_db")
            .withUsername("test_user")
            .withPassword("test_password")
            .withReuse(false)
            .start();

        connectionString = container.getConnectionUri();
        process.env.DB_URL = connectionString;
        process.env.JWT_SECRET = "test-jwt-secret-key";
        process.env.SITE_NAME = "test.example.com";

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
        await prisma.email.deleteMany();
        await prisma.phone.deleteMany();
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
            include: {
                emails: true,
            },
        });

        // Debug: Check if email was created
        console.log("Created admin customer:", {
            id: adminCustomer.id,
            firstName: adminCustomer.firstName,
            emails: (adminCustomer as any).emails,
        });

        // Verify email exists
        const emailCheck = await prisma.email.findUnique({
            where: { emailAddress: "admin@test.com" },
        });
        console.log("Email check:", emailCheck);

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
        app.use("/api/rest", restRouter);

        // Login as admin and get cookie
        const adminLoginRes = await request(app)
            .post("/api/rest/v1/auth/login")
            .send({ email: "admin@test.com", password: "admin123" });

        if (adminLoginRes.status !== 200) {
            console.error("Admin login failed:", adminLoginRes.status, adminLoginRes.body);
            throw new Error(
                `Admin login failed with status ${adminLoginRes.status}: ${JSON.stringify(adminLoginRes.body)}`
            );
        }

        adminCookie = adminLoginRes.headers["set-cookie"][0];

        // Login as regular user and get cookie
        const userLoginRes = await request(app)
            .post("/api/rest/v1/auth/login")
            .send({ email: "user@test.com", password: "admin123" });

        userCookie = userLoginRes.headers["set-cookie"][0];
    }, 120000);

    afterAll(async () => {
        await prisma.$disconnect();
        if (container) {
            await container.stop();
        }
    });

    beforeEach(async () => {
        // Clean up customers (except admin and user)
        await prisma.customer.deleteMany({
            where: {
                emails: {
                    some: {
                        emailAddress: {
                            in: ["test1@test.com", "test2@test.com", "test3@test.com"],
                        },
                    },
                },
            },
        });
    });

    describe("GET /api/rest/v1/dashboard/stats", () => {
        it("should require authentication", async () => {
            const res = await request(app).get("/api/rest/v1/dashboard/stats");

            expect(res.status).toBe(401);
        });

        it("should require admin role", async () => {
            const res = await request(app)
                .get("/api/rest/v1/dashboard/stats")
                .set("Cookie", userCookie);

            expect(res.status).toBe(401);
        });

        it("should return stats for admin users", async () => {
            const res = await request(app)
                .get("/api/rest/v1/dashboard/stats")
                .set("Cookie", adminCookie);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("totalCustomers");
            expect(res.body).toHaveProperty("approvedCustomers");
            expect(res.body).toHaveProperty("pendingOrders");
            expect(res.body).toHaveProperty("totalProducts");
            expect(res.body).toHaveProperty("totalSkus");
        });

        it("should return correct customer counts", async () => {
            // Create test customers
            await prisma.customer.create({
                data: {
                    firstName: "Test",
                    lastName: "Customer1",
                    accountApproved: true,
                    password: "hashedpass",
                    emails: {
                        create: {
                            emailAddress: "test1@test.com",
                        },
                    },
                },
            });

            await prisma.customer.create({
                data: {
                    firstName: "Test",
                    lastName: "Customer2",
                    accountApproved: true,
                    password: "hashedpass",
                    emails: {
                        create: {
                            emailAddress: "test2@test.com",
                        },
                    },
                },
            });

            await prisma.customer.create({
                data: {
                    firstName: "Test",
                    lastName: "Customer3",
                    accountApproved: false, // Not approved
                    password: "hashedpass",
                    emails: {
                        create: {
                            emailAddress: "test3@test.com",
                        },
                    },
                },
            });

            const res = await request(app)
                .get("/api/rest/v1/dashboard/stats")
                .set("Cookie", adminCookie);

            expect(res.status).toBe(200);

            // Total should be 5: admin + user + 3 test customers
            expect(res.body.totalCustomers).toBe(5);

            // Approved should be 4: admin + user + 2 approved test customers
            expect(res.body.approvedCustomers).toBe(4);
        });

        it("should return zero for archived models", async () => {
            const res = await request(app)
                .get("/api/rest/v1/dashboard/stats")
                .set("Cookie", adminCookie);

            expect(res.status).toBe(200);

            // These models are archived, so should return 0
            expect(res.body.pendingOrders).toBe(0);
            expect(res.body.totalProducts).toBe(0);
            expect(res.body.totalSkus).toBe(0);
        });

        it("should handle empty database gracefully", async () => {
            // Delete all customers except admin and user
            await prisma.customer_roles.deleteMany({
                where: {
                    customer: {
                        emails: {
                            some: {
                                emailAddress: {
                                    in: ["test1@test.com", "test2@test.com", "test3@test.com"],
                                },
                            },
                        },
                    },
                },
            });

            await prisma.customer.deleteMany({
                where: {
                    emails: {
                        some: {
                            emailAddress: {
                                in: ["test1@test.com", "test2@test.com", "test3@test.com"],
                            },
                        },
                    },
                },
            });

            const res = await request(app)
                .get("/api/rest/v1/dashboard/stats")
                .set("Cookie", adminCookie);

            expect(res.status).toBe(200);
            expect(res.body.totalCustomers).toBe(2); // Only admin and user remain
        });

        it("should return consistent stats across multiple requests", async () => {
            // Create some test data
            await prisma.customer.create({
                data: {
                    firstName: "Test",
                    lastName: "Customer1",
                    accountApproved: true,
                    password: "hashedpass",
                    emails: {
                        create: {
                            emailAddress: "test1@test.com",
                        },
                    },
                },
            });

            // First request
            const res1 = await request(app)
                .get("/api/rest/v1/dashboard/stats")
                .set("Cookie", adminCookie);

            // Second request
            const res2 = await request(app)
                .get("/api/rest/v1/dashboard/stats")
                .set("Cookie", adminCookie);

            expect(res1.status).toBe(200);
            expect(res2.status).toBe(200);

            // Stats should be identical
            expect(res1.body.totalCustomers).toBe(res2.body.totalCustomers);
            expect(res1.body.approvedCustomers).toBe(res2.body.approvedCustomers);
        });

        it("should update stats when customers are added", async () => {
            // Get initial stats
            const res1 = await request(app)
                .get("/api/rest/v1/dashboard/stats")
                .set("Cookie", adminCookie);

            const initialTotal = res1.body.totalCustomers;
            const initialApproved = res1.body.approvedCustomers;

            // Add a new customer
            await prisma.customer.create({
                data: {
                    firstName: "New",
                    lastName: "Customer",
                    accountApproved: true,
                    password: "hashedpass",
                    emails: {
                        create: {
                            emailAddress: "test1@test.com",
                        },
                    },
                },
            });

            // Get updated stats
            const res2 = await request(app)
                .get("/api/rest/v1/dashboard/stats")
                .set("Cookie", adminCookie);

            expect(res2.body.totalCustomers).toBe(initialTotal + 1);
            expect(res2.body.approvedCustomers).toBe(initialApproved + 1);
        });

        it("should differentiate between approved and unapproved customers", async () => {
            // Create approved customer
            await prisma.customer.create({
                data: {
                    firstName: "Approved",
                    lastName: "Customer",
                    accountApproved: true,
                    password: "hashedpass",
                    emails: {
                        create: {
                            emailAddress: "test1@test.com",
                        },
                    },
                },
            });

            // Create unapproved customer
            await prisma.customer.create({
                data: {
                    firstName: "Unapproved",
                    lastName: "Customer",
                    accountApproved: false,
                    password: "hashedpass",
                    emails: {
                        create: {
                            emailAddress: "test2@test.com",
                        },
                    },
                },
            });

            const res = await request(app)
                .get("/api/rest/v1/dashboard/stats")
                .set("Cookie", adminCookie);

            expect(res.status).toBe(200);

            // Total includes both
            expect(res.body.totalCustomers).toBeGreaterThanOrEqual(4); // admin + user + 2 new

            // Approved should be less than total
            expect(res.body.approvedCustomers).toBeLessThan(res.body.totalCustomers);
        });
    });

    describe("Error Handling", () => {
        it("should handle database errors gracefully", async () => {
            // Disconnect database to simulate error
            await prisma.$disconnect();

            const res = await request(app)
                .get("/api/rest/v1/dashboard/stats")
                .set("Cookie", adminCookie);

            // Should return error
            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty("error");

            // Reconnect for cleanup
            await prisma.$connect();
        });
    });
});
