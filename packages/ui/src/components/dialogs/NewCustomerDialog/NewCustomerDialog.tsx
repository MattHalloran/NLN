import React from 'react';
import {
    AppBar,
    Autocomplete,
    Button,
    Dialog,
    Grid,
    IconButton,
    Slide,
    TextField,
    Toolbar,
    Typography,
    useTheme,
} from '@mui/material';
import _ from 'lodash';
import { DEFAULT_PRONOUNS } from '@shared/consts';
import { addCustomerMutation } from 'graphql/mutation';
import { useFormik } from 'formik';
import { useMutation } from '@apollo/client';
import { addCustomerVariables, addCustomer_addCustomer } from 'graphql/generated/addCustomer';
import { CancelIcon, CloseIcon, CreateIcon } from '@shared/icons';
import { addCustomerSchema } from '@shared/validation';
import { mutationWrapper } from 'graphql/utils';

 makeStyles((theme) => ({
    appBar: {
        position: 'relative',
    },
    title: {
        textAlign: 'center',
    },
    optionsContainer: {
        padding: spacing(2),
        background: palette.primary.main,
    },
    container: {
        background: palette.background.default,
        flex: 'auto',
        padding: spacing(1),
        paddingBottom: '15vh',
    },
    bottom: {
        background: palette.primary.main,
        position: 'fixed',
        bottom: '0',
        width: '-webkit-fill-available',
        zIndex: 1,
    },
    form: {
        width: '100%',
        marginTop: spacing(3),
    },
    phoneInput: {
        width: '100%',
    },
}));

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const NewCustomerDialog = ({
    open = true,
    onClose,
}) => {
    const { palette, spacing } = useTheme();

    // Stores the modified customer data before updating
    const [addCustomer] = useMutation(addCustomerMutation);

    const formik = useFormik({
        initialValues: {
            firstName: '',
            lastName: '',
            pronouns: '',
            business: '',
            email: '',
            phone: '',
        },
        validationSchema: addCustomerSchema,
        onSubmit: (values) => {
            mutationWrapper<addCustomer_addCustomer, addCustomerVariables>({
                mutation: addCustomer,
                input: {
                    firstName: values.firstName,
                    lastName: values.lastName,
                    pronouns: values.pronouns,
                    business: {name: values.business},
                    emails: [{ emailAddress: values.email }],
                    phones: [{ number: values.phone }],
                },
                onSuccess: () => onClose(),
                successMessage: () => 'Customer created.'
            })
        },
    });


    let options = (
        <Grid className={classes.optionsContainer} container spacing={2}>
            <Grid item xs={12} sm={6}>
                <Button
                    fullWidth
                    startIcon={<CreateIcon />}
                    onClick={() => formik.handleSubmit()}
                >Create</Button>
            </Grid>
            <Grid item xs={12} sm={6}>
                <Button
                    fullWidth
                    startIcon={<CancelIcon />}
                    onClick={onClose}
                >Cancel</Button>
            </Grid>
        </Grid>
    );

    return (
        <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
            <AppBar className={classes.appBar}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
                        <CloseIcon />
                    </IconButton>
                    <Grid container spacing={0}>
                        <Grid className={classes.title} item xs={12}>
                            <Typography variant="h5">
                                Create New Customer
                            </Typography>
                        </Grid>
                    </Grid>
                </Toolbar>
            </AppBar>
            <Box className={classes.container}>
                <form className={classes.form}>
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
                                name="pronouns"
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
                    </Grid>
                </form>
                <Box className={classes.bottom}>
                    {options}
                </Box>
            </Box>
        </Dialog>
    );
}