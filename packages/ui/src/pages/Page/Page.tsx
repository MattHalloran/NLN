import { APP_LINKS } from "@local/shared";
import { PageProps } from "pages/types";
import { useEffect } from "react";
import { Redirect, useLocation } from "route";

export const Page = ({
    title,
    sessionChecked,
    redirect = APP_LINKS.Home,
    userRoles,
    restrictedToRoles = [],
    children,
}: PageProps) => {
    const [location] = useLocation();

    useEffect(() => {
        document.title = title || "";
    }, [title]);

    // If this page has restricted access
    if (restrictedToRoles.length > 0) {
        if (Array.isArray(userRoles) && userRoles.length > 0) {
            const haveArray: any[] = Array.isArray(userRoles) ? userRoles : [userRoles];
            const needArray: any[] = Array.isArray(restrictedToRoles) ? restrictedToRoles : [restrictedToRoles];
            if (haveArray.some((r: any) => needArray.includes(r?.role?.title))) return children;
        }
        if (sessionChecked && location !== redirect) return <Redirect to={redirect} />;
    }

    return children;
};
