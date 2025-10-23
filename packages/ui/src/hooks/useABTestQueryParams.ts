import { useMemo } from "react";
import { useLocation } from "route";
import { getStoredVariantId } from "stores/landingPageStore";

/**
 * Hook to extract variant query parameter from the URL.
 * Used for editing specific variants via ?variantId=xxx
 * Falls back to localStorage if no URL param is present (so admins stay on their selected variant)
 */
export function useABTestQueryParams() {
    const [location] = useLocation();

    const queryParams = useMemo(() => {
        const search = location.split("?")[1] || "";
        const searchParams = new URLSearchParams(search);
        const urlVariantId = searchParams.get("variantId");

        // Priority: URL param > localStorage > undefined
        const variantId = urlVariantId || getStoredVariantId() || undefined;

        return {
            variantId,
            isEditingVariant: !!variantId,
        };
    }, [location]);

    return queryParams;
}
