/**
 * Authentication integration tests
 *
 * Tests authentication middleware and JWT token generation with real database
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { exec } from "child_process";
import { promisify } from "util";
import { generateToken, authenticate } from "./auth.js";
import { COOKIE } from "@local/shared";
import { createMockRequest, createMockResponse, createMockNext } from "./__mocks__/express.js";

const execAsync = promisify(exec);

describe("Authentication Integration Tests", () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;
    let connectionString: string;

    beforeAll(async () => {
        // Start PostgreSQL container
        container = await new PostgreSqlContainer("postgres:16-alpine")
            .withDatabase("test_auth_db")
            .withUsername("test_user")
            .withPassword("test_password")
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
    }, 120000);

    afterAll(async () => {
        await prisma.$disconnect();
        if (container) {
            await container.stop();
        }
    });

    beforeEach(async () => {
        // Clean up database between tests
        await prisma.customer_roles.deleteMany();
        await prisma.customer.deleteMany();
        await prisma.role.deleteMany();
    });

    describe("Token Generation", () => {
        it("should generate valid JWT token for customer", async () => {
            // Create role
            const role = await prisma.role.create({
                data: {
                    title: "customer",
                    description: "Customer role",
                },
            });

            // Create customer
            const customer = await prisma.customer.create({
                data: {
                    firstName: "John",
                    lastName: "Doe",
                    password: bcrypt.hashSync("password123", 10),
                    roles: {
                        create: {
                            roleId: role.id,
                        },
                    },
                },
            });

            // Mock response
            const res = createMockResponse() as Response;

            // Generate token
            await generateToken(res, customer.id, "", prisma);

            // Verify cookie was set
            expect(res.cookie).toHaveBeenCalled();
            const cookieCall = (res.cookie as any).mock.calls[0];
            expect(cookieCall[0]).toBe(COOKIE.Jwt);

            const token = cookieCall[1];
            expect(token).toBeDefined();

            // Verify token contents
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
            expect(decoded.customerId).toBe(customer.id);
            expect(decoded.roles).toContain("customer");
            expect(decoded.isCustomer).toBe(true);
            expect(decoded.isAdmin).toBe(false);
        });

        it("should generate token with admin role", async () => {
            // Create admin role
            const adminRole = await prisma.role.create({
                data: {
                    title: "admin",
                    description: "Administrator role",
                },
            });

            // Create admin customer
            const admin = await prisma.customer.create({
                data: {
                    firstName: "Admin",
                    lastName: "User",
                    roles: {
                        create: {
                            roleId: adminRole.id,
                        },
                    },
                },
            });

            const res = createMockResponse() as Response;
            await generateToken(res, admin.id, "", prisma);

            const cookieCall = (res.cookie as any).mock.calls[0];
            const token = cookieCall[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

            expect(decoded.roles).toContain("admin");
            expect(decoded.isAdmin).toBe(true);
        });

        it("should include business ID in token", async () => {
            const business = await prisma.business.create({
                data: {
                    name: "Test Business",
                },
            });

            const role = await prisma.role.create({
                data: { title: "customer" },
            });

            const customer = await prisma.customer.create({
                data: {
                    firstName: "Business",
                    lastName: "User",
                    businessId: business.id,
                    roles: {
                        create: {
                            roleId: role.id,
                        },
                    },
                },
            });

            const res = createMockResponse() as Response;
            await generateToken(res, customer.id, business.id, prisma);

            const cookieCall = (res.cookie as any).mock.calls[0];
            const token = cookieCall[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

            expect(decoded.businessId).toBe(business.id);
        });

        it("should set appropriate cookie options", async () => {
            const role = await prisma.role.create({
                data: { title: "customer" },
            });

            const customer = await prisma.customer.create({
                data: {
                    firstName: "Test",
                    lastName: "User",
                    roles: {
                        create: {
                            roleId: role.id,
                        },
                    },
                },
            });

            const res = createMockResponse() as Response;
            await generateToken(res, customer.id, "", prisma);

            const cookieCall = (res.cookie as any).mock.calls[0];
            const options = cookieCall[2];

            expect(options.httpOnly).toBe(true);
            expect(options.path).toBe("/");
            expect(options.maxAge).toBeDefined();
            expect(options.maxAge).toBeGreaterThan(0);
        });
    });

    describe("Authentication Middleware", () => {
        it("should authenticate valid JWT token", async () => {
            // Create role and customer
            const role = await prisma.role.create({
                data: { title: "customer" },
            });

            const customer = await prisma.customer.create({
                data: {
                    firstName: "Auth",
                    lastName: "Test",
                    roles: {
                        create: {
                            roleId: role.id,
                        },
                    },
                },
            });

            // Generate token
            const res = createMockResponse() as Response;
            await generateToken(res, customer.id, "", prisma);
            const token = (res.cookie as any).mock.calls[0][1];

            // Create request with token
            const req = createMockRequest({
                cookies: {
                    [COOKIE.Jwt]: token,
                },
            });

            const next = createMockNext();

            // Authenticate
            await authenticate(req as any, {} as Response, next);

            // Wait for async jwt.verify to complete
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Verify request was populated
            expect((req as any).validToken).toBe(true);
            expect((req as any).customerId).toBe(customer.id);
            expect((req as any).roles).toContain("customer");
            expect((req as any).isCustomer).toBe(true);
        });

        it("should handle missing token", async () => {
            const req = createMockRequest({
                cookies: {},
            });

            const next = createMockNext();

            await authenticate(req as any, {} as Response, next);

            expect(next).toHaveBeenCalled();
            expect((req as any).validToken).toBeUndefined();
        });

        it("should handle invalid token", async () => {
            const req = createMockRequest({
                cookies: {
                    [COOKIE.Jwt]: "invalid.token.here",
                },
            });

            const next = createMockNext();

            await authenticate(req as any, {} as Response, next);

            // Wait for async jwt.verify to complete
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect((req as any).validToken).toBeUndefined();
        });

        it("should handle expired token", async () => {
            const role = await prisma.role.create({
                data: { title: "customer" },
            });

            const customer = await prisma.customer.create({
                data: {
                    firstName: "Expired",
                    lastName: "Token",
                    roles: {
                        create: {
                            roleId: role.id,
                        },
                    },
                },
            });

            // Generate expired token
            const expiredToken = jwt.sign(
                {
                    customerId: customer.id,
                    businessId: "",
                    roles: ["customer"],
                    isCustomer: true,
                    isAdmin: false,
                    exp: Date.now() - 1000, // Expired 1 second ago
                },
                process.env.JWT_SECRET!,
            );

            const req = createMockRequest({
                cookies: {
                    [COOKIE.Jwt]: expiredToken,
                },
            });

            const next = createMockNext();

            await authenticate(req as any, {} as Response, next);

            // Wait for async jwt.verify to complete
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect((req as any).validToken).toBeUndefined();
        });
    });

    describe("Role-Based Access", () => {
        it("should identify customer role", async () => {
            const customerRole = await prisma.role.create({
                data: { title: "customer" },
            });

            const customer = await prisma.customer.create({
                data: {
                    firstName: "Customer",
                    lastName: "Role",
                    roles: {
                        create: {
                            roleId: customerRole.id,
                        },
                    },
                },
            });

            const res = createMockResponse() as Response;
            await generateToken(res, customer.id, "", prisma);

            const token = (res.cookie as any).mock.calls[0][1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

            expect(decoded.isCustomer).toBe(true);
            expect(decoded.isAdmin).toBe(false);
        });

        it("should identify admin role", async () => {
            const adminRole = await prisma.role.create({
                data: { title: "admin" },
            });

            const admin = await prisma.customer.create({
                data: {
                    firstName: "Admin",
                    lastName: "Role",
                    roles: {
                        create: {
                            roleId: adminRole.id,
                        },
                    },
                },
            });

            const res = createMockResponse() as Response;
            await generateToken(res, admin.id, "", prisma);

            const token = (res.cookie as any).mock.calls[0][1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

            expect(decoded.isAdmin).toBe(true);
        });

        it("should handle multiple roles", async () => {
            const customerRole = await prisma.role.create({
                data: { title: "customer" },
            });

            const adminRole = await prisma.role.create({
                data: { title: "admin" },
            });

            const user = await prisma.customer.create({
                data: {
                    firstName: "Multi",
                    lastName: "Role",
                    roles: {
                        create: [{ roleId: customerRole.id }, { roleId: adminRole.id }],
                    },
                },
            });

            const res = createMockResponse() as Response;
            await generateToken(res, user.id, "", prisma);

            const token = (res.cookie as any).mock.calls[0][1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

            expect(decoded.roles).toContain("customer");
            expect(decoded.roles).toContain("admin");
            expect(decoded.isCustomer).toBe(true);
            expect(decoded.isAdmin).toBe(true);
        });

        it("should handle user with no roles", async () => {
            const customer = await prisma.customer.create({
                data: {
                    firstName: "No",
                    lastName: "Roles",
                },
            });

            const res = createMockResponse() as Response;
            await generateToken(res, customer.id, "", prisma);

            const token = (res.cookie as any).mock.calls[0][1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

            expect(decoded.roles).toEqual([]);
            expect(decoded.isCustomer).toBe(false);
            expect(decoded.isAdmin).toBe(false);
        });
    });

    describe("Security Tests", () => {
        it("should not accept tampered token", async () => {
            const role = await prisma.role.create({
                data: { title: "customer" },
            });

            const customer = await prisma.customer.create({
                data: {
                    firstName: "Tamper",
                    lastName: "Test",
                    roles: {
                        create: {
                            roleId: role.id,
                        },
                    },
                },
            });

            const res = createMockResponse() as Response;
            await generateToken(res, customer.id, "", prisma);

            const token = (res.cookie as any).mock.calls[0][1];

            // Tamper with token
            const parts = token.split(".");
            parts[1] = Buffer.from(JSON.stringify({ isAdmin: true })).toString("base64");
            const tamperedToken = parts.join(".");

            const req = createMockRequest({
                cookies: {
                    [COOKIE.Jwt]: tamperedToken,
                },
            });

            const next = createMockNext();

            await authenticate(req as any, {} as Response, next);

            // Wait for async jwt.verify to complete
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect((req as any).validToken).toBeUndefined();
        });

        it("should use secure JWT secret", () => {
            expect(process.env.JWT_SECRET).toBeDefined();
            expect(process.env.JWT_SECRET!.length).toBeGreaterThan(10);
        });
    });
});
