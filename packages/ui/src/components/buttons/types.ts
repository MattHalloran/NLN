import { OrArray } from "@local/shared";
import { ButtonProps } from "@mui/material";
import { SvgProps } from "icons/types";
import React from "react";
import { SxType, ViewDisplayType } from "types";

export interface BottomActionsGridProps {
    children: OrArray<JSX.Element | null | undefined>;
    display: ViewDisplayType
    sx?: SxType;
}

export interface BottomActionsButtonsProps {
    disabledCancel?: boolean;
    disabledSubmit?: boolean;
    display: ViewDisplayType;
    errors?: { [key: string]: string | string[] | null | undefined };
    hideButtons?: boolean;
    /** Hides button text on mobile */
    hideTextOnMobile?: boolean;
    isCreate: boolean;
    loading?: boolean;
    onCancel: () => unknown;
    onSetSubmitting?: (isSubmitting: boolean) => unknown;
    onSubmit?: () => unknown;
    sideActionButtons?: Omit<SideActionsButtonsProps, "display" | "hasGridActions">;
}

export interface HelpButtonProps extends ButtonProps {
    id?: string;
    /** Markdown displayed in the popup menu */
    markdown: string;
    /** On click event. Not needed to open the menu */
    onClick?: (event: React.MouseEvent) => void;
    /** Style applied to the root element */
    sxRoot?: object;
    /** Style applied to the question mark icon */
    sx?: SvgProps;
}

export interface SideActionsButtonsProps {
    children: OrArray<JSX.Element | null | undefined>;
    display: ViewDisplayType;
    /** If true, displays higher up */
    hasGridActions?: boolean;
    sx?: SxType;
}
