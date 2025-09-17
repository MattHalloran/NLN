import {
    Alert,
    AlertTitle,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Collapse,
    Container,
    Divider,
    IconButton,
    Paper,
    Stack,
    TextField,
    ThemeProvider,
    Typography,
    useMediaQuery,
    useTheme
} from "@mui/material";
import {
    BugReport as BugReportIcon,
    Close as CloseIcon,
    ContentCopy as CopyIcon,
    ExpandLess,
    ExpandMore,
    Feedback as FeedbackIcon,
    Home as HomeIcon,
    Refresh as RefreshIcon,
    Warning as WarningIcon
} from "@mui/icons-material";
import { ErrorBoundaryProps } from "components/types";
import { Component, ErrorInfo, ReactNode } from "react";
import { stringifySearchParams } from "route";
import { themes } from "utils";

interface ErrorContext {
    timestamp: string;
    userAgent: string;
    url: string;
    userId?: string;
    sessionId?: string;
    buildVersion?: string;
    previousErrors: number;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    errorId: string;
    context: ErrorContext;
    showDetails: boolean;
    showFeedback: boolean;
    feedbackText: string;
    retryCount: number;
    isRetrying: boolean;
}

interface ErrorCategory {
    type: 'network' | 'chunk' | 'runtime' | 'permission' | 'unknown';
    severity: 'low' | 'medium' | 'high' | 'critical';
    recoverable: boolean;
    userMessage: string;
    technicalMessage: string;
}

/**
 * Enhanced Error Boundary with professional UI, detailed error tracking,
 * smart recovery mechanisms, and comprehensive reporting capabilities.
 * 
 * Features:
 * - Professional Material-UI themed design
 * - Detailed error context and stack traces
 * - Smart recovery strategies based on error type
 * - Development vs production modes
 * - Accessibility support
 * - User feedback collection
 * - Error categorization and analytics
 * 
 * NOTE: Must be a class component for error boundary lifecycle methods.
 * See https://legacy.reactjs.org/docs/error-boundaries.html
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    private retryTimer?: NodeJS.Timeout;
    private errorReportingEnabled: boolean;

    constructor(props: ErrorBoundaryProps) {
        super(props);
        
        // Use prop to determine reporting, default to true in production
        this.errorReportingEnabled = props.enableReporting ?? import.meta.env.PROD;
        
        const context: ErrorContext = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            buildVersion: import.meta.env.VITE_BUILD_VERSION || 'unknown',
            previousErrors: this.getPreviousErrorCount(),
        };

        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: '',
            context,
            showDetails: false,
            showFeedback: false,
            feedbackText: '',
            retryCount: 0,
            isRetrying: false,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        return {
            hasError: true,
            error,
            errorId,
            showDetails: import.meta.env.DEV,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            errorInfo,
            context: {
                ...this.state.context,
                timestamp: new Date().toISOString(),
            }
        });

        // Call optional error callback
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Log error details
        this.logError(error, errorInfo);
        
        // Report to external services if enabled
        if (this.errorReportingEnabled) {
            this.reportError(error, errorInfo);
        }
        
        // Track error occurrence
        this.trackErrorOccurrence();
    }

    componentWillUnmount() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
        }
    }

    private categorizeError(error: Error): ErrorCategory {
        const message = error.message.toLowerCase();
        const name = error.name.toLowerCase();
        
        // Chunk loading / Dynamic import errors (check BEFORE network errors)
        if (message.includes('dynamically imported module') || 
            message.includes('failed to fetch dynamically') ||
            message.includes('chunk') || 
            message.includes('loading css chunk') ||
            message.includes('loading chunk') ||
            name.includes('chunkloaderror')) {
            return {
                type: 'chunk',
                severity: 'medium',
                recoverable: true,
                userMessage: 'Failed to load application resources. Please refresh the page.',
                technicalMessage: 'Dynamic module import failed. This often happens after deployments.'
            };
        }
        
        // Network-related errors (but NOT dynamic imports)
        if ((message.includes('network') || message.includes('fetch')) && 
            !message.includes('dynamically') && 
            !message.includes('module')) {
            return {
                type: 'network',
                severity: 'medium',
                recoverable: true,
                userMessage: 'Connection issue detected. Please check your internet connection.',
                technicalMessage: 'Network request failed or timed out.'
            };
        }
        
        // Permission errors
        if (message.includes('permission') || message.includes('denied') || message.includes('unauthorized')) {
            return {
                type: 'permission',
                severity: 'high',
                recoverable: false,
                userMessage: 'You don\'t have permission to perform this action.',
                technicalMessage: 'Access denied or insufficient permissions.'
            };
        }
        
        // Critical runtime errors
        if (name.includes('typeerror') || name.includes('referenceerror')) {
            return {
                type: 'runtime',
                severity: 'critical',
                recoverable: false,
                userMessage: 'A critical error occurred in the application.',
                technicalMessage: 'Runtime error in component or business logic.'
            };
        }
        
        // Unknown errors
        return {
            type: 'unknown',
            severity: 'high',
            recoverable: true,
            userMessage: 'An unexpected error occurred.',
            technicalMessage: 'Unclassified error requiring investigation.'
        };
    }

    private logError(error: Error, errorInfo: ErrorInfo) {
        const category = this.categorizeError(error);
        
        console.group(`🚨 Error Boundary: ${category.type.toUpperCase()} ERROR`);
        console.error('Error ID:', this.state.errorId);
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.error('Context:', this.state.context);
        console.error('Category:', category);
        console.groupEnd();
    }

    private async reportError(error: Error, errorInfo: ErrorInfo) {
        try {
            const errorReport = {
                errorId: this.state.errorId,
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
                context: this.state.context,
                category: this.categorizeError(error),
                retryCount: this.state.retryCount,
            };
            
            // In a real app, send to error reporting service (Sentry, LogRocket, etc.)
            console.log('📊 Error report prepared for external service:', errorReport);
            
            // Example: await sendToErrorService(errorReport);
        } catch (reportingError) {
            console.error('Failed to report error:', reportingError);
        }
    }

    private trackErrorOccurrence() {
        const errorCount = this.getPreviousErrorCount() + 1;
        try {
            localStorage.setItem('errorBoundary_errorCount', errorCount.toString());
            localStorage.setItem('errorBoundary_lastError', Date.now().toString());
        } catch (e) {
            // Storage not available
        }
    }

    private getPreviousErrorCount(): number {
        try {
            return parseInt(localStorage.getItem('errorBoundary_errorCount') || '0', 10);
        } catch {
            return 0;
        }
    }

    private handleRetry = () => {
        this.setState({ isRetrying: true });
        
        this.retryTimer = setTimeout(() => {
            this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
                isRetrying: false,
                retryCount: this.state.retryCount + 1,
            });
        }, 1000);
    };

    private handleRefresh = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.assign('/');
    };

    private handleCopyError = async () => {
        const errorReport = {
            errorId: this.state.errorId,
            timestamp: this.state.context.timestamp,
            error: this.state.error?.toString(),
            stack: this.state.error?.stack,
            url: this.state.context.url,
        };
        
        try {
            await navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
            // Could show a snack notification here
        } catch (e) {
            console.error('Failed to copy error details:', e);
        }
    };

    private handleSendFeedback = () => {
        const category = this.categorizeError(this.state.error!);
        const subject = `Error Report: ${category.type} - ${this.state.errorId}`;
        const body = `Error Details:
${JSON.stringify({
            errorId: this.state.errorId,
            message: this.state.error?.message,
            timestamp: this.state.context.timestamp,
            url: this.state.context.url,
            userFeedback: this.state.feedbackText,
        }, null, 2)}`;
        
        const mailToUrl = `mailto:info@newlifenurseryinc.com${stringifySearchParams({ subject, body })}`;
        window.open(mailToUrl, '_blank');
        
        this.setState({ showFeedback: false, feedbackText: '' });
    };

    private resetError = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: '',
            showDetails: false,
            showFeedback: false,
            feedbackText: '',
            isRetrying: false,
        });
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        // Use custom fallback if provided
        if (this.props.fallback) {
            const FallbackComponent = this.props.fallback;
            return (
                <FallbackComponent
                    error={this.state.error!}
                    errorInfo={this.state.errorInfo!}
                    resetError={this.resetError}
                />
            );
        }

        return (
            <ErrorBoundaryUI
                state={this.state}
                category={this.categorizeError(this.state.error!)}
                onRetry={this.handleRetry}
                onRefresh={this.handleRefresh}
                onGoHome={this.handleGoHome}
                onCopyError={this.handleCopyError}
                onSendFeedback={this.handleSendFeedback}
                onToggleDetails={() => this.setState({ showDetails: !this.state.showDetails })}
                onToggleFeedback={() => this.setState({ showFeedback: !this.state.showFeedback })}
                onFeedbackChange={(text: string) => this.setState({ feedbackText: text })}
            />
        );
    }
}

// Separate functional component for the UI to enable hooks usage
interface ErrorBoundaryUIProps {
    state: ErrorBoundaryState;
    category: ErrorCategory;
    onRetry: () => void;
    onRefresh: () => void;
    onGoHome: () => void;
    onCopyError: () => void;
    onSendFeedback: () => void;
    onToggleDetails: () => void;
    onToggleFeedback: () => void;
    onFeedbackChange: (text: string) => void;
}

const ErrorBoundaryUI = ({
    state,
    category,
    onRetry,
    onRefresh,
    onGoHome,
    onCopyError,
    onSendFeedback,
    onToggleDetails,
    onToggleFeedback,
    onFeedbackChange,
}: ErrorBoundaryUIProps) => {
    // Try to use the current theme, fallback to light theme if not available
    let theme;
    try {
        theme = useTheme();
    } catch {
        theme = themes.light;
    }
    
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isDevelopment = import.meta.env.DEV;

    const getSeverityColor = (severity: ErrorCategory['severity']) => {
        // Use more muted, professional colors
        switch (severity) {
            case 'critical': return theme.palette.text.primary;
            case 'high': return theme.palette.text.primary;
            case 'medium': return theme.palette.text.secondary;
            case 'low': return theme.palette.text.secondary;
            default: return theme.palette.text.primary;
        }
    };

    const getSeverityIcon = () => {
        // Use consistent neutral icon color
        const iconColor = theme.palette.text.secondary;
        switch (category.severity) {
            case 'critical': return <BugReportIcon sx={{ fontSize: 48, color: iconColor }} />;
            case 'high': return <WarningIcon sx={{ fontSize: 48, color: iconColor }} />;
            case 'medium': return <WarningIcon sx={{ fontSize: 48, color: iconColor }} />;
            case 'low': return <WarningIcon sx={{ fontSize: 48, color: iconColor }} />;
            default: return <BugReportIcon sx={{ fontSize: 48, color: iconColor }} />;
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: theme.palette.background.default,
                    p: 2,
                }}
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
            >
                <Container maxWidth="md">
                    <Card
                        elevation={3}
                        sx={{
                            maxWidth: '100%',
                            bgcolor: theme.palette.background.paper,
                            borderRadius: 3,
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <Box
                            sx={{
                                bgcolor: theme.palette.background.paper,
                                borderBottom: `1px solid ${theme.palette.divider}`,
                                p: 4,
                                textAlign: 'center',
                            }}
                        >
                            <Avatar
                                sx={{
                                    bgcolor: theme.palette.grey[100],
                                    width: 80,
                                    height: 80,
                                    mx: 'auto',
                                    mb: 2,
                                }}
                            >
                                {getSeverityIcon()}
                            </Avatar>
                            <Typography variant="h4" component="h1" fontWeight="600" gutterBottom color="text.primary">
                                {category.userMessage}
                            </Typography>
                            <Chip
                                label={`${category.type.toUpperCase()} ERROR`}
                                size="small"
                                variant="outlined"
                                sx={{
                                    borderColor: theme.palette.divider,
                                    color: theme.palette.text.secondary,
                                    fontWeight: 'medium',
                                }}
                            />
                        </Box>

                        <CardContent sx={{ p: 4 }}>
                            {/* Error Info */}
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 3,
                                    mb: 3,
                                    bgcolor: theme.palette.grey[50],
                                    borderColor: theme.palette.divider,
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight="600" color="text.primary" gutterBottom>
                                    Error ID: {state.errorId}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {category.technicalMessage}
                                </Typography>
                                {state.retryCount > 0 && (
                                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                                        Previous retry attempts: {state.retryCount}
                                    </Typography>
                                )}
                            </Paper>

                            {/* Action Buttons */}
                            <Stack
                                direction={isMobile ? 'column' : 'row'}
                                spacing={2}
                                sx={{ mb: 3 }}
                                justifyContent="center"
                            >
                                {category.recoverable && (
                                    <Button
                                        variant="contained"
                                        startIcon={<RefreshIcon />}
                                        onClick={onRetry}
                                        disabled={state.isRetrying}
                                        size="large"
                                        sx={{ 
                                            minWidth: 140,
                                            bgcolor: theme.palette.text.primary,
                                            color: theme.palette.background.paper,
                                            '&:hover': {
                                                bgcolor: theme.palette.text.secondary,
                                            }
                                        }}
                                    >
                                        {state.isRetrying ? 'Retrying...' : 'Try Again'}
                                    </Button>
                                )}
                                <Button
                                    variant="outlined"
                                    startIcon={<RefreshIcon />}
                                    onClick={onRefresh}
                                    size="large"
                                    sx={{ 
                                        minWidth: 140,
                                        borderColor: theme.palette.divider,
                                        color: theme.palette.text.primary,
                                        '&:hover': {
                                            borderColor: theme.palette.text.secondary,
                                            bgcolor: theme.palette.action.hover,
                                        }
                                    }}
                                >
                                    Refresh Page
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<HomeIcon />}
                                    onClick={onGoHome}
                                    size="large"
                                    sx={{ 
                                        minWidth: 140,
                                        borderColor: theme.palette.divider,
                                        color: theme.palette.text.primary,
                                        '&:hover': {
                                            borderColor: theme.palette.text.secondary,
                                            bgcolor: theme.palette.action.hover,
                                        }
                                    }}
                                >
                                    Go Home
                                </Button>
                            </Stack>

                            <Divider sx={{ my: 3 }} />

                            {/* Additional Actions */}
                            <Stack
                                direction={isMobile ? 'column' : 'row'}
                                spacing={2}
                                justifyContent="center"
                            >
                                <Button
                                    variant="text"
                                    startIcon={<FeedbackIcon />}
                                    onClick={onToggleFeedback}
                                    size="small"
                                    sx={{ color: theme.palette.text.secondary }}
                                >
                                    Send Feedback
                                </Button>
                                <Button
                                    variant="text"
                                    startIcon={<CopyIcon />}
                                    onClick={onCopyError}
                                    size="small"
                                    sx={{ color: theme.palette.text.secondary }}
                                >
                                    Copy Error Details
                                </Button>
                                {isDevelopment && (
                                    <Button
                                        variant="text"
                                        startIcon={state.showDetails ? <ExpandLess /> : <ExpandMore />}
                                        onClick={onToggleDetails}
                                        size="small"
                                        sx={{ color: theme.palette.text.secondary }}
                                    >
                                        {state.showDetails ? 'Hide' : 'Show'} Technical Details
                                    </Button>
                                )}
                            </Stack>

                            {/* Feedback Form */}
                            <Collapse in={state.showFeedback}>
                                <Paper
                                    elevation={1}
                                    sx={{
                                        p: 3,
                                        mt: 3,
                                        bgcolor: theme.palette.background.default,
                                        borderRadius: 2,
                                    }}
                                >
                                    <Stack spacing={2}>
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                            <Typography variant="h6" component="h3">
                                                Help us improve
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={onToggleFeedback}
                                                aria-label="Close feedback form"
                                            >
                                                <CloseIcon />
                                            </IconButton>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            Tell us what you were doing when this error occurred.
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={3}
                                            placeholder="Describe what happened..."
                                            value={state.feedbackText}
                                            onChange={(e) => onFeedbackChange(e.target.value)}
                                            variant="outlined"
                                        />
                                        <Button
                                            variant="contained"
                                            onClick={onSendFeedback}
                                            disabled={!state.feedbackText.trim()}
                                            sx={{ 
                                                alignSelf: 'flex-start',
                                                bgcolor: theme.palette.text.primary,
                                                color: theme.palette.background.paper,
                                                '&:hover': {
                                                    bgcolor: theme.palette.text.secondary,
                                                }
                                            }}
                                        >
                                            Send Feedback
                                        </Button>
                                    </Stack>
                                </Paper>
                            </Collapse>

                            {/* Technical Details (Development Only) */}
                            {isDevelopment && (
                                <Collapse in={state.showDetails}>
                                    <Paper
                                        elevation={1}
                                        sx={{
                                            p: 3,
                                            mt: 3,
                                            bgcolor: theme.palette.grey[50],
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Typography variant="h6" gutterBottom color="error">
                                            🔧 Development Details
                                        </Typography>
                                        
                                        <Stack spacing={2}>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    Error Message:
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    component="pre"
                                                    sx={{
                                                        bgcolor: theme.palette.grey[100],
                                                        color: theme.palette.text.primary,
                                                        p: 1,
                                                        borderRadius: 1,
                                                        overflow: 'auto',
                                                        fontSize: '0.75rem',
                                                        border: `1px solid ${theme.palette.divider}`,
                                                    }}
                                                >
                                                    {state.error?.toString()}
                                                </Typography>
                                            </Box>
                                            
                                            {state.error?.stack && (
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight="bold">
                                                        Stack Trace:
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        component="pre"
                                                        sx={{
                                                            bgcolor: theme.palette.grey[100],
                                                            p: 1,
                                                            borderRadius: 1,
                                                            overflow: 'auto',
                                                            fontSize: '0.7rem',
                                                            maxHeight: 200,
                                                        }}
                                                    >
                                                        {state.error.stack}
                                                    </Typography>
                                                </Box>
                                            )}
                                            
                                            {state.errorInfo?.componentStack && (
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight="bold">
                                                        Component Stack:
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        component="pre"
                                                        sx={{
                                                            bgcolor: theme.palette.grey[100],
                                                            p: 1,
                                                            borderRadius: 1,
                                                            overflow: 'auto',
                                                            fontSize: '0.7rem',
                                                            maxHeight: 200,
                                                        }}
                                                    >
                                                        {state.errorInfo.componentStack}
                                                    </Typography>
                                                </Box>
                                            )}
                                            
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    Context:
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    component="pre"
                                                    sx={{
                                                        bgcolor: theme.palette.grey[100],
                                                        color: theme.palette.text.primary,
                                                        p: 1,
                                                        borderRadius: 1,
                                                        overflow: 'auto',
                                                        fontSize: '0.7rem',
                                                        border: `1px solid ${theme.palette.divider}`,
                                                    }}
                                                >
                                                    {JSON.stringify(state.context, null, 2)}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Paper>
                                </Collapse>
                            )}
                        </CardContent>
                    </Card>
                </Container>
            </Box>
        </ThemeProvider>
    );
};
