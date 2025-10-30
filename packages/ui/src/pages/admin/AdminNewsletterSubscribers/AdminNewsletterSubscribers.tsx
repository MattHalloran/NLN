import { APP_LINKS } from "@local/shared";
import {
    Box,
    Button,
    Card,
    Typography,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    TablePagination,
    CircularProgress,
    Tooltip,
    Grid,
} from "@mui/material";
import {
    Download as DownloadIcon,
    Trash2 as DeleteIcon,
    UserX as UnsubscribeIcon,
    Mail,
    RefreshCw as RefreshIcon,
    TrendingUp,
} from "lucide-react";
import { BackButton, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useState, useEffect, useCallback } from "react";
import { restApi } from "api/rest/client";
import type { NewsletterSubscription, NewsletterStatsResponse } from "api/rest/client";
import { PubSub } from "utils/pubsub";
import { SnackSeverity } from "components/dialogs/Snack/Snack";

export const AdminNewsletterSubscribers = () => {
    const [subscribers, setSubscribers] = useState<NewsletterSubscription[]>([]);
    const [stats, setStats] = useState<NewsletterStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalCount, setTotalCount] = useState(0);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchInput, setSearchInput] = useState("");

    const fetchSubscribers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params: any = {
                page: page + 1, // API uses 1-based pagination
                limit: rowsPerPage,
            };

            if (statusFilter !== "all") {
                params.status = statusFilter;
            }

            if (searchQuery) {
                params.search = searchQuery;
            }

            const response = await restApi.getNewsletterSubscribers(params);
            setSubscribers(response.subscribers);
            setTotalCount(response.pagination.total);
        } catch (err: any) {
            console.error("Failed to fetch newsletter subscribers:", err);
            setError(err.message || "Failed to load subscribers");
            PubSub.get().publish("snack", {
                message: "Failed to load subscribers",
                severity: SnackSeverity.Error,
                autoHideDuration: 5000,
            });
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, statusFilter, searchQuery]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await restApi.getNewsletterStats();
            setStats(response);
        } catch (err: any) {
            console.error("Failed to fetch newsletter stats:", err);
        }
    }, []);

    useEffect(() => {
        fetchSubscribers();
    }, [fetchSubscribers]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleExport = async () => {
        try {
            const blob = await restApi.exportNewsletterSubscribers(
                statusFilter !== "all" ? statusFilter : undefined,
            );
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `newsletter-subscribers-${new Date().toISOString().split("T")[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            PubSub.get().publish("snack", {
                message: "Subscribers exported successfully",
                severity: SnackSeverity.Success,
                autoHideDuration: 3000,
            });
        } catch (err: any) {
            console.error("Export failed:", err);
            PubSub.get().publish("snack", {
                message: "Failed to export subscribers",
                severity: SnackSeverity.Error,
                autoHideDuration: 5000,
            });
        }
    };

    const handleDelete = async (id: number, action: "unsubscribe" | "delete") => {
        if (
            !window.confirm(
                `Are you sure you want to ${action} this subscriber? This action cannot be undone.`,
            )
        ) {
            return;
        }

        try {
            await restApi.deleteNewsletterSubscriber(id, action);
            PubSub.get().publish("snack", {
                message: `Subscriber ${action === "delete" ? "deleted" : "unsubscribed"} successfully`,
                severity: SnackSeverity.Success,
                autoHideDuration: 3000,
            });
            fetchSubscribers();
            fetchStats();
        } catch (err: any) {
            console.error(`Failed to ${action} subscriber:`, err);
            PubSub.get().publish("snack", {
                message: `Failed to ${action} subscriber`,
                severity: SnackSeverity.Error,
                autoHideDuration: 5000,
            });
        }
    };

    const handleSearch = () => {
        setSearchQuery(searchInput);
        setPage(0); // Reset to first page on new search
    };

    const handleSearchKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "success";
            case "unsubscribed":
                return "default";
            default:
                return "default";
        }
    };

    return (
        <>
            <TopBar display="page" title="Newsletter Subscribers" />
            <PageContainer maxWidth="xl">
                <BackButton to={APP_LINKS.AdminHomepage} />

                <Box sx={{ mb: 4 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                        <Mail size={32} />
                        <Typography variant="h4" component="h1" fontWeight={600}>
                            Newsletter Subscribers
                        </Typography>
                    </Box>
                    <Typography variant="body1" color="text.secondary">
                        View and manage newsletter subscription list for lead generation
                    </Typography>
                </Box>

                {/* Stats Cards */}
                {stats && (
                    <Grid container spacing={2} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card sx={{ p: 3 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Total Subscribers
                                </Typography>
                                <Typography variant="h4" fontWeight={600}>
                                    {stats.byStatus.active || 0}
                                </Typography>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card sx={{ p: 3 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Last 7 Days
                                </Typography>
                                <Typography variant="h4" fontWeight={600} color="success.main">
                                    +{stats.recentActivity.last7Days}
                                </Typography>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card sx={{ p: 3 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Last 30 Days
                                </Typography>
                                <Typography variant="h4" fontWeight={600} color="primary.main">
                                    +{stats.recentActivity.last30Days}
                                </Typography>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card sx={{ p: 3 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Unsubscribed
                                </Typography>
                                <Typography variant="h4" fontWeight={600} color="text.secondary">
                                    {stats.byStatus.unsubscribed || 0}
                                </Typography>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {/* Controls */}
                <Card sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                        <TextField
                            size="small"
                            placeholder="Search by email..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyPress={handleSearchKeyPress}
                            sx={{ flexGrow: 1, minWidth: 200 }}
                        />
                        <Button
                            variant="outlined"
                            onClick={handleSearch}
                            size="small"
                        >
                            Search
                        </Button>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <MenuItem value="all">All</MenuItem>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="unsubscribed">Unsubscribed</MenuItem>
                            </Select>
                        </FormControl>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon size={16} />}
                            onClick={() => {
                                fetchSubscribers();
                                fetchStats();
                            }}
                            size="small"
                        >
                            Refresh
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<DownloadIcon size={16} />}
                            onClick={handleExport}
                            size="small"
                        >
                            Export CSV
                        </Button>
                    </Box>
                </Card>

                {error && error.trim() !== "" ? (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                ) : null}

                {/* Subscribers Table */}
                <Card>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Variant ID</TableCell>
                                    <TableCell>Source</TableCell>
                                    <TableCell>Subscribed At</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : subscribers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                            <Typography color="text.secondary">
                                                No subscribers found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    subscribers.map((subscriber) => (
                                        <TableRow key={subscriber.id}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {subscriber.email}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={subscriber.status}
                                                    size="small"
                                                    color={getStatusColor(subscriber.status)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {subscriber.variant_id || "-"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {subscriber.source}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {new Date(subscriber.created_at).toLocaleDateString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                                                    {subscriber.status === "active" && (
                                                        <Tooltip title="Unsubscribe">
                                                            <IconButton
                                                                size="small"
                                                                color="warning"
                                                                onClick={() =>
                                                                    handleDelete(subscriber.id, "unsubscribe")
                                                                }
                                                            >
                                                                <UnsubscribeIcon size={18} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title="Delete permanently">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDelete(subscriber.id, "delete")}
                                                        >
                                                            <DeleteIcon size={18} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        component="div"
                        count={totalCount}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </Card>

                {/* A/B Test Insights */}
                {stats && stats.byVariant.length > 0 && (
                    <Card sx={{ mt: 3, p: 3 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                            <TrendingUp size={20} />
                            <Typography variant="h6" fontWeight={600}>
                                Signups by Variant
                            </Typography>
                        </Box>
                        <Grid container spacing={2}>
                            {stats.byVariant.map((variant, index) => (
                                <Grid item xs={12} sm={6} md={4} key={index}>
                                    <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {variant.variantId || "Unknown"}
                                        </Typography>
                                        <Typography variant="h5" fontWeight={600}>
                                            {variant.count}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    </Card>
                )}
            </PageContainer>
        </>
    );
};
