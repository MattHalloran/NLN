import React, { useEffect, useState } from 'react';
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

makeStyles((theme) => ({
    header: {
        textAlign: 'center',
    },
    cardFlex: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, .5fr))',
        gridGap: '20px',
    },
}));

export const AdminCustomerPage = () => {
    const { palette } = useTheme();

    const [customers, setCustomers] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [newCustomerOpen, setNewCustomerOpen] = useState(false);
    const { error, data } = useQuery(customersQuery, { pollInterval: 5000 });
    if (error) { 
        PubSub.get().publishSnack({ message: error.message, severity: SnackSeverity.Error, data: error });
    }
    useEffect(() => {
        setCustomers(data?.customers);
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
            <Box className={classes.header}>
                <Typography variant="h3" component="h1">Manage Customers</Typography>
                <Button color="secondary" onClick={() => setNewCustomerOpen(true)}>Create Customer</Button>
            </Box>
            <Box className={classes.cardFlex}>
                {customers?.map((c, index) =>
                <CustomerCard 
                    key={index}
                    onEdit={setSelectedCustomer}
                    customer={c}
                />)}
            </Box>
        </PageContainer>
    );
}