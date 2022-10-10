import React from 'react';
import { resetPasswordMutation } from 'graphql/mutation';
import { useMutation } from '@apollo/client';
import { useFormik } from 'formik';
import {
    Button,
    Grid,
    TextField,
    useTheme
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { APP_LINKS } from '@shared/consts';
import { resetPasswordSchema } from '@shared/validation';

makeStyles((theme) => ({
    form: {
        width: '100%',
        marginTop: spacing(3),
    },
    submit: {
        margin: spacing(3, 0, 2),
    },
}));

export const ResetPasswordForm = ({
    onSessionUpdate,
    onRedirect
}) => {
    const { palette, spacing } = useTheme();

    const urlParams = useParams();
    const [resetPassword, {loading}] = useMutation(resetPasswordMutation);

    const formik = useFormik({
        initialValues: {
            newPassword: '',
            confirmNewPassword: '',
        },
        validationSchema: resetPasswordSchema,
        onSubmit: (values) => {
            mutationWrapper({
                mutation: resetPassword,
                input: { id: urlParams.id, code: urlParams.code, newPassword: values.newPassword },
                onSuccess: (response) => { onSessionUpdate(response.data.resetPassword); onRedirect(APP_LINKS.Shopping) },
                successMessage: () => 'Password reset.',
            })
        },
    });

    return (
        <form className={classes.form} onSubmit={formik.handleSubmit}>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        autoFocus
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        autoComplete="password"
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
                        autoFocus
                        id="confirmNewPassword"
                        name="confirmNewPassword"
                        type="password"
                        autoComplete="new-password"
                        label="Confirm New Password"
                        value={formik.values.confirmNewPassword}
                        onChange={formik.handleChange}
                        error={formik.touched.confirmNewPassword && Boolean(formik.errors.confirmNewPassword)}
                        helperText={formik.touched.confirmNewPassword && formik.errors.confirmNewPassword}
                    />
                </Grid>
            </Grid>
            <Button
                fullWidth
                disabled={loading}
                type="submit"
                color="secondary"
                className={classes.submit}
            >
                Submit
            </Button>
        </form>
    );
}