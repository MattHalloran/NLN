import { SxType } from "types";
import { PageTab } from "utils/useTabs";

export interface BreadcrumbsBaseProps {
    paths: { text: string; link: string; }[];
    separator?: string;
    ariaLabel?: string;
    textColor?: string;
    sx?: any;
}

export type CopyrightBreadcrumbsProps = Omit<BreadcrumbsBaseProps, "paths" | "ariaLabel">;

export type PolicyBreadcrumbsProps = Omit<BreadcrumbsBaseProps, "paths" | "ariaLabel">

export interface PageTabsProps<T, S extends boolean = true> {
    ariaLabel: string,
    currTab: PageTab<T, S>,
    fullWidth?: boolean,
    id?: string,
    /** Ignore Icons in tabs, rendering them using labels instead */
    ignoreIcons?: boolean,
    onChange: (event: React.ChangeEvent<unknown>, value: PageTab<T, S>) => unknown,
    tabs: PageTab<T, S>[],
    sx?: SxType,
}
