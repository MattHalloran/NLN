import React, { useCallback, useMemo, useState } from 'react';
import {
    Card,
    CardActions,
    CardContent,
    IconButton,
    Tooltip,
    Typography
} from '@mui/material';
import { changeCustomerStatusMutation, deleteCustomerMutation } from 'graphql/mutation';
import { useMutation } from '@apollo/client';
import { ACCOUNT_STATUS } from '@shared/consts';
import { useTheme } from '@emotion/react';
import { emailLink, mapIfExists, phoneLink, PubSub, showPhone } from 'utils';
import { ListDialog } from 'components/dialogs';
import { DeleteForeverIcon, DeleteIcon, EditIcon, EmailIcon, LockIcon } from '@shared/icons';
import { mutationWrapper } from 'graphql/utils';
import { deleteCustomerVariables } from 'graphql/generated/deleteCustomer';
import { changeCustomerStatusVariables } from 'graphql/generated/changeCustomerStatus';

export const  CustomerCard = ({
    customer,
    status = ACCOUNT_STATUS.Deleted,
    onEdit,
}) => {
    const { palette } = useTheme();

    const [changeCustomerStatus] = useMutation(changeCustomerStatusMutation);
    const [deleteCustomer] = useMutation(deleteCustomerMutation);
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);

    const callPhone = (phoneLink) => {
        setPhoneDialogOpen(false);
        if (phoneLink) window.location.href = phoneLink;
    }

    const sendEmail = (emailLink) => {
        setEmailDialogOpen(false);
        if (emailLink) window.open(emailLink, '_blank', 'noopener,noreferrer')
    }

    const status_map = useMemo(() => ({
        [ACCOUNT_STATUS.Deleted]: 'Deleted',
        [ACCOUNT_STATUS.Unlocked]: 'Unlocked',
        [ACCOUNT_STATUS.WaitingApproval]: 'Waiting Approval',
        [ACCOUNT_STATUS.SoftLock]: 'Soft Locked',
        [ACCOUNT_STATUS.HardLock]: 'Hard Locked',
    }), [])

    const edit = () => {
        onEdit(customer);
    }

    const modifyCustomer = useCallback((status, message) => {
        mutationWrapper<any, changeCustomerStatusVariables>({
            mutation: changeCustomerStatus,
            input: { id: customer?.id, status: status },
            successCondition: (response) => response !== null,
            successMessage: () => message
        })
    }, [changeCustomerStatus, customer])

    const confirmPermanentDelete = useCallback(() => {
        PubSub.get().publishAlertDialog({
            message: `Are you sure you want to permanently delete the account for ${customer.firstName} ${customer.lastName}? THIS ACTION CANNOT BE UNDONE!`,
            buttons: [{
                text: 'Yes',
                onClick: () => {
                    mutationWrapper<any, deleteCustomerVariables>({
                        mutation: deleteCustomer,
                        input: { id: customer?.id },
                        successCondition: (response) => response !== null,
                        successMessage: () => 'Customer permanently deleted.'
                    })
                }
            }, {
                text: 'No',
            }]
        })
    }, [customer, deleteCustomer])

    const confirmDelete = useCallback(() => {
        PubSub.publish(PUBS.AlertDialog, {
            message: `Are you sure you want to delete the account for ${customer.firstName} ${customer.lastName}?`,
            firstButtonText: 'Yes',
            firstButtonClicked: () => modifyCustomer(ACCOUNT_STATUS.Deleted, 'Customer deleted.'),
            secondButtonText: 'No',
        });
    }, [customer, modifyCustomer])

    let edit_action = [edit, <EditIcon fill={palette.secondary.light} />, 'Edit customer']
    let approve_action = [() => modifyCustomer(ACCOUNT_STATUS.Unlocked, 'Customer account approved.'), <ThumbUpIcon fill={palette.secondary.light} />, 'Approve customer account'];
    let unlock_action = [() => modifyCustomer(ACCOUNT_STATUS.Unlocked, 'Customer account unlocked.'), <LockOpenIcon fill={palette.secondary.light} />, 'Unlock customer account'];
    let lock_action = [() => modifyCustomer(ACCOUNT_STATUS.HardLock, 'Customer account locked.'), <LockIcon fill={palette.secondary.light} />, 'Lock customer account'];
    let undelete_action = [() => modifyCustomer(ACCOUNT_STATUS.Unlocked, 'Customer account restored.'), <LockOpenIcon fill={palette.secondary.light} />, 'Restore deleted account'];
    let delete_action = [confirmDelete, <DeleteIcon fill={palette.secondary.light} />, 'Delete user'];
    let permanent_delete_action = [confirmPermanentDelete, <DeleteForeverIcon fill={palette.secondary.light} />, 'Permanently delete user']

    let actions = [edit_action];
    // Actions for customer accounts
    if (!Array.isArray(customer?.roles) || !customer.roles.some(r => ['Owner', 'Admin'].includes(r.role.title))) {
        switch (customer?.status) {
            case ACCOUNT_STATUS.Unlocked:
                actions.push(lock_action);
                actions.push(delete_action)
                break;
            case ACCOUNT_STATUS.SoftLock:
            case ACCOUNT_STATUS.HardLock:
                actions.push(unlock_action);
                actions.push(delete_action)
                break;
            case ACCOUNT_STATUS.Deleted:
                actions.push(undelete_action);
                actions.push(permanent_delete_action);
                break;
        }
    }
    if (customer?.accountApproved === false) actions.push(approve_action);

    // Phone and email [label, value] pairs
    const phoneList = mapIfExists(customer, 'phones', (p) => ([showPhone(p.number), phoneLink(p.number)]));
    const emailList = mapIfExists(customer, 'emails', (e) => ([e.emailAddress, emailLink(e.emailAddress)]));

    return (
        <Card sx={{
            background: palette.primary.main,
            color: palette.primary.contrastText,
            borderRadius: 15,
            margin: 3,
            cursor: 'pointer',
        }}>
            {phoneDialogOpen ? (
                <ListDialog
                    title={`Call ${customer?.fullName}`}
                    data={phoneList}
                    onClose={callPhone} />
            ) : null}
            {emailDialogOpen ? (
                <ListDialog
                    title={`Email ${customer?.fullName}`}
                    data={emailList}
                    onClose={sendEmail} />
            ) : null}
            <CardContent
                onClick={() => onEdit(customer)}
                sx={{
                    padding: 8,
                    position: 'inherit',
                }}
            >
                <Typography gutterBottom variant="h6" component="h2">
                    {customer?.firstName} {customer?.lastName}
                </Typography>
                <p>Status: {status_map[customer?.status]}</p>
                <p>Business: {customer?.business?.name}</p>
                <p>Pronouns: {customer?.pronouns ?? 'Unset'}</p>
            </CardContent>
            <CardActions>
                {actions?.map((action, index) =>
                    <Tooltip key={`action-${index}`} title={action[2]} placement="bottom">
                        <IconButton onClick={action[0]}>
                            {action[1]}
                        </IconButton>
                    </Tooltip>
                )}
                {(phoneList?.length > 0) ?
                    (<Tooltip title="View phone numbers" placement="bottom">
                        <IconButton onClick={() => setPhoneDialogOpen(true)}>
                            <PhoneIcon fill={palette.secondary.light} />
                        </IconButton>
                    </Tooltip>)
                    : null}
                {(emailList?.length > 0) ?
                    (<Tooltip title="View emails" placement="bottom">
                        <IconButton onClick={() => setEmailDialogOpen(true)}>
                            <EmailIcon fill={palette.secondary.light} />
                        </IconButton>
                    </Tooltip>)
                    : null}
            </CardActions>
        </Card>
    );
}