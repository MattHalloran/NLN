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
