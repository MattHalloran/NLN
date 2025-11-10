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
    Paper,
} from "@mui/material";
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Timeline as TimelineIcon,
    Visibility as VisibilityIcon,
    TouchApp as TouchAppIcon,
    ExitToApp as ExitToAppIcon,
    Star as StarIcon,
    ToggleOff as ToggleOffIcon,
    ToggleOn as ToggleOnIcon,
    ContentCopy as ContentCopyIcon,
    OpenInNew as OpenInNewIcon,
    Info as InfoIcon,
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
import { saveVariantId } from "stores/landingPageStore";

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

/**
 * Performance indicator showing relative performance to baseline
 */
const PerformanceIndicator: React.FC<{
    value: number;
    baseline: number;
    label: string;
    reversed?: boolean; // true for metrics where lower is better (e.g., bounce rate)
}> = ({ value, baseline, label: _label, reversed = false }) => {
    if (baseline === 0) return null;

    const diff = value - baseline;
    const percentDiff = (diff / baseline) * 100;
    const isBetter = reversed ? diff < 0 : diff > 0;
    const _isWorse = reversed ? diff > 0 : diff < 0;

    if (Math.abs(percentDiff) < 0.5) return null; // Not significant enough

    return (
        <Tooltip title={`${isBetter ? "Better" : "Worse"} than official variant`}>
            <Chip
                icon={isBetter ? <TrendingUpIcon /> : <TrendingDownIcon />}
                label={`${percentDiff > 0 ? "+" : ""}${percentDiff.toFixed(1)}%`}
                size="small"
                color={isBetter ? "success" : "error"}
                variant="outlined"
                sx={{
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    height: "24px",
                }}
            />
        </Tooltip>
    );
};

/**
 * Visual traffic allocation bar
 */
const TrafficAllocationBar: React.FC<{
    variants: LandingPageVariant[];
}> = ({ variants }) => {
    const enabledVariants = variants.filter((v) => v.status === "enabled");
    const total = enabledVariants.reduce((sum, v) => sum + v.trafficAllocation, 0);

    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                mb: 4,
                borderRadius: 3,
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                }}
            >
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Traffic Distribution
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Currently enabled variants and their traffic allocation
                    </Typography>
                </Box>
                <Chip
                    label={`${total}% Allocated`}
                    color={total === 100 ? "success" : total > 100 ? "error" : "warning"}
                    sx={{ fontWeight: 600, fontSize: "0.875rem" }}
                />
            </Box>

            <Box
                sx={{
                    position: "relative",
                    height: 48,
                    borderRadius: 2,
                    overflow: "hidden",
                    bgcolor: "grey.100",
                }}
            >
                {enabledVariants.length === 0 ? (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: "text.secondary",
                        }}
                    >
                        <Typography variant="body2">No variants enabled</Typography>
                    </Box>
                ) : (
                    <Box sx={{ display: "flex", height: "100%", position: "relative" }}>
                        {enabledVariants.map((variant, idx) => (
                            <Tooltip
                                key={variant.id}
                                title={`${variant.name}: ${variant.trafficAllocation}%`}
                            >
                                <Box
                                    sx={{
                                        width: `${variant.trafficAllocation}%`,
                                        bgcolor: variant.isOfficial
                                            ? "warning.main"
                                            : `hsl(${idx * 137.5}, 70%, 50%)`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "white",
                                        fontWeight: 600,
                                        fontSize: "0.875rem",
                                        position: "relative",
                                        transition: "all 0.2s ease-in-out",
                                        cursor: "pointer",
                                        "&:hover": {
                                            filter: "brightness(1.1)",
                                            zIndex: 1,
                                        },
                                    }}
                                >
                                    {variant.trafficAllocation >= 10 &&
                                        `${variant.trafficAllocation}%`}
                                </Box>
                            </Tooltip>
                        ))}
                    </Box>
                )}
            </Box>

            {enabledVariants.length > 0 && (
                <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
                    {enabledVariants.map((variant, idx) => (
                        <Chip
                            key={variant.id}
                            label={variant.name}
                            size="small"
                            sx={{
                                bgcolor: variant.isOfficial
                                    ? "warning.main"
                                    : `hsl(${idx * 137.5}, 70%, 50%)`,
                                color: "white",
                                fontWeight: 600,
                            }}
                        />
                    ))}
                </Stack>
            )}
        </Paper>
    );
};

/**
 * Enhanced metric card with visual indicators
 */
const MetricCard: React.FC<{
    icon: React.ReactElement;
    label: string;
    value: string | number;
    subValue?: string;
    color?: string;
    trend?: React.ReactElement;
}> = ({ icon, label, value, subValue, color = "text.primary", trend }) => (
    <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            {React.cloneElement(icon, { sx: { fontSize: 20, color: "text.secondary" } } as any)}
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                {label}
            </Typography>
            {trend && <Box sx={{ ml: "auto" }}>{trend}</Box>}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color, mb: subValue ? 0.5 : 0 }}>
            {value}
        </Typography>
        {subValue && (
            <Typography variant="caption" color="text.secondary">
                {subValue}
            </Typography>
        )}
    </Box>
);

export const AdminHomepageABTestingNew = () => {
    const [, navigate] = useLocation();
    const { data: variants, loading, error, refetch } = useVariants();
    const createVariant = useCreateVariant();
    const deleteVariant = useDeleteVariant();
    const promoteVariant = usePromoteVariant();
    const toggleVariant = useToggleVariant();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [deleteConfirmVariant, setDeleteConfirmVariant] = useState<LandingPageVariant | null>(
        null,
    );
    const [newVariantName, setNewVariantName] = useState("");
    const [newVariantDescription, setNewVariantDescription] = useState("");
    const [newVariantTraffic, setNewVariantTraffic] = useState(0);
    const [copyFromVariantId, setCopyFromVariantId] = useState("");

    const handleApiSuccess = useCallback((message: string) => {
        PubSub.get().publishSnack({
            message,
            severity: SnackSeverity.Success,
            autoHideDuration: 3000,
        });
    }, []);

    const handleApiError = useCallback((error: any, fallbackMessage: string) => {
        const message = error?.message || fallbackMessage;
        PubSub.get().publishSnack({
            message,
            severity: SnackSeverity.Error,
            autoHideDuration: 5000,
        });
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
    }, [
        newVariantName,
        newVariantDescription,
        newVariantTraffic,
        copyFromVariantId,
        createVariant,
        refetch,
        handleApiSuccess,
        handleApiError,
    ]);

    const handleDeleteVariant = useCallback(
        async (variant: LandingPageVariant) => {
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
        },
        [deleteVariant, refetch, handleApiSuccess, handleApiError],
    );

    const handlePromoteVariant = useCallback(
        async (variantId: string) => {
            try {
                await promoteVariant.mutate(variantId);
                handleApiSuccess("Variant promoted to official successfully!");
                await refetch();
            } catch (error: any) {
                handleApiError(error, "Failed to promote variant");
            }
        },
        [promoteVariant, refetch, handleApiSuccess, handleApiError],
    );

    const handleToggleVariant = useCallback(
        async (variantId: string) => {
            try {
                await toggleVariant.mutate(variantId);
                handleApiSuccess("Variant status toggled successfully!");
                await refetch();
            } catch (error: any) {
                handleApiError(error, "Failed to toggle variant");
            }
        },
        [toggleVariant, refetch, handleApiSuccess, handleApiError],
    );

    const handleEditVariant = useCallback(
        (variantId: string) => {
            // Save the selected variant to localStorage so admin stays on this variant
            // when navigating to other pages (including the landing page for preview)
            saveVariantId(variantId);

            // Navigate to the hero banner page with variantId query param
            navigate(`${APP_LINKS.AdminHomepageHeroBanner}?variantId=${variantId}`);
        },
        [navigate],
    );

    const handlePreviewVariant = useCallback((variantId: string) => {
        // Save the selected variant and open homepage in new tab
        saveVariantId(variantId);
        window.open(APP_LINKS.Home, "_blank");
    }, []);

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

    const officialVariant = variants?.find((v) => v.isOfficial);
    const testVariants = variants?.filter((v) => !v.isOfficial) || [];
    const totalTraffic =
        variants
            ?.filter((v) => v.status === "enabled")
            .reduce((sum, v) => sum + v.trafficAllocation, 0) || 0;
    const availableTraffic = Math.max(0, 100 - totalTraffic);

    // Helper function to suggest traffic allocation for new variant
    const handleSuggestTraffic = () => {
        // If there's available traffic, suggest a reasonable split
        if (availableTraffic > 0) {
            // Suggest all available traffic
            setNewVariantTraffic(availableTraffic);
        } else {
            // Suggest 20% and show warning that user needs to adjust others
            setNewVariantTraffic(20);
            handleApiError(
                null,
                `No available traffic. Consider reducing the official variant to ${officialVariant?.trafficAllocation ? officialVariant.trafficAllocation - 20 : 80}%`,
            );
        }
    };

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0, bgcolor: "background.default" }}>
            <TopBar
                display="page"
                title="Variant Testing"
                help="Create and manage landing page variants to optimize performance"
                startComponent={
                    <BackButton
                        to={APP_LINKS.AdminHomepage}
                        ariaLabel="Back to Homepage Management"
                    />
                }
            />

            <Box p={3}>
                {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                        Failed to load variants: {error.message}
                    </Alert>
                )}

                {/* Traffic Allocation Warning */}
                {totalTraffic !== 100 && variants && variants.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }} icon={<InfoIcon />}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            Traffic Allocation Issue
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            Enabled variants must total 100% traffic. Current total: {totalTraffic}%
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
                            {totalTraffic > 100 ? (
                                <>
                                    <strong>Over-allocated by {totalTraffic - 100}%.</strong> Reduce
                                    traffic on one or more variants.
                                </>
                            ) : (
                                <>
                                    <strong>{100 - totalTraffic}% unallocated.</strong>{" "}
                                    {officialVariant && officialVariant.status === "enabled"
                                        ? `Consider increasing the official variant from ${officialVariant.trafficAllocation}% to ${officialVariant.trafficAllocation + (100 - totalTraffic)}%.`
                                        : "Enable additional variants or adjust allocations."}
                                </>
                            )}
                        </Typography>
                    </Alert>
                )}

                {/* Traffic Allocation Visual */}
                {!loading && variants && variants.length > 0 && (
                    <TrafficAllocationBar variants={variants} />
                )}

                {/* Header Section */}
                <Box
                    sx={{
                        mb: 4,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                    }}
                >
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
                    <Paper
                        elevation={0}
                        sx={{
                            textAlign: "center",
                            py: 12,
                            px: 4,
                            borderRadius: 3,
                            border: "2px dashed",
                            borderColor: "divider",
                            bgcolor: "background.paper",
                        }}
                    >
                        <TimelineIcon
                            sx={{ fontSize: 96, color: "primary.light", mb: 3, opacity: 0.5 }}
                        />
                        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
                            Start A/B Testing Your Landing Page
                        </Typography>
                        <Typography
                            variant="body1"
                            color="text.secondary"
                            sx={{ mb: 4, maxWidth: 600, mx: "auto", lineHeight: 1.8 }}
                        >
                            Create multiple variants of your landing page to test different designs,
                            copy, and layouts. Track real performance metrics and find out what
                            resonates best with your audience.
                        </Typography>
                        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                            <Box sx={{ textAlign: "center", px: 2 }}>
                                <VisibilityIcon
                                    sx={{ fontSize: 32, color: "primary.main", mb: 1 }}
                                />
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                >
                                    Track Views
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: "center", px: 2 }}>
                                <TouchAppIcon sx={{ fontSize: 32, color: "success.main", mb: 1 }} />
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                >
                                    Measure Conversions
                                </Typography>
                            </Box>
                            <Box sx={{ textAlign: "center", px: 2 }}>
                                <TrendingUpIcon sx={{ fontSize: 32, color: "info.main", mb: 1 }} />
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                >
                                    Optimize Performance
                                </Typography>
                            </Box>
                        </Stack>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<AddIcon />}
                            onClick={() => setCreateDialogOpen(true)}
                            sx={{
                                borderRadius: 2,
                                px: 5,
                                py: 1.5,
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: "1rem",
                            }}
                        >
                            Create Your First Variant
                        </Button>
                    </Paper>
                )}

                {/* Official Variant */}
                {!loading && officialVariant && (
                    <Box sx={{ mb: 4 }}>
                        <Typography
                            variant="h6"
                            gutterBottom
                            sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}
                        >
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
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <Box sx={{ flex: 1 }}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 2,
                                                mb: 1,
                                            }}
                                        >
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

                                    <Stack direction="row" spacing={1}>
                                        <Tooltip title="Preview this variant">
                                            <Button
                                                variant="outlined"
                                                startIcon={<OpenInNewIcon />}
                                                onClick={() =>
                                                    handlePreviewVariant(officialVariant.id)
                                                }
                                                sx={{
                                                    borderRadius: 2,
                                                    textTransform: "none",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Preview
                                            </Button>
                                        </Tooltip>
                                        <Button
                                            variant="contained"
                                            startIcon={<EditIcon />}
                                            onClick={() => handleEditVariant(officialVariant.id)}
                                            sx={{
                                                borderRadius: 2,
                                                textTransform: "none",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Edit Content
                                        </Button>
                                    </Stack>
                                </Box>
                            </Box>

                            <CardContent sx={{ p: 3 }}>
                                <Grid container spacing={3}>
                                    {/* Views */}
                                    <Grid item xs={12} md={3}>
                                        <MetricCard
                                            icon={<VisibilityIcon />}
                                            label="Views"
                                            value={officialVariant.metrics.views.toLocaleString()}
                                        />
                                    </Grid>

                                    {/* Conversion Rate */}
                                    <Grid item xs={12} md={3}>
                                        <MetricCard
                                            icon={<TouchAppIcon />}
                                            label="Conversion Rate"
                                            value={`${calculateConversionRate(officialVariant.metrics.conversions, officialVariant.metrics.views).toFixed(1)}%`}
                                            subValue={`${officialVariant.metrics.conversions} conversions`}
                                            color="success.main"
                                        />
                                    </Grid>

                                    {/* Bounce Rate */}
                                    <Grid item xs={12} md={3}>
                                        <MetricCard
                                            icon={<ExitToAppIcon />}
                                            label="Bounce Rate"
                                            value={`${calculateBounceRate(officialVariant.metrics.bounces, officialVariant.metrics.views).toFixed(1)}%`}
                                            subValue={`${officialVariant.metrics.bounces} bounces`}
                                            color="error.main"
                                        />
                                    </Grid>

                                    {/* Last Modified */}
                                    <Grid item xs={12} md={3}>
                                        <Box>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                gutterBottom
                                                sx={{ fontWeight: 500, mb: 1 }}
                                            >
                                                Last Modified
                                            </Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                                {officialVariant.lastModified
                                                    ? new Date(
                                                          officialVariant.lastModified,
                                                      ).toLocaleDateString()
                                                    : "Never"}
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
                                const convRate = calculateConversionRate(
                                    variant.metrics.conversions,
                                    variant.metrics.views,
                                );
                                const bounceRate = calculateBounceRate(
                                    variant.metrics.bounces,
                                    variant.metrics.views,
                                );
                                const hasData = variant.metrics.views > 0;

                                // Simple comparison to official
                                const officialConvRate = officialVariant
                                    ? calculateConversionRate(
                                          officialVariant.metrics.conversions,
                                          officialVariant.metrics.views,
                                      )
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
                                            borderColor: isPerformingBetter
                                                ? "success.main"
                                                : "transparent",
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
                                                bgcolor:
                                                    variant.status === "enabled"
                                                        ? "primary.50"
                                                        : "background.paper",
                                                borderBottom: 1,
                                                borderColor: "divider",
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "flex-start",
                                                }}
                                            >
                                                <Box sx={{ flex: 1 }}>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 2,
                                                            mb: 1,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="h5"
                                                            sx={{ fontWeight: 600 }}
                                                        >
                                                            {variant.name}
                                                        </Typography>
                                                        <Chip
                                                            label={variant.status.toUpperCase()}
                                                            color={
                                                                getStatusColor(
                                                                    variant.status,
                                                                ) as any
                                                            }
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
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                        >
                                                            {variant.description}
                                                        </Typography>
                                                    )}
                                                </Box>

                                                {/* Action Buttons */}
                                                <Stack direction="row" spacing={1}>
                                                    <Tooltip title="Preview this variant">
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            startIcon={<OpenInNewIcon />}
                                                            onClick={() =>
                                                                handlePreviewVariant(variant.id)
                                                            }
                                                            sx={{
                                                                borderRadius: 2,
                                                                textTransform: "none",
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            Preview
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="Edit variant content">
                                                        <Button
                                                            variant="contained"
                                                            size="small"
                                                            startIcon={<EditIcon />}
                                                            onClick={() =>
                                                                handleEditVariant(variant.id)
                                                            }
                                                            sx={{
                                                                borderRadius: 2,
                                                                textTransform: "none",
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            Edit
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip
                                                        title={
                                                            variant.status === "enabled"
                                                                ? "Disable Variant"
                                                                : "Enable Variant"
                                                        }
                                                    >
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            color={
                                                                variant.status === "enabled"
                                                                    ? "warning"
                                                                    : "success"
                                                            }
                                                            startIcon={
                                                                variant.status === "enabled" ? (
                                                                    <ToggleOffIcon />
                                                                ) : (
                                                                    <ToggleOnIcon />
                                                                )
                                                            }
                                                            onClick={() =>
                                                                handleToggleVariant(variant.id)
                                                            }
                                                            disabled={toggleVariant.loading}
                                                            sx={{
                                                                borderRadius: 2,
                                                                textTransform: "none",
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {variant.status === "enabled"
                                                                ? "Disable"
                                                                : "Enable"}
                                                        </Button>
                                                    </Tooltip>
                                                    {isPerformingBetter && (
                                                        <Tooltip title="Promote to Official">
                                                            <Button
                                                                variant="contained"
                                                                size="small"
                                                                color="success"
                                                                startIcon={<StarIcon />}
                                                                onClick={() =>
                                                                    handlePromoteVariant(variant.id)
                                                                }
                                                                disabled={promoteVariant.loading}
                                                                sx={{
                                                                    borderRadius: 2,
                                                                    textTransform: "none",
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                Promote
                                                            </Button>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip
                                                        title={
                                                            variant.status === "enabled"
                                                                ? "Disable variant before deleting"
                                                                : "Delete Variant"
                                                        }
                                                    >
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() =>
                                                                    setDeleteConfirmVariant(variant)
                                                                }
                                                                disabled={
                                                                    variant.status === "enabled"
                                                                }
                                                                color="error"
                                                                sx={{
                                                                    borderRadius: 2,
                                                                    border: 1,
                                                                    borderColor: "divider",
                                                                }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </Stack>
                                            </Box>
                                        </Box>

                                        {/* Metrics */}
                                        <CardContent sx={{ p: 3 }}>
                                            {!hasData && (
                                                <Alert
                                                    severity="info"
                                                    sx={{ mb: 3, borderRadius: 2 }}
                                                    icon={<InfoIcon />}
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 600 }}
                                                    >
                                                        No data collected yet
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        Enable this variant to start tracking
                                                        performance metrics.
                                                    </Typography>
                                                </Alert>
                                            )}

                                            <Grid container spacing={3}>
                                                {/* Views */}
                                                <Grid item xs={12} md={3}>
                                                    <MetricCard
                                                        icon={<VisibilityIcon />}
                                                        label="Views"
                                                        value={variant.metrics.views.toLocaleString()}
                                                    />
                                                </Grid>

                                                {/* Conversion Rate */}
                                                <Grid item xs={12} md={3}>
                                                    <MetricCard
                                                        icon={<TouchAppIcon />}
                                                        label="Conversion Rate"
                                                        value={`${convRate.toFixed(1)}%`}
                                                        subValue={`${variant.metrics.conversions} conversions`}
                                                        color="success.main"
                                                        trend={
                                                            hasData && officialVariant ? (
                                                                <PerformanceIndicator
                                                                    value={convRate}
                                                                    baseline={officialConvRate}
                                                                    label="conversion"
                                                                />
                                                            ) : undefined
                                                        }
                                                    />
                                                </Grid>

                                                {/* Bounce Rate */}
                                                <Grid item xs={12} md={3}>
                                                    <MetricCard
                                                        icon={<ExitToAppIcon />}
                                                        label="Bounce Rate"
                                                        value={`${bounceRate.toFixed(1)}%`}
                                                        subValue={`${variant.metrics.bounces} bounces`}
                                                        color="error.main"
                                                        trend={
                                                            hasData && officialVariant ? (
                                                                <PerformanceIndicator
                                                                    value={bounceRate}
                                                                    baseline={calculateBounceRate(
                                                                        officialVariant.metrics
                                                                            .bounces,
                                                                        officialVariant.metrics
                                                                            .views,
                                                                    )}
                                                                    label="bounce"
                                                                    reversed={true}
                                                                />
                                                            ) : undefined
                                                        }
                                                    />
                                                </Grid>

                                                {/* Last Modified */}
                                                <Grid item xs={12} md={3}>
                                                    <Box>
                                                        <Typography
                                                            variant="body2"
                                                            color="text.secondary"
                                                            gutterBottom
                                                            sx={{ fontWeight: 500, mb: 1 }}
                                                        >
                                                            Last Modified
                                                        </Typography>
                                                        <Typography
                                                            variant="h5"
                                                            sx={{ fontWeight: 700 }}
                                                        >
                                                            {variant.lastModified
                                                                ? new Date(
                                                                      variant.lastModified,
                                                                  ).toLocaleDateString()
                                                                : "Never"}
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
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                    },
                }}
            >
                <DialogTitle sx={{ pb: 2, pt: 3, px: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2,
                                bgcolor: "primary.main",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <AddIcon sx={{ color: "white", fontSize: 28 }} />
                        </Box>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                                Create New Variant
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Set up a new landing page variant to test
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ py: 3, px: 3 }}>
                    <Stack spacing={3}>
                        <TextField
                            label="Variant Name"
                            placeholder="e.g., Bold CTA Design, Green Theme, Mobile-First"
                            fullWidth
                            value={newVariantName}
                            onChange={(e) => setNewVariantName(e.target.value)}
                            disabled={createVariant.loading}
                            autoFocus
                            required
                            variant="outlined"
                            InputProps={{
                                sx: { borderRadius: 2 },
                            }}
                            helperText="Give your variant a descriptive name to easily identify it"
                        />
                        <TextField
                            label="Description"
                            placeholder="What hypothesis are you testing? What changes will you make?"
                            fullWidth
                            multiline
                            rows={3}
                            value={newVariantDescription}
                            onChange={(e) => setNewVariantDescription(e.target.value)}
                            disabled={createVariant.loading}
                            variant="outlined"
                            InputProps={{
                                sx: { borderRadius: 2 },
                            }}
                            helperText="Optional: Describe the purpose and key changes of this variant"
                        />
                        <Box>
                            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                                <TextField
                                    label="Traffic Allocation"
                                    type="number"
                                    placeholder="0"
                                    fullWidth
                                    value={newVariantTraffic}
                                    onChange={(e) =>
                                        setNewVariantTraffic(
                                            Math.max(0, Math.min(100, Number(e.target.value))),
                                        )
                                    }
                                    disabled={createVariant.loading}
                                    variant="outlined"
                                    InputProps={{
                                        sx: { borderRadius: 2 },
                                        endAdornment: (
                                            <Typography sx={{ color: "text.secondary", ml: 1 }}>
                                                %
                                            </Typography>
                                        ),
                                    }}
                                    helperText={
                                        availableTraffic > 0
                                            ? `${availableTraffic}% available for allocation`
                                            : "No traffic available. Adjust other variants after creation."
                                    }
                                    error={availableTraffic === 0 && newVariantTraffic > 0}
                                />
                                <Tooltip
                                    title={
                                        availableTraffic > 0
                                            ? `Allocate ${availableTraffic}%`
                                            : "Suggest 20%"
                                    }
                                >
                                    <Button
                                        variant="outlined"
                                        onClick={handleSuggestTraffic}
                                        disabled={createVariant.loading}
                                        sx={{
                                            borderRadius: 2,
                                            textTransform: "none",
                                            fontWeight: 600,
                                            minWidth: "140px",
                                            height: "56px",
                                        }}
                                    >
                                        Suggest Value
                                    </Button>
                                </Tooltip>
                            </Box>
                        </Box>
                        <FormControl fullWidth>
                            <InputLabel>Copy From Variant</InputLabel>
                            <Select
                                value={copyFromVariantId}
                                onChange={(e) => setCopyFromVariantId(e.target.value)}
                                label="Copy From Variant"
                                disabled={createVariant.loading}
                                sx={{ borderRadius: 2 }}
                            >
                                <MenuItem value="">
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <AddIcon fontSize="small" />
                                        <em>Start from scratch</em>
                                    </Box>
                                </MenuItem>
                                {variants?.map((v) => (
                                    <MenuItem key={v.id} value={v.id}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                            <ContentCopyIcon fontSize="small" />
                                            {v.name}{" "}
                                            {v.isOfficial && (
                                                <Chip
                                                    label="Official"
                                                    size="small"
                                                    color="warning"
                                                />
                                            )}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Alert severity="info" icon={<InfoIcon />} sx={{ borderRadius: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                Next Steps
                            </Typography>
                            <Typography variant="body2">
                                The variant will be created in <strong>disabled</strong> status.
                                After creation, you'll be able to edit its content and enable it
                                when ready to start collecting data.
                            </Typography>
                        </Alert>
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 3, gap: 1 }}>
                    <Button
                        onClick={() => setCreateDialogOpen(false)}
                        disabled={createVariant.loading}
                        variant="outlined"
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            px: 3,
                            py: 1,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateVariant}
                        variant="contained"
                        disabled={createVariant.loading || !newVariantName.trim()}
                        startIcon={createVariant.loading ? null : <AddIcon />}
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            px: 4,
                            py: 1,
                        }}
                    >
                        {createVariant.loading ? "Creating..." : "Create Variant"}
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
                        Are you sure you want to delete{" "}
                        <strong>"{deleteConfirmVariant?.name}"</strong>?
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
                        onClick={() =>
                            deleteConfirmVariant && handleDeleteVariant(deleteConfirmVariant)
                        }
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
