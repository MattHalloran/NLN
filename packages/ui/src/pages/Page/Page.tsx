import { useEffect } from 'react';
import { APP_LINKS } from '@shared/consts';
import { PageProps } from 'pages/types';
import { Redirect, useLocation } from '@shared/route';

export const Page = ({
    title,
    sessionChecked,
    redirect = APP_LINKS.Home,
    userRoles,
    restrictedToRoles = [],
    children
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
        if (sessionChecked && location.pathname !== redirect) return <Redirect to={redirect} />;
    }

    return children;
};