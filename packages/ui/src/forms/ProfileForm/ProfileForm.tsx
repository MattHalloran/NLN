import { useMemo, useState } from 'react'
import { DEFAULT_PRONOUNS } from '@shared/consts';
import { useMutation, useQuery } from '@apollo/client';
import { updateCustomerMutation } from 'graphql/mutation';
import { profileQuery } from 'graphql/query';
import { useFormik } from 'formik';
import { Autocomplete } from '@mui/lab';
import { PubSub } from 'utils';
import { Button, Container, FormHelperText, Grid, TextField, Checkbox, FormControlLabel, useTheme, Box } from '@mui/material';
import FormControl from '@mui/material/FormControl';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import { profileSchema } from '@shared/validation';
import { profile, profile_profile } from 'graphql/generated/profile';
import { uuid } from '@shared/uuid';
import { mutationWrapper } from 'graphql/utils';
import { updateCustomerVariables, updateCustomer_updateCustomer } from 'graphql/generated/updateCustomer';

export const ProfileForm = () => {
    const { spacing } = useTheme();

    const [editing, setEditing] = useState(false);
    const { data } = useQuery<profile>(profileQuery);
    const profile = useMemo<profile_profile | null>(() => data?.profile || null, [data]);
    const [updateCustomer, { loading }] = useMutation(updateCustomerMutation);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            firstName: profile?.firstName ?? '',
            lastName: profile?.lastName ?? '',
            business: profile?.business?.name ?? '',
            pronouns: profile?.pronouns ?? '',
            email: profile !== null && profile.emails.length > 0 ? profile.emails[0].emailAddress : '',
            phone: profile !== null && profile.phones.length > 0 ? profile.phones[0].number : '1',
            theme: profile?.theme ?? 'light',
            accountApproved: (profile?.accountApproved || false) + '',
            marketingEmails: profile !== null && profile.emails.length > 0 ? profile.emails[0].receivesDeliveryUpdates : false,
            currentPassword: '',
            newPassword: '',
            newPasswordConfirmation: ''
        },
        validationSchema: profileSchema,
        onSubmit: (values) => {
            if (!profile) return;
            let input = ({
                id: profile.id,
                firstName: values.firstName,
                lastName: values.lastName,
                business: {
                    id: profile.business?.id ?? uuid(),
                    name: values.business
                },
                pronouns: values.pronouns,
                emails: [
                    {
                        id: profile.emails.length > 0 ? profile.emails[0].id : uuid(),
                        emailAddress: values.email,
                        receivesDeliveryUpdates: values.marketingEmails
                    }
                ],
                phones: [
                    {
                        id: profile.phones.length > 0 ? profile.phones[0].id : uuid(),
                        number: values.phone
                    }
                ],
                theme: values.theme,
                accountApproved: Boolean(values.accountApproved)
            });
            // Only add email and phone ids if they previously existed
            if (profile.emails.length > 0) input.emails[0].id = profile.emails[0].id;
            if (profile.phones.length > 0) input.phones[0].id = profile.phones[0].id;
            mutationWrapper<updateCustomer_updateCustomer, updateCustomerVariables>({
                mutation: updateCustomer,
                input: {
                    input: input,
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword
                },
                successMessage: () => 'Profile updated.',
            })
        },
    });

    const toggleEdit = (event) => {
        event.preventDefault();
        setEditing(edit => !edit);
    }

    return (
        <Box sx={{
            width: '100%',
            marginTop: spacing(3),
        }}>
            <form onSubmit={formik.handleSubmit}>
                <fieldset disabled={!editing}>
                    <Container>
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
                                    onChange={(_, value) => formik.setFieldValue('pronouns', value)}
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
                            <Grid item xs={12}>
                                <FormControl component="fieldset">
                                    <RadioGroup
                                        id="theme"
                                        name="theme"
                                        aria-label="theme-check"
                                        value={formik.values.theme}
                                        onChange={(e) => { formik.handleChange(e); PubSub.get().publishTheme(e.target.value as 'light' | 'dark') }}
                                    >
                                        <FormControlLabel value="light" control={<Radio />} label="Light ☀️" />
                                        <FormControlLabel value="dark" control={<Radio />} label="Dark 🌙" />
                                    </RadioGroup>
                                    <FormHelperText>{formik.touched.theme && formik.errors.theme}</FormHelperText>
                                </FormControl>
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
                                            color="secondary"
                                            checked={formik.values.marketingEmails}
                                            onChange={formik.handleChange}
                                        />
                                    }
                                    label="I want to receive marketing promotions and updates via email."
                                />
                            </Grid>
                        </Grid>
                    </Container>
                    <Container>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    id="currentPassword"
                                    name="currentPassword"
                                    type="password"
                                    autoComplete="password"
                                    label="Current Password"
                                    value={formik.values.currentPassword}
                                    onChange={formik.handleChange}
                                    error={formik.touched.currentPassword && Boolean(formik.errors.currentPassword)}
                                    helperText={formik.touched.currentPassword && formik.errors.currentPassword}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    id="newPassword"
                                    name="newPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    label="New Password"
                                    value={formik.values.newPassword}
                                    onChange={formik.handleChange}
                                    error={formik.touched.newPassword && Boolean(formik.errors.newPassword)}
                                    helperText={formik.touched.newPassword && formik.errors.newPassword}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    id="newPasswordConfirmation"
                                    name="newPasswordConfirmation"
                                    type="password"
                                    autoComplete="new-password"
                                    label="Confirm New Password"
                                    value={formik.values.newPasswordConfirmation}
                                    onChange={formik.handleChange}
                                    error={formik.touched.newPasswordConfirmation && Boolean(formik.errors.newPasswordConfirmation)}
                                    helperText={formik.touched.newPasswordConfirmation && formik.errors.newPasswordConfirmation}
                                />
                            </Grid>
                        </Grid>
                    </Container>
                    <Grid
                        container
                        spacing={2}
                        sx={{
                            paddingTop: spacing(2),
                            paddingBottom: spacing(2),
                        }}
                    >
                        <Grid item xs={12} sm={6}>
                            <Button fullWidth onClick={toggleEdit}>
                                {editing ? "Cancel" : "Edit"}
                            </Button>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Button
                                fullWidth
                                disabled={loading}
                                type="submit"
                                color="secondary"
                            >
                                Save Changes
                            </Button>
                        </Grid>
                    </Grid>
                </fieldset>
            </form>
        </Box>

    );
}