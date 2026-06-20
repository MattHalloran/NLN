import { CODE, CSRF, REST_ROUTES, stripApiPrefix } from "@local/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../utils/serverUrl", () => ({
    getServerUrl: () => "https://server.test/api",
}));

const csrfMocks = vi.hoisted(() => ({
    getCsrfToken: vi.fn(async (): Promise<string | null> => null),
    refreshCsrfToken: vi.fn(async (): Promise<string | null> => null),
    requiresCsrfToken: vi.fn((method: string): boolean => method !== "GET"),
}));

vi.mock("../../utils/csrf", () => csrfMocks);

const jsonResponse = (body: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
        ...init,
    });

describe("restApi client", () => {
    beforeEach(() => {
        csrfMocks.getCsrfToken.mockResolvedValue("csrf-token");
        csrfMocks.refreshCsrfToken.mockResolvedValue("fresh-token");
        csrfMocks.requiresCsrfToken.mockImplementation((method) => method !== "GET");
        vi.stubGlobal("fetch", vi.fn());
    });

    it("sends GET requests with query params and credentials", async () => {
        const { restApi } = await import("./client");
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({
                content: {},
                theme: {},
                layout: {},
                experiments: {},
            }),
        );

        await restApi.getLandingPageContent({ onlyActive: false, variantId: "variant-a" });

        expect(fetch).toHaveBeenCalledWith(
            `https://server.test/api${stripApiPrefix(
                REST_ROUTES.landingPage.root,
            )}?onlyActive=false&variantId=variant-a`,
            expect.objectContaining({
                method: "GET",
                credentials: "include",
            }),
        );
        expect(csrfMocks.getCsrfToken).not.toHaveBeenCalled();
    });

    it("attaches JSON and CSRF headers for state-changing requests", async () => {
        const { restApi } = await import("./client");
        vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true }));

        await restApi.logout();

        const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
        expect(init).toEqual(
            expect.objectContaining({
                method: "POST",
                credentials: "include",
            }),
        );
        expect((init?.headers as Headers).get(CSRF.HeaderName)).toBe("csrf-token");
        expect((init?.headers as Headers).get("Content-Type")).toBe("application/json");
    });

    it("throws ApiError with response details for HTTP failures", async () => {
        const { ApiError, getApiErrorCode, restApi } = await import("./client");
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse(
                {
                    error: "Invalid credentials",
                    code: "AUTH_INVALID",
                },
                {
                    status: 401,
                    statusText: "Unauthorized",
                },
            ),
        );

        const request = restApi.login({ email: "person@example.com", password: "bad-password" });

        await expect(request).rejects.toBeInstanceOf(ApiError);
        await expect(request).rejects.toMatchObject({
            status: 401,
            message: "Invalid credentials",
            data: {
                code: "AUTH_INVALID",
            },
        });
        await expect(request.catch(getApiErrorCode)).resolves.toBe("AUTH_INVALID");
    });

    it("refreshes CSRF and retries once on CSRF validation failures", async () => {
        const { restApi } = await import("./client");
        vi.mocked(fetch)
            .mockResolvedValueOnce(
                jsonResponse(
                    {
                        error: "CSRF failed",
                        code: CODE.CsrfValidationFailed.code,
                    },
                    { status: 403, statusText: "Forbidden" },
                ),
            )
            .mockResolvedValueOnce(jsonResponse({ success: true }));

        await expect(restApi.logout()).resolves.toEqual({ success: true });

        expect(csrfMocks.refreshCsrfToken).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("throws a typed CSRF unavailable error before fetch when no token is available", async () => {
        const { getApiErrorCode, restApi } = await import("./client");
        csrfMocks.getCsrfToken.mockResolvedValueOnce(null);
        globalThis.allowConsoleError("[CSRF] Failed to get CSRF token");

        const request = restApi.logout();

        await expect(request).rejects.toMatchObject({
            status: 500,
            message: CODE.CsrfTokenUnavailable.message,
        });
        await expect(request.catch(getApiErrorCode)).resolves.toBe(CODE.CsrfTokenUnavailable.code);
        expect(fetch).not.toHaveBeenCalled();
    });

    it("submits newsletter signup with normalized endpoint, JSON body, credentials, and CSRF", async () => {
        const { restApi } = await import("./client");
        vi.mocked(fetch).mockResolvedValueOnce(
            jsonResponse({ success: true, message: "Thank you for subscribing!" }),
        );

        await expect(
            restApi.subscribeToNewsletter({
                email: "person@example.com",
                variantId: "variant-a",
                source: "homepage",
            }),
        ).resolves.toEqual({ success: true, message: "Thank you for subscribing!" });

        expect(fetch).toHaveBeenCalledWith(
            `https://server.test/api${stripApiPrefix(REST_ROUTES.newsletter.subscribe)}`,
            expect.objectContaining({
                method: "POST",
                credentials: "include",
                body: JSON.stringify({
                    email: "person@example.com",
                    variantId: "variant-a",
                    source: "homepage",
                }),
            }),
        );
        const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
        expect((init?.headers as Headers).get(CSRF.HeaderName)).toBe("csrf-token");
    });

    it("exports newsletter subscribers as a credentialed CSV request with optional status filter", async () => {
        const { restApi } = await import("./client");
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response("Email\nperson@example.com", {
                status: 200,
                headers: { "Content-Type": "text/csv" },
            }),
        );

        const result = await restApi.exportNewsletterSubscribers("active");

        await expect(result.text()).resolves.toBe("Email\nperson@example.com");

        expect(fetch).toHaveBeenCalledWith(
            `https://server.test/api${stripApiPrefix(
                REST_ROUTES.newsletter.subscribersExport,
            )}?status=active`,
            {
                method: "GET",
                credentials: "include",
            },
        );
        expect(csrfMocks.getCsrfToken).not.toHaveBeenCalled();
    });

    it("throws an ApiError when newsletter subscriber export fails", async () => {
        const { ApiError, restApi } = await import("./client");
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response("unauthorized", {
                status: 401,
                statusText: "Unauthorized",
            }),
        );

        const request = restApi.exportNewsletterSubscribers();

        await expect(request).rejects.toMatchObject({
            status: 401,
            message: "Failed to export subscribers: Unauthorized",
        });
        await expect(request.catch((error) => error)).resolves.toBeInstanceOf(ApiError);
    });
});
