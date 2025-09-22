import { useMutation } from "@apollo/client";
import { APP_LINKS, CODE, DEFAULT_PRONOUNS, signUpSchema } from "@local/shared";
import { Autocomplete } from "@mui/lab";
import { Box, Button, Checkbox, FormControl, FormControlLabel, FormHelperText, Grid, InputAdornment, Radio, RadioGroup, TextField, Typography, useTheme } from "@mui/material";
import { signUpVariables, signUp_signUp } from "api/generated/signUp";
import { signUpMutation } from "api/mutation";
import { mutationWrapper } from "api/utils";
import { BreadcrumbsBase, SnackSeverity } from "components";
import { PasswordTextField } from "components/inputs/PasswordTextField/PasswordTextField";
import { BusinessContext } from "contexts/BusinessContext";
import { useFormik } from "formik";
import { formSubmit } from "forms/styles";
import { EmailIcon } from "icons/common";
import { useContext } from "react";
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

export const SignUpForm = () => {
    const { palette, spacing } = useTheme();
    const [, setLocation] = useLocation();
    const business = useContext(BusinessContext);

    const [signUp, { loading }] = useMutation(signUpMutation);

    const formik = useFormik({
        initialValues: {
            accountApproved: true,
            marketingEmails: true,
            firstName: "",
            lastName: "",
            pronouns: "",
            business: "",
            email: "",
            phone: "",
            password: "",
            confirmPassword: "",
        },
        validationSchema: signUpSchema,
        onSubmit: (values, helpers) => {
            const { confirmPassword, ...input } = values;
            if (values.password !== confirmPassword) {
                PubSub.get().publishSnack({ message: "Passwords don't match.", severity: SnackSeverity.Error });
                helpers.setSubmitting(false);
                return;
            }
            mutationWrapper<signUp_signUp, signUpVariables>({
                mutation: signUp,
                input: {
                    ...input,
                    accountApproved: values.accountApproved,
                    marketingEmails: values.marketingEmails,
                    theme: palette.mode ?? "light",
                },
                onSuccess: (data) => {
                    PubSub.get().publishSession({ ...data, theme: (data.theme as "light" | "dark") || "light" });
                    if (data.accountApproved) {
                        PubSub.get().publishAlertDialog({
                            message: `Welcome to ${business?.BUSINESS_NAME?.Short}. You may now begin shopping. Please verify your email within 48 hours.`,
                            buttons: [{
                                text: "OK",
                                onClick: () => setLocation(APP_LINKS.Home),
                            }],
                        });
                    } else {
                        PubSub.get().publishAlertDialog({
                            message: `Welcome to ${business?.BUSINESS_NAME?.Short}. Please verify your email within 48 hours. Since you have never ordered from us before, we must approve your account before you can order. If this was a mistake, you can edit this in the /profile page.`,
                            buttons: [{
                                text: "OK",
                                onClick: () => setLocation(APP_LINKS.Profile),
                            }],
                        });
                    }
                },
                onError: (response) => {
                    if (Array.isArray(response.graphQLErrors) && response.graphQLErrors.some(e => e.extensions?.code === CODE.EmailInUse.code)) {
                        PubSub.get().publishAlertDialog({
                            message: `${response.message}. Press OK if you would like to be redirected to the forgot password form.`,
                            buttons: [{
                                text: "OK",
                                onClick: () => setLocation(APP_LINKS.ForgotPassword),
                            }],
                        });
                    }
                },
            });
        },
    });

    const breadcrumbPaths = [
        {
            text: "Log In",
            link: APP_LINKS.LogIn,
        },
        {
            text: "Forgot Password",
            link: APP_LINKS.ForgotPassword,
        },
    ] as const;

    return (
        <Box sx={{ width: "100%" }}>
            <form onSubmit={formik.handleSubmit}>
                <Grid container spacing={3}>
                    {/* Personal Information Section */}
                    <Grid item xs={12}>
                        <Typography
                            variant="h6"
                            sx={{
                                color: palette.text.primary,
                                fontWeight: 600,
                                fontSize: "1.1rem",
                                mb: 2,
                                borderBottom: `2px solid ${palette.primary.main}`,
                                pb: 1,
                            }}
                        >
                            Personal Information
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            autoFocus
                            id="firstName"
                            name="firstName"
                            autoComplete="fname"
                            label="First Name"
                            value={formik.values.firstName}
                            onChange={formik.handleChange}
                            error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                            helperText={formik.touched.firstName && formik.errors.firstName}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            id="lastName"
                            name="lastName"
                            autoComplete="lname"
                            label="Last Name"
                            value={formik.values.lastName}
                            onChange={formik.handleChange}
                            error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                            helperText={formik.touched.lastName && formik.errors.lastName}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Autocomplete
                            fullWidth
                            freeSolo
                            id="pronouns"
                            options={DEFAULT_PRONOUNS}
                            value={formik.values.pronouns}
                            onChange={(_, value) => formik.setFieldValue("pronouns", value)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Pronouns (Optional)"
                                    value={formik.values.pronouns}
                                    onChange={formik.handleChange}
                                    error={formik.touched.pronouns && Boolean(formik.errors.pronouns)}
                                    helperText={formik.touched.pronouns && formik.errors.pronouns}
                                />
                            )}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            id="business"
                            name="business"
                            autoComplete="business"
                            label="Business/Organization (Optional)"
                            value={formik.values.business}
                            onChange={formik.handleChange}
                            error={formik.touched.business && Boolean(formik.errors.business)}
                            helperText={formik.touched.business && formik.errors.business}
                        />
                    </Grid>

                    {/* Contact Information Section */}
                    <Grid item xs={12} sx={{ mt: 3 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                color: palette.text.primary,
                                fontWeight: 600,
                                fontSize: "1.1rem",
                                mb: 2,
                                borderBottom: `2px solid ${palette.primary.main}`,
                                pb: 1,
                            }}
                        >
                            Contact Information
                        </Typography>
                    </Grid>
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
                        <TextField
                            fullWidth
                            id="phone"
                            name="phone"
                            autoComplete="tel"
                            label="Phone Number"
                            value={formik.values.phone}
                            onChange={formik.handleChange}
                            error={formik.touched.phone && Boolean(formik.errors.phone)}
                            helperText={formik.touched.phone && formik.errors.phone}
                        />
                    </Grid>

                    {/* Security Section */}
                    <Grid item xs={12} sx={{ mt: 3 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                color: palette.text.primary,
                                fontWeight: 600,
                                fontSize: "1.1rem",
                                mb: 2,
                                borderBottom: `2px solid ${palette.primary.main}`,
                                pb: 1,
                            }}
                        >
                            Account Security
                        </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <PasswordTextField
                            fullWidth
                            id="password"
                            name="password"
                            autoComplete="new-password"
                            label="Password"
                            value={formik.values.password}
                            onBlur={formik.handleBlur}
                            onChange={formik.handleChange}
                            error={formik.touched.password && Boolean(formik.errors.password)}
                            helperText={formik.touched.password ? formik.errors.password : null}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <PasswordTextField
                            fullWidth
                            id="confirmPassword"
                            name="confirmPassword"
                            autoComplete="new-password"
                            label="Confirm Password"
                            value={formik.values.confirmPassword}
                            onBlur={formik.handleBlur}
                            onChange={formik.handleChange}
                            error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                            helperText={formik.touched.confirmPassword ? formik.errors.confirmPassword : null}
                        />
                    </Grid>

                    {/* Account Preferences */}
                    <Grid item xs={12} sx={{ mt: 3 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                color: palette.text.primary,
                                fontWeight: 600,
                                fontSize: "1.1rem",
                                mb: 2,
                                borderBottom: `2px solid ${palette.primary.main}`,
                                pb: 1,
                            }}
                        >
                            Account Preferences
                        </Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl component="fieldset">
                            <RadioGroup
                                id="accountApproved"
                                name="accountApproved"
                                aria-label="existing-customer-check"
                                value={formik.values.accountApproved}
                                onChange={formik.handleChange}
                            >
                                <FormControlLabel value="true" control={<Radio />} label="I have ordered from New Life Nursery before" />
                                <FormControlLabel value="false" control={<Radio />} label="I have never ordered from New Life Nursery" />
                            </RadioGroup>
                            <FormHelperText>{formik.touched.accountApproved && formik.errors.accountApproved}</FormHelperText>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    id="marketingEmails"
                                    name="marketingEmails"
                                    value="marketingEmails"
                                    color="primary"
                                    checked={formik.values.marketingEmails ?? false}
                                    onChange={formik.handleChange}
                                />
                            }
                            label="I want to receive marketing promotions and updates via email."
                        />
                    </Grid>

                    {/* Submit Button */}
                    <Grid item xs={12} sx={{ mt: 3 }}>
                        <Button
                            fullWidth
                            disabled={loading}
                            type="submit"
                            color="primary"
                            variant="contained"
                            size="large"
                        >
                            {loading ? "Creating Account..." : "Create Account"}
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
