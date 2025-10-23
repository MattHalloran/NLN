import { useCallback } from "react";
import { useLandingPage } from "./useLandingPage";
import { restApi } from "api/rest/client";

/**
 * Hook for tracking variant conversion events.
 *
 * Call this hook's `trackConversion` function when a meaningful user action occurs
 * (e.g., form submission, newsletter signup, contact form, etc.)
 */
export function useABTestTracking() {
    const { data } = useLandingPage();

    const trackConversion = useCallback(async () => {
        if (data?._meta?.variantId) {
            try {
                await restApi.trackVariantEvent(data._meta.variantId, {
                    eventType: "conversion",
                });
            } catch (error) {
                console.error("Error tracking conversion:", error);
            }
        }
    }, [data?._meta?.variantId]); // Only depend on variantId to avoid unnecessary re-renders

    return { trackConversion };
}
