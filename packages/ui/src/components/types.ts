import { ReactNode } from "react";
import { SxType } from "types";

export interface CardGridProps {
    children: ReactNode;
    disableMargin?: boolean;
    minWidth: number;
    sx?: SxType;
}

export interface ErrorBoundaryProps {
    children: React.ReactNode;
}

export interface PageContainerProps {
    children: boolean | null | undefined | JSX.Element | (boolean | null | undefined | JSX.Element)[];
    sx?: { [x: string]: any };
}
