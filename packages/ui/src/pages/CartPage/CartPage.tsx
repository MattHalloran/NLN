import React, { useState, useCallback, useEffect } from 'react';
import { useHistory } from 'react-router';
import { LINKS, PubSub } from 'utils';
import { Button } from '@mui/material';
import { CartTable } from 'components';
import { updateOrderMutation, submitOrderMutation } from 'graphql/mutation';
import { useMutation } from '@apollo/client';
import { Typography, Grid } from '@mui/material';
import _ from 'lodash';

const useStyles = makeStyles((theme) => ({
    header: {
        textAlign: 'center',
    },
    padTop: {
        paddingTop: theme.spacing(2),
    },
    gridItem: {
        display: 'flex',
    },
    optionsContainer: {
        width: 'fit-content',
        justifyContent: 'center',
        '& > *': {
            margin: theme.spacing(1),
        },
    },
}));

export const CartPage = ({
    business,
    cart,
    onSessionUpdate
}) => {
    const { palette } = useTheme();

    let history = useHistory();
    // Holds cart changes before update is final
    const [changedCart, setChangedCart] = useState(null);
    const [updateOrder, {loading}] = useMutation(updateOrderMutation);
    const [submitOrder] = useMutation(submitOrderMutation);

    useEffect(() => {
        setChangedCart(cart);
    }, [cart])

    const orderUpdate = () => {
        if (!cart?.customer?.id) {
            PubSub.publish(PUBS.Snack, {message: 'Failed to update order.', severity: 'error' });
            return;
        }
        mutationWrapper({
            mutation: updateOrder,
            data: { variables: { input: { 
                id: changedCart.id,
                desiredDeliveryDate: changedCart.desiredDeliveryDate,
                isDelivery: changedCart.isDelivery,
                specialInstructions: changedCart.specialInstructions,
                items: changedCart.items.map(i => ({ id: i.id, quantity: i.quantity }))} } },
            successCondition: (response) => response.data.updateOrder,
            onSuccess: () => onSessionUpdate(),
            successMessage: () => 'Order successfully updated.',
        })
    }

    const requestQuote = useCallback(() => {
        mutationWrapper({
            mutation: submitOrder,
            data: { variables: { id: cart.id } },
            onSuccess: () => {PubSub.publish(PUBS.AlertDialog, { message: 'Order submitted! We will be in touch with you soon😊' }); onSessionUpdate()},
            onError: () => PubSub.publish(PUBS.AlertDialog, {message: `Failed to submit order. Please contact ${business?.BUSINESS_NAME?.Short}`, severity: 'error'})
        })
    }, [submitOrder, cart, onSessionUpdate, business])

    const finalizeOrder = useCallback(() => {
        // Make sure order is updated
        if (!_.isEqual(cart, changedCart)) {
            PubSub.publish(PUBS.Snack, {message: 'Please click "UPDATE ORDER" before submitting.', severity: 'warning'});
            return;
        }
        // Disallow empty orders
        if (cart.items.length <= 0) {
            PubSub.publish(PUBS.Snack, {message: 'Cannot finalize order - cart is empty.', severity: 'warning'});
            return;
        }
        PubSub.publish(PUBS.AlertDialog, {
            message: `This will submit the order to ${business?.BUSINESS_NAME?.Short}. We will contact you for further information. Are you sure you want to continue?`,
            firstButtonText: 'Yes',
            firstButtonClicked: requestQuote,
            secondButtonText: 'No',
        });
    }, [changedCart, cart, requestQuote, business]);

    let options = (
        <Grid className={classes.padTop} container spacing={2}>
            <Grid className={classes.gridItem} justify="center" item xs={12} sm={4}>
                <Button 
                    fullWidth 
                    startIcon={<ArrowBackIcon />} 
                    onClick={() => history.push(LINKS.Shopping)}
                    disabled={loading || (changedCart !== null && !_.isEqual(cart, changedCart))}
                >Continue Shopping</Button>
            </Grid>
            <Grid className={classes.gridItem} justify="center" item xs={12} sm={4}>
                <Button 
                    fullWidth 
                    startIcon={<UpdateIcon />} 
                    onClick={orderUpdate}
                    disabled={loading || (changedCart === null || _.isEqual(cart, changedCart))}
                >Update Order</Button>
            </Grid>
            <Grid className={classes.gridItem} justify="center" item xs={12} sm={4}>
                <Button 
                    fullWidth 
                    endIcon={<ArrowForwardIcon />} 
                    onClick={finalizeOrder}
                    disabled={loading || changedCart === null || !_.isEqual(cart, changedCart)}
                >Request Quote</Button>
            </Grid>
        </Grid>
    )

    return (
        <Box id='page'>
            <Box className={classes.header}>
                <Typography variant="h3" component="h1">Cart</Typography>
            </Box>
            { options}
            <CartTable className={classes.padTop} cart={changedCart} onUpdate={(d) => setChangedCart(d)} />
            { options}
        </Box>
    );
}
