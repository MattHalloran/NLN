import { useMutation } from "@apollo/client";
import { uuid } from "@local/shared";
import { AppBar, Box, Button, Dialog, Grid, IconButton, TextField, Toolbar, Typography, useTheme } from "@mui/material";
import { customers_customers } from "api/generated/customers";
import { deleteCustomerVariables } from "api/generated/deleteCustomer";
import { AccountStatus } from "api/generated/globalTypes";
import { updateCustomer_updateCustomer, updateCustomerVariables } from "api/generated/updateCustomer";
import { deleteCustomerMutation, updateCustomerMutation } from "api/mutation";
import { documentNodeWrapper, mutationWrapper } from "api/utils";
import { useFormik } from "formik";
import { CancelIcon, CloseIcon, CreateIcon, DeleteIcon, ErrorIcon, LockIcon, LockOpenIcon, SaveIcon } from "icons";
import { SvgComponent } from "icons/types";
import _ from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PubSub } from "utils";
import { Transition } from "../UpTransition/UpTransition";

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
}) => {
    const { palette, spacing } = useTheme();

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
        });
    }, [currCustomer, toggleValue]);

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

    const changes_made = !_.isEqual(customer, currCustomer);
    const options = (
        <Grid container spacing={2} sx={{
            padding: spacing(2),
            background: palette.primary.main,
        }}>
            <Grid item xs={12} sm={6} md={3}>
                <Button
                    fullWidth
                    disabled={loading || !changes_made}
                    startIcon={<CancelIcon />}
                    onClick={revert}
                    variant="contained"
                >Revert</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Button
                    fullWidth
                    disabled={loading || !customer?.id}
                    startIcon={<ToggleIcon />}
                    onClick={toggleLock}
                    variant="contained"
                >{toggleLabel}</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Button
                    fullWidth
                    disabled={loading || !customer?.id}
                    startIcon={<DeleteIcon />}
                    onClick={confirmDelete}
                    variant="contained"
                >Delete</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Button
                    fullWidth
                    disabled={loading || !changes_made}
                    startIcon={<SaveIcon />}
                    onClick={() => { formik.handleSubmit(); }}
                    variant="contained"
                >Update</Button>
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
                        <Grid sx={{ textAlign: "center" }} item xs={12}>
                            <Typography variant="h5">
                                {customer?.firstName} {customer?.lastName}
                            </Typography>
                            <Typography variant="h6">
                                {customer?.business?.name}
                            </Typography>
                        </Grid>
                    </Grid>
                </Toolbar>
            </AppBar>
            <Box component="form" onSubmit={formik.handleSubmit} sx={{
                background: palette.background.default,
                flex: "auto",
                padding: spacing(3),
                paddingBottom: "20vh",
                overflowY: "auto",
            }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="First Name"
                            value={currCustomer?.firstName || ""}
                            onChange={(e) => setCurrCustomer({ ...currCustomer, firstName: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Last Name"
                            value={currCustomer?.lastName || ""}
                            onChange={(e) => setCurrCustomer({ ...currCustomer, lastName: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Pronouns"
                            value={currCustomer?.pronouns || ""}
                            onChange={(e) => setCurrCustomer({ ...currCustomer, pronouns: e.target.value })}
                        />
                    </Grid>
                    {Boolean(customer?.business) && <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Business Name"
                            value={currCustomer?.business?.name || ""}
                            onChange={(e) => setCurrCustomer({ ...currCustomer, business: { ...currCustomer.business!, name: e.target.value } })}
                        />
                    </Grid>}
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Email"
                            value={currCustomer?.emails?.[0]?.emailAddress || ""}
                            onChange={(e) => setCurrCustomer({ ...currCustomer, emails: [{ ...currCustomer.emails[0], emailAddress: e.target.value }] })}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Phone"
                            value={currCustomer?.phones?.[0]?.number || ""}
                            onChange={(e) => setCurrCustomer({ ...currCustomer, phones: [{ ...currCustomer.phones[0], number: e.target.value }] })}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Account Status"
                            value={currLabel}
                            InputProps={{
                                readOnly: true,
                            }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Roles"
                            value={currCustomer?.roles?.map(role => role.role.title).join(", ") || ""}
                            InputProps={{
                                readOnly: true,
                            }}
                        />
                    </Grid>
                </Grid>
            </Box>
            <Box sx={{
                background: palette.background.default,
                flex: "auto",
                padding: spacing(1),
                paddingBottom: "15vh",
            }}>

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
