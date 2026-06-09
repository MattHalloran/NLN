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
    const variantId = data?._meta?.variantId;

    const trackConversion = useCallback(async () => {
        if (variantId) {
            try {
                await restApi.trackVariantEvent(variantId, {
                    eventType: "conversion",
                });
            } catch (error) {
                console.error("Error tracking conversion:", error);
            }
        }
    }, [variantId]);

    return { trackConversion };
}
