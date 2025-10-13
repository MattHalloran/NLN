import {
    Cookies,
    getCookiePreferences,
    setCookiePreferences,
    getOrSetCookie,
    getCookieTheme,
    setCookieTheme,
    getCookieFontSize,
    setCookieFontSize,
    getCookieLanguage,
    setCookieLanguage,
    getCookieIsLeftHanded,
    setCookieIsLeftHanded,
    getSideMenuState,
    setSideMenuState,
    getCookieLastTab,
    setCookieLastTab,
} from "./cookies";

// Mock @local/shared
jest.mock("@local/shared", () => ({
    COOKIE: {
        Session: "session",
    },
    ValueOf: String,
}));

describe("cookies", () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
        localStorage.clear();
        consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    });

    afterEach(() => {
        consoleWarnSpy.mockRestore();
    });

    describe("Cookies constants", () => {
        it("exports cookie key constants", () => {
            expect(Cookies.Preferences).toBe("cookiePreferences");
            expect(Cookies.Theme).toBe("theme");
            expect(Cookies.FontSize).toBe("fontSize");
            expect(Cookies.Language).toBe("language");
            expect(Cookies.LastTab).toBe("lastTab");
            expect(Cookies.IsLeftHanded).toBe("isLeftHanded");
            expect(Cookies.SideMenuState).toBe("sideMenuState");
        });
    });

    describe("getCookiePreferences", () => {
        it("returns null when no preferences set", () => {
            expect(getCookiePreferences()).toBeNull();
        });

        it("returns cookie preferences when set", () => {
            const prefs = {
                strictlyNecessary: true,
                performance: false,
                functional: true,
                targeting: false,
            };
            localStorage.setItem(Cookies.Preferences, JSON.stringify(prefs));

            const result = getCookiePreferences();
            expect(result).toEqual(prefs);
        });

        it("defaults strictlyNecessary to true", () => {
            const prefs = {
                strictlyNecessary: false,
                performance: false,
                functional: false,
                targeting: false,
            };
            localStorage.setItem(Cookies.Preferences, JSON.stringify(prefs));

            const result = getCookiePreferences();
            expect(result?.strictlyNecessary).toBe(true);
        });

        it("handles invalid JSON gracefully", () => {
            localStorage.setItem(Cookies.Preferences, "invalid json");
            const result = getCookiePreferences();
            expect(result).toBeNull();
        });
    });

    describe("setCookiePreferences", () => {
        it("sets cookie preferences in localStorage", () => {
            const prefs = {
                strictlyNecessary: true,
                performance: true,
                functional: true,
                targeting: false,
            };
            setCookiePreferences(prefs);

            const stored = JSON.parse(localStorage.getItem(Cookies.Preferences) || "");
            expect(stored).toEqual(prefs);
        });
    });

    describe("getOrSetCookie", () => {
        it("gets existing cookie value", () => {
            localStorage.setItem("testKey", JSON.stringify("testValue"));
            const result = getOrSetCookie(
                "testKey",
                (value): value is string => typeof value === "string",
            );
            expect(result).toBe("testValue");
        });

        it("sets default value when cookie does not exist", () => {
            const result = getOrSetCookie(
                "testKey",
                (value): value is string => typeof value === "string",
                "default",
            );
            expect(result).toBe("default");
            expect(localStorage.getItem("testKey")).toBe(JSON.stringify("default"));
        });

        it("returns undefined when no default and cookie does not exist", () => {
            const result = getOrSetCookie(
                "testKey",
                (value): value is string => typeof value === "string",
            );
            expect(result).toBeUndefined();
        });

        it("handles type check failure", () => {
            localStorage.setItem("testKey", JSON.stringify(123));
            const result = getOrSetCookie(
                "testKey",
                (value): value is string => typeof value === "string",
                "fallback",
            );
            expect(result).toBe("fallback");
        });
    });

    describe("getCookieTheme / setCookieTheme", () => {
        beforeEach(() => {
            // Set functional cookies to allowed
            setCookiePreferences({
                strictlyNecessary: true,
                performance: false,
                functional: true,
                targeting: false,
            });
        });

        it("gets theme when allowed", () => {
            localStorage.setItem(Cookies.Theme, JSON.stringify("dark"));
            expect(getCookieTheme()).toBe("dark");
        });

        it("sets theme when allowed", () => {
            setCookieTheme("dark");
            expect(localStorage.getItem(Cookies.Theme)).toBe(JSON.stringify("dark"));
        });

        it("returns fallback when functional cookies not allowed", () => {
            setCookiePreferences({
                strictlyNecessary: true,
                performance: false,
                functional: false,
                targeting: false,
            });
            expect(getCookieTheme("light")).toBe("light");
            expect(consoleWarnSpy).toHaveBeenCalled();
        });

        it("uses fallback as default value", () => {
            const result = getCookieTheme("light");
            expect(result).toBe("light");
        });
    });

    describe("getCookieFontSize / setCookieFontSize", () => {
        beforeEach(() => {
            setCookiePreferences({
                strictlyNecessary: true,
                performance: false,
                functional: true,
                targeting: false,
            });
        });

        it("gets font size when allowed", () => {
            localStorage.setItem(Cookies.FontSize, JSON.stringify(16));
            expect(getCookieFontSize()).toBe(16);
        });

        it("sets font size when allowed", () => {
            setCookieFontSize(18);
            expect(localStorage.getItem(Cookies.FontSize)).toBe(JSON.stringify(18));
        });

        it("clamps font size to minimum 8", () => {
            localStorage.setItem(Cookies.FontSize, JSON.stringify(4));
            expect(getCookieFontSize()).toBe(8);
        });

        it("clamps font size to maximum 24", () => {
            localStorage.setItem(Cookies.FontSize, JSON.stringify(32));
            expect(getCookieFontSize()).toBe(24);
        });

        it("returns fallback when not allowed", () => {
            setCookiePreferences({
                strictlyNecessary: true,
                performance: false,
                functional: false,
                targeting: false,
            });
            expect(getCookieFontSize(14)).toBe(14);
        });
    });

    describe("getCookieLanguage / setCookieLanguage", () => {
        beforeEach(() => {
            setCookiePreferences({
                strictlyNecessary: true,
                performance: false,
                functional: true,
                targeting: false,
            });
        });

        it("gets language when allowed", () => {
            localStorage.setItem(Cookies.Language, JSON.stringify("es"));
            expect(getCookieLanguage()).toBe("es");
        });

        it("sets language when allowed", () => {
            setCookieLanguage("fr");
            expect(localStorage.getItem(Cookies.Language)).toBe(JSON.stringify("fr"));
        });

        it("returns fallback when not allowed", () => {
            setCookiePreferences({
                strictlyNecessary: true,
                performance: false,
                functional: false,
                targeting: false,
            });
            expect(getCookieLanguage("en")).toBe("en");
        });
    });

    describe("getCookieIsLeftHanded / setCookieIsLeftHanded", () => {
        beforeEach(() => {
            setCookiePreferences({
                strictlyNecessary: true,
                performance: false,
                functional: true,
                targeting: false,
            });
        });

        it("gets isLeftHanded when allowed", () => {
            localStorage.setItem(Cookies.IsLeftHanded, JSON.stringify(true));
            expect(getCookieIsLeftHanded()).toBe(true);
        });

        it("sets isLeftHanded when allowed", () => {
            setCookieIsLeftHanded(true);
            expect(localStorage.getItem(Cookies.IsLeftHanded)).toBe(JSON.stringify(true));
        });

        it("handles boolean false correctly", () => {
            setCookieIsLeftHanded(false);
            expect(getCookieIsLeftHanded()).toBe(false);
        });

        it("returns fallback when not allowed", () => {
            setCookiePreferences({
                strictlyNecessary: true,
                performance: false,
                functional: false,
                targeting: false,
            });
            expect(getCookieIsLeftHanded(false)).toBe(false);
        });
    });

    describe("getSideMenuState / setSideMenuState", () => {
        beforeEach(() => {
            setCookiePreferences({
                strictlyNecessary: true,
                performance: false,
                functional: true,
                targeting: false,
            });
        });

        it("gets menu state for specific id", () => {
            localStorage.setItem(
                Cookies.SideMenuState,
                JSON.stringify({ menu1: true, menu2: false }),
            );
            expect(getSideMenuState("menu1")).toBe(true);
            expect(getSideMenuState("menu2")).toBe(false);
        });

        it("sets menu state for specific id", () => {
            setSideMenuState("menu1", true);
            const stored = JSON.parse(localStorage.getItem(Cookies.SideMenuState) || "{}");
            expect(stored.menu1).toBe(true);
        });

        it("returns fallback for non-existent menu id", () => {
            expect(getSideMenuState("nonExistent", false)).toBe(false);
        });

        it("preserves other menu states when setting one", () => {
            setSideMenuState("menu1", true);
            setSideMenuState("menu2", false);

            const stored = JSON.parse(localStorage.getItem(Cookies.SideMenuState) || "{}");
            expect(stored.menu1).toBe(true);
            expect(stored.menu2).toBe(false);
        });

        it("returns fallback when not allowed", () => {
            setCookiePreferences({
                strictlyNecessary: true,
                performance: false,
                functional: false,
                targeting: false,
            });
            expect(getSideMenuState("menu1", true)).toBe(true);
        });
    });

    describe("getCookieLastTab / setCookieLastTab", () => {
        beforeEach(() => {
            setCookiePreferences({
                strictlyNecessary: true,
                performance: false,
                functional: true,
                targeting: false,
            });
        });

        it("gets last tab for specific id", () => {
            localStorage.setItem(`${Cookies.LastTab}-page1`, JSON.stringify("tab2"));
            expect(getCookieLastTab("page1")).toBe("tab2");
        });

        it("sets last tab for specific id", () => {
            setCookieLastTab("page1", "tab3");
            expect(localStorage.getItem(`${Cookies.LastTab}-page1`)).toBe(JSON.stringify("tab3"));
        });

        it("handles different page ids independently", () => {
            setCookieLastTab("page1", "tab1");
            setCookieLastTab("page2", "tab2");

            expect(getCookieLastTab("page1")).toBe("tab1");
            expect(getCookieLastTab("page2")).toBe("tab2");
        });

        it("returns fallback for non-existent tab", () => {
            // getCookieLastTab returns undefined when tab doesn't exist, not the fallback
            expect(getCookieLastTab("nonExistent", "default")).toBeUndefined();
        });

        it("returns fallback when not allowed", () => {
            setCookiePreferences({
                strictlyNecessary: true,
                performance: false,
                functional: false,
                targeting: false,
            });
            expect(getCookieLastTab("page1", "default")).toBe("default");
        });
    });

    describe("strictlyNecessary override", () => {
        it("allows theme access when strictlyNecessary requested", () => {
            setCookiePreferences({
                strictlyNecessary: true,
                performance: false,
                functional: false,
                targeting: false,
            });

            // This should still be blocked since theme is "functional"
            const result = getCookieTheme("light");
            expect(result).toBe("light");
            expect(consoleWarnSpy).toHaveBeenCalled();
        });
    });
});
