import { ReactNode } from "react";
import { SvgComponent, SxType } from "types";

export interface CardGridProps {
    children: ReactNode;
    disableMargin?: boolean;
    minWidth: number;
    showMobileView?: boolean;
    sx?: SxType;
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
