import { describe, expect, it } from "vitest";
import {
    API_PREFIX,
    REST_API_PREFIX,
    REST_ENDPOINTS,
    REST_ROUTES,
    stripApiPrefix,
    stripRestPrefix,
} from "./index";
import type { ApiEndpoint, HttpMethod } from "./contracts";

type EndpointEntry = {
    name: string;
    method: HttpMethod;
    path: string;
};

const isEndpoint = (value: unknown): value is ApiEndpoint<unknown, unknown, unknown> =>
    typeof value === "object" &&
    value !== null &&
    "method" in value &&
    "path" in value &&
    typeof (value as { method: unknown }).method === "string" &&
    typeof (value as { path: unknown }).path === "string";

const collectEndpoints = (source: unknown, prefix = "REST_ENDPOINTS"): EndpointEntry[] => {
    if (isEndpoint(source)) {
        return [{ name: prefix, method: source.method, path: source.path }];
    }

    if (typeof source !== "object" || source === null) {
        return [];
    }

    return Object.entries(source).flatMap(([key, value]) => {
        if (typeof value === "function") {
            const endpoint = value();
            return isEndpoint(endpoint)
                ? [{ name: `${prefix}.${key}()`, method: endpoint.method, path: endpoint.path }]
                : [];
        }

        return collectEndpoints(value, `${prefix}.${key}`);
    });
};

describe("REST route contracts", () => {
    it("keeps endpoint metadata under the versioned REST API prefix", () => {
        const endpoints = collectEndpoints(REST_ENDPOINTS);

        expect(endpoints.length).toBeGreaterThan(25);
        expect(endpoints).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: "REST_ENDPOINTS.auth.login" }),
                expect.objectContaining({ name: "REST_ENDPOINTS.landingPage.updateContent" }),
                expect.objectContaining({ name: "REST_ENDPOINTS.storage.cleanupPreview" }),
                expect.objectContaining({ name: "REST_ENDPOINTS.newsletter.subscribers" }),
            ]),
        );

        for (const endpoint of endpoints) {
            expect(["GET", "POST", "PUT", "DELETE"]).toContain(endpoint.method);
            expect(endpoint.path, endpoint.name).toMatch(new RegExp(`^${REST_API_PREFIX}`));
            expect(endpoint.path, endpoint.name).not.toContain("//");
        }
    });

    it("keeps dynamic route builders aligned with endpoint builders", () => {
        expect(REST_ENDPOINTS.images.delete().path).toBe(`${REST_ROUTES.images.root}/:hash`);
        expect(REST_ENDPOINTS.images.delete("abc123").path).toBe(
            `${REST_ROUTES.images.root}/abc123`,
        );
        expect(REST_ENDPOINTS.images.removeLabel().path).toBe(
            `${REST_ROUTES.images.root}/:hash/labels/:label`,
        );
        expect(REST_ENDPOINTS.images.removeLabel("abc123", "gallery").path).toBe(
            `${REST_ROUTES.images.root}/abc123/labels/gallery`,
        );
        expect(REST_ENDPOINTS.landingPage.promoteVariant("variant-a").path).toBe(
            REST_ROUTES.landingPage.promoteVariant("variant-a"),
        );
        expect(REST_ENDPOINTS.newsletter.deleteSubscriber("42").path).toBe(
            REST_ROUTES.newsletter.subscriber("42"),
        );
    });

    it("strips API prefixes consistently for server-relative browser requests", () => {
        expect(stripRestPrefix(REST_ROUTES.auth.login)).toBe("/auth/login");
        expect(stripApiPrefix(REST_ROUTES.auth.login)).toBe("/rest/v1/auth/login");
        expect(stripApiPrefix(API_PREFIX)).toBe("/");
        expect(stripRestPrefix("/unversioned")).toBe("/unversioned");
    });
});
