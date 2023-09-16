import { SxType } from "types";

export interface PageProps {
    excludePageContainer?: boolean;
    title?: string;
    redirect?: string;
    restrictedToRoles?: string[];
    children: JSX.Element;
    sx?: SxType;
}
