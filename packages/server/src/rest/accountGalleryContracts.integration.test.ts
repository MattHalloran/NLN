import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import { Express } from "express";
import fs from "fs";
import path from "path";
import request from "supertest";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CODE, CSRF, IMAGE_LABELS, REST_ROUTES } from "@local/shared";
import {
    createRestTestApp,
    createTestProjectDir,
    startPostgresTestDatabase,
    stopPostgresTestDatabase,
    truncatePublicTables,
} from "../__tests__/integrationUtils.js";

vi.mock("../redisConn.js", () => ({
    initializeRedis: vi.fn(async () => ({
        set: vi.fn(async () => "OK"),
        eval: vi.fn(async () => 1),
    })),
    closeRedis: vi.fn(async () => undefined),
}));

type TestAgent = ReturnType<typeof request.agent>;

const currentSignupPayload = (overrides: Record<string, unknown> = {}) => ({
    firstName: "Contract",
    lastName: "User",
    pronouns: "they/them",
    business: "Contract Nursery",
    email: "contract-user@example.test",
    phone: "555-555-0123",
    accountApproved: false,
    marketingEmails: false,
    password: "ValidPass123!",
    ...overrides,
});

const getCsrfToken = async (agent: TestAgent) => {
    const response = await agent.get(REST_ROUTES.csrfToken).expect(200);
    const token = response.body[CSRF.ResponseTokenField];
    expect(token).toEqual(expect.any(String));
    return token as string;
};

const loginAdmin = async (app: Express) => {
    const agent = request.agent(app);
    const loginToken = await getCsrfToken(agent);
    await agent
        .post(REST_ROUTES.auth.login)
        .set(CSRF.HeaderName, loginToken)
        .send({ email: "admin@example.test", password: "AdminPass123!" })
        .expect(200);
    const authenticatedToken = await getCsrfToken(agent);
    return { agent, csrfToken: authenticatedToken };
};

describe("Account and gallery REST contracts", () => {
    let container: StartedPostgreSqlContainer;
    let prisma: PrismaClient;
    let app: Express;
    let testProject: ReturnType<typeof createTestProjectDir>;

    beforeAll(async () => {
        testProject = createTestProjectDir("nln-account-gallery-contracts");
        process.env.PROJECT_DIR = testProject.projectDir;
        process.env.JWT_SECRET = "test-jwt-secret-key";
        process.env.CSRF_SECRET = "test-csrf-secret-key";
        process.env.SITE_NAME = "test.example.com";

        const database = await startPostgresTestDatabase("test_account_gallery_contracts");
        container = database.container;
        prisma = database.prisma;
        app = await createRestTestApp(prisma, { csrf: true });
    }, 120000);

    afterAll(async () => {
        await stopPostgresTestDatabase(prisma, container);
        testProject?.cleanup();
    });

    beforeEach(async () => {
        await truncatePublicTables(prisma);
        await prisma.role.createMany({
            data: [{ title: "Customer" }, { title: "Admin" }],
        });

        const adminRole = await prisma.role.findUniqueOrThrow({ where: { title: "Admin" } });
        await prisma.customer.create({
            data: {
                firstName: "Admin",
                lastName: "User",
                accountApproved: true,
                emailVerified: true,
                password: await bcrypt.hash("AdminPass123!", 10),
                emails: { create: { emailAddress: "admin@example.test" } },
                roles: { create: { roleId: adminRole.id } },
            },
        });
    });

    it("enforces CSRF on public signup", async () => {
        const response = await request(app)
            .post(REST_ROUTES.auth.signup)
            .send(currentSignupPayload());

        expect(response.status).toBe(403);
        expect(response.body).toMatchObject({
            code: CODE.CsrfValidationFailed.code,
        });
    });

    it("accepts the current signup payload and persists contact and preference fields", async () => {
        const agent = request.agent(app);
        const csrfToken = await getCsrfToken(agent);

        const response = await agent
            .post(REST_ROUTES.auth.signup)
            .set(CSRF.HeaderName, csrfToken)
            .send(currentSignupPayload())
            .expect(200);

        expect(response.body).toMatchObject({
            id: expect.any(String),
            accountApproved: false,
            emailVerified: false,
        });

        const customer = await prisma.customer.findUniqueOrThrow({
            where: { id: response.body.id },
            include: {
                business: true,
                emails: true,
                phones: true,
                roles: { include: { role: true } },
            },
        });
        expect(customer.emails[0]?.emailAddress).toBe("contract-user@example.test");
        expect(customer.phones[0]?.number).toBe("555-555-0123");
        expect(customer.business?.name).toBe("Contract Nursery");
        expect(customer.business?.subscribedToNewsletters).toBe(false);
        expect(customer.roles.map(({ role }) => role.title)).toContain("Customer");
    });

    it("rejects the retired nested signup payload shape", async () => {
        const agent = request.agent(app);
        const csrfToken = await getCsrfToken(agent);

        const response = await agent
            .post(REST_ROUTES.auth.signup)
            .set(CSRF.HeaderName, csrfToken)
            .send({
                firstName: "Old",
                lastName: "Shape",
                businessName: "Old Business",
                emails: [{ emailAddress: "old-shape@example.test" }],
                phones: [{ number: "555-555-9999" }],
                password: "ValidPass123!",
            });

        expect(response.status).toBe(400);
    });

    it("creates reset-password requests for existing accounts", async () => {
        const agent = request.agent(app);
        const csrfToken = await getCsrfToken(agent);

        await agent
            .post(REST_ROUTES.auth.requestPasswordChange)
            .set(CSRF.HeaderName, csrfToken)
            .send({ email: "admin@example.test" })
            .expect(200);

        const admin = await prisma.customer.findFirstOrThrow({
            where: { emails: { some: { emailAddress: "admin@example.test" } } },
        });
        expect(admin.resetPasswordCode).toEqual(expect.any(String));
        expect(admin.lastResetPasswordReqestAttempt).toBeInstanceOf(Date);
    });

    it("orders gallery images by label index and updates metadata under CSRF", async () => {
        await prisma.image.create({
            data: {
                hash: "gallery-late",
                alt: "Late image",
                description: "Late description",
                files: { create: { src: "images/gallery-late-XXL.png", width: 16, height: 16 } },
                image_labels: { create: { label: IMAGE_LABELS.Gallery, index: 2 } },
            },
        });
        await prisma.image.create({
            data: {
                hash: "gallery-early",
                alt: "Early image",
                description: "Early description",
                files: { create: { src: "images/gallery-early-XXL.png", width: 16, height: 16 } },
                image_labels: { create: { label: IMAGE_LABELS.Gallery, index: 1 } },
            },
        });

        const listed = await request(app)
            .get(REST_ROUTES.images.byLabel(IMAGE_LABELS.Gallery))
            .expect(200);
        expect(listed.body.map((image: { hash: string }) => image.hash)).toEqual([
            "gallery-early",
            "gallery-late",
        ]);

        const { agent, csrfToken } = await loginAdmin(app);
        await agent
            .put(REST_ROUTES.images.root)
            .send({
                images: [
                    {
                        hash: "gallery-late",
                        label: IMAGE_LABELS.Gallery,
                        alt: "Updated late image",
                        description: "Updated late description",
                    },
                    {
                        hash: "gallery-early",
                        label: IMAGE_LABELS.Gallery,
                        alt: "Updated early image",
                        description: "Updated early description",
                    },
                ],
            })
            .expect(403);

        await agent
            .put(REST_ROUTES.images.root)
            .set(CSRF.HeaderName, csrfToken)
            .send({
                images: [
                    {
                        hash: "gallery-late",
                        label: IMAGE_LABELS.Gallery,
                        alt: "Updated late image",
                        description: "Updated late description",
                    },
                    {
                        hash: "gallery-early",
                        label: IMAGE_LABELS.Gallery,
                        alt: "Updated early image",
                        description: "Updated early description",
                    },
                ],
            })
            .expect(200);

        const updated = await request(app)
            .get(REST_ROUTES.images.byLabel(IMAGE_LABELS.Gallery))
            .expect(200);
        expect(updated.body.map((image: { hash: string }) => image.hash)).toEqual([
            "gallery-late",
            "gallery-early",
        ]);
        expect(updated.body[0]).toMatchObject({
            alt: "Updated late image",
            description: "Updated late description",
        });
    });

    it("blocks in-use image deletion without force and deletes it with force", async () => {
        const imageDir = path.join(testProject.projectDir, "assets/images");
        fs.mkdirSync(imageDir, { recursive: true });
        fs.writeFileSync(path.join(imageDir, "gallery-delete-XXL.png"), "fake image bytes");

        await prisma.image.create({
            data: {
                hash: "gallery-delete",
                alt: "Delete candidate",
                files: { create: { src: "images/gallery-delete-XXL.png", width: 16, height: 16 } },
                image_labels: { create: { label: IMAGE_LABELS.Gallery, index: 0 } },
            },
        });

        const { agent, csrfToken } = await loginAdmin(app);

        const blocked = await agent
            .delete(`${REST_ROUTES.images.root}/gallery-delete`)
            .set(CSRF.HeaderName, csrfToken)
            .expect(409);
        expect(blocked.body).toMatchObject({
            error: "Cannot delete image while in use",
            usage: { usedInLabels: [IMAGE_LABELS.Gallery] },
        });

        await agent
            .delete(`${REST_ROUTES.images.root}/gallery-delete?force=true`)
            .set(CSRF.HeaderName, csrfToken)
            .expect(200);

        await expect(
            prisma.image.findUnique({ where: { hash: "gallery-delete" } })
        ).resolves.toBeNull();
        expect(fs.existsSync(path.join(imageDir, "gallery-delete-XXL.png"))).toBe(false);
    });
});
