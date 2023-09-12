import { useMutation } from "@apollo/client";
import { APP_LINKS } from "@local/shared";
import { Box, Button, Grid, Typography, useTheme } from "@mui/material";
import { submitOrderVariables } from "api/generated/submitOrder";
import { updateOrderVariables, updateOrder_updateOrder } from "api/generated/updateOrder";
import { submitOrderMutation, updateOrderMutation } from "api/mutation";
import { mutationWrapper } from "api/utils";
import { CartTable, PageContainer, SnackSeverity } from "components";
import { ArrowLeftIcon, ArrowRightIcon, SaveIcon } from "icons";
import _ from "lodash";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "route";
import { PubSub } from "utils";

export const CartPage = ({
    business,
    cart,
    onSessionUpdate,
}) => {
    const { spacing } = useTheme();
    const [, setLocation] = useLocation();

    // Holds cart changes before update is final
    const [changedCart, setChangedCart] = useState<any | null>(null);
    const [updateOrder, { loading }] = useMutation(updateOrderMutation);
    const [submitOrder] = useMutation(submitOrderMutation);

    useEffect(() => {
        setChangedCart(cart);
    }, [cart]);

    const orderUpdate = () => {
        if (!changedCart || !cart?.customer?.id) {
            PubSub.get().publishSnack({ message: "Failed to update order.", severity: SnackSeverity.Error });
            return;
        }
        mutationWrapper<updateOrder_updateOrder, updateOrderVariables>({
            mutation: updateOrder,
            input: {
                id: changedCart.id,
                desiredDeliveryDate: changedCart.desiredDeliveryDate,
                isDelivery: changedCart.isDelivery,
                specialInstructions: changedCart.specialInstructions,
                items: changedCart.items.map(i => ({ id: i.id, quantity: i.quantity })),
            },
            successCondition: (data) => data !== null,
            onSuccess: () => onSessionUpdate(),
            successMessage: () => "Order successfully updated.",
        });
    };

    const requestQuote = useCallback(() => {
        mutationWrapper<any, submitOrderVariables>({
            mutation: submitOrder,
            input: { id: cart.id },
            successCondition: (success) => success === true,
            onSuccess: () => { PubSub.get().publishAlertDialog({ message: "Order submitted! We will be in touch with you soon😊", buttons: [{ "text": "Ok" }] }); onSessionUpdate(); },
            onError: () => PubSub.get().publishAlertDialog({ message: `Failed to submit order. Please contact ${business?.BUSINESS_NAME?.Short}`, buttons: [{ "text": "Ok" }] }), //TODO add contact info
        });
    }, [submitOrder, cart, onSessionUpdate, business]);

    const finalizeOrder = useCallback(() => {
        // Make sure order is updated
        if (!_.isEqual(cart, changedCart)) {
            PubSub.get().publishSnack({ message: "Please click \"UPDATE ORDER\" before submitting.", severity: SnackSeverity.Error });
            return;
        }
        // Disallow empty orders
        if (cart.items.length <= 0) {
            PubSub.get().publishSnack({ message: "Cannot finalize order - cart is empty.", severity: SnackSeverity.Error });
            return;
        }
        PubSub.get().publishAlertDialog({
            message: `This will submit the order to ${business?.BUSINESS_NAME?.Short}. We will contact you for further information. Are you sure you want to continue?`,
            buttons: [{
                text: "Yes",
                onClick: () => requestQuote(),
            }, {
                text: "No",
            }],
        });
    }, [changedCart, cart, requestQuote, business]);

    const options = (
        <Grid container spacing={2} sx={{ paddingTop: spacing(2) }}>
            <Grid display="flex" justifyContent="center" item xs={12} sm={4}>
                <Button
                    fullWidth
                    startIcon={<ArrowLeftIcon />}
                    onClick={() => setLocation(APP_LINKS.Shopping)}
                    disabled={loading || (changedCart !== null && !_.isEqual(cart, changedCart))}
                    variant="contained"
                >Continue Shopping</Button>
            </Grid>
            <Grid display="flex" justifyContent="center" item xs={12} sm={4}>
                <Button
                    fullWidth
                    startIcon={<SaveIcon />}
                    onClick={orderUpdate}
                    disabled={loading || (changedCart === null || _.isEqual(cart, changedCart))}
                    variant="contained"
                >Update Order</Button>
            </Grid>
            <Grid display="flex" justifyContent="center" item xs={12} sm={4}>
                <Button
                    fullWidth
                    endIcon={<ArrowRightIcon />}
                    onClick={finalizeOrder}
                    disabled={loading || changedCart === null || !_.isEqual(cart, changedCart)}
                    variant="contained"
                >Request Quote</Button>
            </Grid>
        </Grid>
    );

    return (
        <PageContainer>
            <Box sx={{ textAlign: "center" }}>
                <Typography variant="h3" component="h1">Cart</Typography>
            </Box>
            {options}
            <CartTable cart={changedCart} onUpdate={(d) => setChangedCart(d)} sx={{ paddingTop: spacing(2) }} />
            {options}
        </PageContainer>
    );
};
