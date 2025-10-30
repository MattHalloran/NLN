import { APP_LINKS } from "@local/shared";
import {
    Box,
    Button,
    Card,
    TextField,
    Switch,
    FormControlLabel,
    Typography,
    Alert,
    Divider,
    Grid,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    useTheme,
} from "@mui/material";
import {
    Save as SaveIcon,
    RotateCcw as ResetIcon,
    Mail,
    Sprout,
    Settings as SettingsIcon,
    Eye as EyeIcon,
    Users as UsersIcon,
} from "lucide-react";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { BackButton, PageContainer } from "components";
import { ABTestEditingBanner } from "components/admin/ABTestEditingBanner";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLandingPage } from "hooks/useLandingPage";
import { useABTestQueryParams } from "hooks/useABTestQueryParams";
import { useUpdateLandingPageSettings } from "api/rest/hooks";
import { useCallback as _useCallback, useEffect, useState, useMemo } from "react";
import { PubSub } from "utils/pubsub";
import { SnackSeverity } from "components/dialogs/Snack/Snack";
import { Link as RouterLink } from "route";

interface NewsletterSettings {
    title: string;
    description: string;
    disclaimer: string;
    isActive: boolean;
}

// Preview component that shows how the newsletter will look
const NewsletterPreview = ({
    newsletter,
}: {
    newsletter: NewsletterSettings;
}) => {
    const { palette } = useTheme();
    const [email, setEmail] = useState("");
    const [subscribed, setSubscribed] = useState(false);

    const handlePreviewSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            setSubscribed(true);
            setTimeout(() => {
                setSubscribed(false);
                setEmail("");
            }, 2000);
        }
    };

    if (!newsletter.isActive) {
        return (
            <Box
                sx={{
                    p: 6,
                    textAlign: "center",
                    bgcolor: "grey.100",
                    borderRadius: 2,
                    border: "2px dashed",
                    borderColor: "divider",
                }}
            >
                <Typography variant="body1" color="text.secondary">
                    Newsletter section is currently inactive
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Enable it in the settings to see preview
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                p: 4,
                background: `linear-gradient(135deg, ${palette.secondary.main} 0%, ${palette.primary.main} 100%)`,
                borderRadius: 3,
                textAlign: "center",
                color: "white",
                border: "2px solid",
                borderColor: "divider",
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 2 }}>
                <Sprout size={24} color="white" />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {newsletter.title}
                </Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
                {newsletter.description}
            </Typography>

            {!subscribed ? (
                <Box
                    component="form"
                    onSubmit={handlePreviewSubmit}
                    sx={{
                        display: "flex",
                        gap: 2,
                        maxWidth: "500px",
                        mx: "auto",
                        flexDirection: { xs: "column", sm: "row" },
                    }}
                >
                    <TextField
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        size="small"
                        sx={{
                            flexGrow: 1,
                            "& .MuiOutlinedInput-root": {
                                backgroundColor: "white",
                                borderRadius: 2,
                            },
                        }}
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        color="secondary"
                        size="medium"
                        sx={{
                            px: 4,
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: 600,
                            minWidth: { xs: "100%", sm: "150px" },
                        }}
                    >
                        Subscribe
                    </Button>
                </Box>
            ) : (
                <Box>
                    <Typography variant="h6" sx={{ color: palette.secondary.main, fontWeight: 600 }}>
                        ✅ Thank you for subscribing!
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                        You'll receive our next seasonal guide in your inbox soon.
                    </Typography>
                </Box>
            )}

            <Typography variant="caption" sx={{ display: "block", mt: 2, opacity: 0.8 }}>
                {newsletter.disclaimer}
            </Typography>
        </Box>
    );
};

export const AdminHomepageNewsletter = () => {
    const { variantId: queryVariantId } = useABTestQueryParams();
    const updateSettings = useUpdateLandingPageSettings();
    const { data: landingPageContent, refetch } = useLandingPage();

    // Use variantId from URL query params, or fall back to the loaded data's variant
    const variantId = queryVariantId || landingPageContent?._meta?.variantId;

    const [newsletter, setNewsletter] = useState<NewsletterSettings>({
        title: "Stay in the Grow",
        description: "Get seasonal care tips, new arrival notifications, and exclusive offers delivered to your inbox",
        disclaimer: "No spam, just helpful gardening tips. Unsubscribe anytime.",
        isActive: true,
    });
    const [originalNewsletter, setOriginalNewsletter] = useState<NewsletterSettings>(newsletter);
    const [isLoading, setIsLoading] = useState(false);

    // Load newsletter settings from landing page content
    useEffect(() => {
        if (landingPageContent?.content?.newsletter) {
            const settings = landingPageContent.content.newsletter;
            setNewsletter(settings);
            setOriginalNewsletter(JSON.parse(JSON.stringify(settings)));
        }
    }, [landingPageContent]);

    // Check for unsaved changes using useMemo for derived state
    const hasChanges = useMemo(
        () => JSON.stringify(newsletter) !== JSON.stringify(originalNewsletter),
        [newsletter, originalNewsletter],
    );

    const handleSave = async () => {
        try {
            setIsLoading(true);
            // Send nested structure matching LandingPageContent for type safety
            await updateSettings.mutate({
                settings: {
                    content: {
                        newsletter,
                    },
                },
                queryParams: variantId ? { variantId } : undefined,
            });
            setOriginalNewsletter(JSON.parse(JSON.stringify(newsletter)));
            PubSub.get().publishSnack({
                message: "Newsletter settings saved successfully!",
                severity: SnackSeverity.Success,
            });
            refetch();
        } catch (error) {
            PubSub.get().publishSnack({
                message: `Failed to save: ${(error as Error).message}`,
                severity: SnackSeverity.Error,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setNewsletter(JSON.parse(JSON.stringify(originalNewsletter)));
    };

    return (
        <PageContainer variant="wide" sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="Newsletter Settings"
                help="Configure the newsletter signup section on your homepage"
                startComponent={<BackButton to={APP_LINKS.AdminHomepage} ariaLabel="Back to Homepage Management" />}
            />

            <Box p={2}>
                <ABTestEditingBanner />

                {/* Link to Newsletter Subscribers */}
                <Alert
                    severity="info"
                    icon={<UsersIcon size={20} />}
                    sx={{
                        mb: 3,
                        borderLeft: "4px solid",
                        borderColor: "info.main",
                        bgcolor: "info.lighter",
                        "& .MuiAlert-icon": {
                            color: "info.main",
                        },
                    }}
                    action={
                        <Button
                            component={RouterLink}
                            to={APP_LINKS.AdminNewsletterSubscribers}
                            size="small"
                            variant="outlined"
                            sx={{ textTransform: "none" }}
                        >
                            View Subscribers
                        </Button>
                    }
                >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Newsletter subscribers are being collected for lead generation
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        View and manage newsletter subscription list, export to CSV, and track signup metrics
                    </Typography>
                </Alert>

                {/* Unsaved changes warning */}
                {hasChanges && (
                    <Alert
                        severity="warning"
                        sx={{
                            mb: 3,
                            borderLeft: "4px solid",
                            borderColor: "warning.main",
                            bgcolor: "warning.lighter",
                            "& .MuiAlert-icon": {
                                color: "warning.main",
                            },
                        }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            You have unsaved changes. Don't forget to save before leaving!
                        </Typography>
                    </Alert>
                )}

                {/* Action Buttons at Top */}
                {hasChanges && (
                    <Paper
                        elevation={0}
                        sx={{
                            mb: 3,
                            p: 2,
                            display: "flex",
                            gap: 2,
                            bgcolor: "grey.50",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                        }}
                    >
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<SaveIcon size={20} />}
                            onClick={handleSave}
                            disabled={isLoading}
                            sx={{
                                px: 4,
                                fontWeight: 600,
                                boxShadow: 2,
                                "&:hover": {
                                    boxShadow: 4,
                                },
                            }}
                        >
                            {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<ResetIcon size={20} />}
                            onClick={handleCancel}
                            sx={{
                                px: 4,
                                fontWeight: 600,
                                borderWidth: 2,
                                "&:hover": {
                                    borderWidth: 2,
                                },
                            }}
                        >
                            Cancel
                        </Button>
                    </Paper>
                )}

                {/* Two-column layout: Controls on left, Preview on right */}
                <Grid container spacing={3}>
                    {/* Left Column - Editing Controls */}
                    <Grid item xs={12} lg={7}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {/* Preview on Mobile Only */}
                            <Box sx={{ display: { xs: "block", lg: "none" } }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        bgcolor: "background.paper",
                                        borderRadius: 2,
                                        border: "2px solid",
                                        borderColor: "divider",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                    }}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 36,
                                                height: 36,
                                                borderRadius: 1.5,
                                                bgcolor: "primary.main",
                                                color: "white",
                                            }}
                                        >
                                            <EyeIcon size={20} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                Live Preview
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                See your changes in real-time
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <NewsletterPreview newsletter={newsletter} />
                                    <Alert
                                        severity="info"
                                        sx={{
                                            mt: 2,
                                            bgcolor: "info.lighter",
                                            border: "1px solid",
                                            borderColor: "info.light",
                                        }}
                                    >
                                        <Typography variant="caption">
                                            This preview updates in real-time as you make changes.
                                        </Typography>
                                    </Alert>
                                </Paper>
                            </Box>

                            {/* Accordion 1: Newsletter Content */}
                            <Accordion
                                defaultExpanded
                                sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: "8px !important",
                                    "&:before": { display: "none" },
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                    mb: 2,
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{
                                        bgcolor: "grey.50",
                                        borderRadius: "8px 8px 0 0",
                                        minHeight: 64,
                                        "&:hover": {
                                            bgcolor: "grey.100",
                                        },
                                        "& .MuiAccordionSummary-content": {
                                            my: 2,
                                        },
                                    }}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 40,
                                                height: 40,
                                                borderRadius: 2,
                                                bgcolor: "primary.main",
                                                color: "white",
                                            }}
                                        >
                                            <Mail size={24} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                Newsletter Content
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Configure the newsletter signup messaging
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        {/* Title */}
                                        <TextField
                                            fullWidth
                                            label="Newsletter Title"
                                            value={newsletter.title}
                                            onChange={(e) => setNewsletter({ ...newsletter, title: e.target.value })}
                                            helperText="Main heading for the newsletter section"
                                            variant="outlined"
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />

                                        {/* Description */}
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={3}
                                            label="Newsletter Description"
                                            value={newsletter.description}
                                            onChange={(e) =>
                                                setNewsletter({ ...newsletter, description: e.target.value })
                                            }
                                            helperText="Describe what users will receive in the newsletter"
                                            variant="outlined"
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />

                                        {/* Disclaimer */}
                                        <TextField
                                            fullWidth
                                            label="Disclaimer Text"
                                            value={newsletter.disclaimer}
                                            onChange={(e) =>
                                                setNewsletter({ ...newsletter, disclaimer: e.target.value })
                                            }
                                            helperText="Privacy disclaimer shown below signup form"
                                            variant="outlined"
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 2: Settings */}
                            <Accordion
                                defaultExpanded
                                sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: "8px !important",
                                    "&:before": { display: "none" },
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                    mb: 2,
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{
                                        bgcolor: "grey.50",
                                        borderRadius: "8px 8px 0 0",
                                        minHeight: 64,
                                        "&:hover": {
                                            bgcolor: "grey.100",
                                        },
                                        "& .MuiAccordionSummary-content": {
                                            my: 2,
                                        },
                                    }}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 40,
                                                height: 40,
                                                borderRadius: 2,
                                                bgcolor: "secondary.main",
                                                color: "white",
                                            }}
                                        >
                                            <SettingsIcon size={24} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                Newsletter Settings
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Control newsletter visibility
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2.5,
                                            bgcolor: "grey.50",
                                            border: "1px solid",
                                            borderColor: "divider",
                                            borderRadius: 2,
                                        }}
                                    >
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={newsletter.isActive}
                                                    onChange={(e) =>
                                                        setNewsletter({ ...newsletter, isActive: e.target.checked })
                                                    }
                                                    color="success"
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                        Enable Newsletter Section
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Show newsletter signup on homepage
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </Paper>
                                </AccordionDetails>
                            </Accordion>

                            {/* Action Buttons at Bottom */}
                            {hasChanges && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        mt: 1,
                                        p: 2,
                                        display: "flex",
                                        gap: 2,
                                        bgcolor: "grey.50",
                                        border: "1px solid",
                                        borderColor: "divider",
                                        borderRadius: 2,
                                    }}
                                >
                                    <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={<SaveIcon size={20} />}
                                        onClick={handleSave}
                                        disabled={isLoading}
                                        sx={{
                                            px: 4,
                                            fontWeight: 600,
                                            boxShadow: 2,
                                            "&:hover": {
                                                boxShadow: 4,
                                            },
                                        }}
                                    >
                                        {isLoading ? "Saving..." : "Save Changes"}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        startIcon={<ResetIcon size={20} />}
                                        onClick={handleCancel}
                                        sx={{
                                            px: 4,
                                            fontWeight: 600,
                                            borderWidth: 2,
                                            "&:hover": {
                                                borderWidth: 2,
                                            },
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </Paper>
                            )}
                        </Box>
                    </Grid>

                    {/* Right Column - Live Preview (Desktop only, sticky) */}
                    <Grid item xs={12} lg={5}>
                        <Box sx={{ display: { xs: "none", lg: "block" } }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    position: "sticky",
                                    top: 16,
                                    p: 3,
                                    bgcolor: "background.paper",
                                    borderRadius: 2,
                                    border: "2px solid",
                                    borderColor: "divider",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: 36,
                                            height: 36,
                                            borderRadius: 1.5,
                                            bgcolor: "primary.main",
                                            color: "white",
                                        }}
                                    >
                                        <EyeIcon size={20} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                            Live Preview
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            See your changes in real-time
                                        </Typography>
                                    </Box>
                                </Box>
                                <NewsletterPreview newsletter={newsletter} />
                                <Alert
                                    severity="info"
                                    sx={{
                                        mt: 2,
                                        bgcolor: "info.lighter",
                                        border: "1px solid",
                                        borderColor: "info.light",
                                        "& .MuiAlert-icon": {
                                            color: "info.main",
                                        },
                                    }}
                                >
                                    <Typography variant="caption">
                                        This preview updates in real-time as you make changes. The actual newsletter
                                        section will appear at the bottom of the homepage.
                                    </Typography>
                                </Alert>
                            </Paper>
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </PageContainer>
    );
};
