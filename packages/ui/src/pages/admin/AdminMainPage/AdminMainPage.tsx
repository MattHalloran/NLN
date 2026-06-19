import {
    Box,
    Button as _Button,
    Card,
    CardContent,
    Grid,
    Typography,
    useTheme,
    Avatar,
    Chip,
    CircularProgress,
} from "@mui/material";
import { useDashboardStats } from "api/rest/hooks";
import { CardGrid as _CardGrid, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLocation } from "route";
import { designTokens as _designTokens } from "utils";
import { ADMIN_DASHBOARD_CARDS, type AdminDashboardCardData } from "../adminRoutes";

const AdminPageCard = ({
    data,
    onClick,
}: {
    data: AdminDashboardCardData;
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
                    <Box
                        display="flex"
                        alignItems="flex-start"
                        justifyContent="space-between"
                        mb={2}
                    >
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

    const { loading, error: _error } = useDashboardStats();
    const cardData = ADMIN_DASHBOARD_CARDS;

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
            <TopBar display="page" title="Admin Dashboard" />

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
