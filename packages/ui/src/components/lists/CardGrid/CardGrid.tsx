import { Box, useTheme } from "@mui/material";
import { CardGridProps } from "components/types";

export const CardGrid = ({
    children,
    disableMargin,
    minWidth,
    showMobileView,
    sx,
}: CardGridProps) => {
    const { breakpoints } = useTheme();

    return (
        <Box sx={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
            alignItems: "stretch",
            gap: showMobileView === true ? 0 : 2,
            margin: showMobileView === true || disableMargin === true ? 0 : 2,
            borderRadius: 2,
            [breakpoints.down("sm")]: {
                gap: showMobileView === false ? 2 : 0,
                margin: showMobileView === false || disableMargin === false ? 2 : 0,
            },
            ...(sx ?? {}),
        }}>
            {children}
        </Box>
    );
};
