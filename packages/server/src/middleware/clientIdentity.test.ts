import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REST_ROUTES } from "@local/shared";
import {
    getClientIdentity,
    getClientRateLimitKey,
    requestIdentityDiagnostics,
} from "./clientIdentity.js";
import { logger } from "../logger.js";

describe("client identity middleware helpers", () => {
    afterEach(() => {
        delete process.env.RATE_LIMIT_DIAGNOSTICS;
        vi.restoreAllMocks();
    });

    it("uses Express trust proxy resolution as the identity source", async () => {
        const app = express();
        app.set("trust proxy", 1);
        app.get("/identity", (req, res) => {
            const identity = getClientIdentity(req);
            res.json({
                ip: identity.ip,
                ips: identity.ips,
                forwardedFor: identity.forwardedFor,
                rateLimitKey: getClientRateLimitKey(req),
            });
        });

        const response = await request(app).get("/identity").set("X-Forwarded-For", "203.0.113.10");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            ip: "203.0.113.10",
            ips: ["203.0.113.10"],
            forwardedFor: "203.0.113.10",
            rateLimitKey: "203.0.113.10",
        });
    });

    it("falls back to the socket address when Express has no resolved ip", () => {
        const identity = getClientIdentity({
            headers: {},
            ips: [],
            socket: { remoteAddress: "127.0.0.1" },
        } as never);

        expect(identity).toMatchObject({
            ip: "127.0.0.1",
            ips: [],
            source: "express",
        });
    });

    it("documents that forwarded test-net IPs collapse when trust proxy is disabled", async () => {
        const app = express();
        app.set("trust proxy", false);
        app.get("/identity", (req, res) => {
            const identity = getClientIdentity(req);
            res.json({
                ip: identity.ip,
                ips: identity.ips,
                rateLimitKey: getClientRateLimitKey(req),
            });
        });

        const [first, second] = await Promise.all([
            request(app).get("/identity").set("X-Forwarded-For", "203.0.113.10"),
            request(app).get("/identity").set("X-Forwarded-For", "203.0.113.11"),
        ]);

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(first.body.ip).not.toBe("203.0.113.10");
        expect(second.body.ip).not.toBe("203.0.113.11");
        expect(first.body.rateLimitKey).toBe(second.body.rateLimitKey);
    });

    it("groups IPv6 addresses with express-rate-limit's safe default subnet helper", async () => {
        const app = express();
        app.set("trust proxy", 1);
        app.get("/identity", (req, res) => {
            res.json({ rateLimitKey: getClientRateLimitKey(req) });
        });

        const [first, second] = await Promise.all([
            request(app).get("/identity").set("X-Forwarded-For", "2001:db8:abcd:1200::1"),
            request(app).get("/identity").set("X-Forwarded-For", "2001:db8:abcd:1200::2"),
        ]);

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(first.body.rateLimitKey).toBe(second.body.rateLimitKey);
        expect(first.body.rateLimitKey).not.toContain("::1");
    });

    it("logs sanitized diagnostics only when explicitly enabled", async () => {
        process.env.RATE_LIMIT_DIAGNOSTICS = "true";
        const logSpy = vi.spyOn(logger, "log").mockImplementation(() => logger);
        const app = express();
        app.set("trust proxy", 1);
        app.use(REST_ROUTES.root, requestIdentityDiagnostics);
        app.get(REST_ROUTES.auth.session, (_req, res) => res.json({ ok: true }));

        const response = await request(app)
            .get(REST_ROUTES.auth.session)
            .set("X-Forwarded-For", "203.0.113.12")
            .set("Authorization", "Bearer secret-token")
            .set("Cookie", "secret-cookie=value");

        expect(response.status).toBe(200);
        expect(logSpy).toHaveBeenCalledWith(
            "info",
            "Request identity diagnostic",
            expect.objectContaining({
                ip: "203.0.113.12",
                rateLimitKey: "203.0.113.12",
                xForwardedFor: "203.0.113.12",
            })
        );
        expect(JSON.stringify(logSpy.mock.calls)).not.toContain("secret-cookie");
        expect(JSON.stringify(logSpy.mock.calls)).not.toContain("secret-token");
    });

    it("skips diagnostics when disabled or when the route is not diagnostic-worthy", async () => {
        const logSpy = vi.spyOn(logger, "log").mockImplementation(() => logger);
        const app = express();
        app.set("trust proxy", 1);
        app.use(REST_ROUTES.root, requestIdentityDiagnostics);
        app.get(REST_ROUTES.csrfToken, (_req, res) => res.json({ ok: true }));

        const disabledResponse = await request(app)
            .get(REST_ROUTES.csrfToken)
            .set("X-Forwarded-For", "203.0.113.13");

        process.env.RATE_LIMIT_DIAGNOSTICS = "true";
        const untrackedRouteResponse = await request(app)
            .get(REST_ROUTES.csrfToken)
            .set("X-Forwarded-For", "203.0.113.13");

        expect(disabledResponse.status).toBe(200);
        expect(untrackedRouteResponse.status).toBe(200);
        expect(logSpy).not.toHaveBeenCalled();
    });
});
