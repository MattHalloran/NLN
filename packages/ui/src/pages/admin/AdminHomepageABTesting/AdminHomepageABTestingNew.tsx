import React, { useState, useCallback } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    CardActions,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Alert,
    Tooltip,
} from "@mui/material";
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    PlayArrow as PlayIcon,
    Stop as StopIcon,
    Edit as EditIcon,
} from "@mui/icons-material";
import { APP_LINKS } from "@local/shared";
import { BackButton, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLocation } from "route";
import { restApi, ABTest } from "api/rest/client";
import { useABTests } from "api/rest/hooks";
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

/**
 * Simplified statistical significance test (Z-test for proportions)
 */
const calculateSignificance = (test: ABTest): { significant: boolean; confidence: number } => {
    const { variantA, variantB } = test.metrics;

    // Need at least 100 views per variant for meaningful stats
    if (variantA.views < 100 || variantB.views < 100) {
        return { significant: false, confidence: 0 };
    }

    const pA = variantA.conversions / variantA.views;
    const pB = variantB.conversions / variantB.views;
    const pPooled = (variantA.conversions + variantB.conversions) / (variantA.views + variantB.views);

    const seA = Math.sqrt((pPooled * (1 - pPooled)) / variantA.views);
    const seB = Math.sqrt((pPooled * (1 - pPooled)) / variantB.views);
    const se = Math.sqrt(seA * seA + seB * seB);

    const z = Math.abs((pA - pB) / se);

    // Z-score to confidence level (approximate)
    let confidence = 0;
    if (z > 2.58) confidence = 99;
    else if (z > 1.96) confidence = 95;
    else if (z > 1.65) confidence = 90;
    else confidence = Math.round((1 - 2 * (1 - 0.5 * (1 + Math.erf(z / Math.sqrt(2))))) * 100);

    return {
        significant: confidence >= 95,
        confidence,
    };
};

export const AdminHomepageABTestingNew = () => {
    const [, navigate] = useLocation();
    const { data: tests, loading, error, refetch } = useABTests();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [deleteConfirmTest, setDeleteConfirmTest] = useState<ABTest | null>(null);
    const [newTestName, setNewTestName] = useState("");
    const [newTestDescription, setNewTestDescription] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const handleApiSuccess = useCallback((message: string) => {
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Success, autoHideDuration: 3000 });
    }, []);

    const handleApiError = useCallback((error: any, fallbackMessage: string) => {
        const message = error?.message || fallbackMessage;
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Error, autoHideDuration: 5000 });
    }, []);

    const handleCreateTest = useCallback(async () => {
        if (!newTestName.trim()) {
            handleApiError(null, "Test name is required");
            return;
        }

        try {
            setIsProcessing(true);
            await restApi.createABTest({
                name: newTestName,
                description: newTestDescription,
            });
            handleApiSuccess("A/B test created successfully!");
            setCreateDialogOpen(false);
            setNewTestName("");
            setNewTestDescription("");
            await refetch();
        } catch (error: any) {
            handleApiError(error, "Failed to create A/B test");
        } finally {
            setIsProcessing(false);
        }
    }, [newTestName, newTestDescription, refetch, handleApiSuccess, handleApiError]);

    const handleStartTest = useCallback(async (testId: string) => {
        try {
            setIsProcessing(true);
            await restApi.startABTest(testId);
            handleApiSuccess("A/B test started successfully!");
            await refetch();
        } catch (error: any) {
            handleApiError(error, "Failed to start A/B test");
        } finally {
            setIsProcessing(false);
        }
    }, [refetch, handleApiSuccess, handleApiError]);

    const handleStopTest = useCallback(async (testId: string) => {
        try {
            setIsProcessing(true);
            await restApi.stopABTest(testId);
            handleApiSuccess("A/B test stopped successfully!");
            await refetch();
        } catch (error: any) {
            handleApiError(error, "Failed to stop A/B test");
        } finally {
            setIsProcessing(false);
        }
    }, [refetch, handleApiSuccess, handleApiError]);

    const handleDeleteTest = useCallback(async (test: ABTest) => {
        if (test.status === "active") {
            handleApiError(null, "Cannot delete an active test. Stop it first.");
            return;
        }

        try {
            setIsProcessing(true);
            await restApi.deleteABTest(test.id);
            handleApiSuccess("A/B test deleted successfully!");
            setDeleteConfirmTest(null);
            await refetch();
        } catch (error: any) {
            handleApiError(error, "Failed to delete A/B test");
        } finally {
            setIsProcessing(false);
        }
    }, [refetch, handleApiSuccess, handleApiError]);

    const handleEditVariant = useCallback((testId: string, variant: "variantA" | "variantB", section: string) => {
        // Navigate to the section admin page with query params
        const sectionRoutes: Record<string, string> = {
            hero: APP_LINKS.Admin.Homepage.HeroBanner,
            services: APP_LINKS.Admin.Homepage.Services,
            contact: APP_LINKS.Admin.ContactInfo,
            seasonal: APP_LINKS.Admin.Homepage.Seasonal,
            branding: APP_LINKS.Admin.Homepage.Branding,
            sections: APP_LINKS.Admin.Homepage.Sections,
        };

        const route = sectionRoutes[section] || APP_LINKS.Admin.Homepage.HeroBanner;
        navigate(`${route}?abTestId=${testId}&variant=${variant}`);
    }, [navigate]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "success";
            case "completed":
                return "info";
            case "draft":
                return "default";
            case "paused":
                return "warning";
            default:
                return "default";
        }
    };

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="A/B Testing"
                help="Create and manage A/B tests for your landing page"
                startComponent={<BackButton to={APP_LINKS.AdminHomepage} ariaLabel="Back to Homepage Management" />}
            />

            <Box p={2}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        Failed to load A/B tests: {error.message}
                    </Alert>
                )}

                <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h5">
                        Active Tests
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                        disabled={isProcessing}
                    >
                        Create New Test
                    </Button>
                </Box>

                {loading ? (
                    <LinearProgress />
                ) : tests && tests.length > 0 ? (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Variant A</TableCell>
                                    <TableCell>Variant B</TableCell>
                                    <TableCell>Winner</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tests.map((test) => {
                                    const convRateA = calculateConversionRate(test.metrics.variantA.conversions, test.metrics.variantA.views);
                                    const convRateB = calculateConversionRate(test.metrics.variantB.conversions, test.metrics.variantB.views);
                                    const bounceRateA = calculateBounceRate(test.metrics.variantA.bounces, test.metrics.variantA.views);
                                    const bounceRateB = calculateBounceRate(test.metrics.variantB.bounces, test.metrics.variantB.views);
                                    const { significant, confidence } = calculateSignificance(test);

                                    let winner = "Insufficient Data";
                                    if (significant) {
                                        winner = convRateA > convRateB ? "Variant A" : "Variant B";
                                    }

                                    return (
                                        <TableRow key={test.id}>
                                            <TableCell>
                                                <Typography variant="body1" fontWeight="medium">
                                                    {test.name}
                                                </Typography>
                                                {test.description && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {test.description}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={test.status.toUpperCase()}
                                                    color={getStatusColor(test.status) as any}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    Views: {test.metrics.variantA.views}
                                                </Typography>
                                                <Typography variant="body2">
                                                    Conversions: {test.metrics.variantA.conversions} ({convRateA.toFixed(1)}%)
                                                </Typography>
                                                <Typography variant="body2">
                                                    Bounces: {test.metrics.variantA.bounces} ({bounceRateA.toFixed(1)}%)
                                                </Typography>
                                                <Button
                                                    size="small"
                                                    startIcon={<EditIcon />}
                                                    onClick={() => handleEditVariant(test.id, "variantA", "hero")}
                                                    sx={{ mt: 1 }}
                                                >
                                                    Edit Variant A
                                                </Button>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    Views: {test.metrics.variantB.views}
                                                </Typography>
                                                <Typography variant="body2">
                                                    Conversions: {test.metrics.variantB.conversions} ({convRateB.toFixed(1)}%)
                                                </Typography>
                                                <Typography variant="body2">
                                                    Bounces: {test.metrics.variantB.bounces} ({bounceRateB.toFixed(1)}%)
                                                </Typography>
                                                <Button
                                                    size="small"
                                                    startIcon={<EditIcon />}
                                                    onClick={() => handleEditVariant(test.id, "variantB", "hero")}
                                                    sx={{ mt: 1 }}
                                                >
                                                    Edit Variant B
                                                </Button>
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title={significant ? `${confidence}% confidence` : "Need more data"}>
                                                    <Chip
                                                        label={winner}
                                                        color={significant ? "success" : "default"}
                                                        size="small"
                                                    />
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="right">
                                                {test.status === "active" ? (
                                                    <Tooltip title="Stop Test">
                                                        <IconButton
                                                            onClick={() => handleStopTest(test.id)}
                                                            disabled={isProcessing}
                                                            color="warning"
                                                        >
                                                            <StopIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip title="Start Test">
                                                        <IconButton
                                                            onClick={() => handleStartTest(test.id)}
                                                            disabled={isProcessing || test.status === "completed"}
                                                            color="primary"
                                                        >
                                                            <PlayIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Delete Test">
                                                    <IconButton
                                                        onClick={() => setDeleteConfirmTest(test)}
                                                        disabled={isProcessing || test.status === "active"}
                                                        color="error"
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Card>
                        <CardContent>
                            <Typography variant="body1" color="text.secondary" align="center">
                                No A/B tests yet. Create your first test to get started!
                            </Typography>
                        </CardContent>
                    </Card>
                )}
            </Box>

            {/* Create Test Dialog */}
            <Dialog open={createDialogOpen} onClose={() => !isProcessing && setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create New A/B Test</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Test Name"
                        fullWidth
                        value={newTestName}
                        onChange={(e) => setNewTestName(e.target.value)}
                        sx={{ mt: 2, mb: 2 }}
                        disabled={isProcessing}
                        autoFocus
                    />
                    <TextField
                        label="Description (optional)"
                        fullWidth
                        multiline
                        rows={3}
                        value={newTestDescription}
                        onChange={(e) => setNewTestDescription(e.target.value)}
                        disabled={isProcessing}
                    />
                    <Alert severity="info" sx={{ mt: 2 }}>
                        A new test will be created with both variants initialized from the current landing page.
                        You can then edit each variant separately.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreateTest} variant="contained" disabled={isProcessing || !newTestName.trim()}>
                        Create Test
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmTest} onClose={() => !isProcessing && setDeleteConfirmTest(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Delete A/B Test?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete the test "{deleteConfirmTest?.name}"?
                        This will also delete both variant files and cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmTest(null)} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => deleteConfirmTest && handleDeleteTest(deleteConfirmTest)}
                        color="error"
                        variant="contained"
                        disabled={isProcessing}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
};
