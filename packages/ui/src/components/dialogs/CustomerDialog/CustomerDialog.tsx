import { useMutation } from "@apollo/client";
import { uuid } from "@local/shared";
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions,
    Box, 
    Button, 
    Grid, 
    IconButton, 
    TextField, 
    Typography, 
    useTheme,
    Paper,
    Divider,
    Chip,
    Avatar,
    useMediaQuery
} from "@mui/material";
import { 
    Close as CloseIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    CheckCircle as ApprovedIcon,
    Schedule as PendingIcon,
    Block as BlockedIcon,
    Delete as DeletedIcon
} from "@mui/icons-material";
import { customers_customers } from "api/generated/customers";
import { deleteCustomerVariables } from "api/generated/deleteCustomer";
import { AccountStatus } from "api/generated/globalTypes";
import { updateCustomer_updateCustomer, updateCustomerVariables } from "api/generated/updateCustomer";
import { deleteCustomerMutation, updateCustomerMutation } from "api/mutation";
import { documentNodeWrapper, mutationWrapper } from "api/utils";
import { useFormik } from "formik";
import { CancelIcon, CreateIcon, DeleteIcon, ErrorIcon, LockIcon, LockOpenIcon, SaveIcon } from "icons";
import { SvgComponent } from "icons/types";
import { isEqual } from "lodash-es";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PubSub } from "utils";
import { CustomerDialogProps } from "../types";

// Associates account states with a dynamic action button
// curr_account_value: [curr_account_label, toggled_account_label, toggled_account_value, toggle_icon]
const statusToggle: { [key in AccountStatus]?: [string, string, AccountStatus, SvgComponent] } = {
    [AccountStatus.Deleted]: ["Deleted", "Undelete", AccountStatus.Unlocked, CreateIcon],
    [AccountStatus.Unlocked]: ["Unlocked", "Lock", AccountStatus.HardLock, LockIcon],
    [AccountStatus.SoftLock]: ["Soft Locked (password timeout)", "Unlock", AccountStatus.Unlocked, LockOpenIcon],
    [AccountStatus.HardLock]: ["Hard Locked", "Unlock", AccountStatus.Unlocked, LockOpenIcon],
};

export const CustomerDialog = ({
    customer,
    open = true,
    onClose,
}: CustomerDialogProps) => {
    const { palette } = useTheme();
    const isMobile = useMediaQuery('(max-width:600px)');

    // Stores the modified customer data before updating
    const [currCustomer, setCurrCustomer] = useState<customers_customers>(customer);

    useEffect(() => {
        setCurrCustomer(customer);
    }, [customer]);

    const revert = () => setCurrCustomer(customer);

    const [currLabel, toggleLabel, toggleValue, ToggleIcon] = useMemo<[string, string, AccountStatus | null, SvgComponent]>(() => {
        return (currCustomer?.status in statusToggle ? statusToggle[currCustomer.status] : ["", "", null, ErrorIcon]) as [string, string, AccountStatus | null, SvgComponent];
    }, [currCustomer]);

    const [updateCustomer, { loading }] = useMutation(updateCustomerMutation);
    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            firstName: customer?.firstName ?? "",
            lastName: customer?.lastName ?? "",
            business: customer?.business?.name ?? "",
            pronouns: customer?.pronouns ?? "",
            email: customer !== null && customer.emails.length > 0 ? customer.emails[0].emailAddress : "",
            phone: customer !== null && customer.phones.length > 0 ? customer.phones[0].number : "",
            accountApproved: (customer?.accountApproved || false),
            marketingEmails: customer !== null && customer.emails.length > 0 ? customer.emails[0].receivesDeliveryUpdates : false,
        },
        onSubmit: (values) => {
            if (!customer) return;
            const input = {
                id: customer.id,
                firstName: values.firstName,
                lastName: values.lastName,
                business: {
                    id: customer.business?.id ?? uuid(),
                    name: values.business,
                },
                pronouns: values.pronouns,
                emails: [
                    {
                        id: customer.emails.length > 0 ? customer.emails[0].id : uuid(),
                        emailAddress: values.email,
                        receivesDeliveryUpdates: values.marketingEmails,
                    },
                ],
                phones: [
                    {
                        id: customer.phones.length > 0 ? customer.phones[0].id : uuid(),
                        number: values.phone,
                    },
                ],
                accountApproved: values.accountApproved,
            };

            mutationWrapper<updateCustomer_updateCustomer, updateCustomerVariables>({
                mutation: updateCustomer,
                input: { input },
                successMessage: () => "Customer updated.",
                onSuccess: onClose,
            });
        },
    });

    // Locks/unlocks/undeletes a user
    const toggleLock = useCallback(() => {
        documentNodeWrapper<any, updateCustomerVariables>({
            node: updateCustomerMutation,
            input: { input: { id: currCustomer.id, status: toggleValue } },
            successMessage: () => "Customer updated.",
            errorMessage: () => "Failed to update customer.",
            onSuccess: onClose,
        });
    }, [currCustomer, toggleValue, onClose]);

    const deleteCustomer = useCallback(() => {
        documentNodeWrapper<any, deleteCustomerVariables>({
            node: deleteCustomerMutation,
            input: { id: currCustomer?.id },
            successMessage: () => "Customer deleted.",
            onSuccess: onClose,
        });
    }, [currCustomer?.id, onClose]);

    const confirmDelete = useCallback(() => {
        PubSub.get().publishAlertDialog({
            message: `Are you sure you want to delete the account for ${currCustomer.firstName} ${currCustomer.lastName}?`,
            buttons: [{
                text: "Yes",
                onClick: deleteCustomer,
            }, {
                text: "No",
            }],
        });
    }, [currCustomer, deleteCustomer]);

    const changes_made = !isEqual(customer, currCustomer);

    const getStatusChip = () => {
        const currentStatus = currCustomer?.accountApproved === false ? 'WaitingApproval' : currCustomer?.status;
        const statusConfig = {
            'Unlocked': { 
                label: 'Active', 
                color: '#2e7d32', 
                icon: <ApprovedIcon sx={{ fontSize: 14 }} /> 
            },
            'WaitingApproval': { 
                label: 'Pending Approval', 
                color: '#ed6c02', 
                icon: <PendingIcon sx={{ fontSize: 14 }} /> 
            },
            'SoftLock': { 
                label: 'Soft Locked', 
                color: '#d32f2f', 
                icon: <BlockedIcon sx={{ fontSize: 14 }} /> 
            },
            'HardLock': { 
                label: 'Hard Locked', 
                color: '#d32f2f', 
                icon: <BlockedIcon sx={{ fontSize: 14 }} /> 
            },
            'Deleted': { 
                label: 'Deleted', 
                color: '#424242', 
                icon: <DeletedIcon sx={{ fontSize: 14 }} /> 
            }
        };
        
        const config = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig['Unlocked'];
        
        return (
            <Chip
                icon={config.icon}
                label={config.label}
                size="small"
                sx={{
                    bgcolor: config.color,
                    color: 'white',
                    fontSize: '0.75rem',
                    '& .MuiChip-icon': {
                        color: 'white'
                    }
                }}
            />
        );
    };

    if (!customer) return null;

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
                }
            }}
        >
            <DialogTitle sx={{ 
                p: 3, 
                bgcolor: palette.background.paper,
                borderBottom: `1px solid ${palette.divider}`
            }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                            sx={{
                                bgcolor: customer?.business ? '#1976d2' : '#546e7a',
                                width: 48,
                                height: 48,
                            }}
                        >
                            {customer?.business ? <BusinessIcon /> : <PersonIcon />}
                        </Avatar>
                        <Box>
                            <Typography variant="h5" fontWeight="600" color="text.primary">
                                {customer.firstName} {customer.lastName}
                            </Typography>
                            {customer?.business && (
                                <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {customer.business.name}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={2}>
                        {getStatusChip()}
                        <IconButton 
                            onClick={onClose}
                            sx={{ 
                                color: palette.text.secondary,
                                "&:hover": { bgcolor: palette.action.hover }
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
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
                            borderRadius: 2
                        }}
                    >
                        <Typography variant="h6" fontWeight="600" sx={{ mb: 2, color: palette.text.primary }}>
                            Personal Information
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="First Name"
                                    value={currCustomer?.firstName || ""}
                                    onChange={(e) => setCurrCustomer({ ...currCustomer, firstName: e.target.value })}
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Last Name"
                                    value={currCustomer?.lastName || ""}
                                    onChange={(e) => setCurrCustomer({ ...currCustomer, lastName: e.target.value })}
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Pronouns"
                                    value={currCustomer?.pronouns || ""}
                                    onChange={(e) => setCurrCustomer({ ...currCustomer, pronouns: e.target.value })}
                                    variant="outlined"
                                    helperText="Optional - How should we refer to this customer?"
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Business Information Section */}
                    {customer?.business && (
                        <Paper 
                            elevation={0} 
                            sx={{ 
                                m: 3, 
                                p: 3, 
                                border: `1px solid ${palette.divider}`,
                                borderRadius: 2
                            }}
                        >
                            <Typography variant="h6" fontWeight="600" sx={{ mb: 2, color: palette.text.primary }}>
                                Business Information
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Business Name"
                                        value={currCustomer?.business?.name || ""}
                                        onChange={(e) => setCurrCustomer({ ...currCustomer, business: { ...currCustomer.business!, name: e.target.value } })}
                                        variant="outlined"
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    )}

                    {/* Contact Information Section */}
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            m: 3, 
                            p: 3, 
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 2
                        }}
                    >
                        <Typography variant="h6" fontWeight="600" sx={{ mb: 2, color: palette.text.primary }}>
                            Contact Information
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Email Address"
                                    type="email"
                                    value={currCustomer?.emails?.[0]?.emailAddress || ""}
                                    onChange={(e) => setCurrCustomer({ ...currCustomer, emails: [{ ...currCustomer.emails[0], emailAddress: e.target.value }] })}
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    type="tel"
                                    value={currCustomer?.phones?.[0]?.number || ""}
                                    onChange={(e) => setCurrCustomer({ ...currCustomer, phones: [{ ...currCustomer.phones[0], number: e.target.value }] })}
                                    variant="outlined"
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Account Information Section */}
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            m: 3, 
                            p: 3, 
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 2
                        }}
                    >
                        <Typography variant="h6" fontWeight="600" sx={{ mb: 2, color: palette.text.primary }}>
                            Account Information
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        Account Status
                                    </Typography>
                                    {getStatusChip()}
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        Roles
                                    </Typography>
                                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                                        {currCustomer?.roles?.map((role, index) => (
                                            <Chip
                                                key={index}
                                                label={role.role.title}
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    fontSize: '0.75rem',
                                                    borderColor: palette.divider
                                                }}
                                            />
                                        )) || (
                                            <Typography variant="body2" color="text.secondary">
                                                No roles assigned
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            </DialogContent>
            
            <DialogActions sx={{ 
                p: 3, 
                bgcolor: palette.background.paper,
                borderTop: `1px solid ${palette.divider}`,
                gap: 1
            }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    disabled={loading}
                >
                    Cancel
                </Button>
                
                <Box flex={1} />
                
                {toggleValue && (
                    <Button
                        onClick={toggleLock}
                        variant="outlined"
                        startIcon={<ToggleIcon />}
                        disabled={loading || !customer?.id}
                        color="warning"
                    >
                        {toggleLabel}
                    </Button>
                )}
                
                <Button
                    onClick={confirmDelete}
                    variant="outlined"
                    startIcon={<DeleteIcon />}
                    disabled={loading || !customer?.id}
                    color="error"
                >
                    Delete
                </Button>
                
                <Button
                    onClick={() => formik.handleSubmit()}
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={loading || !changes_made}
                >
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
};
