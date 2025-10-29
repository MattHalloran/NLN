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
    TableHead,
    TableRow,
    Typography,
    useTheme,
    Alert,
    CircularProgress,
    Chip,
    IconButton,
    Collapse,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Pagination,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip,
    List,
    ListItem,
    ListItemText,
    Divider,
} from "@mui/material";
import {
    Storage,
    CheckCircle,
    Warning,
    Error as ErrorIcon,
    PlayArrow,
    History,
    ExpandMore,
    Delete,
    Refresh,
    Visibility,
    FileDownload,
    TrendingUp,
    Schedule,
} from "@mui/icons-material";
import { BackButton, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { PubSub } from "utils/pubsub";
import { SnackSeverity } from "components/dialogs/Snack/Snack";
import {
    useStorageStats,
    useTriggerCleanup,
    useCleanupHistory,
    useCleanupPreview,
    useOrphanedFiles,
    useOrphanedRecords,
    useCleanOrphanedFiles,
    useCleanOrphanedRecords,
    useRecentActivity,
} from "api/rest/hooks";
import type { StorageStats, CleanupPreview } from "api/rest/client";
import { useState, useCallback } from "react";

const helpText = `Storage Management
Monitor and manage your image storage. The system automatically cleans up unlabeled images after 30 days.

Images are considered "unlabeled" when they are not assigned to any gallery, plant, or other content area.

Features:
• View storage usage and cleanup history
• Preview cleanup before running
• Manage orphaned files and records
• Track recent activity
• Manual cleanup triggers`;

export const AdminStoragePage = () => {
    const { palette } = useTheme();
    const { data: stats, loading, error, refetch } = useStorageStats();
    const { mutate: triggerCleanup, loading: triggeringCleanup } = useTriggerCleanup();

    // Cleanup history state
    const [historyPage, setHistoryPage] = useState(0);
    const [historyLimit] = useState(10);
    const [historyStatus, setHistoryStatus] = useState<string>("all");
    const { data: historyData, refetch: refetchHistory } = useCleanupHistory({
        status: historyStatus === "all" ? undefined : historyStatus,
        limit: historyLimit,
        offset: historyPage * historyLimit,
    });

    // Preview modal state
    const [previewOpen, setPreviewOpen] = useState(false);
    const { data: previewData, refetch: refetchPreview } = useCleanupPreview();

    // Orphaned items state
    const [orphanedFilesExpanded, setOrphanedFilesExpanded] = useState(false);
    const [orphanedRecordsExpanded, setOrphanedRecordsExpanded] = useState(false);
    const { data: orphanedFilesData, refetch: refetchOrphanedFiles } = useOrphanedFiles();
    const { data: orphanedRecordsData, refetch: refetchOrphanedRecords } = useOrphanedRecords();
    const { mutate: cleanOrphanedFiles, loading: cleaningFiles } = useCleanOrphanedFiles();
    const { mutate: cleanOrphanedRecords, loading: cleaningRecords } = useCleanOrphanedRecords();

    // Recent activity state
    const [activityExpanded, setActivityExpanded] = useState(false);
    const { data: recentActivity } = useRecentActivity();

    // Error details state
    const [errorExpanded, setErrorExpanded] = useState(false);

    const handleOpenPreview = useCallback(async () => {
        await refetchPreview();
        setPreviewOpen(true);
    }, [refetchPreview]);

    const handleTriggerCleanup = useCallback(async (fromPreview = false) => {
        if (fromPreview) {
            setPreviewOpen(false);
        }

        try {
            await triggerCleanup();
            PubSub.get().publishSnack({
                message: "Cleanup started successfully. Check back in a minute for results.",
                severity: SnackSeverity.Success,
            });

            // Refresh data after delay
            setTimeout(() => {
                void refetch();
                void refetchHistory();
            }, 3000);
        } catch (error) {
            PubSub.get().publishSnack({
                message: "Failed to trigger cleanup",
                severity: SnackSeverity.Error,
            });
        }
    }, [triggerCleanup, refetch, refetchHistory]);

    const handleCleanOrphanedFiles = useCallback(async () => {
        if (!confirm("Delete all orphaned files? This cannot be undone.")) {
            return;
        }

        try {
            const result = await cleanOrphanedFiles();
            PubSub.get().publishSnack({
                message: `Deleted ${result.deletedCount} orphaned files (freed ${result.freedMB.toFixed(2)} MB)`,
                severity: SnackSeverity.Success,
            });

            await refetch();
            await refetchOrphanedFiles();
        } catch (error) {
            PubSub.get().publishSnack({
                message: "Failed to clean orphaned files",
                severity: SnackSeverity.Error,
            });
        }
    }, [cleanOrphanedFiles, refetch, refetchOrphanedFiles]);

    const handleCleanOrphanedRecords = useCallback(async () => {
        if (!confirm("Delete all orphaned database records? This cannot be undone.")) {
            return;
        }

        try {
            const result = await cleanOrphanedRecords();
            PubSub.get().publishSnack({
                message: `Deleted ${result.deletedCount} orphaned records`,
                severity: SnackSeverity.Success,
            });

            await refetch();
            await refetchOrphanedRecords();
        } catch (error) {
            PubSub.get().publishSnack({
                message: "Failed to clean orphaned records",
                severity: SnackSeverity.Error,
            });
        }
    }, [cleanOrphanedRecords, refetch, refetchOrphanedRecords]);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Never";
        return new Date(dateString).toLocaleString();
    };

    const formatDuration = (ms: number | null) => {
        if (!ms) return "N/A";
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
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

    const getStatusColor = (status: string | null): "success" | "warning" | "error" | "default" => {
        switch (status) {
            case "success":
                return "success";
            case "partial":
                return "warning";
            case "failed":
                return "error";
            default:
                return "default";
        }
    };

    const exportHistoryCSV = useCallback(() => {
        if (!historyData?.history) return;

        const headers = [
            "Date",
            "Status",
            "Images Deleted",
            "Files Deleted",
            "Orphaned Files",
            "Orphaned Records",
            "Duration (ms)",
            "Errors",
        ];

        const rows = historyData.history.map((entry) => [
            formatDate(entry.created_at),
            entry.status,
            entry.deleted_images,
            entry.deleted_files,
            entry.orphaned_files,
            entry.orphaned_records,
            entry.duration_ms || "",
            entry.errors || "",
        ]);

        const csv = [
            headers.join(","),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `cleanup-history-${new Date().toISOString()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [historyData]);

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!stats) {
        return <Alert severity="error">Failed to load storage statistics</Alert>;
    }

    const storagePercent = stats.storage.usagePercent;
    const hasErrors = stats.cleanup.lastRunErrors && stats.cleanup.lastRunErrors.length > 0;

    return (
        <PageContainer>
            <TopBar display="page" title="Storage Management" />

            <Grid container spacing={3}>
                {/* Storage Usage */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                                <Storage sx={{ mr: 1, color: palette.primary.main }} />
                                <Typography variant="h6">Storage Usage</Typography>
                                <Box sx={{ ml: "auto", display: "flex", gap: 2 }}>
                                    <Chip
                                        icon={<TrendingUp />}
                                        label={`${stats.storage.averageImageSizeMB.toFixed(2)} MB avg/image`}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>
                            </Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {stats.storage.totalSizeMB.toFixed(2)} MB / {(stats.storage.maxStorageMB / 1024).toFixed(1)} GB (
                                {storagePercent.toFixed(1)}%)
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={storagePercent}
                                sx={{
                                    height: 10,
                                    borderRadius: 5,
                                    mt: 1,
                                    backgroundColor: palette.grey[200],
                                    "& .MuiLinearProgress-bar": {
                                        backgroundColor:
                                            storagePercent > 90
                                                ? palette.error.main
                                                : storagePercent > 70
                                                  ? palette.warning.main
                                                  : palette.success.main,
                                    },
                                }}
                            />
                            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Available: {stats.storage.availableStorageMB.toFixed(2)} MB
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {stats.storage.filesOnDisk} files on disk
                                </Typography>
                            </Box>
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
                                            <TableCell align="right">
                                                <Chip label={stats.images.labeled} size="small" color="success" />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Unlabeled</TableCell>
                                            <TableCell align="right">
                                                <Chip label={stats.images.unlabeled} size="small" color="warning" />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Ready for Cleanup</TableCell>
                                            <TableCell align="right">
                                                <Chip label={stats.images.unlabeledOverRetention} size="small" color="error" />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Orphaned Files</TableCell>
                                            <TableCell align="right">
                                                <Chip label={stats.storage.orphanedFiles} size="small" color="default" />
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
                                            <TableCell align="right">{formatDate(stats.cleanup.lastRun)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Status</TableCell>
                                            <TableCell align="right">
                                                <Chip
                                                    label={stats.cleanup.lastRunStatus || "N/A"}
                                                    size="small"
                                                    color={getStatusColor(stats.cleanup.lastRunStatus)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Images Deleted</TableCell>
                                            <TableCell align="right">{stats.cleanup.lastRunDeletedImages}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Files Deleted</TableCell>
                                            <TableCell align="right">{stats.cleanup.lastRunDeletedFiles}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Duration</TableCell>
                                            <TableCell align="right">
                                                {formatDuration(stats.cleanup.lastRunDurationMs)}
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Next Scheduled</TableCell>
                                            <TableCell align="right">
                                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                                                    <Schedule fontSize="small" />
                                                    {formatDate(stats.cleanup.nextScheduledRun)}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Error Section */}
                            {hasErrors && (
                                <Box sx={{ mt: 2 }}>
                                    <Button
                                        size="small"
                                        onClick={() => setErrorExpanded(!errorExpanded)}
                                        startIcon={<ErrorIcon />}
                                        color="error"
                                        endIcon={<ExpandMore sx={{ transform: errorExpanded ? "rotate(180deg)" : "none" }} />}
                                    >
                                        {stats.cleanup.lastRunErrors.length} Errors
                                    </Button>
                                    <Collapse in={errorExpanded}>
                                        <Box sx={{ mt: 1, p: 1, bgcolor: palette.error.light + "20", borderRadius: 1 }}>
                                            {stats.cleanup.lastRunErrors.map((error, idx) => (
                                                <Typography key={idx} variant="caption" sx={{ display: "block", mb: 0.5 }}>
                                                    • {error}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </Collapse>
                                </Box>
                            )}

                            {/* Job Queue Status */}
                            <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${palette.divider}` }}>
                                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                    Queue Status
                                </Typography>
                                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                    <Chip label={`Active: ${stats.cleanup.jobStatus.active}`} size="small" color="primary" />
                                    <Chip label={`Waiting: ${stats.cleanup.jobStatus.waiting}`} size="small" />
                                    <Chip label={`Completed: ${stats.cleanup.jobStatus.completed}`} size="small" color="success" />
                                    <Chip label={`Failed: ${stats.cleanup.jobStatus.failed}`} size="small" color="error" />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Retention Policy */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Retention Policy
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                • Unlabeled images are deleted after {stats.policy.retentionDays} days
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                • Cleanup runs {stats.policy.frequency} ({stats.policy.schedule})
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                • Backups retained for {stats.policy.backupRetentionDays} days
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Manual Cleanup */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Manual Cleanup
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Trigger cleanup to delete unlabeled images older than 30 days right now.
                            </Typography>
                            <Box sx={{ display: "flex", gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<Visibility />}
                                    onClick={handleOpenPreview}
                                    disabled={triggeringCleanup}
                                >
                                    Preview Cleanup
                                </Button>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={triggeringCleanup ? <CircularProgress size={20} /> : <PlayArrow />}
                                    onClick={() => handleTriggerCleanup(false)}
                                    disabled={triggeringCleanup}
                                >
                                    {triggeringCleanup ? "Starting..." : "Run Cleanup Now"}
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Orphaned Files Section */}
                <Grid item xs={12}>
                    <Accordion expanded={orphanedFilesExpanded} onChange={() => setOrphanedFilesExpanded(!orphanedFilesExpanded)}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                                <Warning color="warning" />
                                <Typography variant="h6">Orphaned Files</Typography>
                                <Chip
                                    label={orphanedFilesData?.totalCount || 0}
                                    size="small"
                                    color="warning"
                                    sx={{ ml: 1 }}
                                />
                                {orphanedFilesData && orphanedFilesData.totalCount > 0 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                                        {orphanedFilesData.totalSizeMB.toFixed(2)} MB can be freed
                                    </Typography>
                                )}
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Files on disk that have no corresponding database record. These can be safely deleted.
                            </Typography>

                            {orphanedFilesData && orphanedFilesData.totalCount > 0 ? (
                                <>
                                    <TableContainer sx={{ mt: 2, maxHeight: 400 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>File Name</TableCell>
                                                    <TableCell align="right">Size (MB)</TableCell>
                                                    <TableCell align="right">Last Modified</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {orphanedFilesData.orphanedFiles.slice(0, 20).map((file) => (
                                                    <TableRow key={file.name}>
                                                        <TableCell>{file.name}</TableCell>
                                                        <TableCell align="right">{file.sizeMB.toFixed(2)}</TableCell>
                                                        <TableCell align="right">{formatDate(file.lastModified)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    {orphanedFilesData.totalCount > 20 && (
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                                            Showing 20 of {orphanedFilesData.totalCount} files
                                        </Typography>
                                    )}
                                    <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                                        <Button
                                            variant="contained"
                                            color="error"
                                            startIcon={cleaningFiles ? <CircularProgress size={20} /> : <Delete />}
                                            onClick={handleCleanOrphanedFiles}
                                            disabled={cleaningFiles}
                                        >
                                            Delete All Orphaned Files
                                        </Button>
                                        <IconButton onClick={refetchOrphanedFiles} size="small">
                                            <Refresh />
                                        </IconButton>
                                    </Box>
                                </>
                            ) : (
                                <Alert severity="success" sx={{ mt: 2 }}>
                                    No orphaned files found!
                                </Alert>
                            )}
                        </AccordionDetails>
                    </Accordion>
                </Grid>

                {/* Orphaned Records Section */}
                <Grid item xs={12}>
                    <Accordion
                        expanded={orphanedRecordsExpanded}
                        onChange={() => setOrphanedRecordsExpanded(!orphanedRecordsExpanded)}
                    >
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Warning color="warning" />
                                <Typography variant="h6">Orphaned Database Records</Typography>
                                <Chip
                                    label={orphanedRecordsData?.totalCount || 0}
                                    size="small"
                                    color="warning"
                                    sx={{ ml: 1 }}
                                />
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Database records with no corresponding files on disk. These can be safely deleted.
                            </Typography>

                            {orphanedRecordsData && orphanedRecordsData.totalCount > 0 ? (
                                <>
                                    <TableContainer sx={{ mt: 2, maxHeight: 400 }}>
                                        <Table size="small" stickyHeader>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Hash</TableCell>
                                                    <TableCell>Alt Text</TableCell>
                                                    <TableCell>Labels</TableCell>
                                                    <TableCell>Reason</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {orphanedRecordsData.orphanedRecords.slice(0, 20).map((record) => (
                                                    <TableRow key={record.hash}>
                                                        <TableCell>
                                                            <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                                                                {record.hash.substring(0, 12)}...
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>{record.alt || "-"}</TableCell>
                                                        <TableCell>
                                                            {record.labels.length > 0 ? record.labels.join(", ") : "-"}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {record.reason}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    {orphanedRecordsData.totalCount > 20 && (
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                                            Showing 20 of {orphanedRecordsData.totalCount} records
                                        </Typography>
                                    )}
                                    <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                                        <Button
                                            variant="contained"
                                            color="error"
                                            startIcon={cleaningRecords ? <CircularProgress size={20} /> : <Delete />}
                                            onClick={handleCleanOrphanedRecords}
                                            disabled={cleaningRecords}
                                        >
                                            Delete All Orphaned Records
                                        </Button>
                                        <IconButton onClick={refetchOrphanedRecords} size="small">
                                            <Refresh />
                                        </IconButton>
                                    </Box>
                                </>
                            ) : (
                                <Alert severity="success" sx={{ mt: 2 }}>
                                    No orphaned records found!
                                </Alert>
                            )}
                        </AccordionDetails>
                    </Accordion>
                </Grid>

                {/* Recent Activity Section */}
                <Grid item xs={12}>
                    <Accordion expanded={activityExpanded} onChange={() => setActivityExpanded(!activityExpanded)}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <History color="primary" />
                                <Typography variant="h6">Recent Activity</Typography>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            {recentActivity ? (
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={4}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Recent Uploads
                                        </Typography>
                                        <List dense>
                                            {recentActivity.recentUploads.slice(0, 5).map((upload) => (
                                                <ListItem key={upload.hash}>
                                                    <ListItemText
                                                        primary={upload.alt || upload.hash.substring(0, 12)}
                                                        secondary={`${formatDate(upload.createdAt)} - ${upload.labels.join(", ")}`}
                                                        primaryTypographyProps={{ variant: "body2" }}
                                                        secondaryTypographyProps={{ variant: "caption" }}
                                                    />
                                                </ListItem>
                                            ))}
                                            {recentActivity.recentUploads.length === 0 && (
                                                <Typography variant="caption" color="text.secondary">
                                                    No recent uploads
                                                </Typography>
                                            )}
                                        </List>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Recently Unlabeled
                                        </Typography>
                                        <List dense>
                                            {recentActivity.recentlyUnlabeled.slice(0, 5).map((img) => (
                                                <ListItem key={img.hash}>
                                                    <ListItemText
                                                        primary={img.alt || img.hash.substring(0, 12)}
                                                        secondary={formatDate(img.unlabeledSince)}
                                                        primaryTypographyProps={{ variant: "body2" }}
                                                        secondaryTypographyProps={{ variant: "caption" }}
                                                    />
                                                </ListItem>
                                            ))}
                                            {recentActivity.recentlyUnlabeled.length === 0 && (
                                                <Typography variant="caption" color="text.secondary">
                                                    No recently unlabeled images
                                                </Typography>
                                            )}
                                        </List>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Recent Cleanups
                                        </Typography>
                                        <List dense>
                                            {recentActivity.recentCleanups.map((cleanup, idx) => (
                                                <ListItem key={idx}>
                                                    <ListItemText
                                                        primary={`${cleanup.status} - ${cleanup.deleted_images} images`}
                                                        secondary={formatDate(cleanup.created_at)}
                                                        primaryTypographyProps={{ variant: "body2" }}
                                                        secondaryTypographyProps={{ variant: "caption" }}
                                                    />
                                                </ListItem>
                                            ))}
                                            {recentActivity.recentCleanups.length === 0 && (
                                                <Typography variant="caption" color="text.secondary">
                                                    No recent cleanups
                                                </Typography>
                                            )}
                                        </List>
                                    </Grid>
                                </Grid>
                            ) : (
                                <CircularProgress size={24} />
                            )}
                        </AccordionDetails>
                    </Accordion>
                </Grid>

                {/* Cleanup History */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                                <Typography variant="h6">Cleanup History</Typography>
                                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <InputLabel>Status</InputLabel>
                                        <Select
                                            value={historyStatus}
                                            label="Status"
                                            onChange={(e) => {
                                                setHistoryStatus(e.target.value);
                                                setHistoryPage(0);
                                            }}
                                        >
                                            <MenuItem value="all">All</MenuItem>
                                            <MenuItem value="success">Success</MenuItem>
                                            <MenuItem value="partial">Partial</MenuItem>
                                            <MenuItem value="failed">Failed</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Tooltip title="Export to CSV">
                                        <IconButton onClick={exportHistoryCSV} size="small">
                                            <FileDownload />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Refresh">
                                        <IconButton onClick={() => void refetchHistory()} size="small">
                                            <Refresh />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            </Box>

                            {historyData && historyData.history.length > 0 ? (
                                <>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Date</TableCell>
                                                    <TableCell>Status</TableCell>
                                                    <TableCell align="right">Images</TableCell>
                                                    <TableCell align="right">Files</TableCell>
                                                    <TableCell align="right">Orphaned</TableCell>
                                                    <TableCell align="right">Duration</TableCell>
                                                    <TableCell>Errors</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {historyData.history.map((entry) => (
                                                    <TableRow key={entry.id}>
                                                        <TableCell>{formatDate(entry.created_at)}</TableCell>
                                                        <TableCell>
                                                            <Chip label={entry.status} size="small" color={getStatusColor(entry.status)} />
                                                        </TableCell>
                                                        <TableCell align="right">{entry.deleted_images}</TableCell>
                                                        <TableCell align="right">{entry.deleted_files}</TableCell>
                                                        <TableCell align="right">
                                                            {entry.orphaned_files} / {entry.orphaned_records}
                                                        </TableCell>
                                                        <TableCell align="right">{formatDuration(entry.duration_ms)}</TableCell>
                                                        <TableCell>
                                                            {entry.errors ? (
                                                                <Tooltip title={entry.errors}>
                                                                    <ErrorIcon color="error" fontSize="small" />
                                                                </Tooltip>
                                                            ) : (
                                                                "-"
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>

                                    {historyData.pagination.total > historyLimit && (
                                        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                                            <Pagination
                                                count={Math.ceil(historyData.pagination.total / historyLimit)}
                                                page={historyPage + 1}
                                                onChange={(_, page) => setHistoryPage(page - 1)}
                                                color="primary"
                                            />
                                        </Box>
                                    )}
                                </>
                            ) : (
                                <Alert severity="info">No cleanup history available</Alert>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Cleanup Preview Modal */}
            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Cleanup Preview</DialogTitle>
                <DialogContent>
                    {previewData ? (
                        <Box>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                This preview shows what would be deleted if you run cleanup now.
                            </Alert>

                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="h4" color="error" gutterBottom>
                                                {previewData.unlabeledImages.count}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Unlabeled Images
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {previewData.unlabeledImages.estimatedFreedMB.toFixed(2)} MB
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="h4" color="warning.main" gutterBottom>
                                                {previewData.orphanedFiles.count}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Orphaned Files
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {previewData.orphanedFiles.estimatedFreedMB.toFixed(2)} MB
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Typography variant="h4" color="primary" gutterBottom>
                                                {previewData.totalEstimatedFreedMB.toFixed(2)}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Total MB Freed
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" gutterBottom>
                                Age Breakdown
                            </Typography>
                            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                                <Chip label={`30-60 days: ${previewData.unlabeledImages.ageBreakdown["30-60days"]}`} />
                                <Chip label={`60-90 days: ${previewData.unlabeledImages.ageBreakdown["60-90days"]}`} />
                                <Chip label={`90+ days: ${previewData.unlabeledImages.ageBreakdown["90+days"]}`} />
                            </Box>

                            {previewData.unlabeledImages.samples.length > 0 && (
                                <>
                                    <Typography variant="h6" gutterBottom>
                                        Sample Images (First 10)
                                    </Typography>
                                    <TableContainer sx={{ maxHeight: 300 }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Hash</TableCell>
                                                    <TableCell>Alt Text</TableCell>
                                                    <TableCell>Unlabeled Since</TableCell>
                                                    <TableCell align="right">Files</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {previewData.unlabeledImages.samples.map((sample) => (
                                                    <TableRow key={sample.hash}>
                                                        <TableCell>
                                                            <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                                                                {sample.hash.substring(0, 12)}...
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>{sample.alt || "-"}</TableCell>
                                                        <TableCell>{formatDate(sample.unlabeledSince)}</TableCell>
                                                        <TableCell align="right">{sample.fileCount}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            )}
                        </Box>
                    ) : (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                            <CircularProgress />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleTriggerCleanup(true)}
                        disabled={triggeringCleanup || !previewData}
                        startIcon={triggeringCleanup ? <CircularProgress size={20} /> : <PlayArrow />}
                    >
                        Run Cleanup
                    </Button>
                </DialogActions>
            </Dialog>

            <BackButton to="/admin" />
        </PageContainer>
    );
};
