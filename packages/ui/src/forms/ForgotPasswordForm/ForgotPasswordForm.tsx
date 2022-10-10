import React from 'react';
import { requestPasswordChangeMutation } from 'graphql/mutation';
import { useMutation } from '@apollo/client';
import { APP_LINKS } from '@shared/consts';
import { useFormik } from 'formik';
import {
    Button,
    Grid,
    Link,
    TextField,
    Typography,
    useTheme
} from '@mui/material';
import { useHistory } from 'react-router-dom';
import { requestPasswordChangeSchema } from '@shared/validation';

makeStyles((theme) => ({
    form: {
        width: '100%',
        marginTop: spacing(3),
    },
    submit: {
        margin: spacing(3, 0, 2),
    },
    linkRight: {
        flexDirection: 'row-reverse',
    },
    clickSize: {
        color: palette.secondary.light,
        minHeight: '48px', // Lighthouse recommends this for SEO, as it is more clickable
        display: 'flex',
        alignItems: 'center',
    },
}));

export const ForgotPasswordForm = ({
    onRedirect
}) => {
    const { palette, spacing } = useTheme();

    const history = useHistory();
    const [requestPasswordChange, {loading}] = useMutation(requestPasswordChangeMutation);

    const formik = useFormik({
        initialValues: {
            email: ''
        },
        validationSchema: requestPasswordChangeSchema,
        onSubmit: (values) => {
            mutationWrapper({
                mutation: requestPasswordChange,
                inputs: { values },
                successCondition: (response) => response.data.requestPasswordChange,
                onSuccess: () => onRedirect(APP_LINKS.Home),
                successMessage: () => 'Request sent. Please check email.',
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
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <Link onClick={() => history.push(APP_LINKS.LogIn)}>
                        <Typography className={classes.clickSize}>
                            Remember? Back to Log In
                        </Typography>
                    </Link>
                </Grid>
                <Grid item xs={6}>
                    <Link onClick={() => history.push(APP_LINKS.Register)}>
                        <Typography className={`${classes.clickSize} ${classes.linkRight}`}>
                            Don't have an account? Sign up
                        </Typography>
                    </Link>
                </Grid>
            </Grid>
        </form>
    );
}