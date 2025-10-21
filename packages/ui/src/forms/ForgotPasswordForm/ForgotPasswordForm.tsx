import { APP_LINKS, requestPasswordChangeSchema } from "@local/shared";
import { Box, Button, Grid, InputAdornment, TextField, Typography, useTheme } from "@mui/material";
import { useRequestPasswordChange } from "api/rest/hooks";
import { BreadcrumbsBase } from "components/breadcrumbs/BreadcrumbsBase/BreadcrumbsBase";
import { SnackSeverity } from "components";
import { useFormik } from "formik";
import { formSubmit as _formSubmit } from "forms/styles";
import { EmailIcon } from "icons/common";
import { useLocation } from "route";
import { PubSub } from "utils";

const breadcrumbsStyle = {
    margin: "auto",
} as const;

const emailStartAdornment = {
    startAdornment: (
        <InputAdornment position="start">
            <EmailIcon />
        </InputAdornment>
    ),
};


export const ForgotPasswordForm = () => {
    const { spacing: _spacing, palette } = useTheme();
    const [, setLocation] = useLocation();

    const { mutate: requestPasswordChange, loading } = useRequestPasswordChange();

    const formik = useFormik({
        initialValues: {
            email: "",
        },
        validationSchema: requestPasswordChangeSchema,
        onSubmit: async (values) => {
            try {
                await requestPasswordChange({ email: values.email });
                PubSub.get().publishSnack({ message: "Request sent. Please check email.", severity: SnackSeverity.Success });
                setLocation(APP_LINKS.Home);
            } catch (error: any) {
                PubSub.get().publishSnack({
                    message: error?.message || "Failed to send reset link. Please try again.",
                    severity: SnackSeverity.Error,
                });
            }
        },
    });

    const breadcrumbPaths = [
        {
            text: "Log In",
            link: APP_LINKS.LogIn,
        },
        {
            text: "Sign Up",
            link: APP_LINKS.Register,
        },
    ] as const;

    return (
        <Box sx={{ width: "100%" }}>
            <form onSubmit={formik.handleSubmit}>
                <Grid container spacing={3}>
                    {/* Instructions */}
                    <Grid item xs={12}>
                        <Box
                            sx={{
                                p: 3,
                                backgroundColor: palette.mode === "light"
                                    ? "rgba(0, 0, 0, 0.02)"
                                    : "rgba(255, 255, 255, 0.02)",
                                borderRadius: 1,
                                border: `1px solid ${palette.divider}`,
                            }}
                        >
                            <Typography
                                variant="body1"
                                sx={{
                                    color: palette.text.primary,
                                    mb: 2,
                                    fontSize: "1rem",
                                    fontWeight: 500,
                                }}
                            >
                                Password Reset Instructions
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: palette.text.secondary,
                                    fontSize: "0.9rem",
                                    lineHeight: 1.6,
                                }}
                            >
                                Enter your email address below and we'll send you a secure link to reset your password. The link will expire in 24 hours for security purposes.
                            </Typography>
                        </Box>
                    </Grid>

                    {/* Email Input */}
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            autoFocus
                            id="email"
                            name="email"
                            autoComplete="email"
                            InputProps={emailStartAdornment}
                            label="Email Address"
                            value={formik.values.email}
                            onChange={formik.handleChange}
                            error={formik.touched.email && Boolean(formik.errors.email)}
                            helperText={formik.touched.email && formik.errors.email}
                        />
                    </Grid>

                    {/* Submit Button */}
                    <Grid item xs={12} sx={{ mt: 2 }}>
                        <Button
                            fullWidth
                            disabled={loading}
                            type="submit"
                            color="primary"
                            variant="contained"
                            size="large"
                        >
                            {loading ? "Sending Reset Link..." : "Send Reset Link"}
                        </Button>
                    </Grid>
                </Grid>

                {/* Navigation Links */}
                <Box sx={{ textAlign: "center", mt: 4, pt: 3, borderTop: `1px solid ${palette.divider}` }}>
                    <BreadcrumbsBase
                        paths={breadcrumbPaths}
                        separator={"•"}
                        sx={breadcrumbsStyle}
                    />
                </Box>
            </form>
        </Box>
    );
};
