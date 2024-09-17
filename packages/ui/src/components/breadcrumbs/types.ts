import { PageTab } from "hooks/useTabs";
import { SxType } from "types";

export interface BreadcrumbsBaseProps {
    paths: readonly { text: string; link: string; }[];
    separator?: string;
    ariaLabel?: string;
    textColor?: string;
    sx?: any;
}

export type CopyrightBreadcrumbsProps = Omit<BreadcrumbsBaseProps, "paths" | "ariaLabel">;

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
