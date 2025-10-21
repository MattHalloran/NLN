import { APP_LINKS } from "@local/shared";
import {
    Box,
    Button,
    Card,
    CardContent,
    TextField,
    Typography,
    Alert,
    Snackbar,
    Divider,
    InputAdornment,
    ToggleButton,
    ToggleButtonGroup,
    Grid,
    Paper,
    IconButton,
    Chip,
} from "@mui/material";
import { Save, RotateCcw, Palette, Building, Sun, Moon, Menu, ShoppingCart, Heart, User } from "lucide-react";
import { BackButton, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLandingPageContent, useUpdateLandingPageSettings } from "api/rest/hooks";
import { useCallback, useEffect, useState, useMemo } from "react";
import { PubSub } from "utils";

interface ThemeColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    paper: string;
}

interface BrandingSettings {
    companyInfo: {
        foundedYear: number;
        description: string;
    };
    colors: {
        light: ThemeColors;
        dark: ThemeColors;
    };
}

const isValidHexColor = (color: string): boolean => {
    return /^#([0-9A-F]{3}){1,2}$/i.test(color);
};

// Realistic Preview Component
interface PreviewProps {
    colors: ThemeColors;
    mode: "light" | "dark";
}

const RealisticPreview = ({ colors, mode }: PreviewProps) => {
    const textColor = mode === "light" ? "#000000" : "#ffffff";
    const textSecondary = mode === "light" ? "#666666" : "#aaaaaa";

    return (
        <Box
            sx={{
                backgroundColor: colors.background,
                borderRadius: 2,
                overflow: "hidden",
                border: `2px solid ${mode === "light" ? "#e0e0e0" : "#404040"}`,
                boxShadow: 3,
            }}
        >
            {/* Navigation Bar */}
            <Box
                sx={{
                    backgroundColor: colors.primary,
                    borderBottom: `1px solid ${mode === "light" ? "#e0e0e0" : "#404040"}`,
                    padding: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <IconButton size="small" sx={{ color: "#ffffff" }}>
                        <Menu size={20} />
                    </IconButton>
                    <Typography variant="h6" sx={{ color: "#ffffff", fontWeight: 600 }}>
                        Your Brand
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <IconButton size="small" sx={{ color: "#ffffff" }}>
                        <Heart size={18} />
                    </IconButton>
                    <IconButton size="small" sx={{ color: "#ffffff" }}>
                        <ShoppingCart size={18} />
                    </IconButton>
                    <IconButton size="small" sx={{ color: "#ffffff" }}>
                        <User size={18} />
                    </IconButton>
                </Box>
            </Box>

            {/* Hero Section */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                    padding: 4,
                    textAlign: "center",
                }}
            >
                <Typography variant="h4" sx={{ color: "#ffffff", fontWeight: 700, mb: 1 }}>
                    Welcome to Your Brand
                </Typography>
                <Typography variant="body1" sx={{ color: "#ffffff", mb: 3, opacity: 0.95 }}>
                    Discover amazing products and services tailored just for you
                </Typography>
                <Button
                    variant="contained"
                    sx={{
                        backgroundColor: colors.accent,
                        color: "#ffffff",
                        px: 4,
                        py: 1.5,
                        fontWeight: 600,
                        "&:hover": {
                            backgroundColor: colors.accent,
                            opacity: 0.9,
                        },
                    }}
                >
                    Get Started
                </Button>
            </Box>

            {/* Content Section */}
            <Box sx={{ padding: 3 }}>
                <Grid container spacing={2}>
                    {/* Feature Card 1 */}
                    <Grid item xs={4}>
                        <Paper
                            sx={{
                                backgroundColor: colors.paper,
                                padding: 2,
                                borderRadius: 2,
                                height: "100%",
                            }}
                        >
                            <Box
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 1,
                                    backgroundColor: colors.primary,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    mb: 1.5,
                                }}
                            >
                                <Typography sx={{ color: "#ffffff", fontWeight: 700 }}>1</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: textColor, fontWeight: 600, mb: 0.5 }}>
                                Feature One
                            </Typography>
                            <Typography variant="caption" sx={{ color: textSecondary }}>
                                Amazing benefits await
                            </Typography>
                        </Paper>
                    </Grid>

                    {/* Feature Card 2 */}
                    <Grid item xs={4}>
                        <Paper
                            sx={{
                                backgroundColor: colors.paper,
                                padding: 2,
                                borderRadius: 2,
                                height: "100%",
                            }}
                        >
                            <Box
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 1,
                                    backgroundColor: colors.secondary,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    mb: 1.5,
                                }}
                            >
                                <Typography sx={{ color: "#ffffff", fontWeight: 700 }}>2</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: textColor, fontWeight: 600, mb: 0.5 }}>
                                Feature Two
                            </Typography>
                            <Typography variant="caption" sx={{ color: textSecondary }}>
                                Incredible experiences
                            </Typography>
                        </Paper>
                    </Grid>

                    {/* Feature Card 3 */}
                    <Grid item xs={4}>
                        <Paper
                            sx={{
                                backgroundColor: colors.paper,
                                padding: 2,
                                borderRadius: 2,
                                height: "100%",
                            }}
                        >
                            <Box
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 1,
                                    backgroundColor: colors.accent,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    mb: 1.5,
                                }}
                            >
                                <Typography sx={{ color: "#ffffff", fontWeight: 700 }}>3</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: textColor, fontWeight: 600, mb: 0.5 }}>
                                Feature Three
                            </Typography>
                            <Typography variant="caption" sx={{ color: textSecondary }}>
                                Outstanding quality
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Call to Action Section */}
                <Box sx={{ mt: 3, textAlign: "center" }}>
                    <Typography variant="body1" sx={{ color: textColor, mb: 2, fontWeight: 500 }}>
                        Ready to get started?
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
                        <Button
                            variant="contained"
                            size="small"
                            sx={{
                                backgroundColor: colors.primary,
                                color: "#ffffff",
                                "&:hover": { backgroundColor: colors.primary, opacity: 0.9 },
                            }}
                        >
                            Primary Action
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            sx={{
                                borderColor: colors.secondary,
                                color: colors.secondary,
                                "&:hover": { borderColor: colors.secondary, backgroundColor: "transparent" },
                            }}
                        >
                            Secondary Action
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export const AdminHomepageBranding = () => {
    const updateSettings = useUpdateLandingPageSettings();
    const { data: landingPageContent, refetch } = useLandingPageContent(false);

    const [branding, setBranding] = useState<BrandingSettings>({
        companyInfo: {
            foundedYear: 1981,
            description: "Expert plant care and community service",
        },
        colors: {
            light: {
                primary: "#1b5e20",
                secondary: "#1976d2",
                accent: "#4CAF50",
                background: "#e9f1e9",
                paper: "#ffffff",
            },
            dark: {
                primary: "#515774",
                secondary: "#4372a3",
                accent: "#5b99da",
                background: "#181818",
                paper: "#2e2e2e",
            },
        },
    });
    const [originalBranding, setOriginalBranding] = useState<BrandingSettings>(branding);
    const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
    const [editingMode, setEditingMode] = useState<"light" | "dark">("light");
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
        open: false,
        message: "",
        severity: "success",
    });

    // Load branding settings from landing page content
    useEffect(() => {
        if (landingPageContent?.theme) {
            // Handle both old format (single colors object) and new format (light/dark)
            const colors = landingPageContent.theme.colors as any;
            let colorSettings = branding.colors;

            if (colors?.light && colors?.dark) {
                // New format with light/dark mode
                colorSettings = colors as { light: ThemeColors; dark: ThemeColors };
            } else if (colors?.primary) {
                // Old format - use for light mode, keep defaults for dark
                colorSettings = {
                    light: {
                        primary: colors.primary || branding.colors.light.primary,
                        secondary: colors.secondary || branding.colors.light.secondary,
                        accent: colors.accent || branding.colors.light.accent,
                        background: branding.colors.light.background,
                        paper: branding.colors.light.paper,
                    },
                    dark: branding.colors.dark,
                };
            }

            const settings: BrandingSettings = {
                companyInfo: landingPageContent.content?.company || branding.companyInfo,
                colors: colorSettings,
            };
            setBranding(settings);
            setOriginalBranding(JSON.parse(JSON.stringify(settings)));
        }
    }, [landingPageContent]);

    // Check for unsaved changes using useMemo for derived state
    const hasChanges = useMemo(
        () => JSON.stringify(branding) !== JSON.stringify(originalBranding),
        [branding, originalBranding]
    );

    const handleSave = async () => {
        // Validate all colors for both light and dark modes
        const colorsToValidate = [
            { value: branding.colors.light.primary, name: "Light mode primary" },
            { value: branding.colors.light.secondary, name: "Light mode secondary" },
            { value: branding.colors.light.accent, name: "Light mode accent" },
            { value: branding.colors.light.background, name: "Light mode background" },
            { value: branding.colors.light.paper, name: "Light mode paper" },
            { value: branding.colors.dark.primary, name: "Dark mode primary" },
            { value: branding.colors.dark.secondary, name: "Dark mode secondary" },
            { value: branding.colors.dark.accent, name: "Dark mode accent" },
            { value: branding.colors.dark.background, name: "Dark mode background" },
            { value: branding.colors.dark.paper, name: "Dark mode paper" },
        ];

        for (const color of colorsToValidate) {
            if (!isValidHexColor(color.value)) {
                setSnackbar({
                    open: true,
                    message: `Invalid ${color.name} color format. Use hex format like #2E7D32`,
                    severity: "error",
                });
                return;
            }
        }

        try {
            await updateSettings.mutate(branding);
            setOriginalBranding(JSON.parse(JSON.stringify(branding)));
            setSnackbar({
                open: true,
                message: "Branding settings saved successfully!",
                severity: "success",
            });
            refetch();
            // Notify other components that landing page content has been updated
            PubSub.get().publishLandingPageUpdated();
        } catch (error) {
            setSnackbar({
                open: true,
                message: `Failed to save: ${(error as Error).message}`,
                severity: "error",
            });
        }
    };

    const handleCancel = () => {
        setBranding(JSON.parse(JSON.stringify(originalBranding)));
    };

    const currentColors = branding.colors[editingMode];

    const handleColorChange = (field: keyof ThemeColors, value: string) => {
        setBranding({
            ...branding,
            colors: {
                ...branding.colors,
                [editingMode]: {
                    ...branding.colors[editingMode],
                    [field]: value,
                },
            },
        });
    };

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="Branding & Theme"
                help="Customize company information and brand colors for light and dark modes"
                startComponent={<BackButton to={APP_LINKS.AdminHomepage} ariaLabel="Back to Homepage Management" />}
            />

            <Box p={3}>
                {/* Unsaved changes warning */}
                {hasChanges && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        You have unsaved changes. Don't forget to save before leaving!
                    </Alert>
                )}

                {/* Company Information Card */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                            <Building size={24} />
                            <Typography variant="h6">Company Information</Typography>
                        </Box>

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Founded Year"
                                value={branding.companyInfo.foundedYear}
                                onChange={(e) =>
                                    setBranding({
                                        ...branding,
                                        companyInfo: {
                                            ...branding.companyInfo,
                                            foundedYear: parseInt(e.target.value) || 1981,
                                        },
                                    })
                                }
                                helperText="Year the company was founded"
                                inputProps={{ min: 1900, max: new Date().getFullYear() }}
                            />

                            <TextField
                                fullWidth
                                label="Company Description"
                                value={branding.companyInfo.description}
                                onChange={(e) =>
                                    setBranding({
                                        ...branding,
                                        companyInfo: {
                                            ...branding.companyInfo,
                                            description: e.target.value,
                                        },
                                    })
                                }
                                helperText="Short description of your company"
                            />
                        </Box>
                    </CardContent>
                </Card>

                {/* Theme Colors Card */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                            <Palette size={24} />
                            <Typography variant="h6">Theme Colors</Typography>
                        </Box>

                        <Alert severity="info" sx={{ mb: 3 }}>
                            Customize colors for both light and dark modes. Use hex format (e.g., #2E7D32).
                        </Alert>

                        {/* Theme Mode Toggle */}
                        <Box sx={{ mb: 3 }}>
                            <ToggleButtonGroup
                                value={editingMode}
                                exclusive
                                onChange={(e, value) => value && setEditingMode(value)}
                                fullWidth
                            >
                                <ToggleButton value="light">
                                    <Sun size={18} style={{ marginRight: 8 }} />
                                    Light Mode
                                </ToggleButton>
                                <ToggleButton value="dark">
                                    <Moon size={18} style={{ marginRight: 8 }} />
                                    Dark Mode
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {/* Primary Color */}
                            <TextField
                                fullWidth
                                label="Primary Color"
                                value={currentColors.primary}
                                onChange={(e) => handleColorChange("primary", e.target.value)}
                                helperText="Main brand color (used for primary buttons, links, etc.)"
                                error={!isValidHexColor(currentColors.primary)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <input
                                                type="color"
                                                value={isValidHexColor(currentColors.primary) ? currentColors.primary : "#000000"}
                                                onChange={(e) => handleColorChange("primary", e.target.value)}
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    border: "none",
                                                    borderRadius: 4,
                                                    cursor: "pointer",
                                                    marginRight: 8,
                                                }}
                                            />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {/* Secondary Color */}
                            <TextField
                                fullWidth
                                label="Secondary Color"
                                value={currentColors.secondary}
                                onChange={(e) => handleColorChange("secondary", e.target.value)}
                                helperText="Secondary brand color (used for accents and highlights)"
                                error={!isValidHexColor(currentColors.secondary)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <input
                                                type="color"
                                                value={isValidHexColor(currentColors.secondary) ? currentColors.secondary : "#000000"}
                                                onChange={(e) => handleColorChange("secondary", e.target.value)}
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    border: "none",
                                                    borderRadius: 4,
                                                    cursor: "pointer",
                                                    marginRight: 8,
                                                }}
                                            />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {/* Accent Color */}
                            <TextField
                                fullWidth
                                label="Accent Color"
                                value={currentColors.accent}
                                onChange={(e) => handleColorChange("accent", e.target.value)}
                                helperText="Accent color (used for CTAs and special highlights)"
                                error={!isValidHexColor(currentColors.accent)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <input
                                                type="color"
                                                value={isValidHexColor(currentColors.accent) ? currentColors.accent : "#000000"}
                                                onChange={(e) => handleColorChange("accent", e.target.value)}
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    border: "none",
                                                    borderRadius: 4,
                                                    cursor: "pointer",
                                                    marginRight: 8,
                                                }}
                                            />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {/* Background Color */}
                            <TextField
                                fullWidth
                                label="Background Color"
                                value={currentColors.background}
                                onChange={(e) => handleColorChange("background", e.target.value)}
                                helperText="Main background color for pages"
                                error={!isValidHexColor(currentColors.background)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <input
                                                type="color"
                                                value={isValidHexColor(currentColors.background) ? currentColors.background : "#000000"}
                                                onChange={(e) => handleColorChange("background", e.target.value)}
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    border: "none",
                                                    borderRadius: 4,
                                                    cursor: "pointer",
                                                    marginRight: 8,
                                                }}
                                            />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {/* Paper Color */}
                            <TextField
                                fullWidth
                                label="Paper/Card Color"
                                value={currentColors.paper}
                                onChange={(e) => handleColorChange("paper", e.target.value)}
                                helperText="Background color for cards and elevated surfaces"
                                error={!isValidHexColor(currentColors.paper)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <input
                                                type="color"
                                                value={isValidHexColor(currentColors.paper) ? currentColors.paper : "#ffffff"}
                                                onChange={(e) => handleColorChange("paper", e.target.value)}
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    border: "none",
                                                    borderRadius: 4,
                                                    cursor: "pointer",
                                                    marginRight: 8,
                                                }}
                                            />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>
                    </CardContent>
                </Card>

                {/* Live Preview Section */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                            <Typography variant="h6">Live Preview</Typography>
                            <ToggleButtonGroup
                                value={previewMode}
                                exclusive
                                onChange={(e, value) => value && setPreviewMode(value)}
                                size="small"
                            >
                                <ToggleButton value="light">
                                    <Sun size={16} style={{ marginRight: 8 }} />
                                    Light
                                </ToggleButton>
                                <ToggleButton value="dark">
                                    <Moon size={16} style={{ marginRight: 8 }} />
                                    Dark
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                        <RealisticPreview colors={branding.colors[previewMode]} mode={previewMode} />
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
