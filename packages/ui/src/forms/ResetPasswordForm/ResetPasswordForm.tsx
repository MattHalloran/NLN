import { useMutation } from "@apollo/client";
import { APP_LINKS, resetPasswordSchema } from "@local/shared";
import { Box, Button, Grid, useTheme } from "@mui/material";
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
    const { spacing } = useTheme();

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
                onSuccess: (data) => { PubSub.get().publishSession({ ...data, theme: (data.theme as "light" | "dark") || "light" }); setLocation(APP_LINKS.Shopping); },
                successMessage: () => "Password reset.",
            });
        },
    });

    return (
        <Box sx={{
            width: "100%",
            marginTop: spacing(3),
        }}>
            <form onSubmit={formik.handleSubmit}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <PasswordTextField
                            fullWidth
                            id="newPassword"
                            name="newPassword"
                            autoComplete="password"
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
                </Grid>
                <Button
                    fullWidth
                    disabled={loading}
                    type="submit"
                    color="secondary"
                    sx={{
                        margin: spacing(3, 0, 2),
                    }}
                    variant="contained"
                >
                    Submit
                </Button>
            </form>
        </Box>
    );
};
