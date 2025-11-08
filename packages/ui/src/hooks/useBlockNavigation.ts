import { useEffect, useRef } from "react";

/**
 * Hook to block navigation when there are unsaved changes.
 *
 * This hook prevents data loss by:
 * 1. Blocking browser events (closing tab, refreshing)
 * 2. Blocking browser back/forward buttons
 * 3. Blocking internal navigation (clicking links, programmatic navigation)
 *
 * @param hasUnsavedChanges - Boolean indicating if there are unsaved changes
 * @param message - Optional custom message to show in the confirmation dialog
 *
 * @example
 * ```tsx
 * const hasChanges = useMemo(() => {
 *   return JSON.stringify(data) !== JSON.stringify(originalData);
 * }, [data, originalData]);
 *
 * useBlockNavigation(hasChanges);
 * ```
 */
export const useBlockNavigation = (
    hasUnsavedChanges: boolean,
    message: string = "You have unsaved changes. Are you sure you want to leave? Your changes will be lost.",
) => {
    const isBlockingRef = useRef(false);

    // Block browser navigation (close tab, refresh, back button, etc.)
    useEffect(() => {
        if (!hasUnsavedChanges) return;

        const handleBeforeUnload = (event: Event) => {
            event.preventDefault();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (event as any).returnValue = message;
            return message;
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [hasUnsavedChanges, message]);

    // Intercept history.pushState and history.replaceState to block internal navigation
    useEffect(() => {
        if (!hasUnsavedChanges) return;

        // Store the original methods (they're already patched by the router)
        const originalPushState = window.history.pushState;
        const originalReplaceState = window.history.replaceState;

        // Wrap pushState with confirmation
        window.history.pushState = function (
            data: unknown,
            unused: string,
            url?: string | URL | null,
        ) {
            if (isBlockingRef.current) {
                // Already showing a confirmation dialog, allow through
                return originalPushState.call(this, data, unused, url);
            }

            isBlockingRef.current = true;
            const confirmed = window.confirm(message);
            isBlockingRef.current = false;

            if (confirmed) {
                return originalPushState.call(this, data, unused, url);
            }
            // Navigation blocked - do nothing
        };

        // Wrap replaceState with confirmation
        window.history.replaceState = function (
            data: unknown,
            unused: string,
            url?: string | URL | null,
        ) {
            if (isBlockingRef.current) {
                return originalReplaceState.call(this, data, unused, url);
            }

            isBlockingRef.current = true;
            const confirmed = window.confirm(message);
            isBlockingRef.current = false;

            if (confirmed) {
                return originalReplaceState.call(this, data, unused, url);
            }
        };

        // Intercept popstate (back/forward button)
        const handlePopState = () => {
            if (isBlockingRef.current) return;

            isBlockingRef.current = true;
            const confirmed = window.confirm(message);
            isBlockingRef.current = false;

            if (!confirmed) {
                // Prevent navigation by pushing current state back
                window.history.pushState(null, "", window.location.href);
            }
        };

        window.addEventListener("popstate", handlePopState);

        return () => {
            // Restore original methods
            window.history.pushState = originalPushState;
            window.history.replaceState = originalReplaceState;
            window.removeEventListener("popstate", handlePopState);
        };
    }, [hasUnsavedChanges, message]);
};
