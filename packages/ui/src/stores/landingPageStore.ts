import { create } from "zustand";
import { LandingPageContent, restApi } from "api/rest/client";
import { handleError } from "utils/errorLogger";

const VARIANT_STORAGE_KEY = "variantAssignment";

// Helper to get stored variant assignment from localStorage
const getStoredVariantId = (): string | null => {
    try {
        const stored = localStorage.getItem(VARIANT_STORAGE_KEY);
        return stored || null;
    } catch (error) {
        handleError(error, "landingPageStore", "getStoredVariantId");
        return null;
    }
};

// Helper to save variant assignment to localStorage
const saveVariantId = (variantId: string): void => {
    try {
        localStorage.setItem(VARIANT_STORAGE_KEY, variantId);
    } catch (error) {
        handleError(error, "landingPageStore", "saveVariantId");
    }
};

interface LandingPageState {
    data: LandingPageContent | null;
    loading: boolean;
    error: Error | null;
    fetchLandingPage: () => Promise<void>;
    refetch: () => Promise<void>;
}

export const useLandingPageStore = create<LandingPageState>((set, get) => ({
    data: null,
    loading: false,
    error: null,

    fetchLandingPage: async () => {
        // Prevent duplicate requests if already loading
        const currentState = get();
        if (currentState.loading) return;

        set({ loading: true, error: null });

        try {
            // Get stored variant assignment (if user was previously assigned)
            const storedVariantId = getStoredVariantId();

            // Fetch data with variantId if available
            // Backend will handle variant assignment if no variantId provided
            const data = await restApi.getLandingPageContent({
                onlyActive: false, // Fetch ALL data (including inactive) - components can filter as needed
                variantId: storedVariantId || undefined,
            });

            // Save returned variant metadata to localStorage for consistency
            if (data._meta?.variantId) {
                saveVariantId(data._meta.variantId);
            }

            set({ data, loading: false, error: null });
        } catch (err) {
            set({
                error: err instanceof Error ? err : new Error("Unknown error"),
                loading: false,
                data: null,
            });
        }
    },

    refetch: async () => {
        const currentState = get();
        await currentState.fetchLandingPage();
    },
}));
