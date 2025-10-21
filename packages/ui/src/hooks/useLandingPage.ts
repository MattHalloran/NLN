import { useLandingPageStore } from "stores/landingPageStore";

/**
 * Hook to access landing page content from the central store.
 * The data is fetched once in App.tsx and shared across all components.
 * This prevents duplicate API calls.
 */
export function useLandingPage() {
    const data = useLandingPageStore((state) => state.data);
    const loading = useLandingPageStore((state) => state.loading);
    const error = useLandingPageStore((state) => state.error);
    const refetch = useLandingPageStore((state) => state.refetch);

    return { data, loading, error, refetch };
}
