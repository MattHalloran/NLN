import { Box, Container, Paper, Typography, useTheme, Divider } from "@mui/material";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { PageContainer } from "components";

interface FormPageProps {
    title: string;
    autocomplete?: string;
    children: React.ReactNode;
}

export const FormPage = ({
    title,
    autocomplete: _autocomplete = "on",
    children,
}: FormPageProps) => {
    const { palette } = useTheme();

    return (
        <PageContainer>
            <TopBar
                display="page"
                title={title}
            />
            <Container
                maxWidth="sm"
                sx={{
                    minHeight: "calc(100vh - 200px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 4,
                }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        width: "100%",
                        maxWidth: 520,
                        backgroundColor: palette.background.paper,
                        borderRadius: 2,
                        overflow: "hidden",
                        boxShadow: palette.mode === "light"
                            ? "0 8px 32px rgba(0, 0, 0, 0.08)"
                            : "0 8px 32px rgba(0, 0, 0, 0.24)",
                    }}
                >
                    {/* Header Section */}
                    <Box
                        sx={{
                            textAlign: "center",
                            pt: 5,
                            pb: 4,
                            px: 4,
                            backgroundColor: palette.mode === "light"
                                ? "rgba(0, 0, 0, 0.02)"
                                : "rgba(255, 255, 255, 0.02)",
                        }}
                    >
                        {/* Title */}
                        <Typography
                            variant="h4"
                            component="h1"
                            sx={{
                                color: palette.text.primary,
                                fontWeight: 700,
                                mb: 2,
                                fontSize: { xs: "1.75rem", sm: "2rem" },
                                letterSpacing: "-0.025em",
                            }}
                        >
                            {title}
                        </Typography>

                        {/* Subtitle */}
                        <Typography
                            variant="body1"
                            sx={{
                                color: palette.text.secondary,
                                fontSize: "1rem",
                                maxWidth: "340px",
                                mx: "auto",
                                lineHeight: 1.6,
                                fontWeight: 400,
                            }}
                        >
                            {title === "Sign Up" && "Create your account to access our plant ordering system"}
                            {title === "Log In" && "Access your account to manage orders and preferences"}
                            {title === "Forgot Password" && "Enter your email to receive password reset instructions"}
                            {title === "Reset Password" && "Enter your new password to secure your account"}
                        </Typography>
                    </Box>

                    <Divider />

                    {/* Form Content */}
                    <Box
                        sx={{
                            px: 4,
                            py: 4,
                            "& .MuiTextField-root": {
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 1,
                                    backgroundColor: palette.mode === "light"
                                        ? "rgba(0, 0, 0, 0.01)"
                                        : "rgba(255, 255, 255, 0.02)",
                                    transition: "all 0.2s ease",
                                    "&:hover": {
                                        backgroundColor: palette.mode === "light"
                                            ? "rgba(0, 0, 0, 0.02)"
                                            : "rgba(255, 255, 255, 0.03)",
                                        "& .MuiOutlinedInput-notchedOutline": {
                                            borderColor: palette.primary.main,
                                        },
                                    },
                                    "&.Mui-focused": {
                                        backgroundColor: palette.mode === "light"
                                            ? "rgba(0, 0, 0, 0.02)"
                                            : "rgba(255, 255, 255, 0.03)",
                                        "& .MuiOutlinedInput-notchedOutline": {
                                            borderWidth: 2,
                                            borderColor: palette.primary.main,
                                        },
                                    },
                                },
                                "& .MuiInputLabel-root": {
                                    fontWeight: 500,
                                    "&.Mui-focused": {
                                        color: palette.primary.main,
                                        fontWeight: 600,
                                    },
                                },
                            },
                            "& .MuiButton-root": {
                                borderRadius: 1,
                                textTransform: "none",
                                fontWeight: 600,
                                py: 1.75,
                                fontSize: "1rem",
                                letterSpacing: "0.025em",
                                transition: "all 0.2s ease",
                                "&.MuiButton-contained": {
                                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                                    "&:hover": {
                                        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
                                        transform: "translateY(-1px)",
                                    },
                                },
                            },
                            "& .MuiFormControlLabel-root": {
                                "& .MuiCheckbox-root, & .MuiRadio-root": {
                                    color: palette.text.secondary,
                                    "&.Mui-checked": {
                                        color: palette.primary.main,
                                    },
                                },
                                "& .MuiFormControlLabel-label": {
                                    fontSize: "0.95rem",
                                    lineHeight: 1.5,
                                },
                            },
                            "& .MuiFormHelperText-root": {
                                fontSize: "0.8rem",
                                marginTop: "6px",
                            },
                        }}
                    >
                        {children}
                    </Box>
                </Paper>
            </Container>
        </PageContainer>
    );
};
