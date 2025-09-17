import { useTheme } from "@mui/material";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { memo, ReactNode } from "react";

interface TabPanelProps {
    children: ReactNode;
    value: number;
    index: number;
    [key: string]: unknown;
}

const TabPanelComponent = (props: TabPanelProps) => {
    const { palette } = useTheme();

    const { children, value, index, ...other } = props;

    return (
        <Box
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            sx={{ background: palette.background.paper }}
            {...other}
        >
            {value === index && (
                <Box p={3}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </Box>
    );
};

// Memoize TabPanel for better performance when switching tabs
export const TabPanel = memo(TabPanelComponent);
