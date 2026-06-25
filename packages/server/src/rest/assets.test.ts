import { REST_CHILD_PATHS } from "@local/shared";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import assetsRouter from "./assets.js";

const { readFiles, auditSecurityEvent, loggerLog } = vi.hoisted(() => ({
    readFiles: vi.fn(),
    auditSecurityEvent: vi.fn(),
    loggerLog: vi.fn(),
}));

vi.mock("../utils/index.js", () => ({
    readFiles,
    saveFiles: vi.fn(),
}));

vi.mock("../utils/auditLogger.js", () => ({
    AuditEventType: {
        SECURITY_UNAUTHORIZED_ACCESS: "SECURITY_UNAUTHORIZED_ACCESS",
    },
    auditSecurityEvent,
}));

vi.mock("../logger.js", () => ({
    LogLevel: {
        error: "error",
        warn: "warn",
    },
    logger: {
        log: loggerLog,
    },
}));

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use(assetsRouter);
    return app;
};

describe("assets REST routes", () => {
    beforeEach(() => {
        readFiles.mockReset();
        auditSecurityEvent.mockReset();
        loggerLog.mockReset();
    });

    it("reads whitelisted public documents", async () => {
        readFiles.mockResolvedValue(["Privacy text", "Terms text"]);

        const response = await request(createApp())
            .post(REST_CHILD_PATHS.assets.read)
            .send({ files: ["privacy.md", "terms.md"] });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            "privacy.md": "Privacy text",
            "terms.md": "Terms text",
        });
        expect(readFiles).toHaveBeenCalledWith(["privacy.md", "terms.md"]);
        expect(auditSecurityEvent).not.toHaveBeenCalled();
    });

    it("blocks non-whitelisted public reads and logs an audit event", async () => {
        const response = await request(createApp())
            .post(REST_CHILD_PATHS.assets.read)
            .send({ files: ["privacy.md", ".env-prod"] });

        expect(response.status).toBe(403);
        expect(response.body).toMatchObject({
            error: "Access denied to requested files",
            deniedFiles: [".env-prod"],
        });
        expect(readFiles).not.toHaveBeenCalled();
        expect(auditSecurityEvent).toHaveBeenCalledWith(
            expect.anything(),
            "SECURITY_UNAUTHORIZED_ACCESS",
            "Attempted to read non-whitelisted files",
            expect.objectContaining({
                deniedFiles: [".env-prod"],
                allowedFiles: ["privacy.md", "terms.md"],
            })
        );
    });

    it("rejects malformed file lists", async () => {
        const response = await request(createApp())
            .post(REST_CHILD_PATHS.assets.read)
            .send({ files: ["privacy.md", 123] });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: "Files array required" });
        expect(readFiles).not.toHaveBeenCalled();
    });
});
