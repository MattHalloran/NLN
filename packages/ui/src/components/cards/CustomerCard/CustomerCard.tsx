import { useMutation } from "@apollo/client";
import { 
    Card, 
    CardActions, 
    CardContent, 
    IconButton, 
    Tooltip, 
    Typography, 
    useTheme, 
    Box, 
    Chip, 
    Avatar,
    Divider 
} from "@mui/material";
import { 
    Business as BusinessIcon, 
    Person as PersonIcon, 
    CheckCircle as ApprovedIcon,
    Schedule as PendingIcon,
    Block as BlockedIcon,
    Delete as DeletedIcon
} from "@mui/icons-material";
import { changeCustomerStatusVariables } from "api/generated/changeCustomerStatus";
import { deleteCustomerVariables } from "api/generated/deleteCustomer";
import { AccountStatus } from "api/generated/globalTypes";
import { changeCustomerStatusMutation, deleteCustomerMutation } from "api/mutation";
import { mutationWrapper } from "api/utils";
import { ListDialog } from "components/dialogs";
import { DeleteForeverIcon, DeleteIcon, EditIcon, EmailIcon, LockIcon, LockOpenIcon, PhoneIcon, ThumbUpIcon } from "icons";
import { useCallback, useMemo, useState } from "react";
import { PubSub, emailLink, mapIfExists, phoneLink, showPhone } from "utils";
import { CustomerCardProps } from "../types";

type ActionArray = [(() => any), JSX.Element, string];

enum CustomerStatus {
    Deleted = "Deleted",
    Unlocked = "Unlocked",
    WaitingApproval = "WaitingApproval",
    SoftLock = "SoftLock",
    HardLock = "HardLock"
}

export const CustomerCard = ({
    customer,
    isMobile,
    onEdit,
}: CustomerCardProps) => {
    const { breakpoints, palette } = useTheme();

    const [changeCustomerStatus] = useMutation(changeCustomerStatusMutation);
    const [deleteCustomer] = useMutation(deleteCustomerMutation);
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);

    const callPhone = (phoneLink?: string): void => {
        setPhoneDialogOpen(false);
        if (phoneLink) window.location.href = phoneLink;
    };

    const sendEmail = (emailLink?: string): void => {
        setEmailDialogOpen(false);
        if (emailLink) window.open(emailLink, "_blank", "noopener,noreferrer");
    };

    const status_map = useMemo<{ [key in CustomerStatus]: string }>(() => ({
        [CustomerStatus.Deleted]: "Deleted",
        [CustomerStatus.Unlocked]: "Unlocked",
        [CustomerStatus.WaitingApproval]: "Waiting Approval",
        [CustomerStatus.SoftLock]: "Soft Locked",
        [CustomerStatus.HardLock]: "Hard Locked",
    }), []);

    const edit = () => {
        onEdit(customer);
    };

    const modifyCustomer = useCallback((status: AccountStatus, message: string) => {
        mutationWrapper<any, changeCustomerStatusVariables>({
            mutation: changeCustomerStatus,
            input: { id: customer?.id, status },
            successCondition: (response) => response !== null,
            successMessage: () => message,
        });
    }, [changeCustomerStatus, customer]);

    const confirmPermanentDelete = useCallback(() => {
        PubSub.get().publishAlertDialog({
            message: `Are you sure you want to permanently delete the account for ${customer.firstName} ${customer.lastName}? THIS ACTION CANNOT BE UNDONE!`,
            buttons: [{
                text: "Yes",
                onClick: () => {
                    mutationWrapper<any, deleteCustomerVariables>({
                        mutation: deleteCustomer,
                        input: { id: customer?.id },
                        successCondition: (response) => response !== null,
                        successMessage: () => "Customer permanently deleted.",
                    });
                },
            }, {
                text: "No",
            }],
        });
    }, [customer, deleteCustomer]);

    const confirmDelete = useCallback(() => {
        PubSub.get().publishAlertDialog({
            message: `Are you sure you want to delete the account for ${customer.firstName} ${customer.lastName}?`,
            buttons: [{
                text: "Yes",
                onClick: () => { modifyCustomer(AccountStatus.Deleted, "Customer deleted."); },
            }, {
                text: "No",
            }],
        });
    }, [customer, modifyCustomer]);

    const edit_action: ActionArray = [edit, <EditIcon fill={palette.secondary.light} />, "Edit customer"];
    const approve_action: ActionArray = [() => modifyCustomer(AccountStatus.Unlocked, "Customer account approved."), <ThumbUpIcon fill={palette.secondary.light} />, "Approve customer account"];
    const unlock_action: ActionArray = [() => modifyCustomer(AccountStatus.Unlocked, "Customer account unlocked."), <LockOpenIcon fill={palette.secondary.light} />, "Unlock customer account"];
    const lock_action: ActionArray = [() => modifyCustomer(AccountStatus.HardLock, "Customer account locked."), <LockIcon fill={palette.secondary.light} />, "Lock customer account"];
    const undelete_action: ActionArray = [() => modifyCustomer(AccountStatus.Unlocked, "Customer account restored."), <LockOpenIcon fill={palette.secondary.light} />, "Restore deleted account"];
    const delete_action: ActionArray = [confirmDelete, <DeleteIcon fill={palette.secondary.light} />, "Delete user"];
    const permanent_delete_action: ActionArray = [confirmPermanentDelete, <DeleteForeverIcon fill={palette.secondary.light} />, "Permanently delete user"];

    const actions: ActionArray[] = [edit_action];
    // Actions for customer accounts
    if (!Array.isArray(customer?.roles) || !customer.roles.some(r => ["Owner"].includes(r.role.title))) {
        switch (customer?.status) {
            case AccountStatus.Unlocked:
                actions.push(lock_action);
                actions.push(delete_action);
                break;
            case AccountStatus.SoftLock:
            case AccountStatus.HardLock:
                actions.push(unlock_action);
                actions.push(delete_action);
                break;
            case AccountStatus.Deleted:
                actions.push(undelete_action);
                actions.push(permanent_delete_action);
                break;
        }
    }
    if (customer?.accountApproved === false) actions.push(approve_action);

    // Phone and email [label, value] pairs
    const phoneList = mapIfExists(customer as unknown as Record<string, unknown>, "phones", (p: any) => [showPhone(p.number), phoneLink(p.number)] as [string, string]) as [string, string][] | null;
    const emailList = mapIfExists(customer as unknown as Record<string, unknown>, "emails", (e: any) => [e.emailAddress, emailLink(e.emailAddress)] as [string, string]) as [string, string][] | null;

    const getStatusChip = () => {
        const currentStatus = customer?.accountApproved === false ? CustomerStatus.WaitingApproval : customer?.status as unknown as CustomerStatus;
        const statusConfig = {
            [CustomerStatus.Unlocked]: { 
                label: 'Active', 
                color: '#2e7d32', 
                icon: <ApprovedIcon sx={{ fontSize: 14 }} /> 
            },
            [CustomerStatus.WaitingApproval]: { 
                label: 'Pending', 
                color: '#ed6c02', 
                icon: <PendingIcon sx={{ fontSize: 14 }} /> 
            },
            [CustomerStatus.SoftLock]: { 
                label: 'Soft Locked', 
                color: '#d32f2f', 
                icon: <BlockedIcon sx={{ fontSize: 14 }} /> 
            },
            [CustomerStatus.HardLock]: { 
                label: 'Hard Locked', 
                color: '#d32f2f', 
                icon: <BlockedIcon sx={{ fontSize: 14 }} /> 
            },
            [CustomerStatus.Deleted]: { 
                label: 'Deleted', 
                color: '#424242', 
                icon: <DeletedIcon sx={{ fontSize: 14 }} /> 
            }
        };
        
        const config = statusConfig[currentStatus] || statusConfig[CustomerStatus.Unlocked];
        
        return (
            <Chip
                icon={config.icon}
                label={config.label}
                size="small"
                sx={{
                    bgcolor: config.color,
                    color: 'white',
                    fontSize: '0.75rem',
                    height: 24,
                    '& .MuiChip-icon': {
                        color: 'white',
                        marginLeft: 1
                    }
                }}
            />
        );
    };

    return (
        <Card sx={{
            background: palette.background.paper,
            border: `1px solid ${palette.divider}`,
            borderRadius: 2,
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            "&:hover": {
                boxShadow: 3,
                transform: "translateY(-1px)",
                borderColor: palette.primary.main,
            },
            boxShadow: 1,
        }}>
            {phoneDialogOpen ? (
                <ListDialog
                    title={`Call ${customer?.firstName} ${customer?.lastName}`}
                    data={phoneList ?? undefined}
                    onClose={callPhone} />
            ) : null}
            {emailDialogOpen ? (
                <ListDialog
                    title={`Email ${customer?.firstName} ${customer?.lastName}`}
                    data={emailList ?? undefined}
                    onClose={sendEmail} />
            ) : null}
            
            <CardContent 
                onClick={() => onEdit(customer)}
                sx={{ 
                    p: 3, 
                    pb: 2,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column"
                }}
            >
                {/* Header Section */}
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar
                            sx={{
                                bgcolor: customer?.business ? '#1976d2' : '#546e7a',
                                width: 40,
                                height: 40,
                                "& > svg": {
                                    fontSize: 20,
                                    color: "white",
                                },
                            }}
                        >
                            {customer?.business ? <BusinessIcon /> : <PersonIcon />}
                        </Avatar>
                        <Box>
                            <Typography variant="h6" fontWeight="600" color="text.primary" sx={{ lineHeight: 1.2 }}>
                                {customer?.firstName} {customer?.lastName}
                            </Typography>
                            {customer?.business && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {customer.business.name}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                    {getStatusChip()}
                </Box>

                {/* Customer Details */}
                <Box flex={1}>
                    {customer?.pronouns && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            <strong>Pronouns:</strong> {customer.pronouns}
                        </Typography>
                    )}
                    
                    {customer?.roles && customer.roles.length > 0 && (
                        <Box display="flex" flexWrap="wrap" gap={0.5} mt={1}>
                            {customer.roles.map((role, index) => (
                                <Chip
                                    key={index}
                                    label={role.role.title}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                        fontSize: '0.7rem',
                                        height: 20,
                                        borderColor: palette.divider,
                                        color: palette.text.secondary
                                    }}
                                />
                            ))}
                        </Box>
                    )}
                </Box>
            </CardContent>

            <Divider />

            {/* Action Buttons */}
            <CardActions sx={{ 
                p: 2, 
                pt: 1.5,
                justifyContent: "space-between",
                alignItems: "center"
            }}>
                <Box display="flex" gap={0.5}>
                    {actions?.slice(0, 3).map((action, index) =>
                        <Tooltip key={`action-${index}`} title={action[2]} placement="top">
                            <IconButton 
                                onClick={action[0]}
                                size="small"
                                sx={{ 
                                    color: palette.text.secondary,
                                    "&:hover": { 
                                        color: palette.primary.main,
                                        bgcolor: palette.action.hover 
                                    }
                                }}
                            >
                                {action[1]}
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>

                <Box display="flex" gap={0.5}>
                    {(phoneList && phoneList.length > 0) &&
                        <Tooltip title="View phone numbers" placement="top">
                            <IconButton 
                                onClick={() => setPhoneDialogOpen(true)}
                                size="small"
                                sx={{ 
                                    color: palette.text.secondary,
                                    "&:hover": { 
                                        color: palette.primary.main,
                                        bgcolor: palette.action.hover 
                                    }
                                }}
                            >
                                <PhoneIcon fill="currentColor" />
                            </IconButton>
                        </Tooltip>
                    }
                    {(emailList && emailList.length > 0) &&
                        <Tooltip title="View emails" placement="top">
                            <IconButton 
                                onClick={() => setEmailDialogOpen(true)}
                                size="small"
                                sx={{ 
                                    color: palette.text.secondary,
                                    "&:hover": { 
                                        color: palette.primary.main,
                                        bgcolor: palette.action.hover 
                                    }
                                }}
                            >
                                <EmailIcon fill="currentColor" />
                            </IconButton>
                        </Tooltip>
                    }
                </Box>
            </CardActions>
        </Card>
    );
};
