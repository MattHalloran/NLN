import { useMutation } from "@apollo/client";
import { DEFAULT_PRONOUNS, addCustomerSchema } from "@local/shared";
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions,
    Autocomplete, 
    Box, 
    Button, 
    Checkbox, 
    FormControlLabel, 
    Grid, 
    IconButton, 
    TextField, 
    Typography, 
    useTheme,
    Paper,
    Avatar,
    useMediaQuery,
} from "@mui/material";
import { 
    Close as CloseIcon,
    PersonAdd as PersonAddIcon, 
} from "@mui/icons-material";
import { addCustomerVariables, addCustomer_addCustomer } from "api/generated/addCustomer";
import { addCustomerMutation } from "api/mutation";
import { mutationWrapper } from "api/utils";
import { useFormik } from "formik";
import { CancelIcon, CreateIcon } from "icons";

interface NewCustomerDialogProps {
    open?: boolean;
    onClose: () => void;
}

export const NewCustomerDialog = ({
    open = true,
    onClose,
}: NewCustomerDialogProps) => {
    const { palette } = useTheme();
    const isMobile = useMediaQuery("(max-width:600px)");

    const [addCustomer, { loading }] = useMutation(addCustomerMutation);

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
                    business: values.business ? { name: values.business } : undefined,
                    emails: [{ emailAddress: values.email }],
                    phones: [{ number: values.phone }],
                },
                onSuccess: () => {
                    formik.resetForm();
                    onClose();
                },
                successMessage: () => "Customer created successfully.",
            });
        },
    });

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? 0 : 2,
                    bgcolor: palette.background.paper,
                },
            }}
        >
            <DialogTitle sx={{ 
                p: 3, 
                bgcolor: palette.background.paper,
                borderBottom: `1px solid ${palette.divider}`,
            }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                            sx={{
                                bgcolor: palette.primary.main,
                                width: 48,
                                height: 48,
                            }}
                        >
                            <PersonAddIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h5" fontWeight="600" color="text.primary">
                                Create New Customer
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                                Add a new customer to your nursery system
                            </Typography>
                        </Box>
                    </Box>
                    
                    <IconButton 
                        onClick={onClose}
                        sx={{ 
                            color: palette.text.secondary,
                            "&:hover": { bgcolor: palette.action.hover },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            
            <DialogContent sx={{ p: 0 }}>
                <Box component="form" onSubmit={formik.handleSubmit}>
                    {/* Personal Information Section */}
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            m: 3, 
                            p: 3, 
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 2,
                        }}
                    >
                        <Typography variant="h6" fontWeight="600" sx={{ mb: 2, color: palette.text.primary }}>
                            Personal Information
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    autoFocus
                                    id="firstName"
                                    name="firstName"
                                    label="First Name *"
                                    value={formik.values.firstName}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                                    helperText={formik.touched.firstName && formik.errors.firstName}
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    id="lastName"
                                    name="lastName"
                                    label="Last Name *"
                                    value={formik.values.lastName}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                                    helperText={formik.touched.lastName && formik.errors.lastName}
                                    variant="outlined"
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
                                            name="pronouns"
                                            onBlur={formik.handleBlur}
                                            error={formik.touched.pronouns && Boolean(formik.errors.pronouns)}
                                            helperText={(formik.touched.pronouns && formik.errors.pronouns) || "Optional - How should we refer to this customer?"}
                                            variant="outlined"
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Business Information Section */}
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            m: 3, 
                            p: 3, 
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 2,
                        }}
                    >
                        <Typography variant="h6" fontWeight="600" sx={{ mb: 2, color: palette.text.primary }}>
                            Business Information
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    id="business"
                                    name="business"
                                    label="Business Name"
                                    value={formik.values.business}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.business && Boolean(formik.errors.business)}
                                    helperText={(formik.touched.business && formik.errors.business) || "Optional - Leave blank if this is an individual customer"}
                                    variant="outlined"
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Contact Information Section */}
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            m: 3, 
                            p: 3, 
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 2,
                        }}
                    >
                        <Typography variant="h6" fontWeight="600" sx={{ mb: 2, color: palette.text.primary }}>
                            Contact Information
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    id="email"
                                    name="email"
                                    type="email"
                                    label="Email Address *"
                                    value={formik.values.email}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.email && Boolean(formik.errors.email)}
                                    helperText={formik.touched.email && formik.errors.email}
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    label="Phone Number *"
                                    value={formik.values.phone}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.phone && Boolean(formik.errors.phone)}
                                    helperText={formik.touched.phone && formik.errors.phone}
                                    variant="outlined"
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Account Settings Section */}
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            m: 3, 
                            p: 3, 
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 2,
                        }}
                    >
                        <Typography variant="h6" fontWeight="600" sx={{ mb: 2, color: palette.text.primary }}>
                            Account Settings
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            id="isAdmin"
                                            name="isAdmin"
                                            color="primary"
                                            checked={formik.values.isAdmin}
                                            onChange={formik.handleChange}
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="body1" fontWeight="500">
                                                Administrator Privileges
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Grant access to the admin dashboard and management tools
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            </DialogContent>
            
            <DialogActions sx={{ 
                p: 3, 
                bgcolor: palette.background.paper,
                borderTop: `1px solid ${palette.divider}`,
                gap: 1,
            }}>
                <Button
                    onClick={() => {
                        formik.resetForm();
                        onClose();
                    }}
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    disabled={loading}
                >
                    Cancel
                </Button>
                
                <Box flex={1} />
                
                <Button
                    onClick={() => formik.handleSubmit()}
                    variant="contained"
                    startIcon={<CreateIcon />}
                    disabled={loading || !formik.isValid}
                >
                    {loading ? "Creating..." : "Create Customer"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
