import { useMutation } from "@apollo/client";
import { ORDER_STATUS, ROLES } from "@local/shared";
import { AppBar, Box, Button, Dialog, Grid, IconButton, Toolbar, Typography, useTheme } from "@mui/material";
import { updateOrderVariables, updateOrder_updateOrder } from "api/generated/updateOrder";
import { updateOrderMutation } from "api/mutation";
import { mutationWrapper } from "api/utils";
import { CartTable, Transition } from "components";
import { SessionContext } from "contexts/SessionContext";
import { CancelIcon, CloseIcon, CompleteIcon, DeliveryTruckIcon, EditIcon, SaveIcon, ScheduleIcon, SuccessIcon, ThumbDownIcon, ThumbUpIcon } from "icons";
import { isEqual } from "lodash-es";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ORDER_FILTERS, findWithAttr } from "utils";

const editableStatuses = [ORDER_STATUS.PendingCancel, ORDER_STATUS.Pending, ORDER_STATUS.Approved, ORDER_STATUS.Scheduled];

interface OrderDialogProps {
    order: any;
    open?: boolean;
    onClose: () => void;
}

export const OrderDialog = ({
    order,
    open = true,
    onClose,
}: OrderDialogProps) => {
    const { palette, spacing } = useTheme();
    const session = useContext(SessionContext);

    // Holds order changes before update is final
    const [changedOrder, setChangedOrder] = useState(order);
    const [updateOrder, { loading }] = useMutation(updateOrderMutation);

    useEffect(() => {
        setChangedOrder(order);
    }, [order]);

    const orderUpdate = () => {
        mutationWrapper<updateOrder_updateOrder, updateOrderVariables>({
            mutation: updateOrder,
            input: {
                id: changedOrder.id,
                desiredDeliveryDate: changedOrder.desiredDeliveryDate,
                isDelivery: changedOrder.isDelivery,
                items: changedOrder.items.map((i: any) => ({ id: i.id, quantity: i.quantity })),
            },
            successCondition: (data) => data !== null,
            successMessage: () => "Order successfully updated.",
            onSuccess: (data) => setChangedOrder(data),
        });
    };

    const setOrderStatus = useCallback((status: string, successMessage: string, errorMessage: string) => {
        mutationWrapper<updateOrder_updateOrder, updateOrderVariables>({
            mutation: updateOrder,
            input: { id: order.id, status: status as any },
            successMessage: () => successMessage,
            errorMessage: () => errorMessage,
            onSuccess: (data) => setChangedOrder(data),
        });
    }, [order, updateOrder]);


    // Used to set the status of the order
    // First item is a check to detemine if action is currently available.
    // The rest is the data needed to display the action and call mutationWrapper.
    const changeStatus = useMemo(() => {
        const isCustomer = session?.roles && Array.isArray(session.roles) && session.roles.some(r => [ROLES.Customer].includes(r?.role?.title));
        const isOwner = session?.roles && Array.isArray(session.roles) && session.roles.some(r => [ROLES.Owner, ROLES.Admin].includes(r?.role?.title));
        const isCanceled = [ORDER_STATUS.CanceledByAdmin, ORDER_STATUS.CanceledByCustomer, ORDER_STATUS.Rejected].includes(changedOrder?.status);
        const isOutTheDoor = [ORDER_STATUS.InTransit, ORDER_STATUS.Delivered].includes(changedOrder?.status);
        return {
            [ORDER_STATUS.CanceledByAdmin]: [
                isOwner && !isCanceled,
                "Cancel order", <CancelIcon />, "Order canceled.", "Failed to cancel order.",
            ],
            [ORDER_STATUS.CanceledByCustomer]: [
                isCustomer && !isCanceled && !isOutTheDoor && changedOrder?.status !== ORDER_STATUS.Approved,
                "Cancel order", <CancelIcon />, "Order canceled.", "Failed to cancel order.",
            ],
            [ORDER_STATUS.PendingCancel]: [
                isCustomer && changedOrder.status === ORDER_STATUS.Approved,
                "Request cancellation", <CancelIcon />, "Order cancellation requested.", "Failed to request cancellation.",
            ],
            [ORDER_STATUS.Rejected]: [
                isOwner && !isCanceled,
                "Reject order", <ThumbDownIcon />, "Order reverted back to cart.", "Failed to change order.",
            ],
            [ORDER_STATUS.Draft]: [
                isCustomer && changedOrder?.status === ORDER_STATUS.Pending,
                "Revoke order submission", <EditIcon />, "Order reverted back to cart.", "Failed to change order.",
            ],
            [ORDER_STATUS.Pending]: [
                isCustomer && [ORDER_STATUS.Draft, ORDER_STATUS.PendingCancel].includes(changedOrder?.status),
                "Submit order", <CompleteIcon />, "Order approved.", "Failed to approve order.",
            ],
            [ORDER_STATUS.Approved]: [
                isOwner && (changedOrder?.status === ORDER_STATUS.Pending || isCanceled),
                "Approve Order", <ThumbUpIcon />, "Order approved.", "Failed to approve order.",
            ],
            [ORDER_STATUS.Scheduled]: [
                isOwner && [ORDER_STATUS.Approved, ORDER_STATUS.InTransit].includes(changedOrder?.status),
                "Set order status to \"scheduled\"", <ScheduleIcon />, "Order status set to \"scheduled\".", "Failed to update order status.",
            ],
            [ORDER_STATUS.InTransit]: [
                isOwner && [ORDER_STATUS.Scheduled, ORDER_STATUS.Delivered].includes(changedOrder?.status),
                "Set order status to \"in transit\"", <DeliveryTruckIcon />, "Order status set to \"in transit\".", "Failed to update order status.",
            ],
            [ORDER_STATUS.Delivered]: [
                isOwner && changedOrder?.status === ORDER_STATUS.InTransit,
                "Set order status to \"Delivered\"", <SuccessIcon />, "Order status set to \"delivered\".", "Failed to update order status.",
            ],
        };
    }, [changedOrder, session]);

    // Filter out order mutation actions that are not currently available
    const availableActions = Object.entries(changeStatus).filter(([, value]) => value[0]).map(([status, statusData]) => ({
        status,
        displayText: statusData[1],
        icon: statusData[2],
        successMessage: statusData[3],
        failureMessage: statusData[4],
    }));

    let status_string;
    const status_index = findWithAttr(ORDER_FILTERS, "value", changedOrder?.status);
    if (status_index >= 0) {
        status_string = `Status: ${ORDER_FILTERS[status_index].label}`;
    }

    const options = (
        <Grid container spacing={1} sx={{ padding: spacing(2) }}>
            <Grid item xs={12} sm={4}>
                <Button
                    fullWidth
                    startIcon={<SaveIcon />}
                    onClick={orderUpdate}
                    disabled={loading || isEqual(order, changedOrder)}
                    variant="contained"
                >Update</Button>
            </Grid>
            {availableActions.map(action => (
                <Grid item xs={12} sm={4}>
                    <Button
                        fullWidth
                        startIcon={action.icon}
                        onClick={() => setOrderStatus(String(action.status), String(action.successMessage), String(action.failureMessage))}
                        disabled={loading}
                        variant="contained"
                    >{action.displayText}</Button>
                </Grid>
            ))}
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
                                {order?.customer?.firstName} {order?.customer?.lastName}'s order
                            </Typography>
                            <Typography variant="h6">
                                {order?.customer?.business?.name}
                            </Typography>
                        </Grid>
                    </Grid>
                </Toolbar>
            </AppBar>
            <Box sx={{
                background: palette.background.default,
                flex: "auto",
                paddingBottom: "15vh",
            }}>
                <Box sx={{ padding: spacing(1) }}>
                    <Typography variant="body1" gutterBottom>{status_string}</Typography>
                    <CartTable cart={changedOrder} editable={editableStatuses.includes(changedOrder?.status)} onUpdate={(data) => setChangedOrder(data)} />
                </Box>
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
