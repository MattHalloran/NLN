import { useMutation, useQuery } from "@apollo/client";
import { DEFAULT_PRONOUNS, profileSchema, uuid } from "@local/shared";
import { Autocomplete } from "@mui/lab";
import { Box, Button, Checkbox, Container, Divider, FormControlLabel, FormHelperText, Grid, TextField, useTheme, Typography, Paper } from "@mui/material";
import FormControl from "@mui/material/FormControl";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import { profile, profile_profile } from "api/generated/profile";
import { updateCustomerVariables, updateCustomer_updateCustomer } from "api/generated/updateCustomer";
import { updateCustomerMutation } from "api/mutation";
import { profileQuery } from "api/query";
import { mutationWrapper } from "api/utils";
import { SnackSeverity } from "components";
import { PasswordTextField } from "components/inputs/PasswordTextField/PasswordTextField";
import { useFormik } from "formik";
import { CancelIcon, SaveIcon } from "icons";
import { useMemo } from "react";
import { PubSub } from "utils";

export const ProfileForm = () => {
    const { spacing, palette } = useTheme();

    const { data } = useQuery<profile>(profileQuery);
    const profile = useMemo<profile_profile | null>(() => data?.profile || null, [data]);
    const [updateCustomer, { loading }] = useMutation(updateCustomerMutation);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            firstName: profile?.firstName ?? "",
            lastName: profile?.lastName ?? "",
            business: profile?.business?.name ?? "",
            pronouns: profile?.pronouns ?? "",
            email: profile !== null && profile.emails.length > 0 ? profile.emails[0].emailAddress : "",
            phone: profile !== null && profile.phones.length > 0 ? profile.phones[0].number : "1",
            theme: profile?.theme ?? "light",
            accountApproved: (profile?.accountApproved || false) + "",
            marketingEmails: profile !== null && profile.emails.length > 0 ? profile.emails[0].receivesDeliveryUpdates : false,
            currentPassword: "",
            newPassword: "",
            newPasswordConfirmation: "",
        },
        validationSchema: profileSchema,
        onSubmit: (values, helpers) => {
            if (!profile) return;
            if (typeof values.newPassword === "string" && values.newPassword.length > 0 && values.newPassword !== (values as any).newPasswordConfirmation) {
                PubSub.get().publishSnack({ message: "Passwords don't match.", severity: SnackSeverity.Error });
                helpers.setSubmitting(false);
                return;
            }
            const input = ({
                id: profile.id,
                firstName: values.firstName,
                lastName: values.lastName,
                business: {
                    id: profile.business?.id ?? uuid(),
                    name: values.business,
                },
                pronouns: values.pronouns,
                emails: [
                    {
                        id: profile.emails.length > 0 ? profile.emails[0].id : uuid(),
                        emailAddress: values.email,
                        receivesDeliveryUpdates: values.marketingEmails,
                    },
                ],
                phones: [
                    {
                        id: profile.phones.length > 0 ? profile.phones[0].id : uuid(),
                        number: values.phone,
                    },
                ],
                theme: values.theme,
                accountApproved: Boolean(values.accountApproved),
            });
            // Only add email and phone ids if they previously existed
            if (profile.emails.length > 0) input.emails[0].id = profile.emails[0].id;
            if (profile.phones.length > 0) input.phones[0].id = profile.phones[0].id;
            mutationWrapper<updateCustomer_updateCustomer, updateCustomerVariables>({
                mutation: updateCustomer,
                input: {
                    input,
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                },
                successMessage: () => "Profile updated.",
            });
        },
    });

    return (
        <Box
            component="form"
            onSubmit={formik.handleSubmit}
            sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 4,
            }}>
            {/* Personal Information Section */}
            <Box>
                <Typography 
                    variant="h6" 
                    component="h3" 
                    sx={{ 
                        fontWeight: 600,
                        color: palette.text.primary,
                        mb: 3,
                        pb: 1,
                        borderBottom: `1px solid ${palette.divider}`,
                    }}
                >
                    Personal Information
                </Typography>
                <Container sx={{ px: 0 }}>
                <Grid container spacing={2}>
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
                                    label="Pronouns"
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
                            label="Business"
                            value={formik.values.business}
                            onChange={formik.handleChange}
                            error={formik.touched.business && Boolean(formik.errors.business)}
                            helperText={formik.touched.business && formik.errors.business}
                        />
                    </Grid>
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
                </Grid>
                </Container>
            </Box>

            {/* Theme & Account Settings Section */}
            <Box>
                <Typography 
                    variant="h6" 
                    component="h3" 
                    sx={{ 
                        fontWeight: 600,
                        color: palette.text.primary,
                        mb: 3,
                        pb: 1,
                        borderBottom: `1px solid ${palette.divider}`,
                    }}
                >
                    Account Settings
                </Typography>
                <Container sx={{ px: 0 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <FormControl component="fieldset">
                                <Typography 
                                    variant="subtitle2" 
                                    sx={{ 
                                        fontWeight: 500,
                                        color: palette.text.primary,
                                        mb: 1,
                                    }}
                                >
                                    Theme Preference
                                </Typography>
                                <RadioGroup
                                    id="theme"
                                    name="theme"
                                    aria-label="theme-selection"
                                    value={formik.values.theme}
                                    onChange={(e) => { formik.handleChange(e); PubSub.get().publishTheme(e.target.value as "light" | "dark"); }}
                                    sx={{ ml: 1 }}
                                >
                                    <FormControlLabel 
                                        value="light" 
                                        control={<Radio />} 
                                        label="Light Theme" 
                                        sx={{ mb: 0.5 }}
                                    />
                                    <FormControlLabel 
                                        value="dark" 
                                        control={<Radio />} 
                                        label="Dark Theme" 
                                        sx={{ mb: 0.5 }}
                                    />
                                </RadioGroup>
                                <FormHelperText>{formik.touched.theme && formik.errors.theme}</FormHelperText>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl component="fieldset">
                                <Typography 
                                    variant="subtitle2" 
                                    sx={{ 
                                        fontWeight: 500,
                                        color: palette.text.primary,
                                        mb: 1,
                                    }}
                                >
                                    Customer Status
                                </Typography>
                                <RadioGroup
                                    id="accountApproved"
                                    name="accountApproved"
                                    aria-label="customer-status"
                                    value={formik.values.accountApproved}
                                    onChange={formik.handleChange}
                                    sx={{ ml: 1 }}
                                >
                                    <FormControlLabel 
                                        value="true" 
                                        control={<Radio />} 
                                        label="Existing Customer - I have ordered from New Life Nursery before" 
                                        sx={{ mb: 0.5 }}
                                    />
                                    <FormControlLabel 
                                        value="false" 
                                        control={<Radio />} 
                                        label="New Customer - I have never ordered from New Life Nursery" 
                                        sx={{ mb: 0.5 }}
                                    />
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
                                        checked={formik.values.marketingEmails}
                                        onChange={formik.handleChange}
                                    />
                                }
                                label="I want to receive marketing promotions and updates via email."
                                sx={{
                                    alignItems: "flex-start",
                                    "& .MuiFormControlLabel-label": {
                                        color: palette.text.secondary,
                                        fontSize: "0.875rem",
                                        lineHeight: 1.5,
                                        mt: 0.25,
                                    },
                                }}
                            />
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Password Change Section */}
            <Box>
                <Typography 
                    variant="h6" 
                    component="h3" 
                    sx={{ 
                        fontWeight: 600,
                        color: palette.text.primary,
                        mb: 3,
                        pb: 1,
                        borderBottom: `1px solid ${palette.divider}`,
                    }}
                >
                    Change Password
                </Typography>
                <Container sx={{ px: 0 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <PasswordTextField
                            fullWidth
                            id="currentPassword"
                            name="currentPassword"
                            autoComplete="current-password"
                            label="Current Password"
                            value={formik.values.currentPassword}
                            onBlur={formik.handleBlur}
                            onChange={formik.handleChange}
                            error={formik.touched.currentPassword && Boolean(formik.errors.currentPassword)}
                            helperText={formik.touched.currentPassword ? formik.errors.currentPassword : null}
                        />
                    </Grid>
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
                            id="newPasswordConfirmation"
                            name="newPasswordConfirmation"
                            autoComplete="new-password"
                            label="Confirm New Password"
                            value={formik.values.newPasswordConfirmation}
                            onBlur={formik.handleBlur}
                            onChange={formik.handleChange}
                            error={formik.touched.newPasswordConfirmation && Boolean(formik.errors.newPasswordConfirmation)}
                            helperText={formik.touched.newPasswordConfirmation ? formik.errors.newPasswordConfirmation : null}
                        />
                    </Grid>
                </Grid>
                </Container>
            </Box>

            {/* Action Buttons */}
            <Box 
                sx={{
                    display: "flex",
                    gap: 2,
                    justifyContent: "flex-end",
                    pt: 2,
                    borderTop: `1px solid ${palette.divider}`,
                    mt: 2,
                }}
            >
                <Button
                    onClick={() => { formik.resetForm(); }}
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    sx={{
                        minWidth: 120,
                        color: palette.text.secondary,
                        borderColor: palette.divider,
                        "&:hover": {
                            borderColor: palette.text.secondary,
                            backgroundColor: palette.action.hover,
                        },
                    }}
                >
                    Cancel
                </Button>
                <Button
                    disabled={loading}
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    sx={{
                        minWidth: 120,
                        backgroundColor: "#546e7a",
                        "&:hover": {
                            backgroundColor: "#455a64",
                        },
                    }}
                >
                    Save Changes
                </Button>
            </Box>
        </Box>

    );
};
