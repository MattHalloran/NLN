import { describe, expect, it } from "vitest";
import {
    buildAllowedCorsOrigins,
    buildHelmetOptions,
    getAppRuntime,
    getCookieSecurityOptions,
    isLocalHttpRuntime,
    isPublicHttpsRuntime,
} from "./runtimePolicy.js";

describe("runtime policy", () => {
    it("treats explicit APP_RUNTIME as the strongest runtime signal", () => {
        expect(
            getAppRuntime({
                APP_RUNTIME: "local-production",
                NODE_ENV: "production",
                SERVER_LOCATION: "dns",
            })
        ).toBe("local-production");
    });

    it("allows canonical HTTPS virtual hosts for public production", () => {
        expect(
            buildAllowedCorsOrigins({
                APP_RUNTIME: "production",
                VIRTUAL_HOST: "example.com,www.example.com",
            })
        ).toEqual(["https://example.com", "https://www.example.com"]);
    });

    it("adds local browser origins for local HTTP runtimes", () => {
        expect(
            buildAllowedCorsOrigins({
                APP_RUNTIME: "local-production",
                NODE_ENV: "production",
                VIRTUAL_HOST: "example.com",
                UI_URL: "http://localhost:3001",
            })
        ).toEqual(
            expect.arrayContaining([
                "https://example.com",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
            ])
        );
    });

    it("parses, trims, and de-duplicates explicit CORS origins", () => {
        expect(
            buildAllowedCorsOrigins({
                APP_RUNTIME: "production",
                VIRTUAL_HOST: "example.com",
                CORS_ORIGINS:
                    " https://admin.example.com, https://example.com, ,https://admin.example.com ",
            })
        ).toEqual(["https://example.com", "https://admin.example.com"]);
    });

    it("separates local production from public HTTPS production for cookie security", () => {
        expect(
            getCookieSecurityOptions({
                APP_RUNTIME: "local-production",
                NODE_ENV: "production",
                SERVER_URL: "http://localhost:5331/api",
            })
        ).toMatchObject({
            secure: false,
            sameSite: "lax",
            path: "/",
        });

        expect(
            getCookieSecurityOptions({
                APP_RUNTIME: "production",
                NODE_ENV: "production",
                SERVER_URL: "https://example.com/api",
            }).secure
        ).toBe(true);
    });

    it("supports an explicit COOKIE_SECURE override", () => {
        expect(
            getCookieSecurityOptions({
                APP_RUNTIME: "production",
                SERVER_URL: "https://example.com/api",
                COOKIE_SECURE: "false",
            }).secure
        ).toBe(false);

        expect(
            getCookieSecurityOptions({
                APP_RUNTIME: "local-production",
                SERVER_URL: "http://localhost:5331/api",
                COOKIE_SECURE: "true",
            }).secure
        ).toBe(true);
    });

    it("keeps strict production Helmet policy and relaxes only local HTTP runtime needs", () => {
        const productionHelmet = buildHelmetOptions({
            APP_RUNTIME: "production",
            SERVER_URL: "https://example.com/api",
        });
        const localHelmet = buildHelmetOptions({
            APP_RUNTIME: "local-production",
            SERVER_URL: "http://localhost:5331/api",
        });

        expect(productionHelmet.contentSecurityPolicy.directives.connectSrc).toEqual(["'self'"]);
        expect(productionHelmet.contentSecurityPolicy.directives).toHaveProperty(
            "upgradeInsecureRequests"
        );
        expect(productionHelmet.hsts).not.toBe(false);
        expect(productionHelmet.crossOriginResourcePolicy.policy).toBe("same-origin");
        expect(localHelmet.contentSecurityPolicy.useDefaults).toBe(false);

        expect(localHelmet.contentSecurityPolicy.directives.connectSrc).toEqual([
            "'self'",
            "http://localhost:5331",
        ]);
        expect(localHelmet.contentSecurityPolicy.directives).not.toHaveProperty(
            "upgradeInsecureRequests"
        );
        expect(localHelmet.hsts).toBe(false);
        expect(localHelmet.crossOriginResourcePolicy.policy).toBe("cross-origin");
    });

    it("classifies local and public HTTPS runtime modes", () => {
        expect(isLocalHttpRuntime({ APP_RUNTIME: "local-production" })).toBe(true);
        expect(
            isPublicHttpsRuntime({
                APP_RUNTIME: "production",
                SERVER_URL: "https://example.com/api",
            })
        ).toBe(true);
        expect(
            isPublicHttpsRuntime({
                APP_RUNTIME: "production",
                SERVER_URL: "http://localhost:5331/api",
            })
        ).toBe(false);
    });
});
