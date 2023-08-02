import { useMutation } from "@apollo/client";
import { APP_LINKS, requestPasswordChangeSchema } from "@local/shared";
import {
    Box,
    Button,
    Grid,
    Link,
    Palette,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import { useFormik } from "formik";
import { requestPasswordChangeVariables } from "graphql/generated/requestPasswordChange";
import { requestPasswordChangeMutation } from "graphql/mutation";
import { mutationWrapper } from "graphql/utils";
import { useLocation } from "route";

const clickSizeStyle = (palette: Palette) => ({
    color: palette.secondary.light,
    minHeight: "48px", // Lighthouse recommends this for SEO, as it is more clickable
    display: "flex",
    alignItems: "center",
});

export const ForgotPasswordForm = ({
    onRedirect,
}) => {
    const { palette, spacing } = useTheme();
    const [, setLocation] = useLocation();

    const [requestPasswordChange, { loading }] = useMutation(requestPasswordChangeMutation);

    const formik = useFormik({
        initialValues: {
            email: "",
        },
        validationSchema: requestPasswordChangeSchema,
        onSubmit: (values) => {
            mutationWrapper<any, requestPasswordChangeVariables>({
                mutation: requestPasswordChange,
                input: { ...values },
                successCondition: (success) => success === true,
                onSuccess: () => onRedirect(APP_LINKS.Home),
                successMessage: () => "Request sent. Please check email.",
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
                    sx={{ margin: spacing(3, 0, 2) }}
                >
                    Submit
                </Button>
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Link onClick={() => setLocation(APP_LINKS.LogIn)}>
                            <Typography sx={clickSizeStyle(palette)}>
                                Remember? Back to Log In
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
