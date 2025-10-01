import { Box, Card, CardContent, Typography, useTheme } from "@mui/material";
import { PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { ProfileForm } from "forms/ProfileForm/ProfileForm";

export const ProfilePage = () => {
    const { palette } = useTheme();

    return (
        <PageContainer sx={{ paddingLeft: "0!important", paddingRight: "0!important" }}>
            <TopBar
                display="page"
                title="Account Settings"
            />
            
            <Box px={3} py={4}>
                <Card
                    sx={{
                        maxWidth: "800px",
                        margin: "0 auto",
                        bgcolor: palette.background.paper,
                        border: `1px solid ${palette.divider}`,
                        borderRadius: 1,
                        boxShadow: 1,
                    }}
                >
                    <CardContent sx={{ p: 4 }}>
                        <Box mb={4}>
                            <Typography 
                                variant="h5" 
                                component="h2" 
                                sx={{ 
                                    fontWeight: 600,
                                    color: palette.text.primary,
                                    mb: 1,
                                }}
                            >
                                Profile Information
                            </Typography>
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: palette.text.secondary,
                                    lineHeight: 1.6,
                                }}
                            >
                                Update your personal information, business details, and account preferences.
                            </Typography>
                        </Box>
                        
                        <ProfileForm />
                    </CardContent>
                </Card>
            </Box>
        </PageContainer>
    );
};
