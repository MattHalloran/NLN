import { useMutation } from "@apollo/client";
import { APP_LINKS, resetPasswordSchema } from "@local/shared";
import { Box, Button, Grid, Typography, useTheme } from "@mui/material";
import { resetPasswordVariables, resetPassword_resetPassword } from "api/generated/resetPassword";
import { resetPasswordMutation } from "api/mutation";
import { mutationWrapper } from "api/utils";
import { SnackSeverity } from "components";
import { PasswordTextField } from "components/inputs/PasswordTextField/PasswordTextField";
import { useFormik } from "formik";
import { useMemo } from "react";
import { useLocation } from "route";
import { PubSub } from "utils";

export const ResetPasswordForm = () => {
    const [, setLocation] = useLocation();
    const { spacing, palette } = useTheme();

    const { id, code } = useMemo(() => {
        const url = new URL(window.location.href);
        const pathnameParts = url.pathname.split("/");
        const id = pathnameParts[2];
        const code = pathnameParts[3];
        console.log("id", id, "code", code);
        return { id, code };
    }, []);
    const [resetPassword, { loading }] = useMutation(resetPasswordMutation);

    const formik = useFormik({
        initialValues: {
            newPassword: "",
            confirmNewPassword: "",
        },
        validationSchema: resetPasswordSchema,
        onSubmit: (values) => {
            if (!id || !code) {
                PubSub.get().publishSnack({ message: "Could not parse URL", severity: SnackSeverity.Error });
                return;
            }
            mutationWrapper<resetPassword_resetPassword, resetPasswordVariables>({
                mutation: resetPassword,
                input: { id, code, newPassword: values.newPassword },
                onSuccess: (data) => { PubSub.get().publishSession({ ...data, theme: (data.theme as "light" | "dark") || "light" }); setLocation(APP_LINKS.Home); },
                successMessage: () => "Password reset.",
            });
        },
    });

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
                                Create New Password
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: palette.text.secondary,
                                    fontSize: "0.9rem",
                                    lineHeight: 1.6,
                                }}
                            >
                                Choose a strong password that is at least 8 characters long and includes a combination of letters, numbers, and special characters.
                            </Typography>
                        </Box>
                    </Grid>

                    {/* Password Fields */}
                    <Grid item xs={12}>
                        <PasswordTextField
                            fullWidth
                            id="newPassword"
                            name="newPassword"
                            autoComplete="new-password"
                            label="New Password"
                            value={formik.values.newPassword}
                            onBlur={formik.handleBlur}
                            onChange={formik.handleChange}
                            error={formik.touched.newPassword && Boolean(formik.errors.newPassword)}
                            helperText={formik.touched.newPassword ? formik.errors.newPassword : null}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <PasswordTextField
                            fullWidth
                            id="confirmNewPassword"
                            name="confirmNewPassword"
                            autoComplete="new-password"
                            label="Confirm New Password"
                            value={formik.values.confirmNewPassword}
                            onBlur={formik.handleBlur}
                            onChange={formik.handleChange}
                            error={formik.touched.confirmNewPassword && Boolean(formik.errors.confirmNewPassword)}
                            helperText={formik.touched.confirmNewPassword ? formik.errors.confirmNewPassword : null}
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
                            {loading ? "Updating Password..." : "Update Password"}
                        </Button>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};
