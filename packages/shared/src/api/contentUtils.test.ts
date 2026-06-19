import { describe, expect, it } from "vitest";
import {
    activeByDisplayOrder,
    filterActive,
    flattenObjectToPaths,
    getValueAtPath,
    moveArrayIndex,
    replaceLandingPageTokens,
    sortByDisplayOrder,
} from "./contentUtils";

describe("contentUtils", () => {
    it("sorts and filters display-order aware content without mutating input", () => {
        const items = [
            { id: "third", displayOrder: 3, isActive: true },
            { id: "inactive", displayOrder: 1, isActive: false },
            { id: "first", displayOrder: 1, isActive: true },
        ];

        expect(sortByDisplayOrder(items).map((item) => item.id)).toEqual([
            "inactive",
            "first",
            "third",
        ]);
        expect(filterActive(items).map((item) => item.id)).toEqual(["third", "first"]);
        expect(activeByDisplayOrder(items).map((item) => item.id)).toEqual(["first", "third"]);
        expect(items.map((item) => item.id)).toEqual(["third", "inactive", "first"]);
    });

    it("replaces known landing page tokens and blanks missing values", () => {
        expect(
            replaceLandingPageTokens("Since {foundedYear}: {yearsInBusiness} years of {season}", {
                foundedYear: 1981,
                yearsInBusiness: 45,
                currentSeason: "spring",
            }),
        ).toBe("Since 1981: 45 years of spring");

        expect(replaceLandingPageTokens("{season}-{missing}", {})).toBe("-{missing}");
    });

    it("moves an item between indexes without mutating the original array", () => {
        const input = ["a", "b", "c", "d"];

        expect(moveArrayIndex(input, 1, 3)).toEqual(["a", "c", "d", "b"]);
        expect(input).toEqual(["a", "b", "c", "d"]);
    });

    it("reads and flattens nested object paths", () => {
        const input = {
            hero: {
                title: "Welcome",
                buttons: ["shop", "visit"],
            },
            enabled: true,
        };

        expect(getValueAtPath(input, "hero.title")).toBe("Welcome");
        expect(getValueAtPath(input, "hero.missing")).toBeUndefined();
        expect(getValueAtPath(null, "hero.title")).toBeNull();
        expect(flattenObjectToPaths(input)).toEqual({
            "hero.title": "Welcome",
            "hero.buttons": ["shop", "visit"],
            enabled: true,
        });
    });
});
