import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request } from "express";
import {
    auditAdminAction,
    auditAuthEvent,
    auditLog,
    auditSecurityEvent,
    AuditEventType,
    getRequestMetadata,
} from "./auditLogger.js";
import { logger } from "../logger.js";

describe("audit logger utilities", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("extracts request metadata for audit entries", () => {
        const metadata = getRequestMetadata({
            ip: "203.0.113.50",
            headers: { "user-agent": "vitest" },
            customerId: "customer-1",
            customer: { firstName: "Ada", lastName: "Lovelace" },
        } as unknown as Request);

        expect(metadata).toEqual({
            ip: "203.0.113.50",
            userAgent: "vitest",
            userId: "customer-1",
            userName: "Ada Lovelace",
        });
    });

    it("logs audit entries at the level implied by status", () => {
        const logSpy = vi.spyOn(logger, "log").mockImplementation(() => logger);

        auditLog({ eventType: AuditEventType.AUTH_LOGIN_SUCCESS, status: "success" });
        auditLog({ eventType: AuditEventType.AUTH_LOGIN_FAILURE, status: "failure" });
        auditLog({ eventType: AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY, status: "warning" });

        expect(logSpy).toHaveBeenCalledWith(
            "info",
            "AUDIT: auth.login.success",
            expect.objectContaining({ status: "success" })
        );
        expect(logSpy).toHaveBeenCalledWith(
            "error",
            "AUDIT: auth.login.failure",
            expect.objectContaining({ status: "failure" })
        );
        expect(logSpy).toHaveBeenCalledWith(
            "warn",
            "AUDIT: security.suspicious.activity",
            expect.objectContaining({ status: "warning" })
        );
    });

    it("builds auth, admin, and security audit events from request metadata", () => {
        const logSpy = vi.spyOn(logger, "log").mockImplementation(() => logger);
        const req = {
            ip: "203.0.113.51",
            headers: { "user-agent": "vitest" },
            customerId: "customer-2",
        } as unknown as Request;

        auditAuthEvent(req, AuditEventType.AUTH_LOGOUT, "success", { reason: "test" });
        auditAdminAction(req, AuditEventType.ADMIN_IMAGE_UPDATE, "images", undefined, {
            hash: "abc",
        });
        auditSecurityEvent(req, AuditEventType.SECURITY_CSRF_FAILURE, "bad token", {
            path: "/api",
        });

        expect(logSpy).toHaveBeenCalledWith(
            "info",
            "AUDIT: auth.logout",
            expect.objectContaining({
                ip: "203.0.113.51",
                userId: "customer-2",
                details: { reason: "test" },
            })
        );
        expect(logSpy).toHaveBeenCalledWith(
            "info",
            "AUDIT: admin.image.update",
            expect.objectContaining({
                resource: "images",
                afterState: { hash: "abc" },
            })
        );
        expect(logSpy).toHaveBeenCalledWith(
            "warn",
            "AUDIT: security.csrf.failure",
            expect.objectContaining({
                errorMessage: "bad token",
                details: { path: "/api" },
            })
        );
    });
});
