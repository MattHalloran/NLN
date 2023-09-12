import { useMutation } from "@apollo/client";
import { DEFAULT_PRONOUNS, addCustomerSchema } from "@local/shared";
import {
    AppBar,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Dialog,
    FormControlLabel,
    Grid,
    IconButton,
    TextField,
    Toolbar,
    Typography,
    useTheme,
} from "@mui/material";
import { addCustomerVariables, addCustomer_addCustomer } from "api/generated/addCustomer";
import { addCustomerMutation } from "api/mutation";
import { mutationWrapper } from "api/utils";
import { useFormik } from "formik";
import { CancelIcon, CloseIcon, CreateIcon } from "icons";
import { Transition } from "../UpTransition/UpTransition";

export const NewCustomerDialog = ({
    open = true,
    onClose,
}) => {
    const { palette, spacing } = useTheme();

    // Stores the modified customer data before updating
    const [addCustomer] = useMutation(addCustomerMutation);

    const formik = useFormik({
        initialValues: {
            isAdmin: false,
            firstName: "",
            lastName: "",
            pronouns: "",
            business: "",
            email: "",
            phone: "",
        },
        validationSchema: addCustomerSchema,
        onSubmit: (values) => {
            mutationWrapper<addCustomer_addCustomer, addCustomerVariables>({
                mutation: addCustomer,
                input: {
                    isAdmin: values.isAdmin,
                    firstName: values.firstName,
                    lastName: values.lastName,
                    pronouns: values.pronouns,
                    business: { name: values.business },
                    emails: [{ emailAddress: values.email }],
                    phones: [{ number: values.phone }],
                },
                onSuccess: () => onClose(),
                successMessage: () => "Customer created.",
            });
        },
    });


    const options = (
        <Grid container spacing={2} sx={{
            padding: spacing(2),
            background: palette.primary.main,
        }}>
            <Grid item xs={12} sm={6}>
                <Button
                    fullWidth
                    startIcon={<CreateIcon />}
                    onClick={() => formik.handleSubmit()}
                    variant="contained"
                >Create</Button>
            </Grid>
            <Grid item xs={12} sm={6}>
                <Button
                    fullWidth
                    startIcon={<CancelIcon />}
                    onClick={onClose}
                    variant="contained"
                >Cancel</Button>
            </Grid>
        </Grid>
    );

    return (
        <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
            <AppBar sx={{ position: "relative" }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
                        <CloseIcon />
                    </IconButton>
                    <Grid container spacing={0}>
                        <Grid item xs={12} sx={{ textAlign: "center" }}>
                            <Typography variant="h5">
                                Create New Customer
                            </Typography>
                        </Grid>
                    </Grid>
                </Toolbar>
            </AppBar>
            <Box sx={{
                background: palette.background.default,
                flex: "auto",
                padding: spacing(1),
                paddingBottom: "15vh",
                width: "100%",
                paddingTop: spacing(3),
            }}>
                <form>
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
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        id="isAdmin"
                                        name="isAdmin"
                                        value="isAdmin"
                                        color="secondary"
                                        checked={formik.values.isAdmin}
                                        onChange={formik.handleChange}
                                    />
                                }
                                label="Should this person have administrator privileges? (Can access the admin dashboard)"
                            />
                        </Grid>
                    </Grid>
                </form>
                <Box sx={{
                    background: palette.primary.main,
                    position: "fixed",
                    bottom: "0",
                    width: "-webkit-fill-available",
                    zIndex: 1,
                }}>
                    {options}
                </Box>
            </Box>
        </Dialog>
    );
};
