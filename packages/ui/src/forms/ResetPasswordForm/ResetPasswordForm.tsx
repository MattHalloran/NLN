import { useMutation } from "@apollo/client";
import { APP_LINKS, resetPasswordSchema } from "@local/shared";
import {
    Box,
    Button,
    Grid,
    useTheme,
} from "@mui/material";
import { SnackSeverity } from "components";
import { PasswordTextField } from "components/inputs/PasswordTextField/PasswordTextField";
import { useFormik } from "formik";
import { resetPasswordVariables, resetPassword_resetPassword } from "graphql/generated/resetPassword";
import { resetPasswordMutation } from "graphql/mutation";
import { mutationWrapper } from "graphql/utils";
import { useMemo } from "react";
import { PubSub, parseSearchParams } from "utils";

export const ResetPasswordForm = ({
    onSessionUpdate,
    onRedirect,
}) => {
    const { spacing } = useTheme();

    const { id, code } = useMemo<{ id: string | undefined, code: string | undefined }>(() => {
        const searchParams = parseSearchParams();
        return {
            id: searchParams.id === "string" ? searchParams.id : undefined,
            code: searchParams.code === "string" ? searchParams.code : undefined,
        };
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
                onSuccess: (data) => { onSessionUpdate(data); onRedirect(APP_LINKS.Shopping); },
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
                >
                    Submit
                </Button>
            </form>
        </Box>
    );
};
