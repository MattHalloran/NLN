import { IconButton, useTheme } from "@mui/material";
import { ChevronLeft } from "@mui/icons-material";
import { useLocation } from "route";

interface BackButtonProps {
    to: string;
    ariaLabel?: string;
}

/**
 * A back navigation button with a left chevron icon.
 * Designed to be used in the TopBar's startComponent prop.
 */
export const BackButton = ({ to, ariaLabel = "Go back" }: BackButtonProps) => {
    const [, setLocation] = useLocation();
    const { palette } = useTheme();

    return (
        <IconButton
            onClick={() => setLocation(to)}
            aria-label={ariaLabel}
            sx={{
                color: palette.primary.contrastText,
                "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
            }}
        >
            <ChevronLeft fontSize="large" />
        </IconButton>
    );
};
