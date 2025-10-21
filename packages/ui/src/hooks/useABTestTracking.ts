import { useCallback } from "react";
import { useLandingPage } from "./useLandingPage";
import { restApi } from "api/rest/client";

/**
 * Hook for tracking A/B test conversion events.
 * Call this hook's `trackConversion` function when a meaningful user action occurs
 * (e.g., form submission, newsletter signup, contact form, etc.)
 */
export function useABTestTracking() {
    const { data } = useLandingPage();

    const trackConversion = useCallback(async () => {
        if (data?._meta) {
            try {
                await restApi.trackABTestEvent(data._meta.testId, {
                    variantId: data._meta.variantId,
                    eventType: "conversion",
                });
            } catch (error) {
                console.error("Error tracking A/B test conversion:", error);
            }
        }
    }, [data]);

    return { trackConversion };
}
