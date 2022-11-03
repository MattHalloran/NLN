import { ButtonProps } from '@mui/material';
import { SvgProps } from 'assets/img/types';
import React from 'react';

export interface GridSubmitButtonsProps {
    disabledCancel?: boolean;
    disabledSubmit?: boolean;
    errors?: { [key: string]: string | string[] | null | undefined };
    isCreate: boolean;
    loading?: boolean;
    onCancel: () => void;
    onSetSubmitting?: (isSubmitting: boolean) => void;
    onSubmit?: () => void;
}

export interface HelpButtonProps extends ButtonProps {
    id?: string;
    /**
     * Markdown displayed in the popup menu
     */
    markdown: string;
    /**
     * On click event. Not needed to open the menu
     */
    onClick?: (event: React.MouseEvent) => void;
    /**
     * Style applied to the root element
     */
    sxRoot?: object;
    /**
     * Style applied to the question mark icon
     */
    sx?: SvgProps;
}