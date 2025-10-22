import { useMemo } from "react";
import { useLocation } from "route";

/**
 * Hook to extract variant query parameter from the URL.
 * Used for editing specific variants via ?variantId=xxx
 */
export function useABTestQueryParams() {
    const [location] = useLocation();

    const queryParams = useMemo(() => {
        const search = location.split('?')[1] || '';
        const searchParams = new URLSearchParams(search);
        const variantId = searchParams.get("variantId") || undefined;

        return {
            variantId,
            isEditingVariant: !!variantId,
        };
    }, [location]);

    return queryParams;
}
