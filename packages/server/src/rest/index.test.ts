import { REST_ROUTES } from "@local/shared";
import { describe, expect, it } from "vitest";
import { createRestApiInfo } from "./apiInfo.js";

describe("REST API manifest", () => {
    it("documents the shared routes exposed by the versioned REST API", () => {
        expect(createRestApiInfo()).toMatchObject({
            name: "New Life Nursery REST API",
            version: "1.0.0",
            endpoints: {
                v1: {
                    health: REST_ROUTES.health,
                    csrfToken: REST_ROUTES.csrfToken,
                    auth: {
                        login: REST_ROUTES.auth.login,
                        session: REST_ROUTES.auth.session,
                    },
                    landingPage: {
                        root: REST_ROUTES.landingPage.root,
                        contactInfo: REST_ROUTES.landingPage.contactInfo,
                        variants: REST_ROUTES.landingPage.variants,
                    },
                    storage: {
                        stats: REST_ROUTES.storage.stats,
                        cleanupPreview: REST_ROUTES.storage.cleanupPreview,
                        orphanedFiles: REST_ROUTES.storage.orphanedFiles,
                    },
                    logs: {
                        root: REST_ROUTES.logs.root,
                        stats: REST_ROUTES.logs.stats,
                    },
                    newsletter: {
                        subscribe: REST_ROUTES.newsletter.subscribe,
                        subscribers: REST_ROUTES.newsletter.subscribers,
                        subscribersExport: REST_ROUTES.newsletter.subscribersExport,
                    },
                },
            },
        });
    });
});
