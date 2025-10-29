import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Typography,
    useTheme,
    Alert,
    CircularProgress,
} from "@mui/material";
import { Storage, CheckCircle, Warning, Error as ErrorIcon, PlayArrow } from "@mui/icons-material";
import { BackButton, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { PubSub } from "utils/pubsub";
import { SnackSeverity } from "components/dialogs/Snack/Snack";
import { useStorageStats, useTriggerCleanup, type StorageStats } from "api/rest/hooks";

const helpText = `Storage Management
Monitor and manage your image storage. The system automatically cleans up unlabeled images after 30 days.

Images are considered "unlabeled" when they are not assigned to any gallery, plant, or other content area.`;

export const AdminStoragePage = () => {
    const { palette } = useTheme();
    const { data: stats, loading, error, refetch } = useStorageStats();
    const { mutate: triggerCleanup, loading: triggeringCleanup } = useTriggerCleanup();

    const handleTriggerCleanup = async () => {
        if (!confirm("Trigger manual cleanup now? This will delete unlabeled images older than 30 days.")) {
            return;
        }

        try {
            await triggerCleanup();
            PubSub.get().publishSnack({
                messageKey: "Cleanup started successfully. Refresh in a minute to see results.",
                severity: SnackSeverity.Success,
            });

            // Refresh stats after a delay
            setTimeout(() => {
                void refetch();
            }, 3000);
        } catch (error) {
            PubSub.get().publishSnack({ messageKey: "Failed to trigger cleanup", severity: SnackSeverity.Error });
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Never";
        return new Date(dateString).toLocaleString();
    };

    const getStatusIcon = (status: string | null) => {
        switch (status) {
            case "success":
                return <CheckCircle sx={{ color: palette.success.main }} />;
            case "partial":
                return <Warning sx={{ color: palette.warning.main }} />;
            case "failed":
                return <ErrorIcon sx={{ color: palette.error.main }} />;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!stats) {
        return (
            <Alert severity="error">Failed to load storage statistics</Alert>
        );
    }

    const storagePercent = Math.min((stats.storage.totalSizeMB / 10240) * 100, 100); // Assume 10GB limit

    return (
        <PageContainer>
            <TopBar titleKey="Storage Management" route={{ path: "/" }} helpText={helpText} />

            <Grid container spacing={3}>
                {/* Storage Usage */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                                <Storage sx={{ mr: 1, color: palette.primary.main }} />
                                <Typography variant="h6">Storage Usage</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {stats.storage.totalSizeMB.toFixed(2)} MB / 10 GB ({storagePercent.toFixed(1)}%)
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={storagePercent}
                                sx={{ height: 10, borderRadius: 5, mt: 1 }}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Image Statistics */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Image Statistics
                            </Typography>
                            <TableContainer>
                                <Table size="small">
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>Total Images</TableCell>
                                            <TableCell align="right">{stats.images.total}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Labeled (In Use)</TableCell>
                                            <TableCell align="right">{stats.images.labeled}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Unlabeled</TableCell>
                                            <TableCell align="right">{stats.images.unlabeled}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Ready for Cleanup</TableCell>
                                            <TableCell align="right">
                                                {stats.images.unlabeledOverRetention}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Orphaned Files</TableCell>
                                            <TableCell align="right">
                                                {stats.storage.orphanedFiles}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Cleanup Status */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                                <Typography variant="h6">Cleanup Status</Typography>
                                {stats.cleanup.lastRunStatus && getStatusIcon(stats.cleanup.lastRunStatus)}
                            </Box>
                            <TableContainer>
                                <Table size="small">
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>Last Run</TableCell>
                                            <TableCell align="right">
                                                {formatDate(stats.cleanup.lastRun)}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Status</TableCell>
                                            <TableCell align="right">
                                                {stats.cleanup.lastRunStatus || "N/A"}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Images Deleted</TableCell>
                                            <TableCell align="right">
                                                {stats.cleanup.lastRunDeletedImages}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Files Deleted</TableCell>
                                            <TableCell align="right">
                                                {stats.cleanup.lastRunDeletedFiles}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Next Scheduled</TableCell>
                                            <TableCell align="right">
                                                {formatDate(stats.cleanup.nextScheduledRun)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Retention Policy */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Retention Policy
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Unlabeled images are automatically deleted after {stats.policy.retentionDays} days.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Cleanup runs {stats.policy.frequency} ({stats.policy.schedule}).
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Manual Cleanup */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Manual Cleanup
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Trigger cleanup manually to delete unlabeled images older than 30 days right now.
                            </Typography>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={triggeringCleanup ? <CircularProgress size={20} /> : <PlayArrow />}
                                onClick={handleTriggerCleanup}
                                disabled={triggeringCleanup}
                            >
                                {triggeringCleanup ? "Starting..." : "Run Cleanup Now"}
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <BackButton />
        </PageContainer>
    );
};
