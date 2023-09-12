import { FetchResult } from "@apollo/client";
import { Theme } from "@mui/material";
import { SystemStyleObject } from "@mui/system";
import { Path } from "route";

// Top-level props that can be passed into any routed component
export type SessionChecked = boolean;
export type Session = {
    id?: string | null;
    roles?: any
    theme?: string;
    cart?: any;
    firstName?: string | null;
    lastName?: string | null;
    pronouns?: string | null;
}
export interface CommonProps {
    session: Session;
    sessionChecked: SessionChecked;
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
