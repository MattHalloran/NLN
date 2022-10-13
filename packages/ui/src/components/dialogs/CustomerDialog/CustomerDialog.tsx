import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    AppBar,
    Box,
    Button,
    Dialog,
    Grid,
    IconButton,
    Toolbar,
    Typography,
    useTheme,
} from '@mui/material';
import _ from 'lodash';
import { ACCOUNT_STATUS } from '@shared/consts';
import { deleteCustomerMutation, updateCustomerMutation } from 'graphql/mutation';
import { PubSub } from 'utils';
import { CancelIcon, CloseIcon, CreateIcon, DeleteIcon, LockIcon, LockOpenIcon, SaveIcon, SvgComponent } from '@shared/icons';
import { documentNodeWrapper } from 'graphql/utils';
import { updateCustomerVariables } from 'graphql/generated/updateCustomer';
import { deleteCustomerVariables } from 'graphql/generated/deleteCustomer';
import { AccountStatus } from 'graphql/generated/globalTypes';
import { Transition } from '../UpTransition/UpTransition';
import { customers_customers } from 'graphql/generated/customers';

// Associates account states with a dynamic action button
// curr_account_value: [curr_account_label, toggled_account_label, toggled_account_value, toggle_icon]
const statusToggle: { [key in AccountStatus]?: [string, string, AccountStatus, SvgComponent] } = {
    [ACCOUNT_STATUS.Deleted]: ['Deleted', 'Undelete', ACCOUNT_STATUS.Unlocked, (<CreateIcon />)],
    [ACCOUNT_STATUS.Unlocked]: ['Unlocked', 'Lock', ACCOUNT_STATUS.HardLock, (<LockIcon />)],
    [ACCOUNT_STATUS.SoftLock]: ['Soft Locked (password timeout)', 'Unlock', ACCOUNT_STATUS.Unlocked, (<LockOpenIcon />)],
    [ACCOUNT_STATUS.HardLock]: ['Hard Locked', 'Unlock', ACCOUNT_STATUS.Unlocked, (<LockOpenIcon />)]
}

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
    }, [customer])

    const revert = () => setCurrCustomer(customer);

    const statusToggleData = useMemo<[string, string, AccountStatus | null, SvgComponent | null]>(() => {
        return currCustomer?.status in statusToggle ? statusToggle[currCustomer.status] : ['', '', null, null] as [string, string, AccountStatus | null, SvgComponent | null];
    }, [currCustomer])

    // Locks/unlocks/undeletes a user
    const toggleLock = useCallback(() => {
        documentNodeWrapper<any, updateCustomerVariables>({
            node: updateCustomerMutation,
            input: { id: currCustomer.id, status: statusToggleData[2] },
            successMessage: () => 'Customer updated.',
            errorMessage: () => 'Failed to update customer.'
        })
    }, [currCustomer, statusToggleData])

    const deleteCustomer = useCallback(() => {
        documentNodeWrapper<any, deleteCustomerVariables>({
            node: deleteCustomerMutation,
            input: { id: currCustomer?.id },
            successMessage: () => 'Customer deleted.',
            onSuccess: onClose,
        })
    }, [currCustomer?.id, onClose])

    const confirmDelete = useCallback(() => {
        PubSub.get().publishAlertDialog({
            message: `Are you sure you want to delete the account for ${currCustomer.firstName} ${currCustomer.lastName}?`,
            buttons: [{
                text: 'Yes',
                onClick: deleteCustomer,
            }, {
                text: 'No',
            }]
        });
    }, [currCustomer, deleteCustomer])

    const updateCustomer = useCallback(() => {
        documentNodeWrapper<any, updateCustomerVariables>({
            node: updateCustomerMutation,
            input: { input: ...currCustomer },
            successMessage: () => 'Customer updated.',
        })
    }, [currCustomer])

    let changes_made = !_.isEqual(customer, currCustomer);
    let options = (
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
                >Revert</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Button
                    fullWidth
                    disabled={!customer?.id}
                    startIcon={statusToggleData[3]}
                    onClick={toggleLock}
                >{statusToggleData[1]}</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Button
                    fullWidth
                    disabled={!customer?.id}
                    startIcon={<DeleteIcon />}
                    onClick={confirmDelete}
                >Delete</Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Button
                    fullWidth
                    disabled={!changes_made}
                    startIcon={<SaveIcon />}
                    onClick={updateCustomer}
                >Update</Button>
            </Grid>
        </Grid>
    );

    return (
        <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
            <AppBar sx={{ position: 'relative' }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
                        <CloseIcon />
                    </IconButton>
                    <Grid container spacing={0}>
                        <Grid sx={{ textAlign: 'center' }} item xs={12}>
                            <Typography variant="h5">
                                {customer?.fullName}
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
                flex: 'auto',
                padding: spacing(1),
                paddingBottom: '15vh',
            }}>

                <Box sx={{
                    background: palette.primary.main,
                    position: 'fixed',
                    bottom: '0',
                    width: '-webkit-fill-available',
                    zIndex: 1,
                }}>
                    {options}
                </Box>
            </Box>
        </Dialog>
    );
}