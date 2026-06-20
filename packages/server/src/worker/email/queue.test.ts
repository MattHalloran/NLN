import { beforeEach, describe, expect, it, vi } from "vitest";

const queueMocks = vi.hoisted(() => {
    const mockQueue = {
        add: vi.fn().mockResolvedValue({ id: "job-1" }),
        process: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
    };
    return {
        Bull: vi.fn(() => mockQueue),
        mockQueue,
        readFileSync: vi.fn(),
    };
});

vi.mock("bull", () => ({
    default: queueMocks.Bull,
}));

vi.mock("fs", async (importOriginal) => {
    const actual = await importOriginal<typeof import("fs")>();
    const defaultExport = {
        ...actual,
        readFileSync: queueMocks.readFileSync,
    };
    return {
        ...actual,
        default: defaultExport,
        readFileSync: queueMocks.readFileSync,
    };
});

describe("email queue wrapper", () => {
    beforeEach(() => {
        vi.resetModules();
        queueMocks.Bull.mockClear();
        queueMocks.mockQueue.add.mockClear();
        queueMocks.mockQueue.process.mockClear();
        queueMocks.mockQueue.close.mockClear();
        queueMocks.readFileSync.mockReset();
        queueMocks.readFileSync.mockReturnValue(
            JSON.stringify({
                BUSINESS_NAME: { Long: "New Life Nursery", Short: "NLN" },
                WEBSITE: "https://example.test",
            })
        );
        delete process.env.SITE_EMAIL_USERNAME;
    });

    it("loads the website from business config", async () => {
        const { loadBusinessConfig } = await import("./queue.js");

        expect(loadBusinessConfig()).toMatchObject({
            WEBSITE: "https://example.test",
        });
        expect(queueMocks.readFileSync).toHaveBeenCalledWith(
            expect.stringContaining("business.json"),
            "utf8"
        );
    });

    it("creates and registers the Bull email queue", async () => {
        const { createEmailQueue, registerEmailProcessor } = await import("./queue.js");

        const queue = createEmailQueue();
        registerEmailProcessor(queue);

        expect(queueMocks.Bull).toHaveBeenCalledWith(
            "email",
            expect.objectContaining({
                redis: expect.objectContaining({
                    host: expect.any(String),
                    port: expect.any(Number),
                }),
            })
        );
        expect(queueMocks.mockQueue.process).toHaveBeenCalledWith(expect.any(Function));
    });

    it("queues arbitrary email payloads through the initialized queue", async () => {
        const { sendMail } = await import("./queue.js");

        sendMail(["person@example.com"], "Subject", "Plain", "<p>Html</p>");

        expect(queueMocks.mockQueue.process).toHaveBeenCalledWith(expect.any(Function));
        expect(queueMocks.mockQueue.add).toHaveBeenCalledWith({
            to: ["person@example.com"],
            subject: "Subject",
            text: "Plain",
            html: "<p>Html</p>",
        });
    });

    it("queues order notifications with the configured website", async () => {
        process.env.SITE_EMAIL_USERNAME = "admin@example.com";
        const { orderNotifyAdmin } = await import("./queue.js");

        orderNotifyAdmin();

        expect(queueMocks.mockQueue.add).toHaveBeenCalledWith({
            to: ["admin@example.com"],
            subject: "New Order Received!",
            text: "A new order has been submitted. It can be viewed at https://example.test/admin/orders",
            html: '<p>A new order has been submitted. It can be viewed at <a href="https://example.test/admin/orders">https://example.test/admin/orders</a></p>',
        });
    });

    it("queues feedback notifications to the configured admin email", async () => {
        process.env.SITE_EMAIL_USERNAME = "admin@example.com";
        const { feedbackNotifyAdmin } = await import("./queue.js");

        feedbackNotifyAdmin("Great service", "customer@example.com");

        expect(queueMocks.mockQueue.add).toHaveBeenCalledWith({
            to: ["admin@example.com"],
            subject: "You've received feedback!",
            text: "Feedback from customer@example.com: Great service",
        });
    });

    it("closes and clears the initialized email queue", async () => {
        const { closeEmailQueue, sendMail } = await import("./queue.js");

        sendMail(["person@example.com"], "Subject", "Plain", "<p>Html</p>");
        await closeEmailQueue();
        await closeEmailQueue();

        expect(queueMocks.mockQueue.close).toHaveBeenCalledTimes(1);
    });
});
