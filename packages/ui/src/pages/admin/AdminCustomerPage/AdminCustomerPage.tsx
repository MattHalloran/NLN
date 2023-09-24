import { useQuery } from "@apollo/client";
import { Box, Button } from "@mui/material";
import { customers, customers_customers } from "api/generated/customers";
import { customersQuery } from "api/query";
import { AdminTabOption, AdminTabs, CustomerCard, SnackSeverity } from "components";
import { CustomerDialog } from "components/dialogs/CustomerDialog/CustomerDialog";
import { NewCustomerDialog } from "components/dialogs/NewCustomerDialog/NewCustomerDialog";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useEffect, useState } from "react";
import { PubSub } from "utils";

const helpText = "This page allows you to contact you customers, as well as manage their account information. This includes approving and deleting customers.";

export const AdminCustomerPage = () => {
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
        <>
            <TopBar
                display="page"
                help={helpText}
                title="Customers"
                below={<AdminTabs defaultTab={AdminTabOption.Customers} />}
            />
            <CustomerDialog
                customer={selectedCustomer}
                open={selectedCustomer !== null}
                onClose={() => setSelectedCustomer(null)} />
            <NewCustomerDialog
                open={newCustomerOpen}
                onClose={() => setNewCustomerOpen(false)} />
            <Button
                color="secondary"
                onClick={() => setNewCustomerOpen(true)}
                sx={{ display: "block", margin: "auto", marginTop: 2 }}
                variant="contained"
            >Create Customer</Button>
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
        </>
    );
};
