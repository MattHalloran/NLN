import { beforeEach, describe, expect, it, vi } from "vitest";
import { UI_TIMING } from "@local/shared";
import {
    clearStoredVariant,
    getStoredVariantId,
    saveVariantId,
    useLandingPageStore,
} from "./landingPageStore";
import { restApi } from "api/rest/client";
import type { LandingPageContent } from "api/rest/client";

vi.mock("api/rest/client", () => ({
    restApi: {
        getLandingPageContent: vi.fn(),
    },
}));

vi.mock("utils/errorLogger", () => ({
    handleError: vi.fn(),
}));

const landingPageResponse = (variantId?: string) =>
    ({
        _meta: variantId ? { variantId } : undefined,
        content: {},
    }) as unknown as LandingPageContent;

describe("landingPageStore", () => {
    const getLandingPageContent = vi.mocked(restApi.getLandingPageContent);

    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
        getLandingPageContent.mockReset();
        useLandingPageStore.setState({ data: null, loading: false, error: null });
    });

    it("stores, retrieves, expires, and clears variant assignments", () => {
        saveVariantId("variant-a");

        expect(getStoredVariantId()).toBe("variant-a");

        vi.setSystemTime(Date.now() + UI_TIMING.variantSessionDurationMs + 1);

        expect(getStoredVariantId()).toBeNull();
        expect(localStorage.getItem("variantAssignment")).toBeNull();

        saveVariantId("variant-b");
        clearStoredVariant();
        expect(getStoredVariantId()).toBeNull();
    });

    it("fetches landing page content using a stored variant and saves returned metadata", async () => {
        saveVariantId("old-variant");
        getLandingPageContent.mockResolvedValueOnce(landingPageResponse("new-variant"));

        await useLandingPageStore.getState().fetchLandingPage();

        expect(getLandingPageContent).toHaveBeenCalledWith({
            onlyActive: true,
            variantId: "old-variant",
        });
        expect(useLandingPageStore.getState().data).toEqual(landingPageResponse("new-variant"));
        expect(getStoredVariantId()).toBe("new-variant");
    });

    it("clears an invalid stored variant and retries without it", async () => {
        saveVariantId("stale-variant");
        getLandingPageContent
            .mockRejectedValueOnce({ status: 404 })
            .mockResolvedValueOnce(landingPageResponse("fresh-variant"));

        await useLandingPageStore.getState().fetchLandingPage();

        expect(getLandingPageContent).toHaveBeenNthCalledWith(1, {
            onlyActive: true,
            variantId: "stale-variant",
        });
        expect(getLandingPageContent).toHaveBeenNthCalledWith(2, {
            onlyActive: true,
            variantId: undefined,
        });
        expect(getStoredVariantId()).toBe("fresh-variant");
    });

    it("coalesces concurrent fetches and records non-variant errors", async () => {
        getLandingPageContent.mockRejectedValueOnce(new Error("network down"));

        const firstFetch = useLandingPageStore.getState().fetchLandingPage();
        const secondFetch = useLandingPageStore.getState().fetchLandingPage();

        await Promise.all([firstFetch, secondFetch]);

        const state = useLandingPageStore.getState();
        expect(getLandingPageContent).toHaveBeenCalledTimes(1);
        expect(state.loading).toBe(false);
        expect(state.data).toBeNull();
        expect(state.error?.message).toBe("network down");
    });
});
