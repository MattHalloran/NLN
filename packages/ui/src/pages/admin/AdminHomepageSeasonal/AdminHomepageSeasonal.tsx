import { APP_LINKS } from "@local/shared";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Grid,
    IconButton,
    Paper,
    Stack,
    TextField,
    Typography,
    useTheme,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Alert,
    FormControlLabel,
    Switch,
    ToggleButtonGroup,
    ToggleButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from "@mui/material";
import { useLandingPage } from "hooks/useLandingPage";
import { useUpdateLandingPageContent, useAddImages } from "api/rest/hooks";
import { useABTestQueryParams } from "hooks/useABTestQueryParams";
import { BackButton, PageContainer, TopBar, Dropzone } from "components";
import { getServerUrl } from "utils";
import {
    Flower,
    Leaf,
    Lightbulb,
    Plus,
    Snowflake,
    Sprout,
    Star,
    Trash2,
    Save,
    RotateCcw,
    Leaf as LeafIcon,
    ChevronDown,
    X as CloseIcon,
    Image as ImageIcon,
} from "lucide-react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { PubSub } from "utils/pubsub";
import { SnackSeverity } from "components/dialogs/Snack/Snack";

interface SeasonalPlant {
    id: string;
    name: string;
    description: string;
    season: string;
    careLevel: string;
    icon: string;
    displayOrder: number;
    isActive: boolean;
    // Optional image fields (icon is fallback)
    image?: string;
    imageAlt?: string;
    imageHash?: string;
}

interface PlantTip {
    id: string;
    title: string;
    description: string;
    category: string;
    season: string;
    displayOrder: number;
    isActive: boolean;
}

const iconOptions = [
    { value: "leaf", icon: Leaf, label: "Leaf" },
    { value: "flower", icon: Flower, label: "Flower" },
    { value: "flower2", icon: Flower, label: "Flower 2" },
    { value: "snowflake", icon: Snowflake, label: "Snowflake" },
    { value: "sprout", icon: Sprout, label: "Sprout" },
    { value: "star", icon: Star, label: "Star" },
];

const getIconComponent = (iconName: string) => {
    const option = iconOptions.find((opt) => opt.value === iconName);
    return option ? option.icon : Leaf;
};

// Get current season based on month (Northern Hemisphere)
const getCurrentSeason = (): string => {
    const month = new Date().getMonth(); // 0-11
    if (month >= 2 && month <= 4) return "Spring"; // Mar, Apr, May
    if (month >= 5 && month <= 7) return "Summer"; // Jun, Jul, Aug
    if (month >= 8 && month <= 10) return "Fall"; // Sep, Oct, Nov
    return "Winter"; // Dec, Jan, Feb
};

// Sort plants by season, putting current season first
const sortPlantsBySeason = (plants: SeasonalPlant[]): SeasonalPlant[] => {
    const currentSeason = getCurrentSeason();
    return [...plants].sort((a, b) => {
        // Current season comes first
        if (a.season === currentSeason && b.season !== currentSeason) return -1;
        if (b.season === currentSeason && a.season !== currentSeason) return 1;
        // Otherwise maintain original order
        return 0;
    });
};

// Preview Component - Shows how the seasonal section looks on the homepage
const SeasonalPreview = ({ plants, tips }: { plants: SeasonalPlant[]; tips: PlantTip[] }) => {
    const { palette } = useTheme();
    const [currentPlant, setCurrentPlant] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(0);

    const rawActivePlants = plants.filter((p) => p.isActive);
    // Sort plants by season, putting current season first
    const activePlants = useMemo(() => sortPlantsBySeason(rawActivePlants), [rawActivePlants]);
    const currentSeason = useMemo(() => getCurrentSeason(), []);

    const activeTips = tips.filter((t) => t.isActive);
    const tipCategories = ["All", ...Array.from(new Set(activeTips.map((tip) => tip.category)))];
    const filteredTips =
        selectedCategory === 0 ? activeTips : activeTips.filter((tip) => tip.category === tipCategories[selectedCategory]);

    const safeCurrentPlant = useMemo(() => {
        if (activePlants.length === 0) return 0;
        if (currentPlant >= activePlants.length) return 0;
        return currentPlant;
    }, [currentPlant, activePlants.length]);

    const getCareColor = (level: string) => {
        switch (level) {
            case "Easy":
                return palette.success.main;
            case "Medium":
                return palette.warning.main;
            case "Advanced":
                return palette.error.main;
            default:
                return palette.grey[500];
        }
    };

    return (
        <Box
            sx={{
                borderRadius: 2,
                border: "2px solid",
                borderColor: "divider",
                overflow: "hidden",
                bgcolor: palette.grey[50],
            }}
        >
            {/* Header */}
            <Box sx={{ textAlign: "center", p: 3, bgcolor: "background.paper" }}>
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 700,
                        color: palette.primary.main,
                        mb: 0.5,
                    }}
                >
                    Seasonal Highlights & Expert Tips
                </Typography>
                <Typography variant="caption" sx={{ color: palette.text.secondary }}>
                    Discover what's blooming now and get expert care advice
                </Typography>
            </Box>

            <Box sx={{ p: 2 }}>
                <Grid container spacing={2}>
                    {/* Seasonal Plants Carousel */}
                    <Grid item xs={12} md={6}>
                        <Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                                <Leaf size={18} color={palette.primary.main} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: palette.primary.main }}>
                                    {activePlants.length > 0 && activePlants[safeCurrentPlant]?.season === currentSeason
                                        ? "What's Blooming Now"
                                        : activePlants.length > 0
                                            ? `Perfect for ${activePlants[safeCurrentPlant]?.season}`
                                            : "What's Blooming Now"}
                                </Typography>
                            </Box>

                            {activePlants.length > 0 ? (
                                <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                                    <Box
                                        sx={{
                                            minHeight: "200px",
                                            background: activePlants[safeCurrentPlant]?.image
                                                ? `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url(${getServerUrl()}${activePlants[safeCurrentPlant].image})`
                                                : `linear-gradient(135deg, ${palette.primary.light} 0%, ${palette.secondary.light} 100%)`,
                                            backgroundSize: "cover",
                                            backgroundPosition: "center",
                                            position: "relative",
                                            p: 3,
                                            color: "white",
                                            textAlign: "center",
                                        }}
                                    >
                                        {/* Only show icon if no image is available */}
                                        {!activePlants[safeCurrentPlant]?.image && (
                                            <Box sx={{ mb: 1.5, display: "flex", justifyContent: "center" }}>
                                                {(() => {
                                                    const IconComponent = getIconComponent(activePlants[safeCurrentPlant]?.icon || "leaf");
                                                    return <IconComponent size={48} />;
                                                })()}
                                            </Box>
                                        )}

                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}>
                                            {activePlants[safeCurrentPlant]?.name || "Loading..."}
                                        </Typography>

                                        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, mb: 1.5 }}>
                                            <Chip label={activePlants[safeCurrentPlant]?.season || "Season"} color="secondary" size="small" />
                                            <Chip
                                                label={activePlants[safeCurrentPlant]?.careLevel || "Easy"}
                                                sx={{
                                                    backgroundColor: getCareColor(activePlants[safeCurrentPlant]?.careLevel || "Easy"),
                                                    color: "white",
                                                }}
                                                size="small"
                                            />
                                        </Box>

                                        <Typography
                                            variant="caption"
                                            sx={{
                                                opacity: 0.9,
                                                textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
                                                display: "block",
                                            }}
                                        >
                                            {activePlants[safeCurrentPlant]?.description || "Loading..."}
                                        </Typography>
                                    </Box>

                                    {/* Navigation Dots */}
                                    <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, p: 1.5, backgroundColor: "white" }}>
                                        {activePlants.map((_, index) => (
                                            <Box
                                                key={index}
                                                onClick={() => setCurrentPlant(index)}
                                                sx={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: "50%",
                                                    backgroundColor: index === safeCurrentPlant ? palette.primary.main : palette.grey[300],
                                                    cursor: "pointer",
                                                    transition: "all 0.2s",
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Card>
                            ) : (
                                <Paper sx={{ p: 3, textAlign: "center", bgcolor: "grey.100" }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Add plants to see preview
                                    </Typography>
                                </Paper>
                            )}
                        </Box>
                    </Grid>

                    {/* Plant Care Tips */}
                    <Grid item xs={12} md={6}>
                        <Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                                <Lightbulb size={18} color={palette.primary.main} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: palette.primary.main }}>
                                    Expert Plant Care Tips
                                </Typography>
                            </Box>

                            {activeTips.length > 0 ? (
                                <Box>
                                    {/* Category Tabs */}
                                    <Box sx={{ mb: 1.5, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                        {tipCategories.slice(0, 3).map((category, index) => (
                                            <Chip
                                                key={index}
                                                label={category}
                                                size="small"
                                                onClick={() => setSelectedCategory(index)}
                                                color={selectedCategory === index ? "primary" : "default"}
                                                sx={{ cursor: "pointer", fontSize: "0.7rem" }}
                                            />
                                        ))}
                                    </Box>

                                    {/* Tips List */}
                                    <Box sx={{ maxHeight: "200px", overflowY: "auto" }}>
                                        {filteredTips.slice(0, 2).map((tip, index) => (
                                            <Card key={index} sx={{ mb: 1, borderRadius: 1 }}>
                                                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 600, color: palette.primary.main, display: "block", mb: 0.5 }}>
                                                        {tip.title}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: palette.text.secondary, fontSize: "0.65rem", display: "block" }}>
                                                        {tip.description.substring(0, 80)}
                                                        {tip.description.length > 80 ? "..." : ""}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Box>
                                </Box>
                            ) : (
                                <Paper sx={{ p: 3, textAlign: "center", bgcolor: "grey.100" }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Add tips to see preview
                                    </Typography>
                                </Paper>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};

export const AdminHomepageSeasonal = () => {
    const { palette } = useTheme();
    const { variantId: queryVariantId } = useABTestQueryParams();
    const { data, refetch } = useLandingPage();
    const updateLandingPageContent = useUpdateLandingPageContent();
    const { mutate: addImages } = useAddImages();

    // Use variantId from URL query params, or fall back to the loaded data's variant
    const variantId = queryVariantId || data?._meta?.variantId;

    const [plants, setPlants] = useState<SeasonalPlant[]>([]);
    const [originalPlants, setOriginalPlants] = useState<SeasonalPlant[]>([]);
    const [tips, setTips] = useState<PlantTip[]>([]);
    const [originalTips, setOriginalTips] = useState<PlantTip[]>([]);
    const [editingPlant, setEditingPlant] = useState<SeasonalPlant | null>(null);
    const [editingTip, setEditingTip] = useState<PlantTip | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

    // Section text settings state
    const [sectionText, setSectionText] = useState({
        header: {
            title: "Seasonal Highlights & Expert Tips",
            subtitle: "Discover what's blooming now and get expert care advice for every season"
        },
        sections: {
            plants: {
                currentSeasonTitle: "What's Blooming Now",
                otherSeasonTitleTemplate: "Perfect for {season}"
            },
            tips: {
                title: "Expert Plant Care Tips"
            }
        },
        newsletterButtonText: "Subscribe"
    });
    const [originalSectionText, setOriginalSectionText] = useState(sectionText);

    // Load data from API
    useEffect(() => {
        if (data?.content?.seasonal) {
            const loadedPlants = data.content.seasonal.plants || [];
            const loadedTips = data.content.seasonal.tips || [];

            setPlants(JSON.parse(JSON.stringify(loadedPlants)));
            setOriginalPlants(JSON.parse(JSON.stringify(loadedPlants)));
            setTips(JSON.parse(JSON.stringify(loadedTips)));
            setOriginalTips(JSON.parse(JSON.stringify(loadedTips)));

            // Load section text settings
            const loadedSectionText = {
                header: data.content.seasonal.header || {
                    title: "Seasonal Highlights & Expert Tips",
                    subtitle: "Discover what's blooming now and get expert care advice for every season"
                },
                sections: data.content.seasonal.sections || {
                    plants: {
                        currentSeasonTitle: "What's Blooming Now",
                        otherSeasonTitleTemplate: "Perfect for {season}"
                    },
                    tips: {
                        title: "Expert Plant Care Tips"
                    }
                },
                newsletterButtonText: data.content.newsletter?.buttonText || "Subscribe"
            };
            setSectionText(JSON.parse(JSON.stringify(loadedSectionText)));
            setOriginalSectionText(JSON.parse(JSON.stringify(loadedSectionText)));
        }
    }, [data]);

    // Check for unsaved changes
    const hasChanges = useMemo(() => {
        const plantsChanged = JSON.stringify(plants) !== JSON.stringify(originalPlants);
        const tipsChanged = JSON.stringify(tips) !== JSON.stringify(originalTips);
        const sectionTextChanged = JSON.stringify(sectionText) !== JSON.stringify(originalSectionText);
        return plantsChanged || tipsChanged || sectionTextChanged;
    }, [plants, originalPlants, tips, originalTips, sectionText, originalSectionText]);

    const handleApiError = useCallback((error: any, defaultMessage: string) => {
        const message = error?.message || defaultMessage;
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Error });
    }, []);

    const handleApiSuccess = useCallback((message: string) => {
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Success });
    }, []);

    const handleSaveAll = async () => {
        try {
            setIsLoading(true);

            const queryParams = variantId ? { variantId } : undefined;

            await updateLandingPageContent.mutate({
                data: {
                    seasonalPlants: plants,
                    plantTips: tips,
                    seasonalHeader: sectionText.header,
                    seasonalSections: sectionText.sections,
                    newsletterButtonText: sectionText.newsletterButtonText,
                },
                queryParams,
            });
            await refetch();
            setOriginalPlants(JSON.parse(JSON.stringify(plants)));
            setOriginalTips(JSON.parse(JSON.stringify(tips)));
            setOriginalSectionText(JSON.parse(JSON.stringify(sectionText)));
            handleApiSuccess("Seasonal content saved successfully!");
        } catch (error) {
            handleApiError(error, "Failed to save seasonal content");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setPlants(JSON.parse(JSON.stringify(originalPlants)));
        setTips(JSON.parse(JSON.stringify(originalTips)));
        setSectionText(JSON.parse(JSON.stringify(originalSectionText)));
        setEditingPlant(null);
        setEditingTip(null);
    };

    const handleAddPlant = () => {
        const newPlant: SeasonalPlant = {
            id: `plant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: "",
            description: "",
            season: "Spring",
            careLevel: "Easy",
            icon: "leaf",
            displayOrder: plants.length + 1,
            isActive: true,
        };
        setPlants([...plants, newPlant]);
        setEditingPlant(newPlant);
    };

    const handleAddTip = () => {
        const newTip: PlantTip = {
            id: `tip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: "",
            description: "",
            category: "General",
            season: "Year-round",
            displayOrder: tips.length + 1,
            isActive: true,
        };
        setTips([...tips, newTip]);
        setEditingTip(newTip);
    };

    const handleDeletePlant = (id: string) => {
        if (window.confirm("Delete this plant?")) {
            setPlants(plants.filter((p) => p.id !== id));
            if (editingPlant?.id === id) setEditingPlant(null);
        }
    };

    const handleDeleteTip = (id: string) => {
        if (window.confirm("Delete this tip?")) {
            setTips(tips.filter((t) => t.id !== id));
            if (editingTip?.id === id) setEditingTip(null);
        }
    };

    const handlePlantFieldChange = (field: keyof SeasonalPlant, value: any) => {
        if (!editingPlant) return;
        const updatedPlant = { ...editingPlant, [field]: value };
        setEditingPlant(updatedPlant);
        setPlants(plants.map((p) => (p.id === updatedPlant.id ? updatedPlant : p)));
    };

    const handleTipFieldChange = (field: keyof PlantTip, value: any) => {
        if (!editingTip) return;
        const updatedTip = { ...editingTip, [field]: value };
        setEditingTip(updatedTip);
        setTips(tips.map((t) => (t.id === updatedTip.id ? updatedTip : t)));
    };

    // Image upload handler for seasonal plants
    const handlePlantImageUpload = useCallback(async (plantId: string, acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        try {
            setIsLoading(true);
            const file = acceptedFiles[0]; // Only use first file

            // Upload image with "seasonal" label
            const uploadResults = await addImages({ label: "seasonal", files: [file] });

            if (uploadResults.length > 0 && uploadResults[0].success) {
                const result = uploadResults[0];

                // Update plant with image details
                const updatedPlants = plants.map((p) => {
                    if (p.id === plantId) {
                        return {
                            ...p,
                            image: `/${result.src}`,
                            imageAlt: file.name.replace(/\.[^/.]+$/, ""),
                            imageHash: result.hash,
                        };
                    }
                    return p;
                });

                setPlants(updatedPlants);

                // Update editing plant if it's the one being edited
                if (editingPlant?.id === plantId) {
                    setEditingPlant({
                        ...editingPlant,
                        image: `/${result.src}`,
                        imageAlt: file.name.replace(/\.[^/.]+$/, ""),
                        imageHash: result.hash,
                    });
                }

                PubSub.get().publishSnack({
                    message: "Image uploaded successfully!",
                    severity: SnackSeverity.Success,
                });
            } else {
                throw new Error("Image upload failed");
            }
        } catch (error) {
            handleApiError(error, "Failed to upload image");
        } finally {
            setIsLoading(false);
        }
    }, [plants, editingPlant, addImages, handleApiError]);

    // Delete image handler for seasonal plants
    const handleDeletePlantImage = useCallback((plantId: string) => {
        // Set deleting state immediately to prevent double-clicks
        setDeletingImageId(plantId);

        // Use functional state update to avoid stale closure
        setPlants((prevPlants) => prevPlants.map((p) => {
            if (p.id === plantId) {
                // Create a new object without image fields
                const newPlant: SeasonalPlant = {
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    season: p.season,
                    careLevel: p.careLevel,
                    icon: p.icon,
                    displayOrder: p.displayOrder,
                    isActive: p.isActive,
                    // Explicitly do not include image, imageAlt, imageHash
                };
                return newPlant;
            }
            return p;
        }));

        // Update editing plant if it's the one being edited
        setEditingPlant((prevEditingPlant) => {
            if (prevEditingPlant?.id === plantId) {
                const newPlant: SeasonalPlant = {
                    id: prevEditingPlant.id,
                    name: prevEditingPlant.name,
                    description: prevEditingPlant.description,
                    season: prevEditingPlant.season,
                    careLevel: prevEditingPlant.careLevel,
                    icon: prevEditingPlant.icon,
                    displayOrder: prevEditingPlant.displayOrder,
                    isActive: prevEditingPlant.isActive,
                    // Explicitly do not include image, imageAlt, imageHash
                };
                return newPlant;
            }
            return prevEditingPlant;
        });

        PubSub.get().publishSnack({
            message: "Image removed (icon will be used as fallback)",
            severity: SnackSeverity.Info,
        });

        // Clear deleting state after state updates
        setTimeout(() => setDeletingImageId(null), 100);
    }, []);

    return (
        <PageContainer variant="wide" sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="Seasonal Content Management"
                help="Manage seasonal plants and expert tips displayed on the home page"
                startComponent={<BackButton to={APP_LINKS.AdminHomepage} ariaLabel="Back to Homepage Management" />}
            />

            <Box p={2}>
                {/* Unsaved changes warning */}
                {hasChanges && (
                    <Alert
                        severity="warning"
                        sx={{
                            mb: 3,
                            borderLeft: "4px solid",
                            borderColor: "warning.main",
                            bgcolor: "warning.lighter",
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
                            startIcon={<Save size={20} />}
                            onClick={handleSaveAll}
                            disabled={isLoading}
                            sx={{
                                px: 4,
                                fontWeight: 600,
                                boxShadow: 2,
                                "&:hover": { boxShadow: 4 },
                            }}
                        >
                            {isLoading ? "Saving..." : "Save All Changes"}
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<RotateCcw size={20} />}
                            onClick={handleCancel}
                            sx={{
                                px: 4,
                                fontWeight: 600,
                                borderWidth: 2,
                                "&:hover": { borderWidth: 2 },
                            }}
                        >
                            Cancel
                        </Button>
                    </Paper>
                )}

                {/* Two-column layout */}
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
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                        Live Preview
                                    </Typography>
                                    <SeasonalPreview plants={plants} tips={tips} />
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                        <Typography variant="caption">This preview updates in real-time as you make changes.</Typography>
                                    </Alert>
                                </Paper>
                            </Box>

                            {/* Statistics Card */}
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 2,
                                }}
                            >
                                <Grid container spacing={3}>
                                    <Grid item xs={4}>
                                        <Box sx={{ textAlign: "center" }}>
                                            <Leaf size={32} color={palette.primary.main} />
                                            <Typography variant="h5" sx={{ mt: 1 }}>
                                                {plants.filter((p) => p.isActive).length}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Active Plants
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Box sx={{ textAlign: "center" }}>
                                            <Lightbulb size={32} color={palette.secondary.main} />
                                            <Typography variant="h5" sx={{ mt: 1 }}>
                                                {tips.filter((t) => t.isActive).length}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Active Tips
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Box sx={{ textAlign: "center" }}>
                                            <LeafIcon size={32} color={palette.info.main} />
                                            <Typography variant="h5" sx={{ mt: 1 }}>
                                                {plants.length + tips.length}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Total Items
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Paper>

                            {/* Section Text Settings Accordion */}
                            <Accordion
                                defaultExpanded
                                sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: "8px !important",
                                    "&:before": { display: "none" },
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ChevronDown size={20} />}
                                    sx={{
                                        bgcolor: "grey.50",
                                        borderRadius: "8px 8px 0 0",
                                        minHeight: 64,
                                        "&:hover": { bgcolor: "grey.100" },
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
                                            <LeafIcon size={20} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                Section Text Settings
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Customize all text in the seasonal section
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3 }}>
                                    <Grid container spacing={3}>
                                        {/* Main Section Header */}
                                        <Grid item xs={12}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: palette.primary.main }}>
                                                Main Section Header
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                label="Section Title"
                                                value={sectionText.header.title}
                                                onChange={(e) => setSectionText({
                                                    ...sectionText,
                                                    header: { ...sectionText.header, title: e.target.value }
                                                })}
                                                helperText="Main heading for the seasonal section"
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                label="Section Subtitle"
                                                value={sectionText.header.subtitle}
                                                onChange={(e) => setSectionText({
                                                    ...sectionText,
                                                    header: { ...sectionText.header, subtitle: e.target.value }
                                                })}
                                                helperText="Subtitle under the main heading"
                                            />
                                        </Grid>

                                        {/* Plants Section */}
                                        <Grid item xs={12}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, mt: 2, color: palette.primary.main }}>
                                                Plants Carousel Settings
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                label="Current Season Title"
                                                value={sectionText.sections.plants.currentSeasonTitle}
                                                onChange={(e) => setSectionText({
                                                    ...sectionText,
                                                    sections: {
                                                        ...sectionText.sections,
                                                        plants: { ...sectionText.sections.plants, currentSeasonTitle: e.target.value }
                                                    }
                                                })}
                                                helperText="Title when showing current season plants"
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                label="Other Season Title Template"
                                                value={sectionText.sections.plants.otherSeasonTitleTemplate}
                                                onChange={(e) => setSectionText({
                                                    ...sectionText,
                                                    sections: {
                                                        ...sectionText.sections,
                                                        plants: { ...sectionText.sections.plants, otherSeasonTitleTemplate: e.target.value }
                                                    }
                                                })}
                                                helperText="Use {season} as placeholder (e.g., 'Perfect for {season}')"
                                            />
                                        </Grid>

                                        {/* Tips Section */}
                                        <Grid item xs={12}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, mt: 2, color: palette.primary.main }}>
                                                Tips Section Settings
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                label="Tips Section Title"
                                                value={sectionText.sections.tips.title}
                                                onChange={(e) => setSectionText({
                                                    ...sectionText,
                                                    sections: {
                                                        ...sectionText.sections,
                                                        tips: { title: e.target.value }
                                                    }
                                                })}
                                                helperText="Heading for the expert tips section"
                                            />
                                        </Grid>

                                        {/* Newsletter Button */}
                                        <Grid item xs={12}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, mt: 2, color: palette.primary.main }}>
                                                Newsletter Settings
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                label="Subscribe Button Text"
                                                value={sectionText.newsletterButtonText}
                                                onChange={(e) => setSectionText({
                                                    ...sectionText,
                                                    newsletterButtonText: e.target.value
                                                })}
                                                helperText="Text on the newsletter subscription button"
                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Alert severity="info" sx={{ mt: 2 }}>
                                                <Typography variant="caption">
                                                    These text settings allow you to customize all the section headings and titles.
                                                    Changes will be reflected on the homepage after saving.
                                                </Typography>
                                            </Alert>
                                        </Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>

                            {/* Seasonal Plants Accordion */}
                            <Accordion
                                defaultExpanded
                                sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: "8px !important",
                                    "&:before": { display: "none" },
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ChevronDown size={20} />}
                                    sx={{
                                        bgcolor: "grey.50",
                                        borderRadius: "8px 8px 0 0",
                                        minHeight: 64,
                                        "&:hover": { bgcolor: "grey.100" },
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
                                            <Leaf size={20} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                Seasonal Plants ({plants.length})
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Manage plants that appear in the carousel
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<Plus size={20} />}
                                            onClick={handleAddPlant}
                                            sx={{
                                                borderStyle: "dashed",
                                                borderWidth: 2,
                                                py: 1.5,
                                                "&:hover": { borderWidth: 2 },
                                            }}
                                        >
                                            Add New Plant
                                        </Button>

                                        {plants.map((plant) => (
                                            <Paper
                                                key={plant.id}
                                                elevation={0}
                                                sx={{
                                                    p: 2.5,
                                                    border: "2px solid",
                                                    borderColor: editingPlant?.id === plant.id ? "primary.main" : "divider",
                                                    borderRadius: 2,
                                                    cursor: "pointer",
                                                    transition: "all 0.2s",
                                                    "&:hover": {
                                                        borderColor: "primary.light",
                                                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                                    },
                                                }}
                                                onClick={() => setEditingPlant(plant)}
                                            >
                                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                                                            {(() => {
                                                                const IconComponent = getIconComponent(plant.icon);
                                                                return <IconComponent size={24} color={palette.primary.main} />;
                                                            })()}
                                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                                {plant.name || "Untitled Plant"}
                                                            </Typography>
                                                            {!plant.isActive && (
                                                                <Chip label="Inactive" size="small" color="default" />
                                                            )}
                                                        </Box>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            {plant.description || "No description"}
                                                        </Typography>
                                                        <Stack direction="row" spacing={1}>
                                                            <Chip label={plant.season} size="small" color="primary" />
                                                            <Chip label={plant.careLevel} size="small" />
                                                        </Stack>
                                                    </Box>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeletePlant(plant.id);
                                                        }}
                                                        color="error"
                                                    >
                                                        <Trash2 size={18} />
                                                    </IconButton>
                                                </Box>

                                                {/* Editing Form */}
                                                {editingPlant?.id === plant.id && (
                                                    <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
                                                        <Grid container spacing={2}>
                                                            <Grid item xs={12}>
                                                                <TextField
                                                                    fullWidth
                                                                    label="Name"
                                                                    value={editingPlant.name}
                                                                    onChange={(e) => handlePlantFieldChange("name", e.target.value)}
                                                                    size="small"
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <TextField
                                                                    fullWidth
                                                                    multiline
                                                                    rows={2}
                                                                    label="Description"
                                                                    value={editingPlant.description}
                                                                    onChange={(e) => handlePlantFieldChange("description", e.target.value)}
                                                                    size="small"
                                                                />
                                                            </Grid>
                                                            <Grid item xs={6}>
                                                                <FormControl fullWidth size="small">
                                                                    <InputLabel>Season</InputLabel>
                                                                    <Select
                                                                        value={editingPlant.season}
                                                                        label="Season"
                                                                        onChange={(e) => handlePlantFieldChange("season", e.target.value)}
                                                                    >
                                                                        <MenuItem value="Spring">Spring</MenuItem>
                                                                        <MenuItem value="Summer">Summer</MenuItem>
                                                                        <MenuItem value="Fall">Fall</MenuItem>
                                                                        <MenuItem value="Winter">Winter</MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            </Grid>
                                                            <Grid item xs={6}>
                                                                <FormControl fullWidth size="small">
                                                                    <InputLabel>Care Level</InputLabel>
                                                                    <Select
                                                                        value={editingPlant.careLevel}
                                                                        label="Care Level"
                                                                        onChange={(e) => handlePlantFieldChange("careLevel", e.target.value)}
                                                                    >
                                                                        <MenuItem value="Easy">Easy</MenuItem>
                                                                        <MenuItem value="Medium">Medium</MenuItem>
                                                                        <MenuItem value="Advanced">Advanced</MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <Typography variant="caption" sx={{ mb: 1, display: "block", fontWeight: 600 }}>
                                                                    Image (Optional)
                                                                </Typography>
                                                                {editingPlant.image ? (
                                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                                                        <Box
                                                                            component="img"
                                                                            src={`${getServerUrl()}${editingPlant.image}`}
                                                                            alt={editingPlant.imageAlt || editingPlant.name}
                                                                            sx={{
                                                                                width: 100,
                                                                                height: 100,
                                                                                objectFit: "cover",
                                                                                borderRadius: 1,
                                                                                border: "2px solid",
                                                                                borderColor: "divider",
                                                                            }}
                                                                        />
                                                                        <Box>
                                                                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                                                                Image is set. Icon will be used as fallback.
                                                                            </Typography>
                                                                            <Button
                                                                                size="small"
                                                                                startIcon={<Trash2 size={16} />}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeletePlantImage(editingPlant.id);
                                                                                }}
                                                                                color="error"
                                                                                disabled={deletingImageId === editingPlant.id}
                                                                            >
                                                                                {deletingImageId === editingPlant.id ? "Removing..." : "Remove Image"}
                                                                            </Button>
                                                                        </Box>
                                                                    </Box>
                                                                ) : (
                                                                    <Box>
                                                                        <Dropzone
                                                                            dropzoneText="Drop image here or click"
                                                                            onUpload={(files) => handlePlantImageUpload(editingPlant.id, files)}
                                                                            uploadText="Upload Image"
                                                                            acceptedFileTypes={["image/*"]}
                                                                            maxFiles={1}
                                                                            sxs={{ root: { maxWidth: "100%", mb: 0 } }}
                                                                        />
                                                                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                                                                            Recommended: 800x600px or 600x600px. Icon below will be used as fallback.
                                                                        </Typography>
                                                                    </Box>
                                                                )}
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
                                                                    Icon (Fallback) *Required
                                                                </Typography>
                                                                <ToggleButtonGroup
                                                                    value={editingPlant.icon}
                                                                    exclusive
                                                                    onChange={(_, value) => value && handlePlantFieldChange("icon", value)}
                                                                    size="small"
                                                                >
                                                                    {iconOptions.map((option) => {
                                                                        const IconComp = option.icon;
                                                                        return (
                                                                            <ToggleButton key={option.value} value={option.value}>
                                                                                <IconComp size={18} />
                                                                            </ToggleButton>
                                                                        );
                                                                    })}
                                                                </ToggleButtonGroup>
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <FormControlLabel
                                                                    control={
                                                                        <Switch
                                                                            checked={editingPlant.isActive}
                                                                            onChange={(e) => handlePlantFieldChange("isActive", e.target.checked)}
                                                                        />
                                                                    }
                                                                    label="Active"
                                                                />
                                                            </Grid>
                                                        </Grid>
                                                    </Box>
                                                )}
                                            </Paper>
                                        ))}
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Plant Care Tips Accordion */}
                            <Accordion
                                defaultExpanded
                                sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: "8px !important",
                                    "&:before": { display: "none" },
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ChevronDown size={20} />}
                                    sx={{
                                        bgcolor: "grey.50",
                                        borderRadius: "8px 8px 0 0",
                                        minHeight: 64,
                                        "&:hover": { bgcolor: "grey.100" },
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
                                            <Lightbulb size={20} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                Plant Care Tips ({tips.length})
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Manage expert advice and tips
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<Plus size={20} />}
                                            onClick={handleAddTip}
                                            sx={{
                                                borderStyle: "dashed",
                                                borderWidth: 2,
                                                py: 1.5,
                                                "&:hover": { borderWidth: 2 },
                                            }}
                                        >
                                            Add New Tip
                                        </Button>

                                        {tips.map((tip) => (
                                            <Paper
                                                key={tip.id}
                                                elevation={0}
                                                sx={{
                                                    p: 2.5,
                                                    border: "2px solid",
                                                    borderColor: editingTip?.id === tip.id ? "secondary.main" : "divider",
                                                    borderRadius: 2,
                                                    cursor: "pointer",
                                                    transition: "all 0.2s",
                                                    "&:hover": {
                                                        borderColor: "secondary.light",
                                                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                                    },
                                                }}
                                                onClick={() => setEditingTip(tip)}
                                            >
                                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                                {tip.title || "Untitled Tip"}
                                                            </Typography>
                                                            {!tip.isActive && (
                                                                <Chip label="Inactive" size="small" color="default" />
                                                            )}
                                                        </Box>
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            {tip.description || "No description"}
                                                        </Typography>
                                                        <Stack direction="row" spacing={1}>
                                                            <Chip label={tip.category} size="small" color="primary" />
                                                            <Chip label={tip.season} size="small" color="secondary" />
                                                        </Stack>
                                                    </Box>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteTip(tip.id);
                                                        }}
                                                        color="error"
                                                    >
                                                        <Trash2 size={18} />
                                                    </IconButton>
                                                </Box>

                                                {/* Editing Form */}
                                                {editingTip?.id === tip.id && (
                                                    <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
                                                        <Grid container spacing={2}>
                                                            <Grid item xs={12}>
                                                                <TextField
                                                                    fullWidth
                                                                    label="Title"
                                                                    value={editingTip.title}
                                                                    onChange={(e) => handleTipFieldChange("title", e.target.value)}
                                                                    size="small"
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <TextField
                                                                    fullWidth
                                                                    multiline
                                                                    rows={3}
                                                                    label="Description"
                                                                    value={editingTip.description}
                                                                    onChange={(e) => handleTipFieldChange("description", e.target.value)}
                                                                    size="small"
                                                                />
                                                            </Grid>
                                                            <Grid item xs={6}>
                                                                <FormControl fullWidth size="small">
                                                                    <InputLabel>Category</InputLabel>
                                                                    <Select
                                                                        value={editingTip.category}
                                                                        label="Category"
                                                                        onChange={(e) => handleTipFieldChange("category", e.target.value)}
                                                                    >
                                                                        <MenuItem value="Watering">Watering</MenuItem>
                                                                        <MenuItem value="Fertilizing">Fertilizing</MenuItem>
                                                                        <MenuItem value="Pruning">Pruning</MenuItem>
                                                                        <MenuItem value="Pest Control">Pest Control</MenuItem>
                                                                        <MenuItem value="General">General</MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            </Grid>
                                                            <Grid item xs={6}>
                                                                <FormControl fullWidth size="small">
                                                                    <InputLabel>Season</InputLabel>
                                                                    <Select
                                                                        value={editingTip.season}
                                                                        label="Season"
                                                                        onChange={(e) => handleTipFieldChange("season", e.target.value)}
                                                                    >
                                                                        <MenuItem value="Spring">Spring</MenuItem>
                                                                        <MenuItem value="Summer">Summer</MenuItem>
                                                                        <MenuItem value="Fall">Fall</MenuItem>
                                                                        <MenuItem value="Winter">Winter</MenuItem>
                                                                        <MenuItem value="Year-round">Year-round</MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <FormControlLabel
                                                                    control={
                                                                        <Switch
                                                                            checked={editingTip.isActive}
                                                                            onChange={(e) => handleTipFieldChange("isActive", e.target.checked)}
                                                                        />
                                                                    }
                                                                    label="Active"
                                                                />
                                                            </Grid>
                                                        </Grid>
                                                    </Box>
                                                )}
                                            </Paper>
                                        ))}
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Action Buttons at Bottom */}
                            {hasChanges && (
                                <Paper
                                    elevation={0}
                                    sx={{
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
                                        startIcon={<Save size={20} />}
                                        onClick={handleSaveAll}
                                        disabled={isLoading}
                                        sx={{
                                            px: 4,
                                            fontWeight: 600,
                                            boxShadow: 2,
                                            "&:hover": { boxShadow: 4 },
                                        }}
                                    >
                                        {isLoading ? "Saving..." : "Save All Changes"}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        startIcon={<RotateCcw size={20} />}
                                        onClick={handleCancel}
                                        sx={{
                                            px: 4,
                                            fontWeight: 600,
                                            borderWidth: 2,
                                            "&:hover": { borderWidth: 2 },
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
                                        <LeafIcon size={20} />
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
                                <SeasonalPreview plants={plants} tips={tips} />
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
                                        This preview updates in real-time as you make changes. The actual seasonal section may look slightly different
                                        based on screen size.
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
