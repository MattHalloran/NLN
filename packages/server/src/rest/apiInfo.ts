import { REST_ROUTES } from "@local/shared";

export const createRestApiInfo = () => ({
    name: "New Life Nursery REST API",
    version: "1.0.0",
    endpoints: {
        v1: {
            health: REST_ROUTES.health,
            csrfToken: REST_ROUTES.csrfToken,
            auth: {
                session: REST_ROUTES.auth.session,
                login: REST_ROUTES.auth.login,
                logout: REST_ROUTES.auth.logout,
                signup: REST_ROUTES.auth.signup,
                resetPassword: REST_ROUTES.auth.resetPassword,
                requestPasswordChange: REST_ROUTES.auth.requestPasswordChange,
            },
            images: {
                getByLabel: REST_ROUTES.images.byLabel(),
                add: REST_ROUTES.images.root,
                update: REST_ROUTES.images.root,
            },
            assets: {
                read: REST_ROUTES.assets.read,
                write: REST_ROUTES.assets.write,
            },
            dashboard: {
                stats: REST_ROUTES.dashboard.stats,
            },
            landingPage: {
                root: REST_ROUTES.landingPage.root,
                contactInfo: REST_ROUTES.landingPage.contactInfo,
                settings: REST_ROUTES.landingPage.settings,
                variants: REST_ROUTES.landingPage.variants,
            },
            storage: {
                stats: REST_ROUTES.storage.stats,
                cleanupPreview: REST_ROUTES.storage.cleanupPreview,
                orphanedFiles: REST_ROUTES.storage.orphanedFiles,
                orphanedRecords: REST_ROUTES.storage.orphanedRecords,
            },
            logs: {
                root: REST_ROUTES.logs.root,
                stats: REST_ROUTES.logs.stats,
            },
            newsletter: {
                subscribe: REST_ROUTES.newsletter.subscribe,
                subscribers: REST_ROUTES.newsletter.subscribers,
                subscribersExport: REST_ROUTES.newsletter.subscribersExport,
                stats: REST_ROUTES.newsletter.stats,
            },
        },
    },
});
