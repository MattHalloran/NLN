import { create } from "zustand";
import { LandingPageContent, restApi, ABTestMeta } from "api/rest/client";

const AB_TEST_STORAGE_KEY = "abTestAssignment";

// Helper to get stored A/B test assignment from localStorage
const getStoredABTestAssignment = (): ABTestMeta | null => {
    try {
        const stored = localStorage.getItem(AB_TEST_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored) as ABTestMeta;
        }
    } catch (error) {
        console.error("Error reading A/B test assignment from localStorage:", error);
    }
    return null;
};

// Helper to save A/B test assignment to localStorage
const saveABTestAssignment = (meta: ABTestMeta): void => {
    try {
        localStorage.setItem(AB_TEST_STORAGE_KEY, JSON.stringify(meta));
    } catch (error) {
        console.error("Error saving A/B test assignment to localStorage:", error);
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
            // Get stored A/B test assignment
            const storedAssignment = getStoredABTestAssignment();

            // Fetch data with A/B test parameters if available
            const data = await restApi.getLandingPageContent({
                onlyActive: false, // Fetch ALL data (including inactive) - components can filter as needed
                abTestId: storedAssignment?.testId,
                variant: storedAssignment?.variantId,
            });

            // Save returned A/B test metadata to localStorage
            if (data._meta) {
                saveABTestAssignment(data._meta);

                // Track "view" event for this A/B test
                try {
                    await restApi.trackABTestEvent(data._meta.testId, {
                        variantId: data._meta.variantId,
                        eventType: "view",
                    });
                } catch (trackError) {
                    // Non-fatal - don't block rendering if analytics fails
                    console.error("Error tracking A/B test view event:", trackError);
                }
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
