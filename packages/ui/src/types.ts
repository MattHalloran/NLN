import { FetchResult } from "@apollo/client";
import { Theme } from "@mui/material";
import { SystemStyleObject } from "@mui/system";
import { orders_orders } from "api/generated/orders";
import { SvgProps } from "icons/types";
import { Path } from "route";

export type Cart = Omit<orders_orders, "customer">;

// Top-level props that can be passed into any routed component
export type Session = {
    id?: string | null;
    roles?: any
    theme?: string;
    cart?: Cart | null;
    firstName?: string | null;
    lastName?: string | null;
    pronouns?: string | null;
}

type BusinessLink = {
    Label: string;
    Link: string;
}
export type BusinessData = {
    hours?: any;
    BUSINESS_NAME: {
        Short: string;
        Long: string;
    },
    ADDRESS: BusinessLink;
    PHONE: BusinessLink;
    FAX: BusinessLink;
    EMAIL: BusinessLink;
    SOCIAL: {
        Facebook: string;
        Instagram: string;
    },
    WEBSITE: string;
}

// Apollo GraphQL
export type ApolloResponse = FetchResult<any, Record<string, any>, Record<string, any>>;
export type ApolloError = {
    message?: string;
    graphQLErrors?: {
        message: string;
        extensions?: {
            code: string;
        };
    }[];
}

// Miscellaneous types
export type SetLocation = (to: Path, options?: { replace?: boolean }) => void;

export type SxType = NonNullable<SystemStyleObject<Theme>> & {
    color?: string;
};

/**
 * Views can be displayed as full pages or as dialogs
 */
export type ViewDisplayType = "dialog" | "page";

export type SvgComponent = (props: SvgProps) => JSX.Element;
