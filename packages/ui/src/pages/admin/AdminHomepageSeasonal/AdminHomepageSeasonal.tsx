import { APP_LINKS } from "@local/shared";
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography,
    useTheme,
    IconButton,
    Stack,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tab,
    Tabs,
    Paper,
} from "@mui/material";
import {
    Flower,
    Leaf,
    Lightbulb,
    Plus,
    Settings,
    Snowflake,
    Sprout,
    Star,
    Edit3,
    Trash2,
} from "lucide-react";
import { useLandingPageContent } from "api/rest/hooks";
import { restApi } from "api/rest/client";
import { BackButton, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { PubSub } from "utils/pubsub";
import { SnackSeverity } from "components/dialogs/Snack/Snack";
import { useCallback, useState } from "react";

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

export const AdminHomepageSeasonal = () => {
    const { palette } = useTheme();
    const [selectedTab, setSelectedTab] = useState(0);
    const [editingPlant, setEditingPlant] = useState<SeasonalPlant | null>(null);
    const [editingTip, setEditingTip] = useState<PlantTip | null>(null);
    const [plantDialogOpen, setPlantDialogOpen] = useState(false);
    const [tipDialogOpen, setTipDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { data: seasonalData, refetch } = useLandingPageContent(false);

    const handleApiError = useCallback((error: any, defaultMessage: string) => {
        const message = error?.message || defaultMessage;
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Error });
    }, []);

    const handleApiSuccess = useCallback((message: string) => {
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Success });
    }, []);

    const handlePlantEdit = (plant?: SeasonalPlant) => {
        setEditingPlant(
            plant || {
                id: "",
                name: "",
                description: "",
                season: "Spring",
                careLevel: "Easy",
                icon: "leaf",
                displayOrder: seasonalData?.content?.seasonal?.plants?.length || 0,
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
                displayOrder: seasonalData?.content?.seasonal?.tips?.length || 0,
                isActive: true,
            },
        );
        setTipDialogOpen(true);
    };

    const handlePlantSave = async () => {
        if (!editingPlant) return;

        try {
            setIsLoading(true);
            const currentPlants = seasonalData?.content?.seasonal?.plants || [];
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
        } finally {
            setIsLoading(false);
        }
    };

    const handleTipSave = async () => {
        if (!editingTip) return;

        try {
            setIsLoading(true);
            const currentTips = seasonalData?.content?.seasonal?.tips || [];
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
        } finally {
            setIsLoading(false);
        }
    };

    const plants = seasonalData?.content?.seasonal?.plants || [];
    const tips = seasonalData?.content?.seasonal?.tips || [];
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
                title="Seasonal Content"
                help="Update seasonal plants and expert care tips displayed on the homepage"
                startComponent={<BackButton to={APP_LINKS.AdminHomepage} ariaLabel="Back to Homepage Management" />}
            />

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

                {/* Sub-tabs */}
                <Paper sx={{ mb: 4 }}>
                    <Tabs
                        value={selectedTab}
                        onChange={(_, v) => setSelectedTab(v)}
                    >
                        <Tab label="Seasonal Plants" />
                        <Tab label="Plant Care Tips" />
                    </Tabs>
                </Paper>

                {/* Seasonal Plants */}
                {selectedTab === 0 && (
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
                {selectedTab === 1 && (
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
