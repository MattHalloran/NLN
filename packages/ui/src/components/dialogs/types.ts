import { PopoverProps } from "@mui/material";
import { TitleProps } from "components/text/types";
import { SxType } from "types";
import { SnackSeverity } from "./Snack/Snack";

// Customer type for archived CustomerDialog component (kept for backwards compatibility)
type Customer = {
    id: string;
    firstName: string;
    lastName: string;
    emails?: Array<{ emailAddress: string }>;
    phones?: Array<{ number: string }>;
};

export interface DialogTitleProps extends Omit<TitleProps, "sxs"> {
    below?: JSX.Element | boolean | undefined;
    id: string;
    onClose?: () => unknown;
    startComponent?: JSX.Element;
    sxs?: TitleProps["sxs"] & { root?: SxType; };
}

export interface MenuTitleProps {
    ariaLabel?: string;
    helpText?: string;
    onClose: () => void;
    title?: string;
}

// ARCHIVED: PlantDialog component moved to /archived
// export interface PlantDialogProps {
//     isAdminPage: boolean;
//     plant: plants_plants | undefined;
//     selectedSku: plants_plants_skus | undefined;
//     onAddToCart: (sku: plants_plants_skus, quantity: number) => void;
//     open: boolean;
//     onClose: () => void;
// }

export interface PopoverWithArrowProps extends Omit<PopoverProps, "open" | "sx"> {
    anchorEl: HTMLElement | null;
    children: React.ReactNode;
    handleClose: () => any;
    placement?: "bottom" | "left" | "right" | "top";
    sxs?: {
        root?: Record<string, unknown>;
        content?: SxType;
        paper?: SxType;
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

export interface CustomerDialogProps {
    customer: Customer;
    open?: boolean;
    onClose: () => void;
}

// ARCHIVED: OrderDialog component moved to /archived
// export interface OrderDialogProps {
//     order: orders_orders;
//     open?: boolean;
//     onClose: () => void;
// }

export interface ListDialogProps {
    open?: boolean;
    onClose: (value?: string) => void;
    title?: string;
    data?: Array<[string, string]>;
}

export interface NewCustomerDialogProps {
    open?: boolean;
    onClose: () => void;
}
