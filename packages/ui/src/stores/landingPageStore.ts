import { create } from "zustand";
import { LandingPageContent, restApi } from "api/rest/client";

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
            // Fetch ALL data (including inactive) - components can filter as needed
            const data = await restApi.getLandingPageContent(false);
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
