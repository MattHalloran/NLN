import { SnackSeverity } from './Snack/Snack';

export interface DialogTitleProps {
    ariaLabel: string;
    helpText?: string;
    onClose: () => void;
    title: string;
}

export interface MenuTitleProps {
    ariaLabel?: string;
    helpText?: string;
    onClose: () => void;
    title?: string;
}

export interface SnackProps {
    buttonClicked?: (event?: any) => any;
    buttonText?: string;
    /**
     * Anything you'd like to log in development mode
     */
    data?: any;
    handleClose: () => any;
    id: string;
    message?: string;
    severity?: SnackSeverity;
}