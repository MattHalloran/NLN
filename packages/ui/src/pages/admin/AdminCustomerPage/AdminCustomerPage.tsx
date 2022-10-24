import { useEffect, useState } from 'react';
import { customersQuery } from 'graphql/query';
import { useQuery } from '@apollo/client';
import { PubSub } from 'utils';
import {
    AdminBreadcrumbs,
    CustomerCard,
    PageContainer,
    SnackSeverity
} from 'components';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { CustomerDialog } from 'components/dialogs/CustomerDialog/CustomerDialog';
import { NewCustomerDialog } from 'components/dialogs/NewCustomerDialog/NewCustomerDialog';
import { customers, customers_customers } from 'graphql/generated/customers';

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
    }, [data])

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
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" component="h1">Manage Customers</Typography>
                <Button color="secondary" onClick={() => setNewCustomerOpen(true)}>Create Customer</Button>
            </Box>
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, .5fr))',
                gridGap: '20px',
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
}