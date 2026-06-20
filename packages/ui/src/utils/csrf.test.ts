import { CSRF } from "@local/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clearCookie = () => {
    document.cookie = `${CSRF.CookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

const csrfResponse = (token: string): Response =>
    ({
        ok: true,
        json: vi.fn().mockResolvedValue({ [CSRF.ResponseTokenField]: token }),
    }) as unknown as Response;

describe("CSRF utilities", () => {
    beforeEach(() => {
        vi.resetModules();
        clearCookie();
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        clearCookie();
        vi.unstubAllGlobals();
    });

    it("reads and caches a same-origin CSRF cookie", async () => {
        document.cookie = `${CSRF.CookieName}=cookie-token`;
        const { getCsrfToken, getCsrfTokenSync } = await import("./csrf");

        await expect(getCsrfToken()).resolves.toBe("cookie-token");

        expect(getCsrfTokenSync()).toBe("cookie-token");
        expect(fetch).not.toHaveBeenCalled();
    });

    it("deduplicates concurrent token fetches and caches the result", async () => {
        vi.mocked(fetch).mockResolvedValue(csrfResponse("server-token"));
        const { getCsrfToken, getCsrfTokenSync } = await import("./csrf");

        const [firstToken, secondToken] = await Promise.all([getCsrfToken(), getCsrfToken()]);

        expect(firstToken).toBe("server-token");
        expect(secondToken).toBe("server-token");
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/csrf-token"), {
            method: "GET",
            credentials: "include",
        });
        expect(getCsrfTokenSync()).toBe("server-token");
    });

    it("refreshes by clearing existing token state and fetching a replacement", async () => {
        document.cookie = `${CSRF.CookieName}=old-token`;
        vi.mocked(fetch).mockResolvedValue(csrfResponse("new-token"));
        const { getCsrfToken, refreshCsrfToken } = await import("./csrf");

        await expect(getCsrfToken()).resolves.toBe("old-token");
        await expect(refreshCsrfToken()).resolves.toBe("new-token");
        await expect(getCsrfToken()).resolves.toBe("new-token");

        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("exposes CSRF header and method protection helpers", async () => {
        const { getCsrfHeaderName, requiresCsrfToken } = await import("./csrf");

        expect(getCsrfHeaderName()).toBe(CSRF.HeaderName);
        expect(requiresCsrfToken("POST")).toBe(true);
        expect(requiresCsrfToken("get")).toBe(false);
    });
});
