import { useQuery } from "@apollo/client";
import { Box } from "@mui/material";
import { ordersQuery } from "api/query";
import { AdminTabOption, AdminTabs, OrderCard, OrderDialog, Selector, SnackSeverity } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useEffect, useState } from "react";
import { ORDER_FILTERS, PubSub } from "utils";

export const AdminOrderPage = () => {
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
        <>
            {currOrder ? (<OrderDialog
                order={currOrder}
                open={currOrder !== null}
                onClose={() => setCurrOrder(null)} />) : null}
            <TopBar
                display="page"
                title="Orders"
                below={<AdminTabs defaultTab={AdminTabOption.Orders} />}
            />
            <Box p={2}>
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
            </Box>
        </>
    );
};
