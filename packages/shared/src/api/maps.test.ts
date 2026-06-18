import { describe, expect, it } from "vitest";
import {
    buildGoogleMapsEmbedUrl,
    DEFAULT_BUSINESS_ADDRESS,
    DEFAULT_GOOGLE_MAPS_ZOOM,
} from "./maps";

describe("buildGoogleMapsEmbedUrl", () => {
    it("returns null when no API key is provided", () => {
        expect(buildGoogleMapsEmbedUrl({})).toBeNull();
    });

    it("builds an encoded Google Maps embed URL with defaults", () => {
        const url = buildGoogleMapsEmbedUrl({ apiKey: "test-key" });

        expect(url).not.toBeNull();

        const parsed = new URL(url as string);
        expect(parsed.origin).toBe("https://www.google.com");
        expect(parsed.pathname).toBe("/maps/embed/v1/place");
        expect(parsed.searchParams.get("key")).toBe("test-key");
        expect(parsed.searchParams.get("q")).toBe(DEFAULT_BUSINESS_ADDRESS);
        expect(parsed.searchParams.get("zoom")).toBe(String(DEFAULT_GOOGLE_MAPS_ZOOM));
    });

    it("uses custom address and zoom values", () => {
        const url = buildGoogleMapsEmbedUrl({
            apiKey: "test-key",
            address: "1 Main St, Bridgeton, NJ",
            zoom: 12,
        });

        const parsed = new URL(url as string);
        expect(parsed.searchParams.get("q")).toBe("1 Main St, Bridgeton, NJ");
        expect(parsed.searchParams.get("zoom")).toBe("12");
    });
});
