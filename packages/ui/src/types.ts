import { FetchResult } from "@apollo/client";
import { Theme } from "@mui/material";
import { SystemStyleObject } from "@mui/system";
import { SvgProps } from "icons/types";
import { Path } from "route";

// ARCHIVED: Cart functionality moved to external system - keeping minimal type for backwards compatibility
export type Cart = { items?: Array<any> };

// Image types for image management
export type ImageFile = {
    __typename: "ImageFile",
    src: string,
    width: number,
    height: number,
    hash: string
};

export type Image = {
    __typename?: "Image";
    hash: string;
    alt?: string | null;
    description?: string | null;
    files?: ImageFile[] | null;
};

export type ImageInfo = {
    index: number,
    image: Image
};

// Top-level props that can be passed into any routed component
export type Session = {
    id?: string | null;
    roles?: Array<{ role: { title: string } }>;
    theme?: "light" | "dark";
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
    hours?: string;
    BUSINESS_NAME: {
        Short: string;
        Long: string;
    },
    ADDRESS: BusinessLink;
    PHONE: BusinessLink;
    FAX?: BusinessLink;
    EMAIL: BusinessLink;
    SOCIAL?: {
        Facebook?: string;
        Instagram?: string;
    },
    WEBSITE?: string;
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
