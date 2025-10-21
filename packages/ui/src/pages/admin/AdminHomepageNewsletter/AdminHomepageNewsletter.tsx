import { APP_LINKS } from "@local/shared";
import {
    Box,
    Button,
    Card,
    CardContent,
    TextField,
    Switch,
    FormControlLabel,
    Typography,
    Alert,
    Snackbar,
    Divider,
} from "@mui/material";
import { Save, RotateCcw, Mail } from "lucide-react";
import { BackButton, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLandingPageContent, useUpdateLandingPageSettings } from "api/rest/hooks";
import { useCallback, useEffect, useState } from "react";

interface NewsletterSettings {
    title: string;
    description: string;
    disclaimer: string;
    isActive: boolean;
}

export const AdminHomepageNewsletter = () => {
    const updateSettings = useUpdateLandingPageSettings();
    const { data: landingPageContent, refetch } = useLandingPageContent(false);

    const [newsletter, setNewsletter] = useState<NewsletterSettings>({
        title: "Stay in the Grow",
        description: "Get seasonal care tips, new arrival notifications, and exclusive offers delivered to your inbox",
        disclaimer: "No spam, just helpful gardening tips. Unsubscribe anytime.",
        isActive: true,
    });
    const [originalNewsletter, setOriginalNewsletter] = useState<NewsletterSettings>(newsletter);
    const [hasChanges, setHasChanges] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
        open: false,
        message: "",
        severity: "success",
    });

    // Load newsletter settings from landing page content
    useEffect(() => {
        if (landingPageContent?.settings?.newsletter) {
            const settings = landingPageContent.settings.newsletter;
            setNewsletter(settings);
            setOriginalNewsletter(JSON.parse(JSON.stringify(settings)));
        }
    }, [landingPageContent]);

    // Check for unsaved changes
    useEffect(() => {
        const changed = JSON.stringify(newsletter) !== JSON.stringify(originalNewsletter);
        setHasChanges(changed);
    }, [newsletter, originalNewsletter]);

    const handleSave = async () => {
        try {
            await updateSettings.mutate({ newsletter });
            setOriginalNewsletter(JSON.parse(JSON.stringify(newsletter)));
            setSnackbar({
                open: true,
                message: "Newsletter settings saved successfully!",
                severity: "success",
            });
            refetch();
        } catch (error) {
            setSnackbar({
                open: true,
                message: `Failed to save: ${(error as Error).message}`,
                severity: "error",
            });
        }
    };

    const handleCancel = () => {
        setNewsletter(JSON.parse(JSON.stringify(originalNewsletter)));
    };

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="Newsletter Settings"
                help="Configure the newsletter signup section on your homepage"
                startComponent={<BackButton to={APP_LINKS.AdminHomepage} ariaLabel="Back to Homepage Management" />}
            />

            <Box p={3}>
                {/* Unsaved changes warning */}
                {hasChanges && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        You have unsaved changes. Don't forget to save before leaving!
                    </Alert>
                )}

                {/* Newsletter Configuration Card */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                            <Mail size={24} />
                            <Typography variant="h6">Newsletter Configuration</Typography>
                        </Box>

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {/* Active Toggle */}
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={newsletter.isActive}
                                        onChange={(e) =>
                                            setNewsletter({ ...newsletter, isActive: e.target.checked })
                                        }
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="body1">Enable Newsletter Section</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Show newsletter signup on homepage
                                        </Typography>
                                    </Box>
                                }
                            />

                            <Divider />

                            {/* Title */}
                            <TextField
                                fullWidth
                                label="Newsletter Title"
                                value={newsletter.title}
                                onChange={(e) => setNewsletter({ ...newsletter, title: e.target.value })}
                                helperText="Main heading for the newsletter section"
                            />

                            {/* Description */}
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Newsletter Description"
                                value={newsletter.description}
                                onChange={(e) => setNewsletter({ ...newsletter, description: e.target.value })}
                                helperText="Describe what users will receive in the newsletter"
                            />

                            {/* Disclaimer */}
                            <TextField
                                fullWidth
                                label="Disclaimer Text"
                                value={newsletter.disclaimer}
                                onChange={(e) => setNewsletter({ ...newsletter, disclaimer: e.target.value })}
                                helperText="Privacy disclaimer shown below signup form"
                            />
                        </Box>
                    </CardContent>
                </Card>

                {/* Preview Card */}
                <Card sx={{ mb: 3, backgroundColor: "#f5f5f5" }}>
                    <CardContent>
                        <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                            Preview:
                        </Typography>
                        <Box
                            sx={{
                                p: 3,
                                backgroundColor: "white",
                                borderRadius: 1,
                                border: "1px solid #e0e0e0",
                            }}
                        >
                            <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                                {newsletter.title}
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 2, color: "text.secondary" }}>
                                {newsletter.description}
                            </Typography>
                            <Box
                                sx={{
                                    display: "flex",
                                    gap: 1,
                                    mb: 1,
                                }}
                            >
                                <TextField
                                    size="small"
                                    placeholder="Enter your email"
                                    disabled
                                    sx={{ flex: 1 }}
                                />
                                <Button variant="contained" disabled>
                                    Subscribe
                                </Button>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                {newsletter.disclaimer}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <Box sx={{ display: "flex", gap: 2 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Save size={20} />}
                        onClick={handleSave}
                        disabled={!hasChanges || updateSettings.loading}
                    >
                        {updateSettings.loading ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<RotateCcw size={20} />}
                        onClick={handleCancel}
                        disabled={!hasChanges}
                    >
                        Cancel
                    </Button>
                </Box>
            </Box>

            {/* Snackbar for feedback */}
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
