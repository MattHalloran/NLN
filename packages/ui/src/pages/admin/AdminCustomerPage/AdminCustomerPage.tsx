import { useQuery } from "@apollo/client";
import { Button, useTheme, Box, Grid, Card, CardContent, Typography, Paper, IconButton, Chip } from "@mui/material";
import { PersonAdd, Group, Business, Verified, Refresh, Search } from "@mui/icons-material";
import { customers, customers_customers } from "api/generated/customers";
import { customersQuery } from "api/query";
import { AdminTabOption, AdminTabs, CardGrid, CustomerCard, SearchBar, SnackSeverity } from "components";
import { CustomerDialog } from "components/dialogs/CustomerDialog/CustomerDialog";
import { NewCustomerDialog } from "components/dialogs/NewCustomerDialog/NewCustomerDialog";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useWindowSize } from "hooks/useWindowSize";
import { useEffect, useMemo, useState } from "react";
import { PubSub, designTokens } from "utils";

const helpText = "This page allows you to contact you customers, as well as manage their account information. This includes approving and deleting customers.";

export const AdminCustomerPage = () => {
    const { breakpoints, palette } = useTheme();
    const isMobile = useWindowSize(({ width }) => width <= breakpoints.values.sm);

    const [customers, setCustomers] = useState<customers_customers[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<customers_customers | null>(null);
    const [newCustomerOpen, setNewCustomerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const { error, data, refetch } = useQuery<customers>(customersQuery, { pollInterval: 30000 });
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

    // Calculate customer statistics
    const totalCustomers = customers.length;
    const businessCustomers = customers.filter(c => c.business).length;
    const individualCustomers = totalCustomers - businessCustomers;
    const approvedCustomers = customers.filter(c => c.roles.some(r => r.role.title !== "UNVERIFIED")).length;
    const pendingCustomers = customers.filter(c => c.roles.some(r => r.role.title === "UNVERIFIED")).length;

    return (
        <>
            <TopBar
                display="page"
                help={helpText}
                title="Customer Management"
                below={<AdminTabs defaultTab={AdminTabOption.Customers} />}
            />
            <CustomerDialog
                customer={selectedCustomer!}
                open={selectedCustomer !== null}
                onClose={() => setSelectedCustomer(null)} />
            <NewCustomerDialog
                open={newCustomerOpen}
                onClose={() => setNewCustomerOpen(false)} />
            
            {/* Summary Statistics Cards */}
            <Box px={3} py={2}>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6}>
                        <Card sx={{ 
                            bgcolor: palette.background.paper,
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 1,
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h4" fontWeight="600" color="text.primary">
                                            {totalCustomers.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">Total Customers</Typography>
                                    </Box>
                                    <Group sx={{ fontSize: 32, color: palette.primary.main, opacity: 0.7 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Card sx={{ 
                            bgcolor: palette.background.paper,
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 1,
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h4" fontWeight="600" color="text.primary">
                                            {approvedCustomers.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">Active Customers</Typography>
                                    </Box>
                                    <Verified sx={{ fontSize: 32, color: palette.primary.main, opacity: 0.7 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Secondary Statistics */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={4}>
                        <Card sx={{ 
                            bgcolor: palette.background.paper,
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 1,
                        }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h5" fontWeight="600" color="text.primary">
                                            {pendingCustomers.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">Pending Approval</Typography>
                                    </Box>
                                    {pendingCustomers > 0 && (
                                        <Chip 
                                            label="PENDING" 
                                            size="small" 
                                            sx={{ 
                                                bgcolor: "#ed6c02", 
                                                color: "white",
                                                fontSize: "0.7rem",
                                                height: 20,
                                            }} 
                                        />
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Card sx={{ 
                            bgcolor: palette.background.paper,
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 1,
                        }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h5" fontWeight="600" color="text.primary">
                                            {businessCustomers.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">Business Customers</Typography>
                                    </Box>
                                    <Business sx={{ fontSize: 28, color: palette.text.secondary, opacity: 0.7 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Card sx={{ 
                            bgcolor: palette.background.paper,
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 1,
                        }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h5" fontWeight="600" color="text.primary">
                                            {individualCustomers.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">Individual Customers</Typography>
                                    </Box>
                                    <Group sx={{ fontSize: 28, color: palette.text.secondary, opacity: 0.7 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Search and Actions Section */}
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 3, 
                        mb: 3, 
                        borderRadius: 1,
                        bgcolor: palette.background.paper,
                        border: `1px solid ${palette.divider}`,
                    }}
                >
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                        <Box display="flex" alignItems="center">
                            <Search sx={{ mr: 1, color: palette.text.secondary }} />
                            <Typography variant="h6" fontWeight="600" color="text.primary">
                                Search & Actions
                            </Typography>
                        </Box>
                        <IconButton 
                            onClick={() => refetch()} 
                            size="small"
                            sx={{ 
                                color: palette.text.secondary,
                                "&:hover": { 
                                    color: palette.primary.main,
                                    bgcolor: palette.action.hover, 
                                },
                            }}
                        >
                            <Refresh />
                        </IconButton>
                    </Box>
                    <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <SearchBar
                                value={searchTerm}
                                onChange={setSearchTerm}
                                placeholder="Search by name, email, business, or role..."
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box display="flex" justifyContent={{ xs: "center", md: "flex-end" }}>
                                <Button
                                    variant="contained"
                                    startIcon={<PersonAdd />}
                                    onClick={() => setNewCustomerOpen(true)}
                                    sx={{
                                        borderRadius: 1,
                                        px: 3,
                                        py: 1.5,
                                        fontWeight: 600,
                                        bgcolor: palette.primary.main,
                                        "&:hover": {
                                            bgcolor: palette.primary.dark,
                                        },
                                    }}
                                >
                                    Add New Customer
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>

            {/* Customer Cards Grid */}
            <Box px={3} pb={3}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                    <Typography variant="h6" fontWeight="600">
                        {searchTerm ? `Search Results (${filteredCustomers.length})` : `All Customers (${totalCustomers})`}
                    </Typography>
                    {searchTerm && (
                        <Typography variant="body2" color={palette.background.textSecondary}>
                            Showing results for: "{searchTerm}"
                        </Typography>
                    )}
                </Box>
                <CardGrid minWidth={300}>
                    {filteredCustomers.map((c, index) =>
                        <CustomerCard
                            key={index}
                            customer={c}
                            isMobile={isMobile}
                            onEdit={(customer) => setSelectedCustomer(customer)}
                        />)}
                </CardGrid>
                {filteredCustomers.length === 0 && (
                    <Box 
                        display="flex" 
                        flexDirection="column" 
                        alignItems="center" 
                        py={8}
                        sx={{ opacity: 0.6 }}
                    >
                        <Group sx={{ fontSize: 80, mb: 2, color: palette.background.textSecondary }} />
                        <Typography variant="h6" color={palette.background.textSecondary} mb={1}>
                            {searchTerm ? "No customers found" : "No customers yet"}
                        </Typography>
                        <Typography variant="body2" color={palette.background.textSecondary}>
                            {searchTerm ? "Try adjusting your search terms" : "Add your first customer to get started"}
                        </Typography>
                    </Box>
                )}
            </Box>
        </>
    );
};
