import { describe, expect, it } from "vitest";
import type { HeroBanner } from "@local/shared";
import {
    buildUploadedHeroBanners,
    deleteHeroBanner,
    reorderHeroBanners,
    updateHeroBannerField,
} from "./heroBannerFormState";

const banner = (id: string, displayOrder: number): HeroBanner => ({
    id,
    src: `/${id}.jpg`,
    alt: id,
    description: "",
    width: 100,
    height: 100,
    displayOrder,
    isActive: true,
});

describe("hero banner form state", () => {
    it("builds uploaded banners from successful upload results", () => {
        const result = buildUploadedHeroBanners(
            [
                { success: true, src: "assets/hero-one.jpg", width: 640, height: 480 },
                { success: false },
                { success: true, src: "assets/hero-two.webp" },
            ],
            [
                new File([""], "hero-one.jpg"),
                new File([""], "ignored.jpg"),
                new File([""], "hero-two.png"),
            ],
            2,
        );

        expect(result).toMatchObject([
            {
                src: "/assets/hero-one.jpg",
                alt: "hero-one",
                width: 640,
                height: 480,
                displayOrder: 3,
                isActive: true,
            },
            {
                src: "/assets/hero-two.webp",
                alt: "hero-two",
                width: 0,
                height: 0,
                displayOrder: 4,
                isActive: true,
            },
        ]);
    });

    it("reorders banners and rewrites display order", () => {
        expect(
            reorderHeroBanners([banner("one", 1), banner("two", 2), banner("three", 3)], 0, 2),
        ).toMatchObject([
            { id: "two", displayOrder: 1 },
            { id: "three", displayOrder: 2 },
            { id: "one", displayOrder: 3 },
        ]);
    });

    it("deletes banners and rewrites display order", () => {
        expect(
            deleteHeroBanner([banner("one", 1), banner("two", 2), banner("three", 3)], "two"),
        ).toMatchObject([
            { id: "one", displayOrder: 1 },
            { id: "three", displayOrder: 2 },
        ]);
    });

    it("updates a single banner field", () => {
        expect(
            updateHeroBannerField([banner("one", 1), banner("two", 2)], "two", "alt", "New"),
        ).toMatchObject([
            { id: "one", alt: "one" },
            { id: "two", alt: "New" },
        ]);
    });
});
