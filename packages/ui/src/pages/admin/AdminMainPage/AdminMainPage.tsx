import { APP_LINKS } from "@local/shared";
import { Box, Button as _Button, Card, CardContent, Grid, Typography, useTheme, Avatar, Chip, CircularProgress } from "@mui/material";
import {
    ShoppingCart as _OrdersIcon,
    People as _CustomersIcon,
    Inventory as _InventoryIcon,
    Photo as HeroIcon,
    PhotoLibrary as GalleryIcon,
    ContactMail as ContactIcon,
    TrendingUp as _TrendingUp,
    Assessment as _Assessment,
    BusinessCenter as BackOfficeIcon,
    Storage as StorageIcon,
    ListAlt as LogsIcon,
    Mail as NewsletterIcon,
} from "@mui/icons-material";
import { useDashboardStats } from "api/rest/hooks";
import { CardGrid as _CardGrid, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLocation } from "route";
import { designTokens as _designTokens } from "utils";
import { useMemo } from "react";

interface AdminCardData {
    title: string;
    description: string;
    link: string;
    icon: React.ComponentType;
    color: string;
    stats?: string;
    badge?: string;
    isExternal?: boolean;
}

const getCardData = (_stats: any): AdminCardData[] => [
    // {
    //     title: "Orders",
    //     description: "Approve, create, and edit customer's orders",
    //     link: APP_LINKS.AdminOrders,
    //     icon: OrdersIcon,
    //     color: "#546e7a",
    //     stats: `${stats?.pendingOrders || 0} pending`,
    //     badge: stats?.pendingOrders > 0 ? "Active" : undefined,
    // },
    // {
    //     title: "Customers",
    //     description: "Approve new customers, edit customer information",
    //     link: APP_LINKS.AdminCustomers,
    //     icon: CustomersIcon,
    //     color: "#546e7a",
    //     stats: `${stats?.totalCustomers || 0} total`,
    // },
    // {
    //     title: "Inventory",
    //     description: "Add, remove, and update inventory",
    //     link: APP_LINKS.AdminInventory,
    //     icon: InventoryIcon,
    //     color: "#546e7a",
    //     stats: `${stats?.totalProducts || 0} items`,
    // },
    {
        title: "Back Office",
        description: "View and manage orders in Horizon back office system",
        link: "https://horizon.sbiteam.com/portal/webclient/#/home",
        icon: BackOfficeIcon,
        color: "#546e7a",
        stats: "View orders",
        isExternal: true,
    },
    {
        title: "Homepage",
        description: "Manage hero banner, seasonal content, and other homepage elements",
        link: APP_LINKS.AdminHomepage,
        icon: HeroIcon,
        color: "#546e7a",
        stats: "Manage content",
    },
    {
        title: "Gallery",
        description: "Add, remove, and rearrange gallery images",
        link: APP_LINKS.AdminGallery,
        icon: GalleryIcon,
        color: "#546e7a",
        stats: "Manage images",
    },
    {
        title: "Contact Info",
        description: "Edit business hours and other contact information",
        link: APP_LINKS.AdminContactInfo,
        icon: ContactIcon,
        color: "#546e7a",
        stats: "Update info",
    },
    {
        title: "Newsletter Subscribers",
        description: "View and manage newsletter subscription list for lead generation",
        link: APP_LINKS.AdminNewsletterSubscribers,
        icon: NewsletterIcon,
        color: "#546e7a",
        stats: "View subscribers",
    },
    {
        title: "Storage Management",
        description: "Monitor image storage, view cleanup status, and manage retention",
        link: APP_LINKS.AdminStorage,
        icon: StorageIcon,
        color: "#546e7a",
        stats: "Monitor storage",
    },
    {
        title: "System Logs",
        description: "View server logs, filter by level, search errors, and export logs",
        link: APP_LINKS.AdminLogs,
        icon: LogsIcon,
        color: "#546e7a",
        stats: "View logs",
    },
];

const AdminPageCard = ({
    data,
    onClick,
}: {
    data: AdminCardData;
    onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}) => {
    const { palette } = useTheme();
    const IconComponent = data.icon;

    return (
        <Card
            onClick={onClick}
            sx={{
                cursor: "pointer",
                transition: "box-shadow 0.2s ease-in-out",
                height: "100%",
                background: palette.background.paper,
                "&:hover": {
                    boxShadow: 3,
                },
                borderRadius: 1,
                boxShadow: 1,
                border: `1px solid ${palette.divider}`,
            }}
        >
            <CardContent sx={{ p: 2 }}>
                <Box display="flex" flexDirection="column" height="100%">
                    {/* Header with icon and badge */}
                    <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                        <Avatar
                            sx={{
                                bgcolor: data.color,
                                width: 48,
                                height: 48,
                                "& > svg": {
                                    fontSize: 24,
                                    color: "white",
                                },
                            }}
                        >
                            <IconComponent />
                        </Avatar>
                        {data.badge && (
                            <Chip
                                label={data.badge}
                                size="small"
                                sx={{
                                    bgcolor: "#2e7d32",
                                    color: "white",
                                    fontSize: "0.75rem",
                                }}
                            />
                        )}
                    </Box>

                    {/* Title and Description */}
                    <Box flex={1}>
                        <Typography 
                            variant="h6" 
                            component="h3" 
                            sx={{ 
                                fontWeight: 600,
                                mb: 1,
                                color: palette.text.primary,
                            }}
                        >
                            {data.title}
                        </Typography>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                color: palette.text.secondary,
                                lineHeight: 1.5,
                                mb: 2,
                            }}
                        >
                            {data.description}
                        </Typography>
                    </Box>

                    {/* Stats */}
                    {data.stats && (
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: palette.text.secondary,
                                    fontWeight: 500,
                                }}
                            >
                                {data.stats}
                            </Typography>
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: palette.primary.main,
                                    fontWeight: 500,
                                }}
                            >
                                Manage →
                            </Typography>
                        </Box>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};


export const AdminMainPage = () => {
    const [, setLocation] = useLocation();
    const { palette } = useTheme();

    const { data, loading, error: _error } = useDashboardStats();

    const dashboardStats = useMemo(() => {
        if (!data) return {
            totalProducts: 0,
            totalCustomers: 0,
            pendingOrders: 0,
        };

        return {
            totalProducts: data.totalSkus || 0,
            totalCustomers: data.approvedCustomers || 0,
            pendingOrders: data.pendingOrders || 0,
        };
    }, [data]);

    const cardData = getCardData(dashboardStats);
    
    if (loading) {
        return (
            <PageContainer>
                <TopBar display="page" title="Admin Dashboard" />
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                </Box>
            </PageContainer>
        );
    }

    return (
        <PageContainer sx={{ paddingLeft: "0!important", paddingRight: "0!important" }}>
            <TopBar
                display="page"
                title="Admin Dashboard"
            />
            
            {/* Dashboard Summary Cards */}
            {/* <Box px={3} py={2}>
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
                                            {dashboardStats.totalProducts.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">Total Products</Typography>
                                    </Box>
                                    <TrendingUp sx={{ fontSize: 32, color: palette.primary.main, opacity: 0.7 }} />
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
                                            {dashboardStats.totalCustomers.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">Active Customers</Typography>
                                    </Box>
                                    <Assessment sx={{ fontSize: 32, color: palette.primary.main, opacity: 0.7 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid> */}
            <Box px={3} py={2}>
                {/* Main Title */}
                <Typography 
                    variant="h5" 
                    component="h2" 
                    sx={{ 
                        mb: 2,
                        fontWeight: 600,
                        color: palette.text.primary,
                    }}
                >
                    Management Modules
                </Typography>
                <Typography 
                    variant="body1" 
                    sx={{ 
                        mb: 4,
                        color: palette.text.secondary,
                    }}
                >
                    Select a module below to manage different aspects of your nursery business.
                </Typography>
            </Box>

            {/* Admin Cards */}
            <Box px={3} pb={3}>
                <Grid container spacing={3}>
                    {cardData.map((card, index) => (
                        <Grid item xs={12} sm={6} lg={4} key={index}>
                            <AdminPageCard
                                data={card}
                                onClick={() => {
                                    if (card.isExternal) {
                                        window.open(card.link, "_blank", "noopener,noreferrer");
                                    } else {
                                        setLocation(card.link);
                                    }
                                }}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </PageContainer>
    );
};
