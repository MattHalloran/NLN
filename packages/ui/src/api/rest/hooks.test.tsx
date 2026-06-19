import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLandingPageContent, useLogin, useRestQuery, useSession } from "./hooks";
import { restApi } from "./client";

vi.mock("./client", () => ({
    restApi: {
        getLandingPageContent: vi.fn(),
        getSession: vi.fn(),
        login: vi.fn(),
    },
}));

describe("REST hooks", () => {
    beforeEach(() => {
        vi.mocked(restApi.getLandingPageContent).mockResolvedValue({
            content: {},
            theme: {},
            layout: {},
            experiments: {},
        } as Awaited<ReturnType<typeof restApi.getLandingPageContent>>);
        vi.mocked(restApi.getSession).mockResolvedValue({
            authenticated: false,
            user: null,
        } as Awaited<ReturnType<typeof restApi.getSession>>);
        vi.mocked(restApi.login).mockResolvedValue({
            id: "customer-1",
            emailVerified: true,
            accountApproved: true,
            status: "active",
            theme: "default",
            roles: [{ role: { title: "customer" } }],
        } as Awaited<ReturnType<typeof restApi.login>>);
    });

    it("loads landing page content and supports refetch", async () => {
        const { result } = renderHook(() => useLandingPageContent(false, "variant-a"));

        expect(result.current.loading).toBe(true);
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(restApi.getLandingPageContent).toHaveBeenCalledWith({
            onlyActive: false,
            variantId: "variant-a",
        });
        expect(result.current.data).toEqual({
            content: {},
            theme: {},
            layout: {},
            experiments: {},
        });

        await act(async () => {
            await result.current.refetch();
        });

        expect(restApi.getLandingPageContent).toHaveBeenCalledTimes(2);
    });

    it("passes an abort signal to query functions and aborts on unmount", () => {
        let querySignal: AbortSignal | undefined;
        const query = vi.fn((signal: AbortSignal): Promise<string> => {
            querySignal = signal;
            return new Promise(() => {});
        });

        const { unmount } = renderHook(() => useRestQuery(query, []));

        expect(querySignal?.aborted).toBe(false);
        unmount();
        expect(querySignal?.aborted).toBe(true);
    });

    it("exposes auth/session mutations with loading, data, and reset state", async () => {
        const login = renderHook(() => useLogin());
        const session = renderHook(() => useSession());

        await act(async () => {
            await login.result.current.mutate({
                email: "person@example.com",
                password: "password",
            });
            await session.result.current.mutate();
        });

        expect(restApi.login).toHaveBeenCalledWith({
            email: "person@example.com",
            password: "password",
        });
        expect(login.result.current.data).toEqual({
            id: "customer-1",
            emailVerified: true,
            accountApproved: true,
            status: "active",
            theme: "default",
            roles: [{ role: { title: "customer" } }],
        });
        expect(session.result.current.data).toEqual({ authenticated: false, user: null });

        act(() => {
            login.result.current.reset();
        });

        expect(login.result.current.data).toBeNull();
        expect(login.result.current.error).toBeNull();
        expect(login.result.current.loading).toBe(false);
    });
});
