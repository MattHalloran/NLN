export const API_PREFIX = "/api";
export const REST_PREFIX = `${API_PREFIX}/rest`;
export const REST_VERSION = "v1";
export const REST_VERSION_PREFIX = `/${REST_VERSION}`;
export const REST_API_PREFIX = `${REST_PREFIX}${REST_VERSION_PREFIX}`;

export const REST_RESOURCE = {
    Assets: "/assets",
    Auth: "/auth",
    CsrfToken: "/csrf-token",
    Dashboard: "/dashboard",
    Health: "/health",
    Images: "/images",
    LandingPage: "/landing-page",
    Logs: "/logs",
    Newsletter: "/newsletter",
    Storage: "/storage",
} as const;

export const REST_ROUTES = {
    root: REST_PREFIX,
    v1: REST_API_PREFIX,
    health: `${REST_API_PREFIX}${REST_RESOURCE.Health}`,
    csrfToken: `${REST_API_PREFIX}${REST_RESOURCE.CsrfToken}`,
    auth: {
        root: `${REST_API_PREFIX}${REST_RESOURCE.Auth}`,
        session: `${REST_API_PREFIX}${REST_RESOURCE.Auth}/session`,
        login: `${REST_API_PREFIX}${REST_RESOURCE.Auth}/login`,
        logout: `${REST_API_PREFIX}${REST_RESOURCE.Auth}/logout`,
        signup: `${REST_API_PREFIX}${REST_RESOURCE.Auth}/signup`,
        resetPassword: `${REST_API_PREFIX}${REST_RESOURCE.Auth}/reset-password`,
        requestPasswordChange: `${REST_API_PREFIX}${REST_RESOURCE.Auth}/request-password-change`,
    },
    images: {
        root: `${REST_API_PREFIX}${REST_RESOURCE.Images}`,
        byLabel: (label = ":label") => `${REST_API_PREFIX}${REST_RESOURCE.Images}?label=${label}`,
        usage: (hash = ":hash") => `${REST_API_PREFIX}${REST_RESOURCE.Images}/${hash}/usage`,
        variants: (hash = ":hash") => `${REST_API_PREFIX}${REST_RESOURCE.Images}/${hash}/variants`,
    },
    assets: {
        root: `${REST_API_PREFIX}${REST_RESOURCE.Assets}`,
        read: `${REST_API_PREFIX}${REST_RESOURCE.Assets}/read`,
        write: `${REST_API_PREFIX}${REST_RESOURCE.Assets}/write`,
    },
    dashboard: {
        root: `${REST_API_PREFIX}${REST_RESOURCE.Dashboard}`,
        stats: `${REST_API_PREFIX}${REST_RESOURCE.Dashboard}/stats`,
    },
    landingPage: {
        root: `${REST_API_PREFIX}${REST_RESOURCE.LandingPage}`,
        contactInfo: `${REST_API_PREFIX}${REST_RESOURCE.LandingPage}/contact-info`,
        invalidateCache: `${REST_API_PREFIX}${REST_RESOURCE.LandingPage}/invalidate-cache`,
        settings: `${REST_API_PREFIX}${REST_RESOURCE.LandingPage}/settings`,
        variants: `${REST_API_PREFIX}${REST_RESOURCE.LandingPage}/variants`,
        variant: (id = ":id") => `${REST_API_PREFIX}${REST_RESOURCE.LandingPage}/variants/${id}`,
        promoteVariant: (id = ":id") =>
            `${REST_API_PREFIX}${REST_RESOURCE.LandingPage}/variants/${id}/promote`,
        toggleVariant: (id = ":id") =>
            `${REST_API_PREFIX}${REST_RESOURCE.LandingPage}/variants/${id}/toggle`,
        trackVariant: (id = ":id") =>
            `${REST_API_PREFIX}${REST_RESOURCE.LandingPage}/variants/${id}/track`,
    },
    storage: {
        root: `${REST_API_PREFIX}${REST_RESOURCE.Storage}`,
        stats: `${REST_API_PREFIX}${REST_RESOURCE.Storage}/stats`,
        cleanup: `${REST_API_PREFIX}${REST_RESOURCE.Storage}/cleanup`,
        cleanupHistory: `${REST_API_PREFIX}${REST_RESOURCE.Storage}/cleanup/history`,
        cleanupPreview: `${REST_API_PREFIX}${REST_RESOURCE.Storage}/cleanup/preview`,
        orphanedFiles: `${REST_API_PREFIX}${REST_RESOURCE.Storage}/orphaned-files`,
        orphanedRecords: `${REST_API_PREFIX}${REST_RESOURCE.Storage}/orphaned-records`,
        recentActivity: `${REST_API_PREFIX}${REST_RESOURCE.Storage}/recent-activity`,
        jobStatus: `${REST_API_PREFIX}${REST_RESOURCE.Storage}/job-status`,
    },
    logs: {
        root: `${REST_API_PREFIX}${REST_RESOURCE.Logs}`,
        stats: `${REST_API_PREFIX}${REST_RESOURCE.Logs}/stats`,
    },
    newsletter: {
        root: `${REST_API_PREFIX}${REST_RESOURCE.Newsletter}`,
        subscribe: `${REST_API_PREFIX}${REST_RESOURCE.Newsletter}/subscribe`,
        subscribers: `${REST_API_PREFIX}${REST_RESOURCE.Newsletter}/subscribers`,
        subscribersExport: `${REST_API_PREFIX}${REST_RESOURCE.Newsletter}/subscribers/export`,
        subscriber: (id = ":id") =>
            `${REST_API_PREFIX}${REST_RESOURCE.Newsletter}/subscribers/${id}`,
        stats: `${REST_API_PREFIX}${REST_RESOURCE.Newsletter}/stats`,
    },
} as const;

export const stripRestPrefix = (route: string): string => {
    return route.startsWith(REST_API_PREFIX) ? route.slice(REST_API_PREFIX.length) || "/" : route;
};

export const stripApiPrefix = (route: string): string => {
    return route.startsWith(API_PREFIX) ? route.slice(API_PREFIX.length) || "/" : route;
};
