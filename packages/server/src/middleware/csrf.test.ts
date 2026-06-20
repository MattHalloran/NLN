import { CODE, CSRF } from "@local/shared";
import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { csrfErrorHandler, exemptFromCsrf, isValidCsrfToken } from "./csrf.js";

vi.mock("../logger.js", () => ({
    LogLevel: {
        debug: "debug",
        error: "error",
        warn: "warn",
    },
    logger: {
        log: vi.fn(),
    },
}));

const response = () => {
    const res = {
        status: vi.fn(),
        json: vi.fn(),
    };

    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);

    return res as unknown as Response & {
        status: ReturnType<typeof vi.fn>;
        json: ReturnType<typeof vi.fn>;
    };
};

const request = (overrides: Partial<Request> = {}) =>
    ({
        cookies: {},
        headers: {},
        ip: "127.0.0.1",
        method: "POST",
        path: "/api/rest/v1/example",
        ...overrides,
    }) as Request;

describe("csrf middleware helpers", () => {
    it("returns a structured 403 response for CSRF errors", () => {
        const req = request({
            cookies: { [CSRF.CookieName]: "cookie-token-value" },
            headers: {
                [CSRF.HeaderName.toLowerCase()]: "header-token-value",
                "user-agent": "vitest",
            },
        });
        const res = response();
        const next = vi.fn() as NextFunction;

        csrfErrorHandler({ name: "Error", message: "invalid csrf token" }, req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            error: "Invalid or missing CSRF token",
            code: CODE.CsrfValidationFailed.code,
            message: CODE.CsrfValidationFailed.message,
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("passes non-CSRF errors to the next error handler", () => {
        const req = request();
        const res = response();
        const next = vi.fn() as NextFunction;
        const error = new Error("database unavailable");

        csrfErrorHandler(error, req, res, next);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith(error);
    });

    it("exempts documented routes and delegates to the next middleware", () => {
        const next = vi.fn() as NextFunction;

        exemptFromCsrf("public signup")(request(), response(), next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    it("keeps manual token validation explicitly permissive", () => {
        expect(isValidCsrfToken(request())).toBe(true);
    });
});
