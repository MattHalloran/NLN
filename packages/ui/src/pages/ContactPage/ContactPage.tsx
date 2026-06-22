import { PageContainer } from "components";
import { ContactInfo } from "components/ContactInfo/ContactInfo";
import { BusinessContext } from "contexts/BusinessContext";
import { Box, Stack, Typography } from "@mui/material";
import { useContext, useLayoutEffect } from "react";

export const ContactPage = () => {
    const business = useContext(BusinessContext);

    useLayoutEffect(() => {
        document.title = `Contact | ${business?.BUSINESS_NAME?.Short}`;
    });
    return (
        <PageContainer sx={{ paddingTop: { xs: 3, sm: 5 } }}>
            <Stack spacing={3}>
                <Box>
                    <Typography variant="h1" sx={{ fontSize: { xs: "2rem", sm: "2.75rem" } }}>
                        Contact Us
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{ color: "text.secondary", marginTop: 1, maxWidth: 560 }}
                    >
                        Find our current hours, phone, email, and location details.
                    </Typography>
                </Box>
                <ContactInfo />
            </Stack>
        </PageContainer>
    );
};
