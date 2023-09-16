import { APP_LINKS } from "@local/shared";
import { Box, useTheme } from "@mui/material";
import { PageContainer } from "components";
import { SessionContext } from "contexts/SessionContext";
import { PageProps } from "pages/types";
import { useContext } from "react";
import { Redirect, useLocation } from "route";

export const Page = ({
    excludePageContainer = false,
    redirect = APP_LINKS.Home,
    restrictedToRoles = [],
    children,
    sx,
}: PageProps) => {
    const [location] = useLocation();
    const session = useContext(SessionContext);
    const { palette } = useTheme();

    // If this page has restricted access
    if (restrictedToRoles.length > 0) {
        if (session?.roles && Array.isArray(session.roles) && session.roles.length > 0) {
            const needArray: any[] = Array.isArray(restrictedToRoles) ? restrictedToRoles : [restrictedToRoles];
            if (session.roles.some((r: any) => needArray.includes(r?.role?.title))) return children;
        }
        if (session !== null && session !== undefined && location !== redirect) return <Redirect to={redirect} />;
    }

    return (
        <>
            {/* Hidden div under the page for top overscroll color.
            Color should mimic `content-wrap` component, but with sx override */}
            <Box sx={{
                backgroundColor: (sx as any)?.background ?? (sx as any)?.backgroundColor ?? (palette.mode === "light" ? "#c2cadd" : palette.background.default),
                height: "100vh",
                position: "fixed",
                top: "0",
                width: "100%",
                zIndex: -3, // Below the footer's hidden div
            }} />
            {!excludePageContainer && <PageContainer sx={sx}>
                {children}
            </PageContainer>}
            {excludePageContainer && children}
        </>
    );
};
