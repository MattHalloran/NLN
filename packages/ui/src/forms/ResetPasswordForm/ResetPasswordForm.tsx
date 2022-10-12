import React from 'react';
import { resetPasswordMutation } from 'graphql/mutation';
import { useMutation } from '@apollo/client';
import { useFormik } from 'formik';
import {
    Box,
    Button,
    Grid,
    TextField,
    useTheme
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { APP_LINKS } from '@shared/consts';
import { resetPasswordSchema } from '@shared/validation';
import { mutationWrapper } from 'graphql/utils';
import { resetPasswordVariables, resetPassword_resetPassword } from 'graphql/generated/resetPassword';

export const ResetPasswordForm = ({
    onSessionUpdate,
    onRedirect
}) => {
    const { spacing } = useTheme();

    const urlParams = useParams();
    const [resetPassword, { loading }] = useMutation(resetPasswordMutation);

    const formik = useFormik({
        initialValues: {
            newPassword: '',
            confirmNewPassword: '',
        },
        validationSchema: resetPasswordSchema,
        onSubmit: (values) => {
            mutationWrapper<resetPassword_resetPassword, resetPasswordVariables>({
                mutation: resetPassword,
                input: { id: urlParams.id, code: urlParams.code, newPassword: values.newPassword },
                onSuccess: (data) => { onSessionUpdate(data); onRedirect(APP_LINKS.Shopping) },
                successMessage: () => 'Password reset.',
            })
        },
    });

    return (
        <Box sx={{
            width: '100%',
            marginTop: spacing(3),
        }}>
            <form onSubmit={formik.handleSubmit}>
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
                    sx={{
                        margin: spacing(3, 0, 2)
                    }}
                >
                    Submit
                </Button>
            </form>
        </Box>
    );
}