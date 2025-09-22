import { useMutation } from "@apollo/client";
import { APP_LINKS, CODE, logInSchema } from "@local/shared";
import { Box, Button, Grid, InputAdornment, TextField, useTheme } from "@mui/material";
import { loginVariables, login_login } from "api/generated/login";
import { loginMutation } from "api/mutation";
import { mutationWrapper } from "api/utils";
import { BreadcrumbsBase, SnackSeverity } from "components";
import { PasswordTextField } from "components/inputs/PasswordTextField/PasswordTextField";
import { useFormik } from "formik";
import { formSubmit } from "forms/styles";
import { EmailIcon } from "icons/common";
import { useEffect, useMemo } from "react";
import { parseSearchParams, useLocation } from "route";
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

export const LogInForm = () => {
    const { spacing, palette } = useTheme();
    const [, setLocation] = useLocation();
    const { verificationCode } = useMemo<{ verificationCode: string | undefined }>(() => {
        const searchParams = parseSearchParams();
        return {
            verificationCode: typeof searchParams.code === "string" ? searchParams.code : undefined,
        };
    }, []);
    const [login, { loading }] = useMutation(loginMutation);

    // If there's a verification code, show message to sign in to verify account
    useEffect(() => {
        if (verificationCode) {
            PubSub.get().publishSnack({ message: "Sign in to verify your account.", severity: SnackSeverity.Info });
        }
    }, [verificationCode]);

    const formik = useFormik({
        initialValues: {
            email: "",
            password: "",
        },
        validationSchema: logInSchema,
        onSubmit: (values) => {
            mutationWrapper<login_login, loginVariables>({
                mutation: login,
                input: { ...values, verificationCode },
                successCondition: (data) => data !== null,
                onSuccess: (data) => {
                    // If code provided, notify of account verification
                    if (verificationCode) {
                        PubSub.get().publishSnack({ message: "Account verified.", severity: SnackSeverity.Success });
                    }
                    PubSub.get().publishSession({ ...data, theme: (data.theme as "light" | "dark") || "light" });
                    setLocation(APP_LINKS.Home);
                },
                onError: (response) => {
                    if (Array.isArray(response.graphQLErrors) && response.graphQLErrors.some(e => e.extensions?.code === CODE.MustResetPassword.code)) {
                        PubSub.get().publishAlertDialog({
                            message: "Before signing in, please follow the link sent to your email to change your password.",
                            buttons: [{
                                text: "OK",
                                onClick: () => setLocation(APP_LINKS.Home),
                            }],
                        });
                    }
                },
            });
        },
    });

    const breadcrumbPaths = [
        {
            text: "Forgot Password",
            link: APP_LINKS.ForgotPassword,
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
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
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
                    <Grid item xs={12}>
                        <PasswordTextField
                            fullWidth
                            id="password"
                            name="password"
                            autoComplete="current-password"
                            label="Password"
                            value={formik.values.password}
                            onBlur={formik.handleBlur}
                            onChange={formik.handleChange}
                            error={formik.touched.password && Boolean(formik.errors.password)}
                            helperText={formik.touched.password ? formik.errors.password : null}
                        />
                    </Grid>
                    <Grid item xs={12} sx={{ mt: 2 }}>
                        <Button
                            fullWidth
                            disabled={loading}
                            type="submit"
                            color="primary"
                            variant="contained"
                            size="large"
                        >
                            {loading ? "Signing In..." : "Sign In"}
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
