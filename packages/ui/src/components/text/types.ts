import { SvgComponent, SxType } from "types";

export interface TitleProps {
    /** Informational icons displayed to the right of the title */
    adornments?: JSX.Element[];
    help?: string;
    /** Icon displayed to the left of the title */
    Icon?: SvgComponent;
    /** Action icons displayed to the right of the title and adornments */
    options?: {
        Icon: SvgComponent;
        label: string;
        onClick: (e?: any) => void;
    }[];
    sxs?: {
        stack?: SxType;
        text?: SxType;
    }
    title?: string;
    /** Replaces title if provided */
    titleComponent?: JSX.Element;
    /** Determines size */
    variant?: "header" | "subheader";
}
