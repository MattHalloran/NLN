/**
 * Centralized error logging utility
 * This allows us to:
 * - Have consistent error handling across the app
 * - Add context to errors
 * - Potentially integrate with error monitoring services in the future
 */

interface ErrorContext {
    component?: string;
    action?: string;
    userId?: string;
    [key: string]: unknown;
}

class ErrorLogger {
    /**
     * Log an error with optional context
     */
    logError(error: unknown, context?: ErrorContext): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        // In production, this could be sent to an error monitoring service
        // like Sentry, LogRocket, or Rollbar
        if (import.meta.env.PROD) {
            // For now, we'll still use console.error but with structured data
            console.error("Application Error:", {
                message: errorMessage,
                stack: errorStack,
                context,
                timestamp: new Date().toISOString(),
            });
        } else {
            // In development, provide more detailed logging
            console.error("Error in", context?.component || "Unknown Component");
            console.error("Action:", context?.action || "Unknown Action");
            console.error("Error:", error);
            if (context) {
                console.error("Context:", context);
            }
        }
    }

    /**
     * Log a warning (non-critical issues)
     */
    logWarning(message: string, context?: ErrorContext): void {
        console.warn("Warning:", message, context);
    }

    /**
     * Log info (for important state changes or user actions)
     */
    logInfo(message: string, context?: ErrorContext): void {
        if (!import.meta.env.PROD) {
            console.log("Info:", message, context);
        }
    }
}

// Export a singleton instance
export const errorLogger = new ErrorLogger();

// Helper function for common error handling pattern
export function handleError(error: unknown, component: string, action: string): void {
    errorLogger.logError(error, { component, action });
}
