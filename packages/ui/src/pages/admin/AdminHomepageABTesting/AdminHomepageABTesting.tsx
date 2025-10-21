import { APP_LINKS } from "@local/shared";
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography,
    LinearProgress,
    Chip,
    Divider,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Switch,
    Snackbar,
    Alert,
} from "@mui/material";
import {
    Plus,
    Target,
    TrendingUp,
    Users,
    Clock,
} from "lucide-react";
import {
    conversionRate,
    bounceRate,
    determineWinner,
    getConfidenceDescription,
    getTestRecommendation,
} from "utils/statistics";
import { useABTests } from "api/rest/hooks";
import { restApi } from "api/rest/client";
import { BackButton, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useState } from "react";

// Section metadata
const SECTION_METADATA: Record<string, { name: string; description: string; required?: boolean }> = {
    hero: {
        name: "Hero Banner",
        description: "Main hero section with carousel and call-to-action",
        required: true,
    },
    services: {
        name: "Services Showcase",
        description: "Display of available services",
    },
    "social-proof": {
        name: "Social Proof",
        description: "Customer testimonials",
    },
    about: {
        name: "About Story",
        description: "Company history",
    },
    seasonal: {
        name: "Seasonal Content",
        description: "What's blooming now",
    },
    location: {
        name: "Location & Visit",
        description: "Contact information",
    },
};

export const AdminHomepageABTesting = () => {
    const { data: abTests, loading: testsLoading, refetch: refetchTests } = useABTests();
    const [createTestDialogOpen, setCreateTestDialogOpen] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
        open: false,
        message: "",
        severity: "success",
    });
    const [newTest, setNewTest] = useState({
        name: "",
        description: "",
        variantA: {
            name: "Control",
            sections: {
                order: ["hero", "services", "social-proof", "about", "seasonal", "location"],
                enabled: {
                    hero: true,
                    services: true,
                    "social-proof": true,
                    about: true,
                    seasonal: true,
                    location: true,
                },
            },
        },
        variantB: {
            name: "Variant B",
            sections: {
                order: ["hero", "services", "social-proof", "about", "seasonal", "location"],
                enabled: {
                    hero: true,
                    services: true,
                    "social-proof": true,
                    about: true,
                    seasonal: true,
                    location: true,
                },
            },
        },
    });

    const handleCreateTest = async () => {
        try {
            await restApi.createABTest(newTest);
            await refetchTests();
            setSnackbar({
                open: true,
                message: "A/B test created successfully!",
                severity: "success",
            });
            setCreateTestDialogOpen(false);
            // Reset form
            setNewTest({
                name: "",
                description: "",
                variantA: {
                    name: "Control",
                    sections: {
                        order: ["hero", "services", "social-proof", "about", "seasonal", "location"],
                        enabled: {
                            hero: true,
                            services: true,
                            "social-proof": true,
                            about: true,
                            seasonal: true,
                            location: true,
                        },
                    },
                },
                variantB: {
                    name: "Variant B",
                    sections: {
                        order: ["hero", "services", "social-proof", "about", "seasonal", "location"],
                        enabled: {
                            hero: true,
                            services: true,
                            "social-proof": true,
                            about: true,
                            seasonal: true,
                            location: true,
                        },
                    },
                },
            });
        } catch (error) {
            setSnackbar({
                open: true,
                message: `Failed to create test: ${(error as Error).message}`,
                severity: "error",
            });
        }
    };

    const handleToggleVariantSection = (variant: "variantA" | "variantB", sectionId: string) => {
        if (sectionId === "hero") return; // Hero is always enabled

        const currentVariant = newTest[variant];
        const currentEnabled = currentVariant.sections.enabled as Record<string, boolean>;

        setNewTest({
            ...newTest,
            [variant]: {
                ...currentVariant,
                sections: {
                    ...currentVariant.sections,
                    enabled: {
                        ...currentEnabled,
                        [sectionId]: !currentEnabled[sectionId],
                    },
                },
            },
        });
    };

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="A/B Testing"
                help="Create and manage A/B tests to optimize homepage performance"
                startComponent={<BackButton to={APP_LINKS.AdminHomepage} ariaLabel="Back to Homepage Management" />}
            />

            <Box p={2}>
                {/* Header */}
                <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box>
                        <Typography variant="h4" gutterBottom>
                            A/B Testing Dashboard
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Create and manage A/B tests for your homepage sections. Track performance metrics
                            and apply winning variants.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Plus size={20} />}
                        onClick={() => setCreateTestDialogOpen(true)}
                    >
                        Create Test
                    </Button>
                </Box>

                {/* Loading State */}
                {testsLoading && (
                    <Box sx={{ width: "100%" }}>
                        <LinearProgress />
                    </Box>
                )}

                {/* Tests List or Empty State */}
                {!testsLoading && (!abTests || abTests.length === 0) && (
                    <Card sx={{ textAlign: "center", py: 8 }}>
                        <CardContent>
                            <Target size={64} color="#ccc" style={{ margin: "0 auto" }} />
                            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                                No A/B Tests Yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                A/B testing helps you optimize your homepage by comparing different
                                versions of content and measuring which performs better.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Click "Create Test" to get started!
                            </Typography>
                        </CardContent>
                    </Card>
                )}

                {/* Active Tests */}
                {!testsLoading && abTests && abTests.length > 0 && (
                    <Box>
                        {abTests.map((test) => {
                            const winner = determineWinner(test.metrics.variantA, test.metrics.variantB);
                            const hasWinner = winner.winner !== "tie";

                            return (
                                <Card key={test.id} sx={{ mb: 3 }}>
                                    <CardContent>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                                mb: 2,
                                            }}
                                        >
                                            <Box>
                                                <Typography variant="h6">{test.name}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {test.description}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={test.status.toUpperCase()}
                                                color={
                                                    test.status === "active"
                                                        ? "success"
                                                        : test.status === "draft"
                                                          ? "default"
                                                          : "primary"
                                                }
                                                size="small"
                                            />
                                        </Box>

                                        <Divider sx={{ my: 2 }} />

                                        {/* Variants Comparison */}
                                        <Grid container spacing={3}>
                                            {/* Variant A */}
                                            <Grid item xs={12} md={6}>
                                                <Card
                                                    variant="outlined"
                                                    sx={{
                                                        backgroundColor:
                                                            hasWinner && winner.winner === "variantA"
                                                                ? "success.light"
                                                                : "background.paper",
                                                    }}
                                                >
                                                    <CardContent>
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                alignItems: "center",
                                                                mb: 2,
                                                            }}
                                                        >
                                                            <Typography variant="subtitle1">
                                                                <strong>{test.variantA.name}</strong>
                                                            </Typography>
                                                            {hasWinner && winner.winner === "variantA" && (
                                                                <Chip
                                                                    label="Winner"
                                                                    color="success"
                                                                    size="small"
                                                                />
                                                            )}
                                                        </Box>

                                                        {/* Metrics */}
                                                        <Box sx={{ mb: 2 }}>
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 1,
                                                                    mb: 1,
                                                                }}
                                                            >
                                                                <Users size={16} />
                                                                <Typography variant="body2">
                                                                    Views: {test.metrics.variantA.views}
                                                                </Typography>
                                                            </Box>
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 1,
                                                                    mb: 1,
                                                                }}
                                                            >
                                                                <Target size={16} />
                                                                <Typography variant="body2">
                                                                    Conversions: {test.metrics.variantA.conversions}
                                                                </Typography>
                                                            </Box>
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 1,
                                                                    mb: 1,
                                                                }}
                                                            >
                                                                <TrendingUp size={16} />
                                                                <Typography variant="body2">
                                                                    Conversion Rate:{" "}
                                                                    {conversionRate(
                                                                        test.metrics.variantA.conversions,
                                                                        test.metrics.variantA.views,
                                                                    ).toFixed(2)}
                                                                    %
                                                                </Typography>
                                                            </Box>
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 1,
                                                                    mb: 1,
                                                                }}
                                                            >
                                                                <Clock size={16} />
                                                                <Typography variant="body2">
                                                                    Bounce Rate:{" "}
                                                                    {bounceRate(
                                                                        test.metrics.variantA.bounces,
                                                                        test.metrics.variantA.views,
                                                                    ).toFixed(2)}
                                                                    %
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            </Grid>

                                            {/* Variant B */}
                                            <Grid item xs={12} md={6}>
                                                <Card
                                                    variant="outlined"
                                                    sx={{
                                                        backgroundColor:
                                                            hasWinner && winner.winner === "variantB"
                                                                ? "success.light"
                                                                : "background.paper",
                                                    }}
                                                >
                                                    <CardContent>
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                alignItems: "center",
                                                                mb: 2,
                                                            }}
                                                        >
                                                            <Typography variant="subtitle1">
                                                                <strong>{test.variantB.name}</strong>
                                                            </Typography>
                                                            {hasWinner && winner.winner === "variantB" && (
                                                                <Chip
                                                                    label="Winner"
                                                                    color="success"
                                                                    size="small"
                                                                />
                                                            )}
                                                        </Box>

                                                        {/* Metrics */}
                                                        <Box sx={{ mb: 2 }}>
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 1,
                                                                    mb: 1,
                                                                }}
                                                            >
                                                                <Users size={16} />
                                                                <Typography variant="body2">
                                                                    Views: {test.metrics.variantB.views}
                                                                </Typography>
                                                            </Box>
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 1,
                                                                    mb: 1,
                                                                }}
                                                            >
                                                                <Target size={16} />
                                                                <Typography variant="body2">
                                                                    Conversions: {test.metrics.variantB.conversions}
                                                                </Typography>
                                                            </Box>
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 1,
                                                                    mb: 1,
                                                                }}
                                                            >
                                                                <TrendingUp size={16} />
                                                                <Typography variant="body2">
                                                                    Conversion Rate:{" "}
                                                                    {conversionRate(
                                                                        test.metrics.variantB.conversions,
                                                                        test.metrics.variantB.views,
                                                                    ).toFixed(2)}
                                                                    %
                                                                </Typography>
                                                            </Box>
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 1,
                                                                    mb: 1,
                                                                }}
                                                            >
                                                                <Clock size={16} />
                                                                <Typography variant="body2">
                                                                    Bounce Rate:{" "}
                                                                    {bounceRate(
                                                                        test.metrics.variantB.bounces,
                                                                        test.metrics.variantB.views,
                                                                    ).toFixed(2)}
                                                                    %
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        </Grid>

                                        {/* Statistical Analysis */}
                                        {hasWinner && (
                                            <Box sx={{ mt: 3 }}>
                                                <Alert severity="info">
                                                    <Typography variant="body2">
                                                        <strong>Statistical Significance:</strong>{" "}
                                                        {getConfidenceDescription(winner.confidence)} (
                                                        {winner.confidence.toFixed(1)}% confidence)
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                                        {getTestRecommendation(
                                                            winner.winner,
                                                            winner.confidence,
                                                            test.metrics.variantA.views + test.metrics.variantB.views,
                                                        )}
                                                    </Typography>
                                                </Alert>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>
                )}
            </Box>

            {/* Create A/B Test Dialog */}
            <Dialog
                open={createTestDialogOpen}
                onClose={() => setCreateTestDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Create A/B Test</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        {/* Test Details */}
                        <Typography variant="h6" gutterBottom>
                            Test Details
                        </Typography>
                        <TextField
                            fullWidth
                            label="Test Name"
                            value={newTest.name}
                            onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                            sx={{ mb: 2 }}
                            placeholder="e.g., Homepage Layout Test"
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Description"
                            value={newTest.description}
                            onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                            sx={{ mb: 4 }}
                            placeholder="What are you testing and why?"
                        />

                        <Divider sx={{ my: 3 }} />

                        {/* Variants Configuration */}
                        <Grid container spacing={3}>
                            {/* Variant A */}
                            <Grid item xs={12} md={6}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Variant A (Control)
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            label="Variant Name"
                                            value={newTest.variantA.name}
                                            onChange={(e) =>
                                                setNewTest({
                                                    ...newTest,
                                                    variantA: { ...newTest.variantA, name: e.target.value },
                                                })
                                            }
                                            sx={{ mb: 2 }}
                                            size="small"
                                        />
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong>Sections:</strong>
                                        </Typography>
                                        {newTest.variantA.sections.order.map((sectionId) => {
                                            const metadata = SECTION_METADATA[sectionId];
                                            if (!metadata) return null;

                                            const enabled = (newTest.variantA.sections.enabled as Record<string, boolean>)[sectionId];

                                            return (
                                                <Box
                                                    key={sectionId}
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        mb: 1,
                                                        p: 1,
                                                        backgroundColor: "background.default",
                                                        borderRadius: 1,
                                                    }}
                                                >
                                                    <Typography variant="body2">{metadata.name}</Typography>
                                                    <Switch
                                                        size="small"
                                                        checked={enabled}
                                                        onChange={() =>
                                                            handleToggleVariantSection("variantA", sectionId)
                                                        }
                                                        disabled={metadata.required}
                                                    />
                                                </Box>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Variant B */}
                            <Grid item xs={12} md={6}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Variant B (Test)
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            label="Variant Name"
                                            value={newTest.variantB.name}
                                            onChange={(e) =>
                                                setNewTest({
                                                    ...newTest,
                                                    variantB: { ...newTest.variantB, name: e.target.value },
                                                })
                                            }
                                            sx={{ mb: 2 }}
                                            size="small"
                                        />
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong>Sections:</strong>
                                        </Typography>
                                        {newTest.variantB.sections.order.map((sectionId) => {
                                            const metadata = SECTION_METADATA[sectionId];
                                            if (!metadata) return null;

                                            const enabled = (newTest.variantB.sections.enabled as Record<string, boolean>)[sectionId];

                                            return (
                                                <Box
                                                    key={sectionId}
                                                    sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        mb: 1,
                                                        p: 1,
                                                        backgroundColor: "background.default",
                                                        borderRadius: 1,
                                                    }}
                                                >
                                                    <Typography variant="body2">{metadata.name}</Typography>
                                                    <Switch
                                                        size="small"
                                                        checked={enabled}
                                                        onChange={() =>
                                                            handleToggleVariantSection("variantB", sectionId)
                                                        }
                                                        disabled={metadata.required}
                                                    />
                                                </Box>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        <Alert severity="info" sx={{ mt: 3 }}>
                            <Typography variant="body2">
                                The test will be created in <strong>draft</strong> status. You'll need to start it
                                separately to begin tracking metrics.
                            </Typography>
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateTestDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateTest}
                        disabled={!newTest.name || !newTest.description}
                    >
                        Create Test
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </PageContainer>
    );
};
