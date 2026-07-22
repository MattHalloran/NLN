import cors from "cors";
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { REST_ROUTES } from "@local/shared";
import { buildCorsOptions } from "./runtimePolicy.js";

const createCorsApp = () => {
    const onBlockedOrigin = vi.fn();
    const app = express();
    const corsOptions = buildCorsOptions(
        {
            APP_RUNTIME: "local-production",
            NODE_ENV: "production",
            UI_URL: "http://localhost:3001",
        },
        onBlockedOrigin
    );

    app.options("*", cors(corsOptions));
    app.use(cors(corsOptions));
    app.get(REST_ROUTES.csrfToken, (_req, res) => {
        res.json({ ok: true });
    });

    return { app, onBlockedOrigin };
};

describe("runtime CORS options", () => {
    it("allows credentialed local production preflight requests", async () => {
        const { app, onBlockedOrigin } = createCorsApp();

        const response = await request(app)
            .options(REST_ROUTES.csrfToken)
            .set("Origin", "http://localhost:3001")
            .set("Access-Control-Request-Method", "GET");

        expect(response.status).toBe(204);
        expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3001");
        expect(response.headers["access-control-allow-credentials"]).toBe("true");
        expect(onBlockedOrigin).not.toHaveBeenCalled();
    });

    it("does not reflect blocked origins or turn them into server errors", async () => {
        const { app, onBlockedOrigin } = createCorsApp();

        const response = await request(app)
            .options(REST_ROUTES.csrfToken)
            .set("Origin", "https://attacker.example")
            .set("Access-Control-Request-Method", "GET");

        expect(response.status).not.toBe(500);
        expect(response.headers["access-control-allow-origin"]).toBeUndefined();
        expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
        expect(onBlockedOrigin).toHaveBeenCalledWith("https://attacker.example");
    });

    it("sets credential headers for allowed simple requests", async () => {
        const { app } = createCorsApp();

        const response = await request(app)
            .get(REST_ROUTES.csrfToken)
            .set("Origin", "http://localhost:3001");

        expect(response.status).toBe(200);
        expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3001");
        expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });
});
