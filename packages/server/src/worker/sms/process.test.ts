import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../logger.js", () => ({
    genErrorCode: vi.fn(() => "fixture"),
    logger: { log: vi.fn() },
    LogLevel: { info: "info", warn: "warn", error: "error" },
}));
vi.mock("twilio", () => ({ default: vi.fn(() => ({ messages: { create: vi.fn() } })) }));

describe("smsProcess delivery policy", () => {
    beforeEach(() => {
        vi.resetModules();
        delete process.env.TWILIO_ACCOUNT_SID;
        delete process.env.TWILIO_AUTH_TOKEN;
        delete process.env.PHONE_NUMBER;
    });

    it("treats disabled local delivery as a successful sink", async () => {
        process.env.SMS_MODE = "disabled";
        const { smsProcess } = await import("./process.js");
        await expect(
            smsProcess({ data: { to: ["+15555550123"], body: "fixture" } } as never)
        ).resolves.toBe(true);
    });

    it("does not silently succeed without the explicit disabled policy", async () => {
        delete process.env.SMS_MODE;
        const { smsProcess } = await import("./process.js");
        await expect(
            smsProcess({ data: { to: ["+15555550123"], body: "fixture" } } as never)
        ).resolves.toBe(false);
    });
});
