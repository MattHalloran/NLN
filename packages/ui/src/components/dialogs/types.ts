import { PopoverProps } from "@mui/material";
import { customers_customers } from "api/generated/customers";
// ARCHIVED: import { orders_orders } from "api/generated/orders";
// ARCHIVED: import { plants_plants, plants_plants_skus } from "api/generated/plants";
import { TitleProps } from "components/text/types";
import { SxType } from "types";
import { SnackSeverity } from "./Snack/Snack";

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
    customer: customers_customers;
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
