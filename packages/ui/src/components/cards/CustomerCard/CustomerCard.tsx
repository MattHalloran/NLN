import { useCallback, useMemo, useState } from 'react';
import {
    Card,
    CardActions,
    CardContent,
    IconButton,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material';
import { changeCustomerStatusMutation, deleteCustomerMutation } from 'graphql/mutation';
import { useMutation } from '@apollo/client';
import { emailLink, mapIfExists, phoneLink, PubSub, showPhone } from 'utils';
import { ListDialog } from 'components/dialogs';
import { DeleteForeverIcon, DeleteIcon, EditIcon, EmailIcon, LockIcon, LockOpenIcon, PhoneIcon, ThumbUpIcon } from '@shared/icons';
import { mutationWrapper } from 'graphql/utils';
import { deleteCustomerVariables } from 'graphql/generated/deleteCustomer';
import { changeCustomerStatusVariables } from 'graphql/generated/changeCustomerStatus';
import { CustomerCardProps } from '../types';
import { AccountStatus } from 'graphql/generated/globalTypes';

type ActionArray = [(() => any), JSX.Element, string];

enum CustomerStatus {
    Deleted = 'Deleted',
    Unlocked = 'Unlocked',
    WaitingApproval = 'WaitingApproval',
    SoftLock = 'SoftLock',
    HardLock = 'HardLock'
}

export const CustomerCard = ({
    customer,
    onEdit,
}: CustomerCardProps) => {
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

    const status_map = useMemo<{ [key in CustomerStatus]: string }>(() => ({
        [CustomerStatus.Deleted]: 'Deleted',
        [CustomerStatus.Unlocked]: 'Unlocked',
        [CustomerStatus.WaitingApproval]: 'Waiting Approval',
        [CustomerStatus.SoftLock]: 'Soft Locked',
        [CustomerStatus.HardLock]: 'Hard Locked',
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
        PubSub.get().publishAlertDialog({
            message: `Are you sure you want to delete the account for ${customer.firstName} ${customer.lastName}?`,
            buttons: [{
                text: 'Yes',
                onClick: () => { modifyCustomer(AccountStatus.Deleted, 'Customer deleted.') },
            }, {
                text: 'No',
            }]
        });
    }, [customer, modifyCustomer])

    let edit_action: ActionArray = [edit, <EditIcon fill={palette.secondary.light} />, 'Edit customer']
    let approve_action: ActionArray = [() => modifyCustomer(AccountStatus.Unlocked, 'Customer account approved.'), <ThumbUpIcon fill={palette.secondary.light} />, 'Approve customer account'];
    let unlock_action: ActionArray = [() => modifyCustomer(AccountStatus.Unlocked, 'Customer account unlocked.'), <LockOpenIcon fill={palette.secondary.light} />, 'Unlock customer account'];
    let lock_action: ActionArray = [() => modifyCustomer(AccountStatus.HardLock, 'Customer account locked.'), <LockIcon fill={palette.secondary.light} />, 'Lock customer account'];
    let undelete_action: ActionArray = [() => modifyCustomer(AccountStatus.Unlocked, 'Customer account restored.'), <LockOpenIcon fill={palette.secondary.light} />, 'Restore deleted account'];
    let delete_action: ActionArray = [confirmDelete, <DeleteIcon fill={palette.secondary.light} />, 'Delete user'];
    let permanent_delete_action: ActionArray = [confirmPermanentDelete, <DeleteForeverIcon fill={palette.secondary.light} />, 'Permanently delete user']

    let actions: ActionArray[] = [edit_action];
    // Actions for customer accounts
    if (!Array.isArray(customer?.roles) || !customer.roles.some(r => ['Owner', 'Admin'].includes(r.role.title))) {
        switch (customer?.status) {
            case AccountStatus.Unlocked:
                actions.push(lock_action);
                actions.push(delete_action)
                break;
            case AccountStatus.SoftLock:
            case AccountStatus.HardLock:
                actions.push(unlock_action);
                actions.push(delete_action)
                break;
            case AccountStatus.Deleted:
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
            borderRadius: 2,
            margin: 2,
            cursor: 'pointer',
        }}>
            {phoneDialogOpen ? (
                <ListDialog
                    title={`Call ${customer?.firstName} ${customer?.lastName}`}
                    data={phoneList}
                    onClose={callPhone} />
            ) : null}
            {emailDialogOpen ? (
                <ListDialog
                    title={`Email ${customer?.firstName} ${customer?.lastName}`}
                    data={emailList}
                    onClose={sendEmail} />
            ) : null}
            <CardContent
                onClick={() => onEdit(customer)}
                sx={{
                    padding: 2,
                    position: 'inherit',
                }}
            >
                <Typography gutterBottom variant="h6" component="h2">
                    {customer?.firstName} {customer?.lastName}
                </Typography>
                <p>Status: {status_map[customer?.accountApproved === false ? CustomerStatus.WaitingApproval : customer?.status as unknown as CustomerStatus]}</p>
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
                {(phoneList && phoneList.length > 0) &&
                    (<Tooltip title="View phone numbers" placement="bottom">
                        <IconButton onClick={() => setPhoneDialogOpen(true)}>
                            <PhoneIcon fill={palette.secondary.light} />
                        </IconButton>
                    </Tooltip>)
                }
                {(emailList && emailList.length > 0) &&
                    (<Tooltip title="View emails" placement="bottom">
                        <IconButton onClick={() => setEmailDialogOpen(true)}>
                            <EmailIcon fill={palette.secondary.light} />
                        </IconButton>
                    </Tooltip>)
                }
            </CardActions>
        </Card>
    );
}