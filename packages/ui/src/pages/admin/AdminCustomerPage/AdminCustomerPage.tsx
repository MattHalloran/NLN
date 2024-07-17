import { useQuery } from "@apollo/client";
import { Button, useTheme } from "@mui/material";
import { customers, customers_customers } from "api/generated/customers";
import { customersQuery } from "api/query";
import { AdminTabOption, AdminTabs, CardGrid, CustomerCard, SearchBar, SnackSeverity } from "components";
import { CustomerDialog } from "components/dialogs/CustomerDialog/CustomerDialog";
import { NewCustomerDialog } from "components/dialogs/NewCustomerDialog/NewCustomerDialog";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useWindowSize } from "hooks/useWindowSize";
import { useEffect, useMemo, useState } from "react";
import { PubSub } from "utils";

const helpText = "This page allows you to contact you customers, as well as manage their account information. This includes approving and deleting customers.";

export const AdminCustomerPage = () => {
    const { breakpoints } = useTheme();
    const isMobile = useWindowSize(({ width }) => width <= breakpoints.values.sm);

    const [customers, setCustomers] = useState<customers_customers[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<customers_customers | null>(null);
    const [newCustomerOpen, setNewCustomerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const { error, data } = useQuery<customers>(customersQuery, { pollInterval: 30000 });
    if (error) {
        PubSub.get().publishSnack({ message: error.message, severity: SnackSeverity.Error, data: error });
    }
    useEffect(() => {
        setCustomers(data?.customers ?? []);
    }, [data]);

    const filteredCustomers = useMemo(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase().trim();
        return customers.filter(customer => {
            const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
            const emails = customer.emails.map(email => email.emailAddress.toLowerCase());
            const businessName = customer.business?.name.toLowerCase() ?? "";
            const roles = customer.roles.map(role => role.role.title.toLowerCase());

            return (
                fullName.includes(lowercasedSearchTerm) ||
                emails.some(email => email.includes(lowercasedSearchTerm)) ||
                businessName.includes(lowercasedSearchTerm) ||
                roles.some(role => role.includes(lowercasedSearchTerm))
            );
        });
    }, [customers, searchTerm]);

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
            <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                sx={{ width: "fit-content", margin: "auto", display: "block", marginTop: 2, marginBottom: 2 }}
            />
            <Button
                color="secondary"
                onClick={() => setNewCustomerOpen(true)}
                sx={{ display: "block", margin: "auto", marginBottom: 2 }}
                variant="contained"
            >Create Customer</Button>
            <CardGrid minWidth={300}>
                {filteredCustomers.map((c, index) =>
                    <CustomerCard
                        key={index}
                        customer={c}
                        isMobile={isMobile}
                        onEdit={setSelectedCustomer}
                    />)}
            </CardGrid>
        </>
    );
};
