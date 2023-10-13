import { SvgProps } from "icons/types";
import { ReactNode } from "react";
import { SvgComponent, SxType } from "types";

export interface CardGridProps {
    children: ReactNode;
    disableMargin?: boolean;
    minWidth: number;
    showMobileView?: boolean;
    sx?: SxType;
}

export interface ContentCollapseProps {
    children?: React.ReactNode;
    helpText?: string;
    id?: string;
    isOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => unknown;
    sxs?: {
        titleContainer?: SxType;
        root?: SxType;
        helpButton?: SvgProps;
    }
    title?: string | null;
    titleComponent?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "legend";
    titleVariant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export interface ErrorBoundaryProps {
    children: React.ReactNode;
}

export interface PageContainerProps {
    children: boolean | null | undefined | JSX.Element | (boolean | null | undefined | JSX.Element)[];
    sx?: { [x: string]: any };
}

export type NavbarProps = {
    below?: JSX.Element | boolean | undefined;
    help?: string | undefined;
    options?: {
        Icon: SvgComponent;
        label: string;
        onClick: (e?: any) => void;
    }[];
    shouldHideTitle?: boolean;
    startComponent?: JSX.Element;
    /** Sets tab title, if different than the Navbar title */
    tabTitle?: string;
    title?: string | undefined;
    /** Replaces title if provided */
    titleComponent?: JSX.Element;
}
