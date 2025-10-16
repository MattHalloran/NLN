import {
    Box,
    Tab,
    Tabs,
    Card,
    CardContent,
    CardMedia,
    CardActions,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    Paper,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    useTheme,
    Button,
    Switch,
    FormControlLabel,
} from "@mui/material";
import { Delete as DeleteIcon, DragIndicator as DragIcon } from "@mui/icons-material";
import { useLandingPageContent } from "api/rest/hooks";
import { restApi } from "api/rest/client";
import { AdminTabOption, AdminTabs, Dropzone, PageContainer } from "components";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { getServerUrl } from "utils/serverUrl";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLocation } from "route";
import {
    Flower,
    Leaf,
    Lightbulb,
    Plus,
    Settings,
    Snowflake,
    Sprout,
    Star,
    Trash2,
    Edit3,
    Image,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { pagePaddingBottom } from "styles";
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

const helpText =
    "Manage your homepage content including the hero banner images and seasonal content sections.";

export const AdminHomePage = () => {
    const { palette } = useTheme();
    const [location, setLocation] = useLocation();
    const [selectedTab, setSelectedTab] = useState(0);
    const [selectedSeasonalTab, setSelectedSeasonalTab] = useState(0);
    const [editingPlant, setEditingPlant] = useState<SeasonalPlant | null>(null);
    const [editingTip, setEditingTip] = useState<PlantTip | null>(null);
    const [plantDialogOpen, setPlantDialogOpen] = useState(false);
    const [tipDialogOpen, setTipDialogOpen] = useState(false);

    // Hero image management state
    const [heroBanners, setHeroBanners] = useState<any[]>([]);
    const [originalHeroBanners, setOriginalHeroBanners] = useState<any[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Track the safe location (last location without unsaved changes)
    const [safeLocation, setSafeLocation] = useState(location);

    // Landing page content state
    const { data: landingPageContent, refetch } = useLandingPageContent(false);

    useEffect(() => {
        if (landingPageContent?.heroBanners && !hasChanges) {
            const sorted = [...landingPageContent.heroBanners].sort(
                (a: any, b: any) => a.displayOrder - b.displayOrder,
            );
            setHeroBanners(sorted);
            setOriginalHeroBanners(sorted);
        }
    }, [landingPageContent, hasChanges]);

    // Warn before leaving page with unsaved changes (external navigation)
    useEffect(() => {
        if (!hasChanges) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            // Modern browsers require returnValue to be set
            e.returnValue = "";
            return "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [hasChanges]);

    // Block internal navigation when there are unsaved changes
    useEffect(() => {
        // If location changed and we have unsaved changes, confirm before allowing navigation
        if (location !== safeLocation && hasChanges) {
            const message = "You have unsaved changes. Are you sure you want to leave?";
            if (!window.confirm(message)) {
                // User cancelled - navigate back to safe location
                setLocation(safeLocation, { replace: true });
                return;
            }
            // User confirmed - discard changes and update safe location
            setHasChanges(false);
            setSafeLocation(location);
        } else if (location !== safeLocation && !hasChanges) {
            // Location changed but no unsaved changes - update safe location
            setSafeLocation(location);
        }
    }, [location, safeLocation, hasChanges, setLocation]);

    // Update safe location when changes are saved or cancelled
    useEffect(() => {
        if (!hasChanges) {
            setSafeLocation(location);
        }
    }, [hasChanges, location]);

    const seasonalData = landingPageContent;

    const handleApiError = useCallback((error: any, defaultMessage: string) => {
        const message = error?.message || defaultMessage;
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Error });
    }, []);

    const handleApiSuccess = useCallback((message: string) => {
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Success });
    }, []);

    // Hero image handlers
    const uploadImages = useCallback(async (acceptedFiles: File[]) => {
        try {
            setIsLoading(true);

            // First, upload the files to the server
            const uploadResult = await restApi.writeAssets(acceptedFiles);

            if (!uploadResult.success) {
                throw new Error("Failed to upload images to server");
            }

            const newBanners: any[] = [];

            let currentLength = 0;
            setHeroBanners((prev) => {
                currentLength = prev.length;
                return prev;
            });

            for (const file of acceptedFiles) {
                const reader = new window.FileReader();
                const base64 = await new Promise<string>((resolve) => {
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.readAsDataURL(file);
                });

                const img = new window.Image();
                await new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.src = base64;
                });

                const newBanner = {
                    id: `hero-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    src: `/${file.name}`,
                    alt: file.name.replace(/\.[^/.]+$/, ""),
                    description: "",
                    width: img.width,
                    height: img.height,
                    displayOrder: currentLength + newBanners.length + 1,
                    isActive: true,
                };
                newBanners.push(newBanner);
            }

            setHeroBanners((prev) => [...prev, ...newBanners]);
            setHasChanges(true);
            handleApiSuccess(`Added ${acceptedFiles.length} image(s). Remember to save changes.`);
        } catch (error) {
            handleApiError(error, "Failed to add images");
        } finally {
            setIsLoading(false);
        }
    }, [handleApiSuccess, handleApiError]);

    const handleDragEnd = useCallback((result: any) => {
        if (!result.destination) return;

        setHeroBanners((prev) => {
            const items = Array.from(prev);
            const [reorderedItem] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, reorderedItem);

            return items.map((item, index) => ({
                ...item,
                displayOrder: index + 1,
            }));
        });
        setHasChanges(true);
    }, []);

    const handleDeleteBanner = useCallback((id: string) => {
        setHeroBanners((prev) =>
            prev
                .filter((b) => b.id !== id)
                .map((item, index) => ({
                    ...item,
                    displayOrder: index + 1,
                })),
        );
        setHasChanges(true);
    }, []);

    const handleFieldChange = useCallback((id: string, field: string, value: any) => {
        setHeroBanners((prev) =>
            prev.map((banner) => (banner.id === id ? { ...banner, [field]: value } : banner)),
        );
        setHasChanges(true);
    }, []);

    const handleSaveHeroBanners = useCallback(async () => {
        try {
            setIsLoading(true);

            // Include heroSettings to prevent them from being lost
            const heroSettings = landingPageContent?.heroSettings || {
                autoPlay: true,
                autoPlayDelay: 5000,
                showDots: true,
                showArrows: true,
                fadeTransition: true,
            };

            const response = await restApi.updateLandingPageContent({
                heroBanners,
                heroSettings,
            });

            if (response.success) {
                // Refetch data FIRST to ensure UI is updated
                await refetch();
                // THEN show success and update state
                handleApiSuccess("Hero banners updated successfully!");
                setHasChanges(false);
                setOriginalHeroBanners([...heroBanners]);
            } else {
                throw new Error("Failed to update");
            }
        } catch (error: any) {
            handleApiError(error, "Failed to save changes");
        } finally {
            setIsLoading(false);
        }
    }, [heroBanners, landingPageContent, refetch, handleApiSuccess, handleApiError]);

    const handleCancelChanges = useCallback(() => {
        setHeroBanners([...originalHeroBanners]);
        setHasChanges(false);
    }, [originalHeroBanners]);

    // Seasonal content handlers
    const handlePlantEdit = (plant?: SeasonalPlant) => {
        setEditingPlant(
            plant || {
                id: "",
                name: "",
                description: "",
                season: "Spring",
                careLevel: "Easy",
                icon: "leaf",
                displayOrder: seasonalData?.seasonalPlants?.length || 0,
                isActive: true,
            },
        );
        setPlantDialogOpen(true);
    };

    const handleTipEdit = (tip?: PlantTip) => {
        setEditingTip(
            tip || {
                id: "",
                title: "",
                description: "",
                category: "General",
                season: "Year-round",
                displayOrder: seasonalData?.plantTips?.length || 0,
                isActive: true,
            },
        );
        setTipDialogOpen(true);
    };

    const handlePlantSave = async () => {
        if (!editingPlant) return;

        try {
            const currentPlants = seasonalData?.seasonalPlants || [];
            let updatedPlants;

            if (editingPlant.id) {
                // Update existing plant
                updatedPlants = currentPlants.map((plant: SeasonalPlant) =>
                    plant.id === editingPlant.id ? editingPlant : plant,
                );
            } else {
                // Add new plant with generated ID
                const newPlant = {
                    ...editingPlant,
                    id: `plant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                };
                updatedPlants = [...currentPlants, newPlant];
            }

            const response = await restApi.updateLandingPageContent({
                seasonalPlants: updatedPlants,
            });
            if (response.success) {
                // Refetch data FIRST to ensure UI is updated
                await refetch();
                // THEN show success and close dialog
                handleApiSuccess("Plant saved successfully!");
                setPlantDialogOpen(false);
                setEditingPlant(null);
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            handleApiError(error, "Failed to save plant");
        }
    };

    const handleTipSave = async () => {
        if (!editingTip) return;

        try {
            const currentTips = seasonalData?.plantTips || [];
            let updatedTips;

            if (editingTip.id) {
                // Update existing tip
                updatedTips = currentTips.map((tip: PlantTip) =>
                    tip.id === editingTip.id ? editingTip : tip,
                );
            } else {
                // Add new tip with generated ID
                const newTip = {
                    ...editingTip,
                    id: `tip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                };
                updatedTips = [...currentTips, newTip];
            }

            const response = await restApi.updateLandingPageContent({ plantTips: updatedTips });
            if (response.success) {
                // Refetch data FIRST to ensure UI is updated
                await refetch();
                // THEN show success and close dialog
                handleApiSuccess("Tip saved successfully!");
                setTipDialogOpen(false);
                setEditingTip(null);
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            handleApiError(error, "Failed to save tip");
        }
    };

    const plants = seasonalData?.seasonalPlants || [];
    const tips = seasonalData?.plantTips || [];
    const activePlants = plants.filter((p: SeasonalPlant) => p.isActive).length;
    const activeTips = tips.filter((t: PlantTip) => t.isActive).length;

    const handlePlantDelete = async (plant: SeasonalPlant) => {
        if (!window.confirm(`Delete ${plant.name}?`)) return;

        try {
            const updatedPlants = plants.filter((p: SeasonalPlant) => p.id !== plant.id);
            const response = await restApi.updateLandingPageContent({
                seasonalPlants: updatedPlants,
            });
            if (response.success) {
                // Refetch data FIRST to ensure UI is updated
                await refetch();
                // THEN show success message
                handleApiSuccess("Plant deleted successfully!");
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            handleApiError(error, "Failed to delete plant");
        }
    };

    const handleTipDelete = async (tip: PlantTip) => {
        if (!window.confirm(`Delete ${tip.title}?`)) return;

        try {
            const updatedTips = tips.filter((t: PlantTip) => t.id !== tip.id);
            const response = await restApi.updateLandingPageContent({ plantTips: updatedTips });
            if (response.success) {
                // Refetch data FIRST to ensure UI is updated
                await refetch();
                // THEN show success message
                handleApiSuccess("Tip deleted successfully!");
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            handleApiError(error, "Failed to delete tip");
        }
    };

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                help={helpText}
                title="Homepage Management"
                below={<AdminTabs defaultTab={AdminTabOption.Hero} />}
            />

            {/* Main Content Tabs */}
            <Paper sx={{ mx: 2, mt: 2 }}>
                <Tabs
                    value={selectedTab}
                    onChange={(_, v) => setSelectedTab(v)}
                    sx={{ borderBottom: 1, borderColor: "divider" }}
                >
                    <Tab icon={<Image size={20} />} iconPosition="start" label="Hero Banner" />
                    <Tab icon={<Leaf size={20} />} iconPosition="start" label="Seasonal Content" />
                </Tabs>
            </Paper>

            {/* Hero Banner Tab */}
            {selectedTab === 0 && (
                <Box p={2}>
                    <Dropzone
                        dropzoneText={"Drag 'n' drop new images here or click"}
                        onUpload={uploadImages}
                        uploadText="Upload Images"
                        sxs={{ root: { maxWidth: "min(100%, 700px)", margin: "auto" } }}
                    />

                    <Box
                        sx={{
                            mt: 4,
                            mb: 2,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Typography variant="h5" data-testid="hero-banners-title">
                            Hero Banners
                        </Typography>
                        {hasChanges && (
                            <Box data-testid="hero-actions-container">
                                <Button
                                    onClick={handleCancelChanges}
                                    sx={{ mr: 1 }}
                                    data-testid="hero-cancel-button"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={handleSaveHeroBanners}
                                    disabled={isLoading}
                                    data-testid="hero-save-button"
                                >
                                    Save Changes
                                </Button>
                            </Box>
                        )}
                    </Box>

                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="hero-banners">
                            {(provided) => (
                                <Box
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    sx={{ pb: pagePaddingBottom }}
                                >
                                    {heroBanners.map((banner, index) => (
                                        <Draggable
                                            key={banner.id}
                                            draggableId={banner.id}
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <Card
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    data-testid={`hero-banner-card-${index}`}
                                                    sx={{
                                                        mb: 2,
                                                        opacity: snapshot.isDragging ? 0.5 : 1,
                                                        backgroundColor: snapshot.isDragging
                                                            ? "action.hover"
                                                            : "background.paper",
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "stretch",
                                                        }}
                                                    >
                                                        <Box
                                                            {...provided.dragHandleProps}
                                                            sx={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                px: 2,
                                                                cursor: "grab",
                                                                backgroundColor: "action.hover",
                                                            }}
                                                        >
                                                            <DragIcon />
                                                        </Box>

                                                        <CardMedia
                                                            component="img"
                                                            height="200"
                                                            image={
                                                                banner.src.startsWith("http")
                                                                    ? banner.src
                                                                    : `${getServerUrl()}${banner.src}`
                                                            }
                                                            alt={banner.alt}
                                                            sx={{ width: 300, objectFit: "cover" }}
                                                        />

                                                        <Box sx={{ flex: 1, p: 2 }}>
                                                            <Typography
                                                                variant="subtitle2"
                                                                gutterBottom
                                                            >
                                                                Order: {banner.displayOrder}
                                                            </Typography>
                                                            <TextField
                                                                label="Alt Text"
                                                                value={banner.alt}
                                                                onChange={(e) =>
                                                                    handleFieldChange(
                                                                        banner.id,
                                                                        "alt",
                                                                        e.target.value,
                                                                    )
                                                                }
                                                                fullWidth
                                                                size="small"
                                                                sx={{ mb: 1 }}
                                                                data-testid={`hero-alt-input-${index}`}
                                                            />
                                                            <TextField
                                                                label="Description"
                                                                value={banner.description}
                                                                onChange={(e) =>
                                                                    handleFieldChange(
                                                                        banner.id,
                                                                        "description",
                                                                        e.target.value,
                                                                    )
                                                                }
                                                                fullWidth
                                                                size="small"
                                                                multiline
                                                                rows={2}
                                                                data-testid={`hero-description-input-${index}`}
                                                            />
                                                            <FormControlLabel
                                                                control={
                                                                    <Switch
                                                                        checked={banner.isActive}
                                                                        onChange={(e) =>
                                                                            handleFieldChange(
                                                                                banner.id,
                                                                                "isActive",
                                                                                e.target.checked,
                                                                            )
                                                                        }
                                                                        data-testid={`hero-active-switch-${index}`}
                                                                    />
                                                                }
                                                                label="Active"
                                                                sx={{ mt: 1 }}
                                                            />
                                                        </Box>

                                                        <CardActions>
                                                            <IconButton
                                                                onClick={() =>
                                                                    handleDeleteBanner(banner.id)
                                                                }
                                                                color="error"
                                                                data-testid={`hero-delete-button-${index}`}
                                                            >
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </CardActions>
                                                    </Box>
                                                </Card>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </Box>
                            )}
                        </Droppable>
                    </DragDropContext>
                </Box>
            )}

            {/* Seasonal Content Tab */}
            {selectedTab === 1 && (
                <Box p={2}>
                    {/* Statistics */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={4}>
                            <Card>
                                <CardContent sx={{ textAlign: "center" }}>
                                    <Leaf size={32} color={palette.primary.main} />
                                    <Typography variant="h5" sx={{ mt: 1 }}>
                                        {activePlants}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Active Plants
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Card>
                                <CardContent sx={{ textAlign: "center" }}>
                                    <Lightbulb size={32} color={palette.secondary.main} />
                                    <Typography variant="h5" sx={{ mt: 1 }}>
                                        {activeTips}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Active Tips
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Card>
                                <CardContent sx={{ textAlign: "center" }}>
                                    <Settings size={32} color={palette.info.main} />
                                    <Typography variant="h5" sx={{ mt: 1 }}>
                                        {plants.length + tips.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Items
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Seasonal Sub-tabs */}
                    <Paper sx={{ mb: 4 }}>
                        <Tabs
                            value={selectedSeasonalTab}
                            onChange={(_, v) => setSelectedSeasonalTab(v)}
                        >
                            <Tab label="Seasonal Plants" />
                            <Tab label="Plant Care Tips" />
                        </Tabs>
                    </Paper>

                    {/* Seasonal Plants */}
                    {selectedSeasonalTab === 0 && (
                        <Box>
                            <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between" }}>
                                <Typography variant="h5">Seasonal Plants</Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<Plus size={20} />}
                                    onClick={() => handlePlantEdit()}
                                    data-testid="add-plant-button"
                                >
                                    Add Plant
                                </Button>
                            </Box>

                            <Grid container spacing={3}>
                                {plants.map((plant: SeasonalPlant, index: number) => {
                                    const IconComponent = getIconComponent(plant.icon);
                                    return (
                                        <Grid item xs={12} sm={6} md={4} key={plant.id}>
                                            <Card
                                                sx={{ height: "100%" }}
                                                data-testid={`plant-card-${index}`}
                                            >
                                                <CardContent>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            mb: 2,
                                                        }}
                                                    >
                                                        <IconComponent
                                                            size={32}
                                                            color={palette.primary.main}
                                                        />
                                                        <Stack direction="row" spacing={1}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() =>
                                                                    handlePlantEdit(plant)
                                                                }
                                                                data-testid={`edit-plant-${index}`}
                                                            >
                                                                <Edit3 size={18} />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() =>
                                                                    handlePlantDelete(plant)
                                                                }
                                                                data-testid={`delete-plant-${index}`}
                                                            >
                                                                <Trash2 size={18} />
                                                            </IconButton>
                                                        </Stack>
                                                    </Box>
                                                    <Typography variant="h6" sx={{ mb: 1 }}>
                                                        {plant.name}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{ mb: 2 }}
                                                    >
                                                        {plant.description}
                                                    </Typography>
                                                    <Stack
                                                        direction="row"
                                                        spacing={1}
                                                        flexWrap="wrap"
                                                    >
                                                        <Chip
                                                            label={plant.season}
                                                            size="small"
                                                            color="primary"
                                                        />
                                                        <Chip
                                                            label={plant.careLevel}
                                                            size="small"
                                                        />
                                                        <Chip
                                                            label={
                                                                plant.isActive
                                                                    ? "Active"
                                                                    : "Inactive"
                                                            }
                                                            size="small"
                                                            color={
                                                                plant.isActive
                                                                    ? "success"
                                                                    : "default"
                                                            }
                                                        />
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Box>
                    )}

                    {/* Plant Care Tips */}
                    {selectedSeasonalTab === 1 && (
                        <Box>
                            <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between" }}>
                                <Typography variant="h5">Plant Care Tips</Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<Plus size={20} />}
                                    onClick={() => handleTipEdit()}
                                    data-testid="add-tip-button"
                                >
                                    Add Tip
                                </Button>
                            </Box>

                            <Grid container spacing={3}>
                                {tips.map((tip: PlantTip, index: number) => (
                                    <Grid item xs={12} md={6} key={tip.id}>
                                        <Card data-testid={`tip-card-${index}`}>
                                            <CardContent>
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        mb: 2,
                                                    }}
                                                >
                                                    <Typography variant="h6">
                                                        {tip.title}
                                                    </Typography>
                                                    <Stack direction="row" spacing={1}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleTipEdit(tip)}
                                                            data-testid={`edit-tip-${index}`}
                                                        >
                                                            <Edit3 size={18} />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleTipDelete(tip)}
                                                            data-testid={`delete-tip-${index}`}
                                                        >
                                                            <Trash2 size={18} />
                                                        </IconButton>
                                                    </Stack>
                                                </Box>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ mb: 2 }}
                                                >
                                                    {tip.description}
                                                </Typography>
                                                <Stack direction="row" spacing={1}>
                                                    <Chip
                                                        label={tip.category}
                                                        size="small"
                                                        color="primary"
                                                    />
                                                    <Chip
                                                        label={tip.season}
                                                        size="small"
                                                        color="secondary"
                                                    />
                                                    <Chip
                                                        label={tip.isActive ? "Active" : "Inactive"}
                                                        size="small"
                                                        color={tip.isActive ? "success" : "default"}
                                                    />
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}
                </Box>
            )}

            {/* Plant Edit Dialog */}
            <Dialog
                open={plantDialogOpen}
                onClose={() => setPlantDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{editingPlant?.id ? "Edit Plant" : "Add Plant"}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="Name"
                            value={editingPlant?.name || ""}
                            onChange={(e) =>
                                setEditingPlant((prev) => ({ ...prev!, name: e.target.value }))
                            }
                            sx={{ mb: 2 }}
                            data-testid="plant-name-input"
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Description"
                            value={editingPlant?.description || ""}
                            onChange={(e) =>
                                setEditingPlant((prev) => ({
                                    ...prev!,
                                    description: e.target.value,
                                }))
                            }
                            sx={{ mb: 2 }}
                            data-testid="plant-description-input"
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Season"
                                    value={editingPlant?.season || "Spring"}
                                    onChange={(e) =>
                                        setEditingPlant((prev) => ({
                                            ...prev!,
                                            season: e.target.value,
                                        }))
                                    }
                                    SelectProps={{ native: true }}
                                    data-testid="plant-season-select"
                                >
                                    <option value="Spring">Spring</option>
                                    <option value="Summer">Summer</option>
                                    <option value="Fall">Fall</option>
                                    <option value="Winter">Winter</option>
                                </TextField>
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Care Level"
                                    value={editingPlant?.careLevel || "Easy"}
                                    onChange={(e) =>
                                        setEditingPlant((prev) => ({
                                            ...prev!,
                                            careLevel: e.target.value,
                                        }))
                                    }
                                    SelectProps={{ native: true }}
                                    data-testid="plant-care-level-select"
                                >
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Advanced">Advanced</option>
                                </TextField>
                            </Grid>
                        </Grid>
                        <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                            Icon
                        </Typography>
                        <ToggleButtonGroup
                            value={editingPlant?.icon || "leaf"}
                            exclusive
                            onChange={(_, value) =>
                                value && setEditingPlant((prev) => ({ ...prev!, icon: value }))
                            }
                            sx={{ mb: 2 }}
                            data-testid="plant-icon-group"
                        >
                            {iconOptions.map((option) => {
                                const IconComp = option.icon;
                                return (
                                    <ToggleButton key={option.value} value={option.value}>
                                        <IconComp size={20} />
                                    </ToggleButton>
                                );
                            })}
                        </ToggleButtonGroup>
                        <Box>
                            <ToggleButton
                                value="check"
                                selected={editingPlant?.isActive}
                                onChange={() =>
                                    setEditingPlant((prev) => ({
                                        ...prev!,
                                        isActive: !prev?.isActive,
                                    }))
                                }
                                sx={{ mt: 2 }}
                                data-testid="plant-active-toggle"
                            >
                                {editingPlant?.isActive ? "Active" : "Inactive"}
                            </ToggleButton>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setPlantDialogOpen(false)}
                        data-testid="plant-cancel-button"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handlePlantSave}
                        disabled={isLoading}
                        data-testid="plant-save-button"
                    >
                        {isLoading ? "Saving..." : "Save"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Tip Edit Dialog */}
            <Dialog
                open={tipDialogOpen}
                onClose={() => setTipDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{editingTip?.id ? "Edit Tip" : "Add Tip"}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="Title"
                            value={editingTip?.title || ""}
                            onChange={(e) =>
                                setEditingTip((prev) => ({ ...prev!, title: e.target.value }))
                            }
                            sx={{ mb: 2 }}
                            data-testid="tip-title-input"
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Description"
                            value={editingTip?.description || ""}
                            onChange={(e) =>
                                setEditingTip((prev) => ({ ...prev!, description: e.target.value }))
                            }
                            sx={{ mb: 2 }}
                            data-testid="tip-description-input"
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Category"
                                    value={editingTip?.category || "General"}
                                    onChange={(e) =>
                                        setEditingTip((prev) => ({
                                            ...prev!,
                                            category: e.target.value,
                                        }))
                                    }
                                    SelectProps={{ native: true }}
                                    data-testid="tip-category-select"
                                >
                                    <option value="Watering">Watering</option>
                                    <option value="Fertilizing">Fertilizing</option>
                                    <option value="Pruning">Pruning</option>
                                    <option value="Pest Control">Pest Control</option>
                                    <option value="General">General</option>
                                </TextField>
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Season"
                                    value={editingTip?.season || "Year-round"}
                                    onChange={(e) =>
                                        setEditingTip((prev) => ({
                                            ...prev!,
                                            season: e.target.value,
                                        }))
                                    }
                                    SelectProps={{ native: true }}
                                    data-testid="tip-season-select"
                                >
                                    <option value="Spring">Spring</option>
                                    <option value="Summer">Summer</option>
                                    <option value="Fall">Fall</option>
                                    <option value="Winter">Winter</option>
                                    <option value="Year-round">Year-round</option>
                                </TextField>
                            </Grid>
                        </Grid>
                        <Box>
                            <ToggleButton
                                value="check"
                                selected={editingTip?.isActive}
                                onChange={() =>
                                    setEditingTip((prev) => ({
                                        ...prev!,
                                        isActive: !prev?.isActive,
                                    }))
                                }
                                sx={{ mt: 2 }}
                                data-testid="tip-active-toggle"
                            >
                                {editingTip?.isActive ? "Active" : "Inactive"}
                            </ToggleButton>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTipDialogOpen(false)} data-testid="tip-cancel-button">
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleTipSave}
                        disabled={isLoading}
                        data-testid="tip-save-button"
                    >
                        {isLoading ? "Saving..." : "Save"}
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
};
