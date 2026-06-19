import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
    addSearchParams,
    keepSearchParams,
    parseSearchParams,
    removeSearchParams,
    setSearchParams,
    stringifySearchParams,
} from "./searchParams";
import type { SetLocation } from "./useLocation";

describe("searchParams", () => {
    const setLocation = vi.fn<SetLocation>();

    beforeEach(() => {
        setLocation.mockReset();
        window.history.replaceState(null, "", "/current");
    });

    afterEach(() => {
        window.history.replaceState(null, "", "/current");
    });

    it("parses primitive, encoded, and JSON-shaped search params", () => {
        window.history.replaceState(
            null,
            "",
            "/current?query=maple&enabled=true&count=3&nested=%7B%22id%22%3A%22hero%22%7D",
        );

        expect(parseSearchParams()).toEqual({
            query: "maple",
            enabled: true,
            count: "3",
            nested: { id: "hero" },
        });
    });

    it("returns an empty object for malformed search params and reports the parse failure", () => {
        globalThis.allowConsoleError("Could not parse search params");
        window.history.replaceState(null, "", "/current?bad=%E0%A4%A");

        expect(parseSearchParams()).toEqual({});
    });

    it("stringifies params while omitting nullish values", () => {
        expect(
            stringifySearchParams({
                query: "spring plants",
                active: true,
                empty: null,
                missing: undefined,
            }),
        ).toBe("?query=%22spring%20plants%22&active=true");
    });

    it("adds, sets, keeps, and removes params through the location setter", () => {
        window.history.replaceState(null, "", "/current?query=maple&page=2&sort=name");

        addSearchParams(setLocation, { page: 3, active: true });
        expect(setLocation).toHaveBeenLastCalledWith("/current", {
            replace: true,
            searchParams: { query: "maple", page: 3, sort: "name", active: true },
        });

        setSearchParams(setLocation, { query: "oak" });
        expect(setLocation).toHaveBeenLastCalledWith("/current", {
            replace: true,
            searchParams: { query: "oak" },
        });

        keepSearchParams(setLocation, ["query"]);
        expect(setLocation).toHaveBeenLastCalledWith("/current", {
            replace: true,
            searchParams: { query: "maple" },
        });

        removeSearchParams(setLocation, ["page"]);
        expect(setLocation).toHaveBeenLastCalledWith("/current", {
            replace: true,
            searchParams: { query: "maple", sort: "name" },
        });
    });
});
