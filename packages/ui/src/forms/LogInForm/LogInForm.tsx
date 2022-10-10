import React from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { loginMutation } from 'graphql/mutation';
import { useMutation } from '@apollo/client';
import { APP_LINKS, CODE } from '@shared/consts';
import { useFormik } from 'formik';
import {
    Button,
    Grid,
    Link,
    TextField,
    Typography,
    useTheme
} from '@mui/material';
import { PubSub } from 'utils';

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

export const LogInForm = ({
    onSessionUpdate,
    onRedirect
}) => {
    const { palette, spacing } = useTheme();
    const history = useHistory();
    const urlParams = useParams();
    const [login, { loading }] = useMutation(loginMutation);

    const formik = useFormik({
        initialValues: {
            email: '',
            password: ''
        },
        validationSchema: logInSchema,
        onSubmit: (values) => {
            mutationWrapper({
                mutation: login,
                input: { ...values, verificationCode: urlParams.code },
                successCondition: (response) => response.data.login !== null,
                onSuccess: (response) => { onSessionUpdate(response.data.login); onRedirect(APP_LINKS.Shopping) },
                onError: (response) => {
                    if (Array.isArray(response.graphQLErrors) && response.graphQLErrors.some(e => e.extensions.code === CODE.MustResetPassword.code)) {
                        PubSub.get().publishAlertDialog({
                            message: 'Before signing in, please follow the link sent to your email to change your password.',
                            buttons: [{
                                text: 'OK',
                                onClock: () => history.push(APP_LINKS.Home),
                            }]
                        });
                    }
                }
            })
        },
    });

    return (
        <form className={classes.form} onSubmit={formik.handleSubmit}>
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
                    <TextField
                        fullWidth
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        label="Password"
                        value={formik.values.password}
                        onChange={formik.handleChange}
                        error={formik.touched.password && Boolean(formik.errors.password)}
                        helperText={formik.touched.password && formik.errors.password}
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
                Log In
            </Button>
            <Grid container spacing={2}>
                <Grid item xs={6}>
                    <Link onClick={() => history.push(APP_LINKS.ForgotPassword)}>
                        <Typography className={classes.clickSize}>
                            Forgot Password?
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