import { useSnackbar } from "notistack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trackMutationError, trackMutationSuccess } from "../utils/errorMonitoring";
import { PubSub } from "../utils/pubsub";
import { useBlockNavigation } from "./useBlockNavigation";

/**
 * Configuration for useAdminForm hook
 */
export interface UseAdminFormConfig<TData> {
    /**
     * Function to fetch the initial data
     */
    fetchFn: () => Promise<TData>;

    /**
     * Function to save the data
     */
    saveFn: (data: TData) => Promise<TData | void>;

    /**
     * Optional callback after successful save
     */
    onSuccess?: (data: TData) => void;

    /**
     * Optional callback on save error
     */
    onError?: (error: Error) => void;

    /**
     * Whether to block navigation when there are unsaved changes (default: true)
     */
    blockNavigation?: boolean;

    /**
     * Custom change detection function (default: JSON.stringify comparison)
     */
    hasChanges?: (current: TData, original: TData) => boolean;

    /**
     * Whether to show snackbar notifications (default: true)
     */
    showNotifications?: boolean;

    /**
     * Whether to use optimistic updates (default: false)
     */
    optimisticUpdates?: boolean;

    /**
     * Custom success message
     */
    successMessage?: string;

    /**
     * Custom error message prefix
     */
    errorMessagePrefix?: string;

    /**
     * Page name for error tracking (default: 'unknown')
     */
    pageName?: string;

    /**
     * Endpoint name for error tracking (default: 'unknown')
     */
    endpointName?: string;

    /**
     * Functions to call after successful save but before internal refetch
     * Use this to invalidate caches that the fetchFn depends on
     *
     * Example: If your fetchFn uses useLandingPage(), pass [refetchLandingPage]
     * to ensure the cache is updated before refetch runs
     */
    refetchDependencies?: Array<() => Promise<void> | void>;
}

/**
 * Return type for useAdminForm hook
 */
export interface UseAdminFormReturn<TData> {
    /** Current form data */
    data: TData | null;

    /** Original/pristine data for comparison */
    originalData: TData | null;

    /** Update the form data */
    setData: React.Dispatch<React.SetStateAction<TData | null>>;

    /** Whether data is being loaded */
    isLoading: boolean;

    /** Whether a save operation is in progress */
    isSaving: boolean;

    /** Whether there are unsaved changes */
    isDirty: boolean;

    /** Error from fetch or save operation */
    error: Error | null;

    /** Save the current data */
    save: () => Promise<void>;

    /** Cancel changes and revert to original */
    cancel: () => void;

    /** Manually refetch the data */
    refetch: () => Promise<void>;

    /** Reset the error state */
    clearError: () => void;
}

/**
 * Standardized hook for admin form state management
 *
 * Features:
 * - Automatic change detection with JSON comparison (configurable)
 * - Navigation blocking when there are unsaved changes
 * - Proper error recovery if refetch fails after mutation
 * - Optimistic updates (optional)
 * - Snackbar notifications
 * - Rollback on save failure
 *
 * Critical Fix: Handles the "mutation succeeded but refetch failed" scenario
 * by storing the mutation response and using it if refetch fails.
 *
 * @example
 * ```tsx
 * const form = useAdminForm({
 *   fetchFn: () => rest.get('/api/homepage/hero'),
 *   saveFn: (data) => rest.patch('/api/homepage/hero', data),
 *   onSuccess: () => console.log('Saved!'),
 * });
 *
 * // In your component
 * <TextField
 *   value={form.data?.title}
 *   onChange={(e) => form.setData({ ...form.data, title: e.target.value })}
 * />
 * <Button onClick={form.save} disabled={!form.isDirty || form.isSaving}>
 *   Save
 * </Button>
 * ```
 */
export function useAdminForm<TData>({
    fetchFn,
    saveFn,
    onSuccess,
    onError,
    blockNavigation = true,
    hasChanges: customHasChanges,
    showNotifications = true,
    optimisticUpdates = false,
    successMessage = "Changes saved successfully",
    errorMessagePrefix = "Failed to save changes",
    pageName = "unknown",
    endpointName = "unknown",
    refetchDependencies = [],
}: UseAdminFormConfig<TData>): UseAdminFormReturn<TData> {
    const { enqueueSnackbar } = useSnackbar();

    // State
    const [data, setData] = useState<TData | null>(null);
    const [originalData, setOriginalData] = useState<TData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Store the last mutation response for rollback/recovery
    const lastMutationResponseRef = useRef<TData | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Store functions in refs to avoid infinite loops from changing function references
    const fetchFnRef = useRef(fetchFn);
    const saveFnRef = useRef(saveFn);
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);

    // Update refs when functions change
    useEffect(() => {
        fetchFnRef.current = fetchFn;
    }, [fetchFn]);

    useEffect(() => {
        saveFnRef.current = saveFn;
    }, [saveFn]);

    useEffect(() => {
        onSuccessRef.current = onSuccess;
    }, [onSuccess]);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    // Change detection
    const isDirty = useMemo(() => {
        if (!data || !originalData) return false;

        if (customHasChanges) {
            return customHasChanges(data, originalData);
        }

        // Default: JSON string comparison
        return JSON.stringify(data) !== JSON.stringify(originalData);
    }, [data, originalData, customHasChanges]);

    // Block navigation if there are unsaved changes
    useBlockNavigation(blockNavigation && isDirty);

    // Fetch initial data
    const refetch = useCallback(async () => {
        // Cancel any in-flight request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        setIsLoading(true);
        setError(null);

        try {
            const result = await fetchFnRef.current();
            setData(result);
            setOriginalData(result);
            setError(null);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
                // Request was cancelled, ignore
                return;
            }

            const error = err instanceof Error ? err : new Error("Failed to fetch data");
            setError(error);

            if (showNotifications) {
                enqueueSnackbar(`Error loading data: ${error.message}`, {
                    variant: "error",
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, [showNotifications, enqueueSnackbar]);

    // Initial fetch on mount
    useEffect(() => {
        refetch();

        // Cleanup
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [refetch]);

    // Save data with proper error recovery
    const save = useCallback(async () => {
        if (!data) {
            throw new Error("No data to save");
        }

        setIsSaving(true);
        setError(null);

        // Store data for potential rollback
        const dataToSave = data;
        const previousData = originalData;
        const startTime = Date.now();

        try {
            // Optimistic update
            if (optimisticUpdates) {
                setOriginalData(dataToSave);
            }

            // Perform mutation
            const result = await saveFnRef.current(dataToSave);

            // Store the mutation response for recovery
            if (result) {
                lastMutationResponseRef.current = result;
            } else {
                lastMutationResponseRef.current = dataToSave;
            }

            if (showNotifications) {
                enqueueSnackbar(successMessage, { variant: "success" });
            }

            // Refetch any dependencies (e.g., landing page cache) before internal refetch
            // This ensures fetchFn gets fresh data instead of stale cached data
            if (refetchDependencies.length > 0) {
                try {
                    await Promise.all(refetchDependencies.map((fn) => fn()));
                } catch (depError) {
                    console.warn("Failed to refetch dependencies:", depError);
                    // Continue anyway - internal refetch might still work
                }
            }

            // Try to refetch to get fresh data from server
            let refetchSuccess = true;
            try {
                await refetch();
            } catch (refetchError) {
                refetchSuccess = false;

                // CRITICAL FIX: If refetch fails after successful mutation,
                // use the mutation response instead of rolling back
                console.warn(
                    "Refetch failed after successful save. Using mutation response.",
                    refetchError,
                );

                if (lastMutationResponseRef.current) {
                    setData(lastMutationResponseRef.current);
                    setOriginalData(lastMutationResponseRef.current);
                }

                if (showNotifications) {
                    enqueueSnackbar(
                        "Changes saved, but failed to verify. Please refresh the page to see the latest data.",
                        { variant: "warning" },
                    );
                }
            }

            // Track successful mutation
            const duration = Date.now() - startTime;
            trackMutationSuccess({
                mutationType: "save",
                page: pageName,
                endpoint: endpointName,
                duration,
                refetchSuccess,
                timestamp: new Date().toISOString(),
            });

            // Call success callback
            if (onSuccessRef.current) {
                onSuccessRef.current(lastMutationResponseRef.current || dataToSave);
            }

            // Notify global store if this is a landing page-related form
            // This ensures the homepage sees updated content without requiring a full page refresh
            if (
                pageName.includes("homepage") ||
                pageName.includes("landing") ||
                endpointName.includes("landing-page")
            ) {
                PubSub.get().publishLandingPageUpdated();
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Save failed");
            setError(error);

            // Track mutation error
            trackMutationError({
                mutationType: "save",
                page: pageName,
                endpoint: endpointName,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                metadata: {
                    optimisticUpdates,
                    hasData: !!data,
                },
            });

            // Rollback optimistic update
            if (optimisticUpdates && previousData) {
                setOriginalData(previousData);
            }

            if (showNotifications) {
                enqueueSnackbar(`${errorMessagePrefix}: ${error.message}`, {
                    variant: "error",
                });
            }

            if (onErrorRef.current) {
                onErrorRef.current(error);
            }

            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [
        data,
        originalData,
        refetch,
        refetchDependencies,
        optimisticUpdates,
        showNotifications,
        successMessage,
        errorMessagePrefix,
        pageName,
        endpointName,
        enqueueSnackbar,
    ]);

    // Cancel changes
    const cancel = useCallback(() => {
        if (originalData) {
            setData(originalData);
        }

        if (showNotifications) {
            enqueueSnackbar("Changes discarded", { variant: "info" });
        }
    }, [originalData, showNotifications, enqueueSnackbar]);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        data,
        originalData,
        setData,
        isLoading,
        isSaving,
        isDirty,
        error,
        save,
        cancel,
        refetch,
        clearError,
    };
}

/**
 * Helper hook for admin forms that use deep nested objects
 * Provides a safer update function that preserves nested structure
 */
export function useDeepUpdate<TData extends Record<string, any>>(
    setData: React.Dispatch<React.SetStateAction<TData | null>>,
) {
    return useCallback(
        (path: string, value: any) => {
            setData((prev) => {
                if (!prev) return prev;

                const keys = path.split(".");
                const updated = { ...prev };
                let current: any = updated;

                // Navigate to the parent of the target property
                for (let i = 0; i < keys.length - 1; i++) {
                    const key = keys[i];
                    current[key] = { ...current[key] };
                    current = current[key];
                }

                // Set the value
                current[keys[keys.length - 1]] = value;

                return updated;
            });
        },
        [setData],
    );
}
