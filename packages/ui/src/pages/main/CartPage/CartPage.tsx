import { useMutation } from "@apollo/client";
import { APP_LINKS } from "@local/shared";
import { Box, Button, Grid, Typography, useTheme } from "@mui/material";
import { submitOrderVariables } from "api/generated/submitOrder";
import { updateOrderVariables, updateOrder_updateOrder } from "api/generated/updateOrder";
import { submitOrderMutation, updateOrderMutation } from "api/mutation";
import { mutationWrapper } from "api/utils";
import { CartTable, PageContainer, SnackSeverity } from "components";
import { BusinessContext } from "contexts/BusinessContext";
import { SessionContext } from "contexts/SessionContext";
import { ArrowLeftIcon, ArrowRightIcon, SaveIcon } from "icons";
import _ from "lodash";
import { useCallback, useContext, useEffect, useState } from "react";
import { useLocation } from "route";
import { Cart } from "types";
import { PubSub } from "utils";

export const CartPage = () => {
    const { spacing } = useTheme();
    const [, setLocation] = useLocation();
    const session = useContext(SessionContext);
    const business = useContext(BusinessContext);

    // Holds cart changes before update is final
    const [changedCart, setChangedCart] = useState<Cart | null>(null);
    const [updateOrder, { loading }] = useMutation(updateOrderMutation);
    const [submitOrder] = useMutation(submitOrderMutation);

    useEffect(() => {
        setChangedCart(session?.cart ?? null);
    }, [session]);

    const orderUpdate = () => {
        if (!changedCart || !session?.id) {
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
            onSuccess: (cart) => PubSub.get().publishSession({ cart }),
            successMessage: () => "Order successfully updated.",
        });
    };

    const requestQuote = useCallback(() => {
        if (!session?.cart?.id) {
            PubSub.get().publishSnack({ message: "Failed to submit order.", severity: SnackSeverity.Error });
            return;
        }
        mutationWrapper<any, submitOrderVariables>({
            mutation: submitOrder,
            input: { id: session.cart.id },
            successCondition: (success) => success === true,
            onSuccess: () => {
                PubSub.get().publishAlertDialog({ message: "Order submitted! We will be in touch with you soon😊", buttons: [{ "text": "Ok" }] });
                PubSub.get().publishSession({ cart: null });
            },
            onError: () => PubSub.get().publishAlertDialog({ message: `Failed to submit order. Please contact ${business?.BUSINESS_NAME?.Short}`, buttons: [{ "text": "Ok" }] }), //TODO add contact info
        });
    }, [submitOrder, session, business]);

    const finalizeOrder = useCallback(() => {
        // Make sure order is updated
        if (!_.isEqual(session?.cart, changedCart)) {
            PubSub.get().publishSnack({ message: "Please click \"UPDATE ORDER\" before submitting.", severity: SnackSeverity.Error });
            return;
        }
        // Disallow empty orders
        if (!session?.cart || session.cart.items.length <= 0) {
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
    }, [changedCart, session, requestQuote, business]);

    const options = (
        <Grid container spacing={2} sx={{ paddingTop: spacing(2) }}>
            <Grid display="flex" justifyContent="center" item xs={12} sm={4}>
                <Button
                    fullWidth
                    startIcon={<ArrowLeftIcon />}
                    onClick={() => setLocation(APP_LINKS.Shopping)}
                    disabled={loading || (changedCart !== null && !_.isEqual(session?.cart, changedCart))}
                    variant="contained"
                >Continue Shopping</Button>
            </Grid>
            <Grid display="flex" justifyContent="center" item xs={12} sm={4}>
                <Button
                    fullWidth
                    startIcon={<SaveIcon />}
                    onClick={orderUpdate}
                    disabled={loading || (changedCart === null || _.isEqual(session?.cart, changedCart))}
                    variant="contained"
                >Update Order</Button>
            </Grid>
            <Grid display="flex" justifyContent="center" item xs={12} sm={4}>
                <Button
                    fullWidth
                    endIcon={<ArrowRightIcon />}
                    onClick={finalizeOrder}
                    disabled={loading || changedCart === null || !_.isEqual(session?.cart, changedCart)}
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
