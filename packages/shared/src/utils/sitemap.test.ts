import { describe, expect, it } from "vitest";
import { generateSitemap, generateSitemapIndex } from "./sitemap";

describe("sitemap utils", () => {
    it("generates route entries with normalized site URLs and defaults", () => {
        const sitemap = generateSitemap("https://example.com/", {
            main: [{ path: "/about", priority: 0.7, changeFreq: "weekly" }, {}],
        });

        expect(sitemap).toContain("<loc>https://example.com/about</loc>");
        expect(sitemap).toContain("<priority>0.7</priority>");
        expect(sitemap).toContain("<changefreq>weekly</changefreq>");
        expect(sitemap).toContain("<loc>https://example.com/</loc>");
        expect(sitemap).toContain("<priority>0</priority>");
        expect(sitemap).toContain("<changefreq>never</changefreq>");
    });

    it("generates content entries with root handles and alternate language links", () => {
        const sitemap = generateSitemap("https://example.com", {
            content: [
                {
                    id: "fall-care",
                    handle: "fall-care-guide",
                    languages: ["es", "fr"],
                    objectLink: "/guides",
                    rootHandle: "plants",
                },
            ],
        });

        expect(sitemap).toContain("<loc>https://example.com/guides/plants/fall-care-guide</loc>");
        expect(sitemap).toContain(
            '<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/guides/plants/fall-care-guide" />',
        );
        expect(sitemap).toContain(
            '<xhtml:link rel="alternate" hreflang="es" href="https://example.com/guides/plants/fall-care-guide?lang=es" />',
        );
        expect(sitemap).toContain(
            '<xhtml:link rel="alternate" hreflang="fr" href="https://example.com/guides/plants/fall-care-guide?lang=fr" />',
        );
    });

    it("falls back to root IDs and entry IDs for content paths", () => {
        const sitemap = generateSitemap("https://example.com", {
            content: [
                {
                    id: "child-id",
                    languages: [],
                    objectLink: "/services",
                    rootId: "root-id",
                },
            ],
        });

        expect(sitemap).toContain("<loc>https://example.com/services/root-id/child-id</loc>");
    });

    it("generates sitemap index files", () => {
        expect(generateSitemapIndex("https://example.com/sitemaps", ["routes.xml", "content.xml"]))
            .toMatchInlineSnapshot(`
              "<?xml version="1.0" encoding="UTF-8"?>
              <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                <sitemap>
                  <loc>https://example.com/sitemaps/routes.xml</loc>
                </sitemap>
                <sitemap>
                  <loc>https://example.com/sitemaps/content.xml</loc>
                </sitemap>
              </sitemapindex>"
            `);
    });
});
