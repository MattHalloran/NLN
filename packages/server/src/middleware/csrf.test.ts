import { CODE, CSRF, REST_ROUTES } from "@local/shared";
import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import {
    csrfErrorHandler,
    csrfProtection,
    exemptFromCsrf,
    isCsrfExemptRequest,
    isValidCsrfToken,
} from "./csrf.js";

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
        path: `${REST_ROUTES.v1}/example`,
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

    it("only exempts anonymous landing-page analytics tracking from CSRF", () => {
        expect(
            isCsrfExemptRequest(
                request({
                    method: "POST",
                    originalUrl: REST_ROUTES.landingPage.trackVariant("variant-homepage-official"),
                })
            )
        ).toBe(true);

        expect(
            isCsrfExemptRequest(
                request({
                    method: "PUT",
                    originalUrl: REST_ROUTES.landingPage.trackVariant("variant-homepage-official"),
                })
            )
        ).toBe(false);
        expect(
            isCsrfExemptRequest(
                request({
                    method: "POST",
                    originalUrl: REST_ROUTES.landingPage.contactInfo,
                })
            )
        ).toBe(false);
    });

    it("detects analytics exemptions with query strings, trailing slashes, and path fallback", () => {
        expect(
            isCsrfExemptRequest(
                request({
                    method: "post",
                    originalUrl: `${REST_ROUTES.landingPage.trackVariant("variant-homepage-official")}/?source=beacon`,
                })
            )
        ).toBe(true);

        expect(
            isCsrfExemptRequest(
                request({
                    method: "POST",
                    path: REST_ROUTES.landingPage.trackVariant("variant-homepage-official"),
                })
            )
        ).toBe(true);
    });

    it("skips CSRF middleware for anonymous landing-page analytics tracking", () => {
        const next = vi.fn() as NextFunction;

        csrfProtection(
            request({
                method: "POST",
                originalUrl: REST_ROUTES.landingPage.trackVariant("variant-homepage-official"),
            }),
            response(),
            next
        );

        expect(next).toHaveBeenCalledTimes(1);
    });

    it("delegates non-exempt safe methods to the underlying CSRF middleware", () => {
        const next = vi.fn() as NextFunction;

        csrfProtection(
            request({
                method: "GET",
                originalUrl: REST_ROUTES.landingPage.contactInfo,
            }),
            response(),
            next
        );

        expect(next).toHaveBeenCalledTimes(1);
    });

    it("keeps manual token validation explicitly permissive", () => {
        expect(isValidCsrfToken(request())).toBe(true);
    });
});
