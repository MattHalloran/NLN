import { Box, useTheme } from "@mui/material";
import { PageContainer, PageTitle } from "components";

export const FormPage = ({
    title,
    autocomplete = "on",
    children,
}) => {
    const { palette } = useTheme();

    return (
        <PageContainer>
            <PageTitle title={title} />
            <Box sx={{
                backgroundColor: palette.background.paper,
                display: "grid",
                position: "relative",
                boxShadow: 8,
                minWidth: "300px",
                maxWidth: "min(100%, 700px)",
                borderRadius: "10px",
                overflow: "hidden",
                left: "50%",
                transform: "translateX(-50%)",
                marginTop: 2,
                marginBottom: 2,
                padding: 2,
            }}>
                {children}
            </Box>
        </PageContainer>
    );
};
