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
    /** 
     * Optional fallback component to render instead of default error UI 
     */
    fallback?: React.ComponentType<{
        error: Error;
        errorInfo: React.ErrorInfo;
        resetError: () => void;
    }>;
    /**
     * Callback fired when an error is caught
     */
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    /**
     * Whether to enable error reporting to external services
     */
    enableReporting?: boolean;
}

export interface PageContainerProps {
    children?: boolean | null | undefined | JSX.Element | (boolean | null | undefined | JSX.Element)[];
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
