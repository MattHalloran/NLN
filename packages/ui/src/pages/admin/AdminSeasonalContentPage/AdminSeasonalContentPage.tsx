import { Box, Button, Card, CardContent, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Paper, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";
import { useLandingPageContent, useUpdateLandingPageContent } from "api/rest/hooks";
import { AdminTabs, PageContainer, TopBar } from "components";
import { Flower, Leaf, Lightbulb, Plus, Settings, Snowflake, Sprout, Star, Trash2, Edit3, Check, X } from "lucide-react";
import { useState } from "react";
import { PubSub } from "utils/pubsub";

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
    const option = iconOptions.find(opt => opt.value === iconName);
    return option ? option.icon : Leaf;
};

export const AdminSeasonalContentPage = () => {
    const { palette } = useTheme();
    const [selectedTab, setSelectedTab] = useState(0);
    const [editingPlant, setEditingPlant] = useState<SeasonalPlant | null>(null);
    const [editingTip, setEditingTip] = useState<PlantTip | null>(null);
    const [plantDialogOpen, setPlantDialogOpen] = useState(false);
    const [tipDialogOpen, setTipDialogOpen] = useState(false);

    // REST API queries and mutations
    const { data, loading, error, refetch } = useLandingPageContent(false);
    const updateLandingPageContent = useUpdateLandingPageContent();

    const handleApiError = (error: any, defaultMessage: string) => {
        const message = error?.message || defaultMessage;
        PubSub.publish("alertsCreate", { text: message, severity: "error" });
    };

    const handleApiSuccess = (message: string) => {
        PubSub.publish("alertsCreate", { text: message, severity: "success" });
    };

    const handlePlantEdit = (plant?: SeasonalPlant) => {
        setEditingPlant(plant || {
            id: "",
            name: "",
            description: "",
            season: "Spring",
            careLevel: "Easy",
            icon: "leaf",
            displayOrder: data?.seasonalPlants?.length || 0,
            isActive: true
        });
        setPlantDialogOpen(true);
    };

    const handleTipEdit = (tip?: PlantTip) => {
        setEditingTip(tip || {
            id: "",
            title: "",
            description: "",
            category: "General",
            season: "Year-round",
            displayOrder: data?.plantTips?.length || 0,
            isActive: true
        });
        setTipDialogOpen(true);
    };

    const handlePlantSave = async () => {
        if (!editingPlant) return;

        try {
            const currentPlants = data?.seasonalPlants || [];
            let updatedPlants;
            
            if (editingPlant.id) {
                // Update existing plant
                updatedPlants = currentPlants.map(plant => 
                    plant.id === editingPlant.id ? editingPlant : plant
                );
            } else {
                // Add new plant with generated ID
                const newPlant = { 
                    ...editingPlant, 
                    id: `plant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
                };
                updatedPlants = [...currentPlants, newPlant];
            }

            await updateLandingPageContent.mutate({ seasonalPlants: updatedPlants });
            handleApiSuccess("Plant saved successfully!");
            setPlantDialogOpen(false);
            setEditingPlant(null);
            await refetch();
        } catch (error) {
            handleApiError(error, "Failed to save plant");
        }
    };

    const handleTipSave = async () => {
        if (!editingTip) return;

        try {
            const currentTips = data?.plantTips || [];
            let updatedTips;
            
            if (editingTip.id) {
                // Update existing tip
                updatedTips = currentTips.map(tip => 
                    tip.id === editingTip.id ? editingTip : tip
                );
            } else {
                // Add new tip with generated ID
                const newTip = { 
                    ...editingTip, 
                    id: `tip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
                };
                updatedTips = [...currentTips, newTip];
            }

            await updateLandingPageContent.mutate({ plantTips: updatedTips });
            handleApiSuccess("Tip saved successfully!");
            setTipDialogOpen(false);
            setEditingTip(null);
            await refetch();
        } catch (error) {
            handleApiError(error, "Failed to save tip");
        }
    };

    const plants = data?.seasonalPlants || [];
    const tips = data?.plantTips || [];

    const handlePlantDelete = async (plant: SeasonalPlant) => {
        if (!confirm(`Delete ${plant.name}?`)) return;
        
        try {
            const updatedPlants = plants.filter(p => p.id !== plant.id);
            await updateLandingPageContent.mutate({ seasonalPlants: updatedPlants });
            handleApiSuccess("Plant deleted successfully!");
            await refetch();
        } catch (error) {
            handleApiError(error, "Failed to delete plant");
        }
    };

    const handleTipDelete = async (tip: PlantTip) => {
        if (!confirm(`Delete ${tip.title}?`)) return;
        
        try {
            const updatedTips = tips.filter(t => t.id !== tip.id);
            await updateLandingPageContent.mutate({ plantTips: updatedTips });
            handleApiSuccess("Tip deleted successfully!");
            await refetch();
        } catch (error) {
            handleApiError(error, "Failed to delete tip");
        }
    };

    const handleInvalidateCache = async () => {
        try {
            // The unified endpoint automatically invalidates cache after updates
            await refetch();
            handleApiSuccess("Landing page cache cleared successfully!");
        } catch (error) {
            handleApiError(error, "Failed to clear cache");
        }
    };

    return (
        <PageContainer>
            <TopBar
                display="page"
                title="Seasonal Content Management"
                helpText="Manage seasonal plants and expert tips displayed on the home page"
            />
            <AdminTabs />

            <Container maxWidth="lg" sx={{ mt: 4 }}>
                {/* Statistics */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={4}>
                        <Card>
                            <CardContent sx={{ textAlign: "center" }}>
                                <Leaf size={32} color={palette.primary.main} />
                                <Typography variant="h5" sx={{ mt: 1 }}>
                                    {plants.filter(p => p.isActive).length}
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
                                    {tips.filter(t => t.isActive).length}
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
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Total Items
                                </Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleInvalidateCache}
                                    sx={{ textTransform: "none" }}
                                >
                                    Clear Cache
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Content Tabs */}
                <Paper sx={{ mb: 4 }}>
                    <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
                        <Tab label="Seasonal Plants" />
                        <Tab label="Plant Care Tips" />
                    </Tabs>
                </Paper>

                {/* Seasonal Plants Tab */}
                {selectedTab === 0 && (
                    <Box>
                        <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between" }}>
                            <Typography variant="h5">Seasonal Plants</Typography>
                            <Button
                                variant="contained"
                                startIcon={<Plus size={20} />}
                                onClick={() => handlePlantEdit()}
                            >
                                Add Plant
                            </Button>
                        </Box>

                        <Grid container spacing={3}>
                            {plants.map((plant) => {
                                const IconComponent = getIconComponent(plant.icon);
                                return (
                                    <Grid item xs={12} sm={6} md={4} key={plant.id}>
                                        <Card sx={{ height: "100%" }}>
                                            <CardContent>
                                                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                                                    <IconComponent size={32} color={palette.primary.main} />
                                                    <Stack direction="row" spacing={1}>
                                                        <IconButton size="small" onClick={() => handlePlantEdit(plant)}>
                                                            <Edit3 size={18} />
                                                        </IconButton>
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handlePlantDelete(plant)}
                                                        >
                                                            <Trash2 size={18} />
                                                        </IconButton>
                                                    </Stack>
                                                </Box>
                                                <Typography variant="h6" sx={{ mb: 1 }}>
                                                    {plant.name}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                    {plant.description}
                                                </Typography>
                                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                                    <Chip label={plant.season} size="small" color="primary" />
                                                    <Chip label={plant.careLevel} size="small" />
                                                    <Chip 
                                                        label={plant.isActive ? "Active" : "Inactive"} 
                                                        size="small" 
                                                        color={plant.isActive ? "success" : "default"}
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

                {/* Plant Care Tips Tab */}
                {selectedTab === 1 && (
                    <Box>
                        <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between" }}>
                            <Typography variant="h5">Plant Care Tips</Typography>
                            <Button
                                variant="contained"
                                startIcon={<Plus size={20} />}
                                onClick={() => handleTipEdit()}
                            >
                                Add Tip
                            </Button>
                        </Box>

                        <Grid container spacing={3}>
                            {tips.map((tip) => (
                                <Grid item xs={12} md={6} key={tip.id}>
                                    <Card>
                                        <CardContent>
                                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                                                <Typography variant="h6">
                                                    {tip.title}
                                                </Typography>
                                                <Stack direction="row" spacing={1}>
                                                    <IconButton size="small" onClick={() => handleTipEdit(tip)}>
                                                        <Edit3 size={18} />
                                                    </IconButton>
                                                    <IconButton 
                                                        size="small"
                                                        onClick={() => handleTipDelete(tip)}
                                                    >
                                                        <Trash2 size={18} />
                                                    </IconButton>
                                                </Stack>
                                            </Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                {tip.description}
                                            </Typography>
                                            <Stack direction="row" spacing={1}>
                                                <Chip label={tip.category} size="small" color="primary" />
                                                <Chip label={tip.season} size="small" color="secondary" />
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
            </Container>

            {/* Plant Edit Dialog */}
            <Dialog open={plantDialogOpen} onClose={() => setPlantDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingPlant?.id ? "Edit Plant" : "Add Plant"}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="Name"
                            value={editingPlant?.name || ""}
                            onChange={(e) => setEditingPlant(prev => ({ ...prev!, name: e.target.value }))}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Description"
                            value={editingPlant?.description || ""}
                            onChange={(e) => setEditingPlant(prev => ({ ...prev!, description: e.target.value }))}
                            sx={{ mb: 2 }}
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Season"
                                    value={editingPlant?.season || "Spring"}
                                    onChange={(e) => setEditingPlant(prev => ({ ...prev!, season: e.target.value }))}
                                    SelectProps={{ native: true }}
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
                                    onChange={(e) => setEditingPlant(prev => ({ ...prev!, careLevel: e.target.value }))}
                                    SelectProps={{ native: true }}
                                >
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Advanced">Advanced</option>
                                </TextField>
                            </Grid>
                        </Grid>
                        <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>Icon</Typography>
                        <ToggleButtonGroup
                            value={editingPlant?.icon || "leaf"}
                            exclusive
                            onChange={(_, value) => value && setEditingPlant(prev => ({ ...prev!, icon: value }))}
                            sx={{ mb: 2 }}
                        >
                            {iconOptions.map(option => {
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
                                onChange={() => setEditingPlant(prev => ({ ...prev!, isActive: !prev?.isActive }))}
                                sx={{ mt: 2 }}
                            >
                                {editingPlant?.isActive ? "Active" : "Inactive"}
                            </ToggleButton>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPlantDialogOpen(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        onClick={handlePlantSave}
                        disabled={updateLandingPageContent.loading}
                    >
                        {updateLandingPageContent.loading ? "Saving..." : "Save"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Tip Edit Dialog */}
            <Dialog open={tipDialogOpen} onClose={() => setTipDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingTip?.id ? "Edit Tip" : "Add Tip"}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="Title"
                            value={editingTip?.title || ""}
                            onChange={(e) => setEditingTip(prev => ({ ...prev!, title: e.target.value }))}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Description"
                            value={editingTip?.description || ""}
                            onChange={(e) => setEditingTip(prev => ({ ...prev!, description: e.target.value }))}
                            sx={{ mb: 2 }}
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Category"
                                    value={editingTip?.category || "General"}
                                    onChange={(e) => setEditingTip(prev => ({ ...prev!, category: e.target.value }))}
                                    SelectProps={{ native: true }}
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
                                    onChange={(e) => setEditingTip(prev => ({ ...prev!, season: e.target.value }))}
                                    SelectProps={{ native: true }}
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
                                onChange={() => setEditingTip(prev => ({ ...prev!, isActive: !prev?.isActive }))}
                                sx={{ mt: 2 }}
                            >
                                {editingTip?.isActive ? "Active" : "Inactive"}
                            </ToggleButton>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTipDialogOpen(false)}>Cancel</Button>
                    <Button 
                        variant="contained" 
                        onClick={handleTipSave}
                        disabled={updateLandingPageContent.loading}
                    >
                        {updateLandingPageContent.loading ? "Saving..." : "Save"}
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
};