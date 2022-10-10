import React, { useState, useEffect } from 'react';
import { ordersQuery } from 'graphql/query';
import { useQuery } from '@apollo/client';
import { ORDER_FILTERS, PubSub } from 'utils';
import {
    AdminBreadcrumbs,
    OrderCard,
    OrderDialog,
    PageContainer,
    PageTitle,
    Selector,
    SnackSeverity,
} from 'components';
import { Box, useTheme } from '@mui/material';

makeStyles((theme) => ({
    header: {
        textAlign: 'center',
    },
    cardFlex: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gridGap: '20px',
    },
    padBottom: {
        marginBottom: spacing(2),
    },
}));

export const AdminOrderPage = ({ userRoles }) => {
    const { palette, spacing } = useTheme();

    const [filter, setFilter] = useState(ORDER_FILTERS[0].value);
    // Selected order data. Used for popup
    const [currOrder, setCurrOrder] = useState(null);
    const [orders, setOrders] = useState(null);
    const { error, data, refetch } = useQuery(ordersQuery, { variables: { input: { status: filter !== 'All' ? filter : undefined } }, pollInterval: 5000 });
    if (error) { 
        PubSub.get().publishSnack({ message: error.message, severity: SnackSeverity.Error, data: error });
    }
    useEffect(() => {
        setOrders(data?.orders);
    }, [data])

    useEffect(() => {
        refetch();
    }, [filter, refetch])

    return (
        <PageContainer>
            {currOrder ? (<OrderDialog 
                userRoles={userRoles}
                order={currOrder}
                open={currOrder !== null}
                onClose={() => setCurrOrder(null)} />) : null}
            <AdminBreadcrumbs className={classes.padBottom} textColor={palette.secondary.dark} />
            <PageTitle>Manage Orders</PageTitle>
            <Selector
                fullWidth
                options={ORDER_FILTERS}
                selected={filter}
                handleChange={(e) => setFilter(e.target.value)}
                inputAriaLabel='order-type-selector-label'
                label="Sort By" />
            <h3>Count: {orders?.length ?? 0}</h3>
            <Box className={classes.cardFlex}>
                {orders?.map((o) => <OrderCard key={o.id} order={o} onEdit={() => setCurrOrder(o)} />)}
            </Box>
        </PageContainer>
    );
}