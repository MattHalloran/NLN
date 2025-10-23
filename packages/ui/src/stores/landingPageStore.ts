import { create } from "zustand";
import { LandingPageContent, restApi } from "api/rest/client";
import { handleError } from "utils/errorLogger";

const VARIANT_STORAGE_KEY = "variantAssignment";
const VARIANT_TIMESTAMP_KEY = "variantAssignmentTimestamp";
const VARIANT_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface StoredVariantData {
    variantId: string;
    timestamp: number;
}

// Helper to get stored variant assignment from localStorage with expiration check
export const getStoredVariantId = (): string | null => {
    try {
        const storedId = localStorage.getItem(VARIANT_STORAGE_KEY);
        const storedTimestamp = localStorage.getItem(VARIANT_TIMESTAMP_KEY);

        if (!storedId || !storedTimestamp) {
            return null;
        }

        const timestamp = parseInt(storedTimestamp, 10);
        const now = Date.now();

        // Check if assignment has expired
        if (now - timestamp > VARIANT_SESSION_DURATION_MS) {
            // Clear expired assignment
            clearStoredVariant();
            return null;
        }

        return storedId;
    } catch (error) {
        handleError(error, "landingPageStore", "getStoredVariantId");
        return null;
    }
};

// Helper to save variant assignment to localStorage with timestamp
export const saveVariantId = (variantId: string): void => {
    try {
        localStorage.setItem(VARIANT_STORAGE_KEY, variantId);
        localStorage.setItem(VARIANT_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
        handleError(error, "landingPageStore", "saveVariantId");
    }
};

// Helper to clear stored variant assignment
export const clearStoredVariant = (): void => {
    try {
        localStorage.removeItem(VARIANT_STORAGE_KEY);
        localStorage.removeItem(VARIANT_TIMESTAMP_KEY);
    } catch (error) {
        handleError(error, "landingPageStore", "clearStoredVariant");
    }
};

interface LandingPageState {
    data: LandingPageContent | null;
    loading: boolean;
    error: Error | null;
    fetchLandingPage: () => Promise<void>;
    refetch: () => Promise<void>;
}

export const useLandingPageStore = create<LandingPageState>((set, get) => {
    // Use a promise to prevent race conditions - only one fetch can happen at a time
    let fetchPromise: Promise<void> | null = null;

    return {
        data: null,
        loading: false,
        error: null,

        fetchLandingPage: async () => {
            // If already fetching, return the existing promise
            if (fetchPromise) return fetchPromise;

            // Create new fetch promise
            fetchPromise = (async () => {
                set({ loading: true, error: null });

                try {
                    // Get stored variant assignment (if user was previously assigned)
                    let storedVariantId = getStoredVariantId();

                    // First attempt: Try with stored variant ID
                    let data: LandingPageContent;
                    try {
                        data = await restApi.getLandingPageContent({
                            onlyActive: false, // Fetch ALL data (including inactive) - components can filter as needed
                            variantId: storedVariantId || undefined,
                        });
                    } catch (firstAttemptError: any) {
                        // If the stored variant doesn't exist or is disabled (404/400), clear it and retry
                        if (storedVariantId && (firstAttemptError?.status === 404 || firstAttemptError?.status === 400)) {
                            handleError(
                                new Error(`Stored variant ${storedVariantId} is no longer valid. Requesting new assignment.`),
                                "landingPageStore",
                                "fetchLandingPage"
                            );
                            clearStoredVariant();

                            // Retry without stored variant ID - backend will assign a new one
                            data = await restApi.getLandingPageContent({
                                onlyActive: false,
                                variantId: undefined,
                            });
                        } else {
                            // Re-throw if it's a different error
                            throw firstAttemptError;
                        }
                    }

                    // Save/update returned variant metadata to localStorage for consistency
                    if (data._meta?.variantId) {
                        // Only save if it's different from what we have (avoid unnecessary writes)
                        if (data._meta.variantId !== storedVariantId) {
                            saveVariantId(data._meta.variantId);
                        }
                    } else {
                        // No variant metadata in response - clear stored variant
                        clearStoredVariant();
                    }

                    set({ data, loading: false, error: null });
                } catch (err) {
                    handleError(err, "landingPageStore", "fetchLandingPage");
                    set({
                        error: err instanceof Error ? err : new Error("Unknown error"),
                        loading: false,
                        data: null,
                    });
                } finally {
                    // Clear the promise so future fetches can proceed
                    fetchPromise = null;
                }
            })();

            return fetchPromise;
        },

        refetch: async () => {
            const currentState = get();
            await currentState.fetchLandingPage();
        },
    };
});
