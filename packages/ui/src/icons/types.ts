import type { CSSProperties } from "react";

export interface SvgProps {
    fill?: string;
    iconTitle?: string;
    id?: string;
    style?: CSSProperties;
    onClick?: () => unknown;
    width?: number | string | null;
    height?: number | string | null;
}

export type SvgComponent = (props: SvgProps) => JSX.Element;
