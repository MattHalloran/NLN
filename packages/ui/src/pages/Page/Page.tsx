import { APP_LINKS } from "@local/shared";
import { SessionContext } from "components/contexts/SessionContext";
import { PageProps } from "pages/types";
import { useContext } from "react";
import { Redirect, useLocation } from "route";

export const Page = ({
    redirect = APP_LINKS.Home,
    restrictedToRoles = [],
    children,
}: PageProps) => {
    const [location] = useLocation();
    const session = useContext(SessionContext);

    // If this page has restricted access
    if (restrictedToRoles.length > 0) {
        if (session?.roles && Array.isArray(session.roles) && session.roles.length > 0) {
            const needArray: any[] = Array.isArray(restrictedToRoles) ? restrictedToRoles : [restrictedToRoles];
            if (session.roles.some((r: any) => needArray.includes(r?.role?.title))) return children;
        }
        if (session !== null && session !== undefined && location !== redirect) return <Redirect to={redirect} />;
    }

    return children;
};
