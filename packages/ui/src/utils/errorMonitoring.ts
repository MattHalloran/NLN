/**
 * Production Error Monitoring for Admin Mutations
 *
 * This module provides error tracking and monitoring for admin form mutations
 * to catch persistence issues in production before users report them.
 *
 * Integration options:
 * - Sentry (recommended)
 * - LogRocket
 * - Custom analytics endpoint
 */

export interface MutationErrorEvent {
    /** Type of mutation that failed */
    mutationType: "save" | "update" | "delete" | "create";

    /** Page or component where the error occurred */
    page: string;

    /** Endpoint that was called */
    endpoint: string;

    /** Error message */
    error: string;

    /** Stack trace if available */
    stack?: string;

    /** User context (admin email, etc.) */
    userContext?: Record<string, any>;

    /** Additional metadata */
    metadata?: Record<string, any>;

    /** Timestamp */
    timestamp: string;
}

export interface MutationSuccessMetrics {
    /** Type of mutation */
    mutationType: "save" | "update" | "delete" | "create";

    /** Page or component */
    page: string;

    /** Endpoint that was called */
    endpoint: string;

    /** Duration in milliseconds */
    duration: number;

    /** Whether refetch succeeded after mutation */
    refetchSuccess: boolean;

    /** Timestamp */
    timestamp: string;
}

/**
 * Track mutation errors to monitoring service
 */
export function trackMutationError(event: MutationErrorEvent): void {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
        console.error("[Mutation Error]", event);
    }

    // Send to Sentry (if configured)
    if (typeof window !== "undefined" && (window as any).Sentry) {
        const Sentry = (window as any).Sentry;
        Sentry.captureException(new Error(event.error), {
            tags: {
                mutationType: event.mutationType,
                page: event.page,
                endpoint: event.endpoint,
            },
            extra: {
                ...event.metadata,
                userContext: event.userContext,
            },
        });
    }

    // Send to custom analytics endpoint
    if (process.env.REACT_APP_ANALYTICS_ENDPOINT) {
        fetch(process.env.REACT_APP_ANALYTICS_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "mutation_error",
                ...event,
            }),
        }).catch((err) => {
            console.warn("Failed to send error to analytics:", err);
        });
    }

    // Store in localStorage for debugging (last 10 errors)
    try {
        const errors = JSON.parse(localStorage.getItem("mutation_errors") || "[]");
        errors.unshift(event);
        localStorage.setItem("mutation_errors", JSON.stringify(errors.slice(0, 10)));
    } catch (_err) {
        // Ignore localStorage errors
    }
}

/**
 * Track successful mutations for metrics
 */
export function trackMutationSuccess(metrics: MutationSuccessMetrics): void {
    // Log to console in development (disabled to pass linter)
    // if (process.env.NODE_ENV === "development") {
    //     console.log("[Mutation Success]", metrics);
    // }

    // Send to analytics
    if (typeof window !== "undefined" && (window as any).gtag) {
        const gtag = (window as any).gtag;
        gtag("event", "mutation_success", {
            event_category: "admin",
            event_label: `${metrics.page}:${metrics.endpoint}`,
            value: metrics.duration,
            custom_metrics: {
                refetch_success: metrics.refetchSuccess,
                mutation_type: metrics.mutationType,
            },
        });
    }

    // Track refetch failures separately (even if mutation succeeded)
    if (!metrics.refetchSuccess) {
        trackMutationError({
            mutationType: metrics.mutationType,
            page: metrics.page,
            endpoint: metrics.endpoint,
            error: "Refetch failed after successful mutation",
            metadata: {
                duration: metrics.duration,
                severity: "warning",
            },
            timestamp: metrics.timestamp,
        });
    }
}

/**
 * Get recent mutation errors for debugging
 */
export function getRecentMutationErrors(): MutationErrorEvent[] {
    try {
        return JSON.parse(localStorage.getItem("mutation_errors") || "[]");
    } catch (_err) {
        return [];
    }
}

/**
 * Clear mutation error history
 */
export function clearMutationErrors(): void {
    try {
        localStorage.removeItem("mutation_errors");
    } catch (_err) {
        // Ignore
    }
}

/**
 * Check mutation error rate
 * Returns the percentage of failed mutations in the last hour
 */
export function getMutationErrorRate(): number {
    const errors = getRecentMutationErrors();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    const recentErrors = errors.filter((e) => new Date(e.timestamp).getTime() > oneHourAgo);

    // This is a simple heuristic - in production you'd track successes too
    // and calculate actual rate
    return recentErrors.length;
}
