import { Box } from "@mui/material";
import { pagePaddingBottom } from "styles";
import { PageContainerProps } from "../types";

/**
 * Container which can be wrapped around most pages to provide a consistent layout.
 */
export const PageContainer = ({ children, sx, variant = "default" }: PageContainerProps) => {
    const maxWidth = variant === "wide" ? "1400px" : "700px";

    // Wide variant uses minimal padding to maximize usable space for two-column layouts
    // Default variant uses responsive padding for centered single-column content
    const horizontalPadding =
        variant === "wide" ? { xs: 1, sm: 2 } : { xs: 0, sm: "max(1em, calc(15% - 75px))" };

    return (
        <Box
            id="page"
            sx={{
                minWidth: "100%",
                minHeight: "100%",
                width: `min(100%, ${maxWidth})`,
                margin: "auto",
                paddingBottom: pagePaddingBottom,
                paddingLeft: horizontalPadding,
                paddingRight: horizontalPadding,
                ...(sx ?? {}),
            }}
        >
            {children}
        </Box>
    );
};
