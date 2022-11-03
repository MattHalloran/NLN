import { PopoverProps } from '@mui/material';
import { plants_plants, plants_plants_skus } from 'graphql/generated/plants';
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

export interface PlantDialogProps {
    plant: plants_plants | undefined;
    selectedSku: plants_plants_skus | undefined;
    onAddToCart: (sku: plants_plants_skus, quantity: number) => void;
    open: boolean;
    onClose: () => void;
}

export interface PopoverWithArrowProps extends Omit<PopoverProps, 'open' | 'sx'> {
    anchorEl: HTMLElement | null;
    children: React.ReactNode;
    handleClose: () => any;
    sxs?: {
        root?: { [x: string]: any };
        content?: { [x: string]: any };
    }
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