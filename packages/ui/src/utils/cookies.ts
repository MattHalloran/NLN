/**
 * This handles handles storing and retrieving "cookies", which may or
 * may not be permitted by the user's cookie preferences. I say "cookies" in 
 * quotes because they are not actually cookies, but rather localStorage. It is 
 * unclear whether EU's Cookie Law applies to localStorage, but it is better to
 * be safe than sorry.
 */
import { COOKIE, ValueOf } from "@local/shared";

/**
 * Handles storing and retrieving cookies, which may or 
 * may not be permitted by the user's cookie preferences
 */
export const Cookies = {
    ...COOKIE,
    Preferences: "cookiePreferences",
    Theme: "theme",
    FontSize: "fontSize",
    Language: "language",
    LastTab: "lastTab",
    IsLeftHanded: "isLeftHanded",
    SideMenuState: "sideMenuState",
};
export type CookieKey = ValueOf<typeof Cookies>;

/**
 * Preferences for the user's cookie settings
 */
export type CookiePreferences = {
    strictlyNecessary: boolean;
    performance: boolean;
    functional: boolean;
    targeting: boolean;
}

const getCookie = <T>(name: CookieKey | string, typeCheck: (value: unknown) => value is T): T | undefined => {
    const cookie = localStorage.getItem(name);
    // If cookie doesn't exist, return undefined without logging
    if (cookie === null || cookie === undefined) {
        return undefined;
    }
    // Try to parse
    try {
        const parsed = JSON.parse(cookie);
        if (typeCheck(parsed)) {
            return parsed;
        }
    } catch (e) {
        console.warn(`Failed to parse cookie ${name}`, cookie);
    }
    return undefined;
};

const setCookie = (name: CookieKey | string, value: unknown) => { localStorage.setItem(name, JSON.stringify(value)); };

/**
 * Gets a cookie if it exists, otherwise sets it to the default value. 
 * Assumes that you have already checked that the cookie is allowed.
 */
export const getOrSetCookie = <T>(name: CookieKey | string, typeCheck: (value: unknown) => value is T, defaultValue?: T): T | undefined => {
    const cookie = getCookie(name, typeCheck);
    if (cookie !== null && cookie !== undefined) return cookie;
    if (defaultValue !== null && defaultValue !== undefined) setCookie(name, defaultValue);
    return defaultValue;
};

/**
 * Finds the user's cookie preferences.
 * @returns CookiePreferences object with defaults if not set
 */
export const getCookiePreferences = (): CookiePreferences => {
    const cookie = getCookie(Cookies.Preferences, (value: unknown): value is CookiePreferences => typeof value === "object");
    if (!cookie) {
        // Return default preferences that allow functional cookies
        // Users can change these via a cookie consent banner if implemented
        return {
            strictlyNecessary: true,
            performance: false,
            functional: true, // Allow functional cookies by default (theme, menu state, etc.)
            targeting: false,
        };
    }
    return {
        strictlyNecessary: cookie.strictlyNecessary || true,
        performance: cookie.performance || false,
        functional: cookie.functional || false,
        targeting: cookie.targeting || false,
    };
};

/**
 * Sets the user's cookie preferences.
 * @param preferences CookiePreferences object
 */
export const setCookiePreferences = (preferences: CookiePreferences) => {
    setCookie(Cookies.Preferences, preferences);
};

/**
 * Sets a cookie only if the user has permitted the cookie's type. 
 * For strictly necessary cookies it will be set regardless of user 
 * preferences.
 * @param cookieType Cookie type to check
 * @param callback Callback function to call if cookie is allowed
 * @param fallback Optional fallback value to use if cookie is not allowed
 */
const ifAllowed = (cookieType: keyof CookiePreferences, callback: () => unknown, fallback?: any) => {
    const preferences = getCookiePreferences();
    if (cookieType === "strictlyNecessary" || preferences[cookieType]) {
        return callback();
    }
    else {
        console.warn(`Not allowed to get/set cookie ${cookieType}`);
        return fallback;
    }
};

type ThemeType = "light" | "dark";
export const getCookieTheme = <T extends ThemeType | undefined>(fallback?: T): T =>
    ifAllowed("functional",
        () => getOrSetCookie(Cookies.Theme, (value: unknown): value is ThemeType => value === "light" || value === "dark", fallback),
        fallback,
    );
export const setCookieTheme = (theme: ThemeType) => ifAllowed("functional", () => setCookie(Cookies.Theme, theme));

export const getCookieFontSize = <T extends number | undefined>(fallback?: T): T =>
    ifAllowed("functional",
        () => {
            const size = getOrSetCookie(Cookies.FontSize, (value: unknown): value is number => typeof value === "number", fallback);
            // Ensure font size is not too small or too large. This would make the UI unusable.
            return size ? Math.max(8, Math.min(24, size)) : undefined;
        },
        fallback,
    );
export const setCookieFontSize = (fontSize: number) => ifAllowed("functional", () => setCookie(Cookies.FontSize, fontSize));

export const getCookieLanguage = <T extends string | undefined>(fallback?: T): T =>
    ifAllowed("functional",
        () => getOrSetCookie(Cookies.Language, (value: unknown): value is string => typeof value === "string", fallback),
        fallback,
    );
export const setCookieLanguage = (language: string) => ifAllowed("functional", () => setCookie(Cookies.Language, language));

export const getCookieIsLeftHanded = <T extends boolean | undefined>(fallback?: T): T =>
    ifAllowed("functional",
        () => getOrSetCookie(Cookies.IsLeftHanded, (value: unknown): value is boolean => typeof value === "boolean", fallback),
        fallback,
    );
export const setCookieIsLeftHanded = (isLeftHanded: boolean) => ifAllowed("functional", () => setCookie(Cookies.IsLeftHanded, isLeftHanded));

export const getSideMenuState = <T extends boolean | undefined>(id: string, fallback?: T): T =>
    ifAllowed("functional",
        () => {
            const allMenus = getOrSetCookie(Cookies.SideMenuState, (value: unknown): value is Record<string, boolean> => typeof value === "object" && value !== null, {});
            return allMenus?.[id] ?? fallback;
        },
        fallback,
    );

export const setSideMenuState = (id: string, state: boolean) => ifAllowed("functional", () => {
    const allMenus = getOrSetCookie(Cookies.SideMenuState, (value: unknown): value is Record<string, boolean> => typeof value === "object" && value !== null, {});
    setCookie(Cookies.SideMenuState, allMenus ? { ...allMenus, [id]: state } : { [id]: state });
});

export const getCookieLastTab = <T>(id: string, fallback?: T): T | undefined => ifAllowed("functional", () => {
    const lastTab = getOrSetCookie(`${Cookies.LastTab}-${id}`, (value: unknown): value is string => typeof value === "string", undefined);
    return lastTab as unknown as T;
}, fallback);
export const setCookieLastTab = <T>(id: string, tabType: T) => ifAllowed("functional", () => setCookie(`${Cookies.LastTab}-${id}`, tabType));
