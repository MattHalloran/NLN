/**
 * Development-only logger utility
 * All methods are no-ops in production builds
 */

const isDevelopment = import.meta.env.DEV;

export const devLog = {
    info: (...args: any[]) => {
        if (isDevelopment) {
            console.info(...args);
        }
    },

    log: (...args: any[]) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },

    warn: (...args: any[]) => {
        if (isDevelopment) {
            console.warn(...args);
        }
    },

    error: (...args: any[]) => {
        // Errors should always be logged, even in production
        // But in production, you might want to send them to a monitoring service
        if (isDevelopment) {
            console.error(...args);
        } else {
            // In production, you could send to Sentry, LogRocket, etc.
            // For now, we'll silently consume them
        }
    },

    debug: (...args: any[]) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },
};

export default devLog;
