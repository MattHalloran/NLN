import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    CircularProgress,
    Alert,
    Stack,
} from "@mui/material";
import {
    ExpandMore as ExpandMoreIcon,
    Refresh as RefreshIcon,
    FileDownload as DownloadIcon,
    ErrorOutline as ErrorIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
} from "@mui/icons-material";
import { BackButton, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useCallback, useEffect, useState } from "react";
import { restApi, LogEntry, LogStatsResponse } from "api/rest/client";
import { pagePaddingBottom } from "styles";

// Level color mapping
const getLevelColor = (level: string): "error" | "warning" | "info" | "success" | "default" => {
    switch (level.toLowerCase()) {
        case "error":
            return "error";
        case "warn":
            return "warning";
        case "info":
            return "info";
        case "debug":
        case "verbose":
            return "default";
        default:
            return "default";
    }
};

// Level icon mapping
const getLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
        case "error":
            return <ErrorIcon fontSize="small" />;
        case "warn":
            return <WarningIcon fontSize="small" />;
        case "info":
            return <InfoIcon fontSize="small" />;
        default:
            return null;
    }
};

export const AdminSystemLogs = () => {
    // State for logs
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [stats, setStats] = useState<LogStatsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);

    // Filter states
    const [logFile, setLogFile] = useState<"combined" | "error">("combined");
    const [level, setLevel] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [offset, setOffset] = useState(0);

    const linesPerPage = 100;

    // Fetch logs
    const fetchLogs = useCallback(async (resetOffset = false) => {
        setLoading(true);
        setError(null);

        try {
            const currentOffset = resetOffset ? 0 : offset;
            const response = await restApi.getLogs({
                file: logFile,
                lines: linesPerPage,
                offset: currentOffset,
                level: level !== "all" ? level : undefined,
                search: search || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
            });

            if (resetOffset) {
                setLogs(response.logs);
                setOffset(0);
            } else {
                setLogs((prev) => [...prev, ...response.logs]);
            }

            setHasMore(response.hasMore);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch logs");
        } finally {
            setLoading(false);
        }
    }, [logFile, level, search, dateFrom, dateTo, offset]);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        try {
            const response = await restApi.getLogStats();
            setStats(response);
        } catch (err) {
            console.error("Failed to fetch log stats:", err);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchLogs(true);
        fetchStats();
    }, [logFile, level, search, dateFrom, dateTo]);

    // Load more logs
    const handleLoadMore = () => {
        setOffset((prev) => prev + linesPerPage);
    };

    // Watch offset changes
    useEffect(() => {
        if (offset > 0) {
            fetchLogs(false);
        }
    }, [offset]);

    // Export logs to JSON
    const handleExportJSON = () => {
        const dataStr = JSON.stringify(logs, null, 2);
        const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
        const exportFileDefaultName = `logs-${logFile}-${new Date().toISOString()}.json`;

        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();
    };

    // Export logs to CSV
    const handleExportCSV = () => {
        const headers = ["timestamp", "level", "message", "service"];
        const csvRows = [headers.join(",")];

        logs.forEach((log) => {
            const row = [
                log.timestamp,
                log.level,
                `"${log.message.replace(/"/g, '""')}"`, // Escape quotes
                log.service || "",
            ];
            csvRows.push(row.join(","));
        });

        const csvString = csvRows.join("\n");
        const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvString);
        const exportFileDefaultName = `logs-${logFile}-${new Date().toISOString()}.csv`;

        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();
    };

    return (
        <>
            <TopBar display="page" />
            <PageContainer sx={{ pb: pagePaddingBottom }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                    <BackButton to="/admin" />
                    <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
                        System Logs
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => {
                            fetchLogs(true);
                            fetchStats();
                        }}
                    >
                        Refresh
                    </Button>
                </Box>

                {/* Stats Cards */}
                {stats && (
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Combined Logs
                                    </Typography>
                                    <Typography variant="h5">{stats.combinedSize}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Error Logs
                                    </Typography>
                                    <Typography variant="h5">{stats.errorSize}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Errors
                                    </Typography>
                                    <Typography variant="h5" color="error">
                                        {stats.errorCount}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        Last 1000
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Warnings
                                    </Typography>
                                    <Typography variant="h5" color="warning.main">
                                        {stats.warnCount}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        Last 1000
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Info
                                    </Typography>
                                    <Typography variant="h5" color="info.main">
                                        {stats.infoCount}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        Last 1000
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {/* Filters */}
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Filters
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Log File</InputLabel>
                                <Select
                                    value={logFile}
                                    label="Log File"
                                    onChange={(e) => setLogFile(e.target.value as "combined" | "error")}
                                >
                                    <MenuItem value="combined">Combined</MenuItem>
                                    <MenuItem value="error">Errors Only</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Level</InputLabel>
                                <Select value={level} label="Level" onChange={(e) => setLevel(e.target.value)}>
                                    <MenuItem value="all">All Levels</MenuItem>
                                    <MenuItem value="error">Error</MenuItem>
                                    <MenuItem value="warn">Warning</MenuItem>
                                    <MenuItem value="info">Info</MenuItem>
                                    <MenuItem value="debug">Debug</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Search"
                                placeholder="Search message, IP, path..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="From Date"
                                InputLabelProps={{ shrink: true }}
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={2}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="To Date"
                                InputLabelProps={{ shrink: true }}
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={1}>
                            <Button
                                fullWidth
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                    setLevel("all");
                                    setSearch("");
                                    setDateFrom("");
                                    setDateTo("");
                                }}
                                sx={{ height: "40px" }}
                            >
                                Clear
                            </Button>
                        </Grid>
                    </Grid>

                    {/* Export Buttons */}
                    <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleExportJSON}
                            disabled={logs.length === 0}
                        >
                            Export JSON
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleExportCSV}
                            disabled={logs.length === 0}
                        >
                            Export CSV
                        </Button>
                    </Box>
                </Paper>

                {/* Error Alert */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Logs Display */}
                <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                        <Typography variant="h6">
                            Logs ({logs.length} {hasMore && "showing, more available"})
                        </Typography>
                        {loading && <CircularProgress size={24} />}
                    </Box>

                    <Stack spacing={1}>
                        {logs.length === 0 && !loading ? (
                            <Typography color="textSecondary" sx={{ textAlign: "center", py: 4 }}>
                                No logs found matching your filters
                            </Typography>
                        ) : null}

                        {logs.map((log, index) => (
                            <Accordion key={index} disableGutters elevation={0} sx={{ border: "1px solid #e0e0e0" }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                                        {getLevelIcon(log.level)}
                                        <Chip
                                            label={log.level.toUpperCase()}
                                            color={getLevelColor(log.level)}
                                            size="small"
                                            sx={{ minWidth: 70 }}
                                        />
                                        <Typography variant="caption" color="textSecondary" sx={{ minWidth: 150 }}>
                                            {log.timestamp}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                flexGrow: 1,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {log.message}
                                        </Typography>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Box sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                                        <Typography variant="body2" gutterBottom>
                                            <strong>Message:</strong> {log.message}
                                        </Typography>
                                        {log.service && (
                                            <Typography variant="body2" gutterBottom>
                                                <strong>Service:</strong> {log.service}
                                            </Typography>
                                        )}
                                        {log.path && (
                                            <Typography variant="body2" gutterBottom>
                                                <strong>Path:</strong> {log.path}
                                            </Typography>
                                        )}
                                        {log.method && (
                                            <Typography variant="body2" gutterBottom>
                                                <strong>Method:</strong> {log.method}
                                            </Typography>
                                        )}
                                        {log.ip && (
                                            <Typography variant="body2" gutterBottom>
                                                <strong>IP:</strong> {log.ip}
                                            </Typography>
                                        )}
                                        {log.stack && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="body2" gutterBottom>
                                                    <strong>Stack Trace:</strong>
                                                </Typography>
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 1,
                                                        backgroundColor: "#f5f5f5",
                                                        overflow: "auto",
                                                        maxHeight: 300,
                                                    }}
                                                >
                                                    <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{log.stack}</pre>
                                                </Paper>
                                            </Box>
                                        )}
                                        {/* Show all other properties */}
                                        {Object.keys(log)
                                            .filter(
                                                (key) =>
                                                    !["level", "message", "timestamp", "service", "stack", "path", "method", "ip"].includes(key),
                                            )
                                            .map((key) => (
                                                <Typography key={key} variant="body2" gutterBottom>
                                                    <strong>{key}:</strong>{" "}
                                                    {typeof log[key] === "object"
                                                        ? JSON.stringify(log[key], null, 2)
                                                        : String(log[key])}
                                                </Typography>
                                            ))}
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Stack>

                    {/* Load More Button */}
                    {hasMore && (
                        <Box sx={{ textAlign: "center", mt: 3 }}>
                            <Button variant="outlined" onClick={handleLoadMore} disabled={loading}>
                                {loading ? "Loading..." : "Load More"}
                            </Button>
                        </Box>
                    )}
                </Paper>
            </PageContainer>
        </>
    );
};
