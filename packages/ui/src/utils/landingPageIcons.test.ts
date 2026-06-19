import { LANDING_PAGE_ICON } from "@local/shared";
import { Leaf } from "lucide-react";
import {
    LANDING_PAGE_ICON_COMPONENTS,
    landingPageIconOptions,
    resolveLandingPageIcon,
} from "./landingPageIcons";

describe("landingPageIcons", () => {
    it("resolves known landing page icons", () => {
        expect(resolveLandingPageIcon(LANDING_PAGE_ICON.Award)).toBe(
            LANDING_PAGE_ICON_COMPONENTS[LANDING_PAGE_ICON.Award],
        );
    });

    it("falls back when an icon is missing", () => {
        expect(resolveLandingPageIcon(undefined)).toBe(Leaf);
        expect(resolveLandingPageIcon("missing-icon")).toBe(Leaf);
    });

    it("re-exports the shared icon options", () => {
        expect(landingPageIconOptions.length).toBeGreaterThan(0);
        expect(landingPageIconOptions.map((option) => option.value)).toContain(
            LANDING_PAGE_ICON.Leaf,
        );
    });
});
