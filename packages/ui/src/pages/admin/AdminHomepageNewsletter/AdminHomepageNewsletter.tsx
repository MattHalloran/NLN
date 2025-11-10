import { APP_LINKS } from "@local/shared";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    FormControlLabel,
    Grid,
    Paper,
    Switch,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import { useLandingPageContent, useUpdateLandingPageSettings } from "api/rest/hooks";
import { BackButton, PageContainer } from "components";
import { ABTestEditingBanner } from "components/admin/ABTestEditingBanner";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useABTestQueryParams } from "hooks/useABTestQueryParams";
import { useAdminForm } from "hooks/useAdminForm";
import {
    Eye as EyeIcon,
    Mail,
    RotateCcw as ResetIcon,
    Save as SaveIcon,
    Settings as SettingsIcon,
    Sprout,
    Users as UsersIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "route";

interface NewsletterSettings {
    title: string;
    description: string;
    disclaimer: string;
    isActive: boolean;
}

const getDefaultNewsletterSettings = (): NewsletterSettings => ({
    title: "Stay in the Grow",
    description:
        "Get seasonal care tips, new arrival notifications, and exclusive offers delivered to your inbox",
    disclaimer: "No spam, just helpful gardening tips. Unsubscribe anytime.",
    isActive: true,
});

// Preview component that shows how the newsletter will look
const NewsletterPreview = ({ newsletter }: { newsletter: NewsletterSettings }) => {
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
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    mb: 2,
                }}
            >
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
                    <Typography
                        variant="h6"
                        sx={{ color: palette.secondary.main, fontWeight: 600 }}
                    >
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
    // Admin needs to see ALL content (including inactive) so they can manage it
    const {
        data: landingPageContent,
        loading: landingPageLoading,
        refetch: refetchLandingPage,
    } = useLandingPageContent(false, queryVariantId);

    // Use variantId from URL query params, or fall back to the loaded data's variant
    const variantId = queryVariantId || landingPageContent?._meta?.variantId;

    const form = useAdminForm<NewsletterSettings>({
        fetchFn: async () => {
            if (landingPageContent?.content?.newsletter) {
                return landingPageContent.content.newsletter;
            }
            return getDefaultNewsletterSettings();
        },
        saveFn: async (data) => {
            const queryParams = variantId ? { variantId } : undefined;
            await updateSettings.mutate({
                settings: {
                    content: {
                        newsletter: data,
                    },
                },
                queryParams,
            });
            return data;
        },
        refetchDependencies: [refetchLandingPage],
        pageName: "newsletter-section",
        endpointName: "/api/v1/landing-page",
        successMessage: "Newsletter settings saved successfully!",
        errorMessagePrefix: "Failed to save",
    });

    // Trigger refetch when landing page data loads
    useEffect(() => {
        if (landingPageContent && !landingPageLoading) {
            form.refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [landingPageContent, landingPageLoading]);

    return (
        <PageContainer variant="wide" sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="Newsletter Settings"
                help="Configure the newsletter signup section on your homepage"
                startComponent={
                    <BackButton
                        to={APP_LINKS.AdminHomepage}
                        ariaLabel="Back to Homepage Management"
                    />
                }
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
                        View and manage newsletter subscription list, export to CSV, and track
                        signup metrics
                    </Typography>
                </Alert>

                {/* Unsaved changes warning */}
                {form.isDirty && (
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
                {form.isDirty && (
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
                            onClick={form.save}
                            disabled={form.isSaving}
                            sx={{
                                px: 4,
                                fontWeight: 600,
                                boxShadow: 2,
                                "&:hover": {
                                    boxShadow: 4,
                                },
                            }}
                        >
                            {form.isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<ResetIcon size={20} />}
                            onClick={form.cancel}
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
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                            mb: 3,
                                        }}
                                    >
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
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
                                                Live Preview
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                See your changes in real-time
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <NewsletterPreview
                                        newsletter={form.data || getDefaultNewsletterSettings()}
                                    />
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
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
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
                                            value={form.data?.title || ""}
                                            onChange={(e) => {
                                                if (!form.data) return;
                                                form.setData({
                                                    ...form.data,
                                                    title: e.target.value,
                                                });
                                            }}
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
                                            value={form.data?.description || ""}
                                            onChange={(e) => {
                                                if (!form.data) return;
                                                form.setData({
                                                    ...form.data,
                                                    description: e.target.value,
                                                });
                                            }}
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
                                            value={form.data?.disclaimer || ""}
                                            onChange={(e) => {
                                                if (!form.data) return;
                                                form.setData({
                                                    ...form.data,
                                                    disclaimer: e.target.value,
                                                });
                                            }}
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
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
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
                                                    checked={form.data?.isActive || false}
                                                    onChange={(e) => {
                                                        if (!form.data) return;
                                                        form.setData({
                                                            ...form.data,
                                                            isActive: e.target.checked,
                                                        });
                                                    }}
                                                    color="success"
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography
                                                        variant="body1"
                                                        sx={{ fontWeight: 500 }}
                                                    >
                                                        Enable Newsletter Section
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        Show newsletter signup on homepage
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </Paper>
                                </AccordionDetails>
                            </Accordion>

                            {/* Action Buttons at Bottom */}
                            {form.isDirty && (
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
                                        onClick={form.save}
                                        disabled={form.isSaving}
                                        sx={{
                                            px: 4,
                                            fontWeight: 600,
                                            boxShadow: 2,
                                            "&:hover": {
                                                boxShadow: 4,
                                            },
                                        }}
                                    >
                                        {form.isSaving ? "Saving..." : "Save Changes"}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        startIcon={<ResetIcon size={20} />}
                                        onClick={form.cancel}
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
                                <Box
                                    sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}
                                >
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
                                        <Typography
                                            variant="h6"
                                            sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                        >
                                            Live Preview
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            See your changes in real-time
                                        </Typography>
                                    </Box>
                                </Box>
                                <NewsletterPreview
                                    newsletter={form.data || getDefaultNewsletterSettings()}
                                />
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
                                        This preview updates in real-time as you make changes. The
                                        actual newsletter section will appear at the bottom of the
                                        homepage.
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
