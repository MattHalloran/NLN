import { useQuery } from "@apollo/client";
import { Box, Button, useTheme } from "@mui/material";
import {
    AdminBreadcrumbs,
    CustomerCard,
    PageContainer,
    PageTitle,
    SnackSeverity,
} from "components";
import { CustomerDialog } from "components/dialogs/CustomerDialog/CustomerDialog";
import { NewCustomerDialog } from "components/dialogs/NewCustomerDialog/NewCustomerDialog";
import { customers, customers_customers } from "graphql/generated/customers";
import { customersQuery } from "graphql/query";
import { useEffect, useState } from "react";
import { PubSub } from "utils";

const helpText = "This page allows you to contact you customers, as well as manage their account information. This includes approving and deleting customers.";

export const AdminCustomerPage = () => {
    const { palette } = useTheme();

    const [customers, setCustomers] = useState<customers_customers[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<customers_customers | null>(null);
    const [newCustomerOpen, setNewCustomerOpen] = useState(false);
    const { error, data } = useQuery<customers>(customersQuery, { pollInterval: 5000 });
    if (error) {
        PubSub.get().publishSnack({ message: error.message, severity: SnackSeverity.Error, data: error });
    }
    useEffect(() => {
        setCustomers(data?.customers ?? []);
    }, [data]);

    return (
        <PageContainer>
            <CustomerDialog
                customer={selectedCustomer}
                open={selectedCustomer !== null}
                onClose={() => setSelectedCustomer(null)} />
            <NewCustomerDialog
                open={newCustomerOpen}
                onClose={() => setNewCustomerOpen(false)} />
            <AdminBreadcrumbs textColor={palette.secondary.dark} />
            <PageTitle title="Manage Customers" helpText={helpText} />
            <Button color="secondary" onClick={() => setNewCustomerOpen(true)} sx={{ display: "block", margin: "auto" }}>Create Customer</Button>
            <Box sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(225px, .5fr))",
                gridGap: 0,
            }}>
                {customers.map((c, index) =>
                    <CustomerCard
                        key={index}
                        onEdit={setSelectedCustomer}
                        customer={c}
                    />)}
            </Box>
        </PageContainer>
    );
};
