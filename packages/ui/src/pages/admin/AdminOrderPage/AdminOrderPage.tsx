import { useQuery } from "@apollo/client";
import { Box, useTheme } from "@mui/material";
import {
    AdminBreadcrumbs,
    OrderCard,
    OrderDialog,
    PageContainer,
    PageTitle,
    Selector,
    SnackSeverity,
} from "components";
import { ordersQuery } from "graphql/query";
import { useEffect, useState } from "react";
import { ORDER_FILTERS, PubSub } from "utils";

export const AdminOrderPage = ({ userRoles }) => {
    const { palette, spacing } = useTheme();

    const [filter, setFilter] = useState(ORDER_FILTERS[0]);
    // Selected order data. Used for popup
    const [currOrder, setCurrOrder] = useState(null);
    const [orders, setOrders] = useState<any[]>([]);
    const { error, data, refetch } = useQuery(ordersQuery, { variables: { input: { status: filter.value !== "All" ? filter.value : undefined } }, pollInterval: 5000 });
    if (error) {
        PubSub.get().publishSnack({ message: error.message, severity: SnackSeverity.Error, data: error });
    }
    useEffect(() => {
        setOrders(data?.orders ?? []);
    }, [data]);

    useEffect(() => {
        refetch();
    }, [filter, refetch]);

    return (
        <PageContainer>
            {currOrder ? (<OrderDialog
                userRoles={userRoles}
                order={currOrder}
                open={currOrder !== null}
                onClose={() => setCurrOrder(null)} />) : null}
            <AdminBreadcrumbs textColor={palette.secondary.dark} sx={{ marginBottom: spacing(2) }} />
            <PageTitle title="Manage Orders" />
            <Selector
                color={undefined}
                fullWidth
                options={ORDER_FILTERS}
                selected={filter}
                getOptionLabel={(option) => option.label}
                handleChange={(c) => setFilter(c)}
                inputAriaLabel='order-type-selector-label'
                label="Sort By" />
            <h3>Count: {orders.length}</h3>
            <Box sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(225px, 1fr))",
                gridGap: "20px",
            }}>
                {orders?.map((o) => <OrderCard key={o.id} order={o} onEdit={() => setCurrOrder(o)} />)}
            </Box>
        </PageContainer>
    );
};
