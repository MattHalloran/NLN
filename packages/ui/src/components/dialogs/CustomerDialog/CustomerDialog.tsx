import { AppBar, Box, Button, Dialog, Grid, IconButton, Toolbar, Typography, useTheme } from "@mui/material";
import { customers_customers } from "api/generated/customers";
import { deleteCustomerVariables } from "api/generated/deleteCustomer";
import { AccountStatus } from "api/generated/globalTypes";
import { updateCustomerVariables } from "api/generated/updateCustomer";
import { deleteCustomerMutation, updateCustomerMutation } from "api/mutation";
import { documentNodeWrapper } from "api/utils";
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

    const updateCustomer = useCallback(() => {
        documentNodeWrapper<any, updateCustomerVariables>({
            node: updateCustomerMutation,
            input: { input: currCustomer },
            successMessage: () => "Customer updated.",
        });
    }, [currCustomer]);

    const changes_made = !_.isEqual(customer, currCustomer);
    const options = (
        <Grid container spacing={2} sx={{
            padding: spacing(2),
            background: palette.primary.main,
        }}>
            <Grid item xs={12} sm={6} md={3}>
                <Button
                    fullWidth
                    disabled={!changes_made}
                    startIcon={<CancelIcon />}
                    onClick={revert}
                    variant="contained"
                >Revert</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Button
                    fullWidth
                    disabled={!customer?.id}
                    startIcon={<ToggleIcon />}
                    onClick={toggleLock}
                    variant="contained"
                >{toggleLabel}</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Button
                    fullWidth
                    disabled={!customer?.id}
                    startIcon={<DeleteIcon />}
                    onClick={confirmDelete}
                    variant="contained"
                >Delete</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Button
                    fullWidth
                    disabled={!changes_made}
                    startIcon={<SaveIcon />}
                    onClick={updateCustomer}
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
