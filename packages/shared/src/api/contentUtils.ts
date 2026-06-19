import type { LandingPageContent } from "./types";

export interface ActiveOrderedItem {
    displayOrder: number;
    isActive: boolean;
}

export const sortByDisplayOrder = <T extends Pick<ActiveOrderedItem, "displayOrder">>(
    items: readonly T[],
): T[] => [...items].sort((a, b) => a.displayOrder - b.displayOrder);

export const filterActive = <T extends Pick<ActiveOrderedItem, "isActive">>(
    items: readonly T[],
): T[] => items.filter((item) => item.isActive);

export const activeByDisplayOrder = <T extends ActiveOrderedItem>(items: readonly T[]): T[] =>
    sortByDisplayOrder(filterActive(items));

export const filterActiveLandingPageContent = (
    content: LandingPageContent,
): LandingPageContent => ({
    ...content,
    content: {
        ...content.content,
        hero: {
            ...content.content.hero,
            banners: activeByDisplayOrder(content.content.hero.banners),
        },
        seasonal: {
            ...content.content.seasonal,
            plants: activeByDisplayOrder(content.content.seasonal.plants),
            tips: activeByDisplayOrder(content.content.seasonal.tips),
        },
    },
});

export interface LandingPageTokenValues {
    foundedYear?: number;
    yearsInBusiness?: number;
    currentSeason?: string;
}

export const replaceLandingPageTokens = (text: string, values: LandingPageTokenValues): string =>
    text
        .replace(/{foundedYear}/g, String(values.foundedYear ?? ""))
        .replace(/{yearsInBusiness}/g, String(values.yearsInBusiness ?? ""))
        .replace(/{season}/g, String(values.currentSeason ?? ""));

export const moveArrayIndex = <T>(array: readonly T[], from: number, to: number): T[] => {
    const copy = [...array];
    copy.splice(to, 0, copy.splice(from, 1)[0]);
    return copy;
};

export const getValueAtPath = (
    object: Record<string, unknown> | null | undefined,
    path: string,
): unknown => {
    if (!object || !path) return null;
    return path.split(".").reduce<unknown>((current, key) => {
        if (current !== null && typeof current === "object") {
            return (current as Record<string, unknown>)[key];
        }
        return undefined;
    }, object);
};

export const flattenObjectToPaths = (
    object: Record<string, unknown>,
    parent: string[] = [],
    result: Record<string, unknown> = {},
): Record<string, unknown> => {
    Object.entries(object).forEach(([key, value]) => {
        const keyPath = [...parent, key];
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            flattenObjectToPaths(value as Record<string, unknown>, keyPath, result);
        } else {
            result[keyPath.join(".")] = value;
        }
    });
    return result;
};
