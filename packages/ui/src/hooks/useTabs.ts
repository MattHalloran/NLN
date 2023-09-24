import { Palette, useTheme } from "@mui/material";
import { ChangeEvent, useCallback, useMemo, useState } from "react";
import { addSearchParams, parseSearchParams, useLocation } from "route";
import { SvgComponent, ViewDisplayType } from "types";

export type TabParam<T, S extends boolean = true> = {
    color?: (palette: Palette) => (string | { active: string, inactive: string })
    href?: string;
    Icon?: SvgComponent,
    title: string;
    tabType: T;
} & (S extends true ? {
    searchPlaceholder?: string;
    searchType: any;
    where: (params?: any) => { [x: string]: any };
} : object);

export type PageTab<T, S extends boolean = true> = {
    color?: string | { active: string, inactive: string };
    href?: string;
    index: number;
    Icon?: SvgComponent;
    label: string;
    tabType: T;
} & (S extends true ? {
    searchPlaceholder: string;
    searchType: any;
} : object);

type UseTabsParam<T, S extends boolean = true> = TabParam<T, S>;

/**
 * Contains logic for displaying tabs and handling tab changes.
 */
export const useTabs = <T, S extends boolean = true>({
    defaultTab,
    display,
    id,
    tabParams,
}: {
    defaultTab?: T,
    display: ViewDisplayType,
    id: string,
    tabParams: readonly UseTabsParam<T, S>[],
}) => {
    const [, setLocation] = useLocation();
    const { palette } = useTheme();

    const tabs = useMemo<PageTab<T, S>[]>(() => {
        return tabParams.map((tab, i) => ({
            color: typeof tab.color === "function" ? tab.color(palette) : tab.color,
            href: tab.href,
            Icon: tab.Icon,
            index: i,
            label: tab.title,
            searchPlaceholder: (tab as UseTabsParam<T, true>).searchPlaceholder,
            searchType: (tab as UseTabsParam<T, true>).searchType,
            tabType: tab.tabType,
        })) as PageTab<T, S>[];
    }, [palette, tabParams]);

    const [currTab, setCurrTab] = useState<PageTab<T, S>>(() => {
        if (display !== "page") {
            const defaultIndex = tabs.findIndex(tab => tab.tabType === defaultTab);
            return tabs[defaultIndex !== -1 ? defaultIndex : 0];
        }
        const searchParams = parseSearchParams();
        const tabFromParams = tabs.find(tab => tab.tabType === searchParams.type);
        return tabFromParams || tabs.find(tab => tab.tabType === defaultTab) || tabs[0];
    });

    const handleTabChange = useCallback((e: ChangeEvent<unknown>, tab: PageTab<T, S>) => {
        e.preventDefault();
        if (display === "page") addSearchParams(setLocation, { type: tab.tabType });
        setCurrTab(tab);
    }, [display, setLocation, id]);

    const currTabParams = useMemo(() => tabParams[currTab.index], [currTab.index, tabParams]);

    return { tabs, currTab, setCurrTab, handleTabChange, ...currTabParams };
};
