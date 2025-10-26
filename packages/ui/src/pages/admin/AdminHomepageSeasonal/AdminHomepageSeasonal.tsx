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
import { useUpdateLandingPageContent } from "api/rest/hooks";
import { BackButton, PageContainer, TopBar } from "components";
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

// Preview Component - Shows how the seasonal section looks on the homepage
const SeasonalPreview = ({ plants, tips }: { plants: SeasonalPlant[]; tips: PlantTip[] }) => {
    const { palette } = useTheme();
    const [currentPlant, setCurrentPlant] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(0);

    const activePlants = plants.filter((p) => p.isActive);
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
                                    What's Blooming Now
                                </Typography>
                            </Box>

                            {activePlants.length > 0 ? (
                                <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                                    <Box
                                        sx={{
                                            minHeight: "200px",
                                            background: `linear-gradient(135deg, ${palette.primary.light} 0%, ${palette.secondary.light} 100%)`,
                                            position: "relative",
                                            p: 3,
                                            color: "white",
                                            textAlign: "center",
                                        }}
                                    >
                                        <Box sx={{ mb: 1.5, display: "flex", justifyContent: "center" }}>
                                            {(() => {
                                                const IconComponent = getIconComponent(activePlants[safeCurrentPlant]?.icon || "leaf");
                                                return <IconComponent size={48} />;
                                            })()}
                                        </Box>

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
    const { data, refetch } = useLandingPage();
    const updateLandingPageContent = useUpdateLandingPageContent();

    const [plants, setPlants] = useState<SeasonalPlant[]>([]);
    const [originalPlants, setOriginalPlants] = useState<SeasonalPlant[]>([]);
    const [tips, setTips] = useState<PlantTip[]>([]);
    const [originalTips, setOriginalTips] = useState<PlantTip[]>([]);
    const [editingPlant, setEditingPlant] = useState<SeasonalPlant | null>(null);
    const [editingTip, setEditingTip] = useState<PlantTip | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Load data from API
    useEffect(() => {
        if (data?.content?.seasonal) {
            const loadedPlants = data.content.seasonal.plants || [];
            const loadedTips = data.content.seasonal.tips || [];

            setPlants(JSON.parse(JSON.stringify(loadedPlants)));
            setOriginalPlants(JSON.parse(JSON.stringify(loadedPlants)));
            setTips(JSON.parse(JSON.stringify(loadedTips)));
            setOriginalTips(JSON.parse(JSON.stringify(loadedTips)));
        }
    }, [data]);

    // Check for unsaved changes
    const hasChanges = useMemo(() => {
        const plantsChanged = JSON.stringify(plants) !== JSON.stringify(originalPlants);
        const tipsChanged = JSON.stringify(tips) !== JSON.stringify(originalTips);
        return plantsChanged || tipsChanged;
    }, [plants, originalPlants, tips, originalTips]);

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
            await updateLandingPageContent.mutate({
                data: {
                    seasonalPlants: plants,
                    plantTips: tips,
                },
            });
            await refetch();
            setOriginalPlants(JSON.parse(JSON.stringify(plants)));
            setOriginalTips(JSON.parse(JSON.stringify(tips)));
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

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0 }}>
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
                                                                <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
                                                                    Icon
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
