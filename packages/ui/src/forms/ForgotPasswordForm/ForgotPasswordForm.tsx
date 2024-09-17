import { useMutation } from "@apollo/client";
import { APP_LINKS, requestPasswordChangeSchema } from "@local/shared";
import { Box, Button, Grid, InputAdornment, TextField, useTheme } from "@mui/material";
import { requestPasswordChangeVariables } from "api/generated/requestPasswordChange";
import { requestPasswordChangeMutation } from "api/mutation";
import { mutationWrapper } from "api/utils";
import { BreadcrumbsBase } from "components/breadcrumbs/BreadcrumbsBase/BreadcrumbsBase";
import { useFormik } from "formik";
import { formSubmit } from "forms/styles";
import { EmailIcon } from "icons/common";
import { useLocation } from "route";

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


export const ForgotPasswordForm = () => {
    const { spacing } = useTheme();
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
                onSuccess: () => setLocation(APP_LINKS.Home),
                successMessage: () => "Request sent. Please check email.",
            });
        },
    });

    const breadcrumbPaths = [
        {
            text: "Log In",
            link: APP_LINKS.LogIn,
        },
        {
            text: "Sign Up",
            link: APP_LINKS.Register,
        },
    ] as const;

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
                            InputProps={emailStartAdornment}
                            label="Email Address"
                            value={formik.values.email}
                            onChange={formik.handleChange}
                            error={formik.touched.email && Boolean(formik.errors.email)}
                            helperText={formik.touched.email && formik.errors.email}
                        />
                    </Grid>
                </Grid>
                <Box width="100%" display="flex" flexDirection="column" p={2}>
                    <Button
                        fullWidth
                        disabled={loading}
                        type="submit"
                        color="secondary"
                        variant='contained'
                        sx={formSubmit}
                    >
                        Submit
                    </Button>
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
