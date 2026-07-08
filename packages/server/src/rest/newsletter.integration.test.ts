import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import { Express } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { COOKIE, REST_ROUTES } from "@local/shared";
import {
    createRestTestApp,
    startPostgresTestDatabase,
    stopPostgresTestDatabase,
    truncatePublicTables,
} from "../__tests__/integrationUtils.js";

describe("Newsletter API Integration Tests", () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;
    let app: Express;
    let adminCookie: string;
    let userCookie: string;

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

    beforeAll(async () => {
        const database = await startPostgresTestDatabase("test_newsletter_db");
        container = database.container;
        prisma = database.prisma;
        process.env.JWT_SECRET = "test-jwt-secret-key";
        process.env.SITE_NAME = "test.example.com";

        app = await createRestTestApp(prisma);
    }, 120000);

    afterAll(async () => {
        await stopPostgresTestDatabase(prisma, container);
    });

    beforeEach(async () => {
        await truncatePublicTables(prisma);

        const adminRole = await prisma.role.create({
            data: {
                title: "Admin",
            },
        });
        const customerRole = await prisma.role.create({
            data: {
                title: "Customer",
            },
        });
        const adminCustomer = await prisma.customer.create({
            data: {
                firstName: "Admin",
                lastName: "User",
                accountApproved: true,
                emailVerified: true,
                emails: {
                    create: {
                        emailAddress: "admin-newsletter@test.com",
                    },
                },
                roles: {
                    create: {
                        roleId: adminRole.id,
                    },
                },
            },
        });

        const regularCustomer = await prisma.customer.create({
            data: {
                firstName: "Regular",
                lastName: "User",
                accountApproved: true,
                emailVerified: true,
                emails: {
                    create: {
                        emailAddress: "user-newsletter@test.com",
                    },
                },
                roles: {
                    create: {
                        roleId: customerRole.id,
                    },
                },
            },
        });

        expect(adminCustomer.id).toBeTruthy();
        expect(regularCustomer.id).toBeTruthy();

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

    it("subscribes a public visitor with normalized email and source metadata", async () => {
        const response = await request(app).post(REST_ROUTES.newsletter.subscribe).send({
            email: "  PUBLIC.Signup@Example.COM ",
            variantId: "variant-homepage-a",
            source: "homepage",
        });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: "Thank you for subscribing!",
        });

        const subscriber = await prisma.newsletter_subscription.findUnique({
            where: { email: "public.signup@example.com" },
        });

        expect(subscriber).toMatchObject({
            email: "public.signup@example.com",
            variant_id: "variant-homepage-a",
            source: "homepage",
            status: "active",
        });
    });

    it("rejects invalid public subscription emails without creating a subscriber", async () => {
        const response = await request(app).post(REST_ROUTES.newsletter.subscribe).send({
            email: "not-an-email",
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: "Invalid email format" });
        await expect(prisma.newsletter_subscription.count()).resolves.toBe(0);
    });

    it("reactivates an unsubscribed visitor without duplicating the subscription", async () => {
        await prisma.newsletter_subscription.create({
            data: {
                email: "person@example.com",
                variant_id: "old-variant",
                source: "homepage",
                status: "unsubscribed",
            },
        });

        const response = await request(app).post(REST_ROUTES.newsletter.subscribe).send({
            email: "person@example.com",
            variantId: "new-variant",
        });

        expect(response.status).toBe(200);
        expect(response.body.message).toMatch(/resubscribed/i);

        await expect(prisma.newsletter_subscription.count()).resolves.toBe(1);
        await expect(
            prisma.newsletter_subscription.findUniqueOrThrow({
                where: { email: "person@example.com" },
            })
        ).resolves.toMatchObject({
            status: "active",
            variant_id: "new-variant",
        });
    });

    it("requires admin access for subscriber list, stats, export, and deletion", async () => {
        const subscriber = await prisma.newsletter_subscription.create({
            data: {
                email: "lead@example.com",
                source: "homepage",
                status: "active",
            },
        });

        await expect(request(app).get(REST_ROUTES.newsletter.subscribers)).resolves.toHaveProperty(
            "status",
            401
        );
        await expect(
            request(app).get(REST_ROUTES.newsletter.subscribers).set("Cookie", userCookie)
        ).resolves.toHaveProperty("status", 401);
        await expect(
            request(app).get(REST_ROUTES.newsletter.stats).set("Cookie", userCookie)
        ).resolves.toHaveProperty("status", 401);
        await expect(
            request(app).get(REST_ROUTES.newsletter.subscribersExport).set("Cookie", userCookie)
        ).resolves.toHaveProperty("status", 401);
        await expect(
            request(app)
                .delete(REST_ROUTES.newsletter.subscriber(String(subscriber.id)))
                .set("Cookie", userCookie)
                .send({ action: "unsubscribe" })
        ).resolves.toHaveProperty("status", 401);
    });

    it("lets admins search, export, inspect stats, unsubscribe, and delete subscribers", async () => {
        const activeSubscriber = await prisma.newsletter_subscription.create({
            data: {
                email: "lead@example.com",
                variant_id: "variant-a",
                source: "homepage",
                status: "active",
            },
        });
        const otherSubscriber = await prisma.newsletter_subscription.create({
            data: {
                email: "other@example.com",
                variant_id: "variant-b",
                source: "footer",
                status: "active",
            },
        });

        const listResponse = await request(app)
            .get(`${REST_ROUTES.newsletter.subscribers}?search=lead&limit=10`)
            .set("Cookie", adminCookie);

        expect(listResponse.status).toBe(200);
        expect(listResponse.body.pagination.total).toBe(1);
        expect(listResponse.body.subscribers).toHaveLength(1);
        expect(listResponse.body.subscribers[0]).toMatchObject({
            email: "lead@example.com",
            variant_id: "variant-a",
            status: "active",
        });

        const statsResponse = await request(app)
            .get(REST_ROUTES.newsletter.stats)
            .set("Cookie", adminCookie);

        expect(statsResponse.status).toBe(200);
        expect(statsResponse.body.byStatus.active).toBe(2);
        expect(statsResponse.body.byVariant).toEqual(
            expect.arrayContaining([
                { variantId: "variant-a", count: 1 },
                { variantId: "variant-b", count: 1 },
            ])
        );
        expect(statsResponse.body.recentActivity.last7Days).toBe(2);

        const exportResponse = await request(app)
            .get(REST_ROUTES.newsletter.subscribersExport)
            .set("Cookie", adminCookie);

        expect(exportResponse.status).toBe(200);
        expect(exportResponse.headers["content-type"]).toMatch(/text\/csv/);
        expect(exportResponse.text).toContain('"lead@example.com","variant-a","homepage","active"');

        const unsubscribeResponse = await request(app)
            .delete(REST_ROUTES.newsletter.subscriber(String(activeSubscriber.id)))
            .set("Cookie", adminCookie)
            .send({ action: "unsubscribe" });

        expect(unsubscribeResponse.status).toBe(200);
        await expect(
            prisma.newsletter_subscription.findUniqueOrThrow({
                where: { id: activeSubscriber.id },
            })
        ).resolves.toMatchObject({ status: "unsubscribed" });

        const deleteResponse = await request(app)
            .delete(REST_ROUTES.newsletter.subscriber(String(otherSubscriber.id)))
            .set("Cookie", adminCookie)
            .send({ action: "delete" });

        expect(deleteResponse.status).toBe(200);
        await expect(
            prisma.newsletter_subscription.findUnique({
                where: { id: otherSubscriber.id },
            })
        ).resolves.toBeNull();
    });
});
