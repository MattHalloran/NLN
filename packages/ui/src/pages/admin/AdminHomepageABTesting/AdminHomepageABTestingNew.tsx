import React, { useState, useCallback } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    LinearProgress,
    Grid,
    TextField,
    Typography,
    Alert,
    Tooltip,
    Divider,
    Stack,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from "@mui/material";
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    TrendingUp as TrendingUpIcon,
    Timeline as TimelineIcon,
    Visibility as VisibilityIcon,
    TouchApp as TouchAppIcon,
    ExitToApp as ExitToAppIcon,
    Star as StarIcon,
    ToggleOff as ToggleOffIcon,
    ToggleOn as ToggleOnIcon,
    ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import { APP_LINKS } from "@local/shared";
import { BackButton, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLocation } from "route";
import {
    useVariants,
    useCreateVariant,
    useDeleteVariant,
    usePromoteVariant,
    useToggleVariant,
} from "api/rest/hooks";
import { LandingPageVariant } from "api/rest/client";
import { PubSub } from "utils/pubsub";
import { SnackSeverity } from "components/dialogs/Snack/Snack";

/**
 * Calculates conversion rate as a percentage
 */
const calculateConversionRate = (conversions: number, views: number): number => {
    if (views === 0) return 0;
    return (conversions / views) * 100;
};

/**
 * Calculates bounce rate as a percentage
 */
const calculateBounceRate = (bounces: number, views: number): number => {
    if (views === 0) return 0;
    return (bounces / views) * 100;
};

export const AdminHomepageABTestingNew = () => {
    const [, navigate] = useLocation();
    const { data: variants, loading, error, refetch } = useVariants();
    const createVariant = useCreateVariant();
    const deleteVariant = useDeleteVariant();
    const promoteVariant = usePromoteVariant();
    const toggleVariant = useToggleVariant();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [deleteConfirmVariant, setDeleteConfirmVariant] = useState<LandingPageVariant | null>(null);
    const [newVariantName, setNewVariantName] = useState("");
    const [newVariantDescription, setNewVariantDescription] = useState("");
    const [newVariantTraffic, setNewVariantTraffic] = useState(0);
    const [copyFromVariantId, setCopyFromVariantId] = useState("");

    const handleApiSuccess = useCallback((message: string) => {
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Success, autoHideDuration: 3000 });
    }, []);

    const handleApiError = useCallback((error: any, fallbackMessage: string) => {
        const message = error?.message || fallbackMessage;
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Error, autoHideDuration: 5000 });
    }, []);

    const handleCreateVariant = useCallback(async () => {
        if (!newVariantName.trim()) {
            handleApiError(null, "Variant name is required");
            return;
        }

        try {
            await createVariant.mutate({
                name: newVariantName,
                description: newVariantDescription,
                trafficAllocation: newVariantTraffic,
                copyFromVariantId: copyFromVariantId || undefined,
            });
            handleApiSuccess("Variant created successfully!");
            setCreateDialogOpen(false);
            setNewVariantName("");
            setNewVariantDescription("");
            setNewVariantTraffic(0);
            setCopyFromVariantId("");
            await refetch();
        } catch (error: any) {
            handleApiError(error, "Failed to create variant");
        }
    }, [newVariantName, newVariantDescription, newVariantTraffic, copyFromVariantId, createVariant, refetch, handleApiSuccess, handleApiError]);

    const handleDeleteVariant = useCallback(async (variant: LandingPageVariant) => {
        if (variant.isOfficial) {
            handleApiError(null, "Cannot delete the official variant");
            return;
        }

        if (variant.status === "enabled") {
            handleApiError(null, "Cannot delete an enabled variant. Disable it first.");
            return;
        }

        try {
            await deleteVariant.mutate(variant.id);
            handleApiSuccess("Variant deleted successfully!");
            setDeleteConfirmVariant(null);
            await refetch();
        } catch (error: any) {
            handleApiError(error, "Failed to delete variant");
        }
    }, [deleteVariant, refetch, handleApiSuccess, handleApiError]);

    const handlePromoteVariant = useCallback(async (variantId: string) => {
        try {
            await promoteVariant.mutate(variantId);
            handleApiSuccess("Variant promoted to official successfully!");
            await refetch();
        } catch (error: any) {
            handleApiError(error, "Failed to promote variant");
        }
    }, [promoteVariant, refetch, handleApiSuccess, handleApiError]);

    const handleToggleVariant = useCallback(async (variantId: string) => {
        try {
            await toggleVariant.mutate(variantId);
            handleApiSuccess("Variant status toggled successfully!");
            await refetch();
        } catch (error: any) {
            handleApiError(error, "Failed to toggle variant");
        }
    }, [toggleVariant, refetch, handleApiSuccess, handleApiError]);

    const handleEditVariant = useCallback((variantId: string) => {
        // Navigate to the hero banner page with variantId query param
        navigate(`${APP_LINKS.AdminHomepageHeroBanner}?variantId=${variantId}`);
    }, [navigate]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "enabled":
                return "success";
            case "disabled":
                return "default";
            default:
                return "default";
        }
    };

    const officialVariant = variants?.find(v => v.isOfficial);
    const testVariants = variants?.filter(v => !v.isOfficial) || [];
    const totalTraffic = variants?.filter(v => v.status === "enabled").reduce((sum, v) => sum + v.trafficAllocation, 0) || 0;

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0, bgcolor: "background.default" }}>
            <TopBar
                display="page"
                title="Variant Testing"
                help="Create and manage landing page variants to optimize performance"
                startComponent={<BackButton to={APP_LINKS.AdminHomepage} ariaLabel="Back to Homepage Management" />}
            />

            <Box p={3}>
                {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                        Failed to load variants: {error.message}
                    </Alert>
                )}

                {/* Traffic Allocation Warning */}
                {totalTraffic !== 100 && variants && variants.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Traffic Allocation Issue
                        </Typography>
                        <Typography variant="body2">
                            Enabled variants must total 100% traffic. Current total: {totalTraffic}%
                        </Typography>
                    </Alert>
                )}

                {/* Header Section */}
                <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box>
                        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                            Landing Page Variants
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Test different homepage designs and track performance metrics
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                        disabled={createVariant.loading}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            py: 1.5,
                            textTransform: "none",
                            fontWeight: 600,
                        }}
                    >
                        Create New Variant
                    </Button>
                </Box>

                {/* Loading State */}
                {loading && (
                    <Box sx={{ width: "100%", mb: 3 }}>
                        <LinearProgress sx={{ borderRadius: 1 }} />
                    </Box>
                )}

                {/* Empty State */}
                {!loading && (!variants || variants.length === 0) && (
                    <Card
                        elevation={0}
                        sx={{
                            textAlign: "center",
                            py: 10,
                            borderRadius: 3,
                            border: "2px dashed",
                            borderColor: "divider",
                            bgcolor: "background.paper",
                        }}
                    >
                        <CardContent>
                            <TimelineIcon sx={{ fontSize: 80, color: "text.disabled", mb: 2 }} />
                            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                                No Variants Yet
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: "auto" }}>
                                Variants let you test different versions of your landing page and measure
                                which performs better with real traffic.
                            </Typography>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<AddIcon />}
                                onClick={() => setCreateDialogOpen(true)}
                                sx={{
                                    borderRadius: 2,
                                    px: 4,
                                    py: 1.5,
                                    textTransform: "none",
                                    fontWeight: 600,
                                }}
                            >
                                Create Your First Variant
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Official Variant */}
                {!loading && officialVariant && (
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
                            <StarIcon sx={{ color: "warning.main" }} />
                            Official Variant
                        </Typography>
                        <Card
                            elevation={3}
                            sx={{
                                borderRadius: 3,
                                border: 2,
                                borderColor: "warning.main",
                                overflow: "hidden",
                            }}
                        >
                            <Box
                                sx={{
                                    p: 3,
                                    bgcolor: "warning.50",
                                    borderBottom: 1,
                                    borderColor: "divider",
                                }}
                            >
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                                            <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                                {officialVariant.name}
                                            </Typography>
                                            <Chip
                                                label="OFFICIAL"
                                                color="warning"
                                                icon={<StarIcon />}
                                                size="small"
                                                sx={{ fontWeight: 600 }}
                                            />
                                            <Chip
                                                label={`${officialVariant.trafficAllocation}% Traffic`}
                                                color="info"
                                                size="small"
                                            />
                                        </Box>
                                        {officialVariant.description && (
                                            <Typography variant="body2" color="text.secondary">
                                                {officialVariant.description}
                                            </Typography>
                                        )}
                                    </Box>

                                    <Button
                                        variant="outlined"
                                        startIcon={<EditIcon />}
                                        onClick={() => handleEditVariant(officialVariant.id)}
                                        sx={{ borderRadius: 2, textTransform: "none" }}
                                    >
                                        Edit
                                    </Button>
                                </Box>
                            </Box>

                            <CardContent sx={{ p: 3 }}>
                                <Grid container spacing={3}>
                                    {/* Views */}
                                    <Grid item xs={12} md={3}>
                                        <Box>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                                <VisibilityIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    Views
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                                {officialVariant.metrics.views.toLocaleString()}
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    {/* Conversion Rate */}
                                    <Grid item xs={12} md={3}>
                                        <Box>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                                <TouchAppIcon sx={{ fontSize: 20, color: "success.main" }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    Conversion Rate
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" sx={{ fontWeight: 700, color: "success.main" }}>
                                                {calculateConversionRate(officialVariant.metrics.conversions, officialVariant.metrics.views).toFixed(1)}%
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {officialVariant.metrics.conversions} conversions
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    {/* Bounce Rate */}
                                    <Grid item xs={12} md={3}>
                                        <Box>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                                <ExitToAppIcon sx={{ fontSize: 20, color: "error.main" }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    Bounce Rate
                                                </Typography>
                                            </Box>
                                            <Typography variant="h4" sx={{ fontWeight: 700, color: "error.main" }}>
                                                {calculateBounceRate(officialVariant.metrics.bounces, officialVariant.metrics.views).toFixed(1)}%
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {officialVariant.metrics.bounces} bounces
                                            </Typography>
                                        </Box>
                                    </Grid>

                                    {/* Last Modified */}
                                    <Grid item xs={12} md={3}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                Last Modified
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                {officialVariant.lastModified
                                                    ? new Date(officialVariant.lastModified).toLocaleDateString()
                                                    : "Never"
                                                }
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Box>
                )}

                {/* Test Variants */}
                {!loading && testVariants.length > 0 && (
                    <Box>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                            Test Variants
                        </Typography>
                        <Stack spacing={3}>
                            {testVariants.map((variant) => {
                                const convRate = calculateConversionRate(variant.metrics.conversions, variant.metrics.views);
                                const bounceRate = calculateBounceRate(variant.metrics.bounces, variant.metrics.views);
                                const hasData = variant.metrics.views > 0;

                                // Simple comparison to official
                                const officialConvRate = officialVariant
                                    ? calculateConversionRate(officialVariant.metrics.conversions, officialVariant.metrics.views)
                                    : 0;
                                const isPerformingBetter = hasData && convRate > officialConvRate;

                                return (
                                    <Card
                                        key={variant.id}
                                        elevation={2}
                                        sx={{
                                            borderRadius: 3,
                                            overflow: "hidden",
                                            transition: "all 0.2s ease-in-out",
                                            border: isPerformingBetter ? 2 : 0,
                                            borderColor: isPerformingBetter ? "success.main" : "transparent",
                                            "&:hover": {
                                                boxShadow: 6,
                                                transform: "translateY(-2px)",
                                            },
                                        }}
                                    >
                                        {/* Variant Header */}
                                        <Box
                                            sx={{
                                                p: 3,
                                                bgcolor: variant.status === "enabled" ? "primary.50" : "background.paper",
                                                borderBottom: 1,
                                                borderColor: "divider",
                                            }}
                                        >
                                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                                                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                                            {variant.name}
                                                        </Typography>
                                                        <Chip
                                                            label={variant.status.toUpperCase()}
                                                            color={getStatusColor(variant.status) as any}
                                                            size="small"
                                                            sx={{ fontWeight: 600 }}
                                                        />
                                                        <Chip
                                                            label={`${variant.trafficAllocation}% Traffic`}
                                                            color="info"
                                                            size="small"
                                                        />
                                                        {isPerformingBetter && (
                                                            <Chip
                                                                icon={<TrendingUpIcon />}
                                                                label="Performing Better"
                                                                color="success"
                                                                variant="outlined"
                                                                size="small"
                                                                sx={{ fontWeight: 600 }}
                                                            />
                                                        )}
                                                    </Box>
                                                    {variant.description && (
                                                        <Typography variant="body2" color="text.secondary">
                                                            {variant.description}
                                                        </Typography>
                                                    )}
                                                </Box>

                                                {/* Action Buttons */}
                                                <Stack direction="row" spacing={1}>
                                                    <Tooltip title={variant.status === "enabled" ? "Disable Variant" : "Enable Variant"}>
                                                        <Button
                                                            variant="outlined"
                                                            color={variant.status === "enabled" ? "warning" : "success"}
                                                            startIcon={variant.status === "enabled" ? <ToggleOffIcon /> : <ToggleOnIcon />}
                                                            onClick={() => handleToggleVariant(variant.id)}
                                                            disabled={toggleVariant.loading}
                                                            sx={{ borderRadius: 2, textTransform: "none" }}
                                                        >
                                                            {variant.status === "enabled" ? "Disable" : "Enable"}
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="Edit Variant">
                                                        <Button
                                                            variant="outlined"
                                                            startIcon={<EditIcon />}
                                                            onClick={() => handleEditVariant(variant.id)}
                                                            sx={{ borderRadius: 2, textTransform: "none" }}
                                                        >
                                                            Edit
                                                        </Button>
                                                    </Tooltip>
                                                    {isPerformingBetter && (
                                                        <Tooltip title="Promote to Official">
                                                            <Button
                                                                variant="contained"
                                                                color="success"
                                                                startIcon={<StarIcon />}
                                                                onClick={() => handlePromoteVariant(variant.id)}
                                                                disabled={promoteVariant.loading}
                                                                sx={{ borderRadius: 2, textTransform: "none" }}
                                                            >
                                                                Promote
                                                            </Button>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title={variant.status === "enabled" ? "Disable variant before deleting" : "Delete Variant"}>
                                                        <span>
                                                            <IconButton
                                                                onClick={() => setDeleteConfirmVariant(variant)}
                                                                disabled={variant.status === "enabled"}
                                                                color="error"
                                                                sx={{
                                                                    borderRadius: 2,
                                                                    border: 1,
                                                                    borderColor: "divider",
                                                                }}
                                                            >
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </Stack>
                                            </Box>
                                        </Box>

                                        {/* Metrics */}
                                        <CardContent sx={{ p: 3 }}>
                                            {!hasData && (
                                                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                                                    No data collected yet. Enable this variant to start tracking metrics.
                                                </Alert>
                                            )}

                                            <Grid container spacing={3}>
                                                {/* Views */}
                                                <Grid item xs={12} md={3}>
                                                    <Box>
                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                                            <VisibilityIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                                                            <Typography variant="body2" color="text.secondary">
                                                                Views
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                                            {variant.metrics.views.toLocaleString()}
                                                        </Typography>
                                                    </Box>
                                                </Grid>

                                                {/* Conversion Rate */}
                                                <Grid item xs={12} md={3}>
                                                    <Box>
                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                                            <TouchAppIcon sx={{ fontSize: 20, color: "success.main" }} />
                                                            <Typography variant="body2" color="text.secondary">
                                                                Conversion Rate
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="h4" sx={{ fontWeight: 700, color: "success.main" }}>
                                                            {convRate.toFixed(1)}%
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {variant.metrics.conversions} conversions
                                                        </Typography>
                                                    </Box>
                                                </Grid>

                                                {/* Bounce Rate */}
                                                <Grid item xs={12} md={3}>
                                                    <Box>
                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                                            <ExitToAppIcon sx={{ fontSize: 20, color: "error.main" }} />
                                                            <Typography variant="body2" color="text.secondary">
                                                                Bounce Rate
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="h4" sx={{ fontWeight: 700, color: "error.main" }}>
                                                            {bounceRate.toFixed(1)}%
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {variant.metrics.bounces} bounces
                                                        </Typography>
                                                    </Box>
                                                </Grid>

                                                {/* Last Modified */}
                                                <Grid item xs={12} md={3}>
                                                    <Box>
                                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                                            Last Modified
                                                        </Typography>
                                                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                            {variant.lastModified
                                                                ? new Date(variant.lastModified).toLocaleDateString()
                                                                : "Never"
                                                            }
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </Stack>
                    </Box>
                )}
            </Box>

            {/* Create Variant Dialog */}
            <Dialog
                open={createDialogOpen}
                onClose={() => !createVariant.loading && setCreateDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                    },
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Create New Variant
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ py: 3 }}>
                    <TextField
                        label="Variant Name"
                        placeholder="e.g., Bold CTA Design"
                        fullWidth
                        value={newVariantName}
                        onChange={(e) => setNewVariantName(e.target.value)}
                        sx={{ mb: 2.5 }}
                        disabled={createVariant.loading}
                        autoFocus
                        variant="outlined"
                        InputProps={{
                            sx: { borderRadius: 2 },
                        }}
                    />
                    <TextField
                        label="Description (optional)"
                        placeholder="What are you testing with this variant?"
                        fullWidth
                        multiline
                        rows={3}
                        value={newVariantDescription}
                        onChange={(e) => setNewVariantDescription(e.target.value)}
                        disabled={createVariant.loading}
                        variant="outlined"
                        sx={{ mb: 2.5 }}
                        InputProps={{
                            sx: { borderRadius: 2 },
                        }}
                    />
                    <TextField
                        label="Traffic Allocation (%)"
                        type="number"
                        placeholder="0"
                        fullWidth
                        value={newVariantTraffic}
                        onChange={(e) => setNewVariantTraffic(Math.max(0, Math.min(100, Number(e.target.value))))}
                        disabled={createVariant.loading}
                        variant="outlined"
                        sx={{ mb: 2.5 }}
                        InputProps={{
                            sx: { borderRadius: 2 },
                        }}
                        helperText="Percentage of traffic this variant should receive (0-100)"
                    />
                    <FormControl fullWidth sx={{ mb: 2.5 }}>
                        <InputLabel>Copy From Variant (optional)</InputLabel>
                        <Select
                            value={copyFromVariantId}
                            onChange={(e) => setCopyFromVariantId(e.target.value)}
                            label="Copy From Variant (optional)"
                            disabled={createVariant.loading}
                            sx={{ borderRadius: 2 }}
                        >
                            <MenuItem value="">
                                <em>Start from scratch</em>
                            </MenuItem>
                            {variants?.map((v) => (
                                <MenuItem key={v.id} value={v.id}>
                                    {v.name} {v.isOfficial && "(Official)"}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Alert
                        severity="info"
                        icon={<ContentCopyIcon />}
                        sx={{ borderRadius: 2 }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            How it works:
                        </Typography>
                        <Typography variant="body2">
                            The new variant will be created in "disabled" status. You can copy content from an
                            existing variant or start fresh, then edit it before enabling.
                        </Typography>
                    </Alert>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 2.5 }}>
                    <Button
                        onClick={() => setCreateDialogOpen(false)}
                        disabled={createVariant.loading}
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            px: 3,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateVariant}
                        variant="contained"
                        disabled={createVariant.loading || !newVariantName.trim()}
                        startIcon={<AddIcon />}
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            px: 3,
                        }}
                    >
                        Create Variant
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={!!deleteConfirmVariant}
                onClose={() => !deleteVariant.loading && setDeleteConfirmVariant(null)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                    },
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: "error.main" }}>
                        Delete Variant?
                    </Typography>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ py: 3 }}>
                    <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            This action cannot be undone
                        </Typography>
                        <Typography variant="body2">
                            All variant data, metrics, and content will be permanently deleted.
                        </Typography>
                    </Alert>
                    <Typography variant="body1">
                        Are you sure you want to delete <strong>"{deleteConfirmVariant?.name}"</strong>?
                    </Typography>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 2.5 }}>
                    <Button
                        onClick={() => setDeleteConfirmVariant(null)}
                        disabled={deleteVariant.loading}
                        variant="outlined"
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            px: 3,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => deleteConfirmVariant && handleDeleteVariant(deleteConfirmVariant)}
                        color="error"
                        variant="contained"
                        disabled={deleteVariant.loading}
                        startIcon={<DeleteIcon />}
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            px: 3,
                        }}
                    >
                        Delete Variant
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
};
