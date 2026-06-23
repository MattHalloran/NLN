import { describe, expect, it } from "vitest";
import { getEnabledHomeSections } from "./homeSections";

const Component = {};

describe("HomePage section ordering", () => {
    it("keeps configured order while removing disabled or unsupported sections", () => {
        const sections = getEnabledHomeSections(
            {
                order: ["hero", "unknown", "about", "seasonal", "location"],
                enabled: {
                    hero: true,
                    unknown: true,
                    about: false,
                    seasonal: true,
                    location: true,
                },
            },
            {
                hero: Component,
                about: Component,
                seasonal: Component,
                location: Component,
            },
        );

        expect(sections).toEqual(["hero", "seasonal", "location"]);
    });
});
