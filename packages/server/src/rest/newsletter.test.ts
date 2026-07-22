import { describe, expect, it } from "vitest";
import {
    buildNewsletterStatsResponse,
    buildNewsletterStatusCounts,
    buildNewsletterSubscribersCsv,
    buildNewsletterWhereFilter,
    isValidNewsletterEmail,
    normalizeNewsletterEmail,
} from "./newsletter.js";

describe("newsletter helpers", () => {
    it("normalizes and validates newsletter emails", () => {
        expect(normalizeNewsletterEmail("  PERSON@Example.COM ")).toBe("person@example.com");
        expect(isValidNewsletterEmail("person@example.com")).toBe(true);
        expect(isValidNewsletterEmail("person@example")).toBe(false);
        expect(isValidNewsletterEmail("not an email")).toBe(false);
        expect(isValidNewsletterEmail("person@@example.com")).toBe(false);
        expect(isValidNewsletterEmail(`person@${"a".repeat(255)}.com`)).toBe(false);
        expect(isValidNewsletterEmail(`!@!.${"!.".repeat(100_000)}`)).toBe(false);
    });

    it("builds subscriber filters from optional query params", () => {
        expect(
            buildNewsletterWhereFilter({
                status: "active",
                variantId: "variant-a",
                search: "example",
            })
        ).toEqual({
            status: "active",
            variant_id: "variant-a",
            email: {
                contains: "example",
                mode: "insensitive",
            },
        });

        expect(buildNewsletterWhereFilter({})).toEqual({});
    });

    it("builds status counts and stats responses", () => {
        const statusCounts = [
            { status: "active", _count: 5 },
            { status: "unsubscribed", _count: 2 },
        ];

        expect(buildNewsletterStatusCounts(statusCounts)).toEqual({
            active: 5,
            unsubscribed: 2,
        });

        expect(
            buildNewsletterStatsResponse({
                statusCounts,
                variantCounts: [
                    { variant_id: "variant-a", _count: 3 },
                    { variant_id: null, _count: 2 },
                ],
                recentSignups: 4,
                signupsThisMonth: 9,
            })
        ).toEqual({
            byStatus: {
                active: 5,
                unsubscribed: 2,
            },
            byVariant: [
                { variantId: "variant-a", count: 3 },
                { variantId: null, count: 2 },
            ],
            recentActivity: {
                last7Days: 4,
                last30Days: 9,
            },
        });
    });

    it("escapes subscriber CSV cells", () => {
        expect(
            buildNewsletterSubscribersCsv([
                {
                    email: 'person+"quote"@example.com',
                    variant_id: null,
                    source: "homepage",
                    status: "active",
                    created_at: new Date("2026-06-19T12:00:00.000Z"),
                },
            ])
        ).toBe(
            'Email,Variant ID,Source,Status,Subscribed At\n"person+""quote""@example.com","","homepage","active","2026-06-19T12:00:00.000Z"'
        );
    });
});
