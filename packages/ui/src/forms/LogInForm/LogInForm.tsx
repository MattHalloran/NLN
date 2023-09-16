import { useMutation } from "@apollo/client";
import { APP_LINKS, CODE, logInSchema } from "@local/shared";
import { Box, Button, Grid, Link, Palette, TextField, Typography, useTheme } from "@mui/material";
import { loginVariables, login_login } from "api/generated/login";
import { loginMutation } from "api/mutation";
import { mutationWrapper } from "api/utils";
import { SnackSeverity } from "components";
import { PasswordTextField } from "components/inputs/PasswordTextField/PasswordTextField";
import { useFormik } from "formik";
import { useEffect, useMemo } from "react";
import { parseSearchParams, useLocation } from "route";
import { PubSub } from "utils";

const clickSizeStyle = (palette: Palette) => ({
    color: palette.secondary.light,
    minHeight: "48px", // Lighthouse recommends this for SEO, as it is more clickable
    display: "flex",
    alignItems: "center",
});

export const LogInForm = () => {
    const { palette, spacing } = useTheme();
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
                    PubSub.get().publishSession(data);
                    setLocation(APP_LINKS.Shopping);
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

    return (
        <Box sx={{
            width: "100%",
            marginTop: spacing(3),
        }}>
            <form onSubmit={formik.handleSubmit}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            id="email"
                            name="email"
                            autoComplete="email"
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
                </Grid>
                <Button
                    fullWidth
                    disabled={loading}
                    type="submit"
                    color="secondary"
                    sx={{ margin: spacing(3, 0, 2) }}
                    variant="contained"
                >
                    Log In
                </Button>
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Link onClick={() => setLocation(APP_LINKS.ForgotPassword)}>
                            <Typography sx={clickSizeStyle(palette)}>
                                Forgot Password?
                            </Typography>
                        </Link>
                    </Grid>
                    <Grid item xs={6}>
                        <Link onClick={() => setLocation(APP_LINKS.Register)}>
                            <Typography sx={{ ...clickSizeStyle(palette), flexDirection: "row-reverse" }}>
                                Don't have an account? Sign up
                            </Typography>
                        </Link>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};
