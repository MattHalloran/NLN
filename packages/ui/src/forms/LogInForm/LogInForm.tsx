import { loginMutation } from 'graphql/mutation';
import { useMutation } from '@apollo/client';
import { APP_LINKS, CODE } from '@shared/consts';
import { useFormik } from 'formik';
import {
    Box,
    Button,
    Grid,
    Link,
    Palette,
    TextField,
    Typography,
    useTheme
} from '@mui/material';
import { parseSearchParams, PubSub } from 'utils';
import { mutationWrapper } from 'graphql/utils';
import { logInSchema } from '@shared/validation';
import { loginVariables, login_login } from 'graphql/generated/login';
import { useLocation } from '@shared/route';
import { useMemo } from 'react';

const clickSizeStyle = (palette: Palette) => ({
    color: palette.secondary.light,
    minHeight: '48px', // Lighthouse recommends this for SEO, as it is more clickable
    display: 'flex',
    alignItems: 'center',
})

export const LogInForm = ({
    onSessionUpdate,
    onRedirect
}) => {
    const { palette, spacing } = useTheme();
    const [, setLocation] = useLocation();
    const { verificationCode } = useMemo<{ verificationCode: string | undefined }>(() => {
        const searchParams = parseSearchParams();
        return {
            verificationCode: searchParams.code === 'string' ? searchParams.code : undefined
        }
    }, []);
    const [login, { loading }] = useMutation(loginMutation);

    const formik = useFormik({
        initialValues: {
            email: '',
            password: ''
        },
        validationSchema: logInSchema,
        onSubmit: (values) => {
            mutationWrapper<login_login, loginVariables>({
                mutation: login,
                input: { ...values, verificationCode },
                successCondition: (data) => data !== null,
                onSuccess: (data) => { onSessionUpdate(data); onRedirect(APP_LINKS.Shopping) },
                onError: (response) => {
                    if (Array.isArray(response.graphQLErrors) && response.graphQLErrors.some(e => e.extensions?.code === CODE.MustResetPassword.code)) {
                        PubSub.get().publishAlertDialog({
                            message: 'Before signing in, please follow the link sent to your email to change your password.',
                            buttons: [{
                                text: 'OK',
                                onClick: () => setLocation(APP_LINKS.Home),
                            }]
                        });
                    }
                }
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
                    sx={{ margin: spacing(3, 0, 2) }}
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
                            <Typography sx={{ ...clickSizeStyle(palette), flexDirection: 'row-reverse' }}>
                                Don't have an account? Sign up
                            </Typography>
                        </Link>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
}