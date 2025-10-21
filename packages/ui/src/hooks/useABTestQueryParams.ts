import { useMemo } from "react";
import { useLocation } from "route";

/**
 * Hook to extract A/B test query parameters from the URL.
 * Returns { abTestId, variant } for use with API calls.
 */
export function useABTestQueryParams() {
    const location = useLocation();

    const queryParams = useMemo(() => {
        const searchParams = new URLSearchParams(location.search);
        const abTestId = searchParams.get("abTestId") || undefined;
        const variant = searchParams.get("variant") as "variantA" | "variantB" | undefined;

        return {
            abTestId,
            variant,
            isEditingVariant: !!(abTestId && variant),
        };
    }, [location.search]);

    return queryParams;
}
