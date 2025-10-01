import { Box, Tab, Tabs, Card, CardContent, CardMedia, CardActions, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography, useTheme, Button, Snackbar, Alert, Switch, FormControlLabel } from "@mui/material";
import { Delete as DeleteIcon, DragIndicator as DragIcon } from "@mui/icons-material";
import { useLandingPageContent } from "api/rest/hooks";
import { restApi } from "api/rest/client";
import { AdminTabOption, AdminTabs, Dropzone, PageContainer } from "components";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { getServerUrl } from "utils/serverUrl";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { Flower, Leaf, Lightbulb, Plus, Settings, Snowflake, Sprout, Star, Trash2, Edit3, Image, Home } from "lucide-react";
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
    const option = iconOptions.find(opt => opt.value === iconName);
    return option ? option.icon : Leaf;
};

const helpText = "Manage your homepage content including the hero banner images and seasonal content sections.";

export const AdminHomePage = () => {
    const { palette } = useTheme();
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
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ 
        open: false, 
        message: "", 
        severity: "success", 
    });
    const [isLoading, setIsLoading] = useState(false);

    // Landing page content state
    const { data: landingPageContent, refetch } = useLandingPageContent(false);
    
    useEffect(() => {
        if (landingPageContent?.heroBanners && !hasChanges) {
            const sorted = [...landingPageContent.heroBanners].sort((a: any, b: any) => a.displayOrder - b.displayOrder);
            setHeroBanners(sorted);
            setOriginalHeroBanners(sorted);
        }
    }, [landingPageContent, hasChanges]);
    
    const seasonalData = landingPageContent;

    const handleApiError = (error: any, defaultMessage: string) => {
        const message = error?.message || defaultMessage;
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Error });
    };

    const handleApiSuccess = (message: string) => {
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Success });
    };

    // Hero image handlers
    const uploadImages = useCallback(async (acceptedFiles: File[]) => {
        try {
            setIsLoading(true);
            const newBanners: any[] = [];
            
            let currentLength = 0;
            setHeroBanners(prev => {
                currentLength = prev.length;
                return prev;
            });
            
            for (const file of acceptedFiles) {
                const reader = new FileReader();
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
                    src: `/images/${file.name}`,
                    alt: file.name.replace(/\.[^/.]+$/, ""),
                    description: "",
                    width: img.width,
                    height: img.height,
                    displayOrder: currentLength + newBanners.length + 1,
                    isActive: true,
                };
                newBanners.push(newBanner);
            }
            
            setHeroBanners(prev => [...prev, ...newBanners]);
            setHasChanges(true);
            setSnackbar({ 
                open: true, 
                message: `Added ${acceptedFiles.length} image(s). Remember to save changes.`, 
                severity: "success", 
            });
        } catch (error) {
            setSnackbar({ 
                open: true, 
                message: "Failed to add images", 
                severity: "error", 
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleDragEnd = useCallback((result: any) => {
        if (!result.destination) return;

        setHeroBanners(prev => {
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
        setHeroBanners(prev => prev
            .filter(b => b.id !== id)
            .map((item, index) => ({
                ...item,
                displayOrder: index + 1,
            })),
        );
        setHasChanges(true);
    }, []);

    const handleFieldChange = useCallback((id: string, field: string, value: any) => {
        setHeroBanners(prev => prev.map(banner => 
            banner.id === id ? { ...banner, [field]: value } : banner,
        ));
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
                setSnackbar({ 
                    open: true, 
                    message: "Hero banners updated successfully", 
                    severity: "success", 
                });
                setHasChanges(false);
                setOriginalHeroBanners([...heroBanners]);
                // Note: Cache invalidation is handled automatically by the server
                await refetch();
            } else {
                throw new Error("Failed to update");
            }
        } catch (error: any) {
            setSnackbar({ 
                open: true, 
                message: error.message || "Failed to save changes", 
                severity: "error", 
            });
        } finally {
            setIsLoading(false);
        }
    }, [heroBanners, landingPageContent, refetch]);

    const handleCancelChanges = useCallback(() => {
        setHeroBanners([...originalHeroBanners]);
        setHasChanges(false);
    }, [originalHeroBanners]);

    // Seasonal content handlers
    const handlePlantEdit = (plant?: SeasonalPlant) => {
        setEditingPlant(plant || {
            id: "",
            name: "",
            description: "",
            season: "Spring",
            careLevel: "Easy",
            icon: "leaf",
            displayOrder: seasonalData?.seasonalPlants?.length || 0,
            isActive: true,
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
            displayOrder: seasonalData?.plantTips?.length || 0,
            isActive: true,
        });
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

            const response = await restApi.updateLandingPageContent({ seasonalPlants: updatedPlants });
            if (response.success) {
                handleApiSuccess("Plant saved successfully!");
                setPlantDialogOpen(false);
                setEditingPlant(null);
                await refetch();
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
                handleApiSuccess("Tip saved successfully!");
                setTipDialogOpen(false);
                setEditingTip(null);
                await refetch();
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
            const response = await restApi.updateLandingPageContent({ seasonalPlants: updatedPlants });
            if (response.success) {
                handleApiSuccess("Plant deleted successfully!");
                await refetch();
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
                handleApiSuccess("Tip deleted successfully!");
                await refetch();
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
                <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)} sx={{ borderBottom: 1, borderColor: "divider" }}>
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
                        uploadText='Upload Images'
                        sxs={{ root: { maxWidth: "min(100%, 700px)", margin: "auto" } }}
                    />
                    
                    <Box sx={{ mt: 4, mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="h5">Hero Banners</Typography>
                        {hasChanges && (
                            <Box>
                                <Button onClick={handleCancelChanges} sx={{ mr: 1 }}>
                                    Cancel
                                </Button>
                                <Button 
                                    variant="contained" 
                                    onClick={handleSaveHeroBanners}
                                    disabled={isLoading}
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
                                        <Draggable key={banner.id} draggableId={banner.id} index={index}>
                                            {(provided, snapshot) => (
                                                <Card
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    sx={{ 
                                                        mb: 2, 
                                                        opacity: snapshot.isDragging ? 0.5 : 1,
                                                        backgroundColor: snapshot.isDragging ? "action.hover" : "background.paper",
                                                    }}
                                                >
                                                    <Box sx={{ display: "flex", alignItems: "stretch" }}>
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
                                                            image={banner.src.startsWith("http") ? banner.src : `${getServerUrl()}${banner.src}`}
                                                            alt={banner.alt}
                                                            sx={{ width: 300, objectFit: "cover" }}
                                                        />
                                                        
                                                        <Box sx={{ flex: 1, p: 2 }}>
                                                            <Typography variant="subtitle2" gutterBottom>
                                                                Order: {banner.displayOrder}
                                                            </Typography>
                                                            <TextField
                                                                label="Alt Text"
                                                                value={banner.alt}
                                                                onChange={(e) => handleFieldChange(banner.id, "alt", e.target.value)}
                                                                fullWidth
                                                                size="small"
                                                                sx={{ mb: 1 }}
                                                            />
                                                            <TextField
                                                                label="Description"
                                                                value={banner.description}
                                                                onChange={(e) => handleFieldChange(banner.id, "description", e.target.value)}
                                                                fullWidth
                                                                size="small"
                                                                multiline
                                                                rows={2}
                                                            />
                                                            <FormControlLabel
                                                                control={
                                                                    <Switch
                                                                        checked={banner.isActive}
                                                                        onChange={(e) => handleFieldChange(banner.id, "isActive", e.target.checked)}
                                                                    />
                                                                }
                                                                label="Active"
                                                                sx={{ mt: 1 }}
                                                            />
                                                        </Box>
                                                        
                                                        <CardActions>
                                                            <IconButton 
                                                                onClick={() => handleDeleteBanner(banner.id)}
                                                                color="error"
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
                        <Tabs value={selectedSeasonalTab} onChange={(_, v) => setSelectedSeasonalTab(v)}>
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
                                >
                                    Add Plant
                                </Button>
                            </Box>

                            <Grid container spacing={3}>
                                {plants.map((plant: SeasonalPlant) => {
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

                    {/* Plant Care Tips */}
                    {selectedSeasonalTab === 1 && (
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
                                {tips.map((tip: PlantTip) => (
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
                </Box>
            )}

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
                        disabled={isLoading}
                    >
                        {isLoading ? "Saving..." : "Save"}
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
                        disabled={isLoading}
                    >
                        {isLoading ? "Saving..." : "Save"}
                    </Button>
                </DialogActions>
            </Dialog>
            
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </PageContainer>
    );
};
