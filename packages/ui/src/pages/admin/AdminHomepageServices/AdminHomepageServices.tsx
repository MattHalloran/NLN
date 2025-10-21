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
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
} from "@mui/material";
import { Save, RotateCcw, Plus, Trash2, GripVertical } from "lucide-react";
import { BackButton, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLandingPageContent, useUpdateLandingPageSettings } from "api/rest/hooks";
import { useCallback, useEffect, useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface Service {
    title: string;
    description: string;
    icon: string;
    action: string;
    url: string;
}

interface ServicesSettings {
    title: string;
    subtitle: string;
    items: Service[];
}

// Available icons for service cards (matching ServiceShowcase component)
const SERVICE_ICONS = [
    { value: "sprout", label: "Sprout" },
    { value: "leaf", label: "Leaf" },
    { value: "home", label: "Home" },
    { value: "truck", label: "Truck" },
    { value: "package", label: "Package" },
    { value: "wrench", label: "Wrench" },
];

export const AdminHomepageServices = () => {
    const updateSettings = useUpdateLandingPageSettings();
    const { data: landingPageContent, refetch } = useLandingPageContent(false);

    const [services, setServices] = useState<ServicesSettings>({
        title: "Our Services",
        subtitle: "Everything you need to create and maintain your perfect garden",
        items: [
            {
                title: "Plant Selection & Availability",
                description:
                    "Browse our extensive collection of healthy plants, trees, and flowers. Check real-time availability and place orders online.",
                icon: "sprout",
                action: "Browse Plants",
                url: "https://newlife.online-orders.sbiteam.com/",
            },
            {
                title: "Expert Plant Care Advice",
                description:
                    "Get personalized guidance from our certified horticulturists. Learn proper care techniques for your specific plants.",
                icon: "leaf",
                action: "Get Advice",
                url: "/about#contact",
            },
            {
                title: "Landscape Design Consultation",
                description:
                    "Transform your outdoor space with professional landscape design. From concept to completion, we'll help bring your vision to life.",
                icon: "home",
                action: "Schedule Consultation",
                url: "/about#contact",
            },
            {
                title: "Delivery & Installation",
                description:
                    "Professional delivery and installation services available. Let our experienced team handle the heavy lifting and proper placement.",
                icon: "truck",
                action: "Learn More",
                url: "/about",
            },
        ],
    });
    const [originalServices, setOriginalServices] = useState<ServicesSettings>(services);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
        open: false,
        message: "",
        severity: "success",
    });

    // Load services settings from landing page content
    useEffect(() => {
        if (landingPageContent?.content?.services) {
            const loadedServices = {
                title: landingPageContent.content.services.title || services.title,
                subtitle: landingPageContent.content.services.subtitle || services.subtitle,
                items: landingPageContent.content.services.items || services.items,
            };
            setServices(loadedServices);
            setOriginalServices(JSON.parse(JSON.stringify(loadedServices)));
        }
    }, [landingPageContent]);

    // Check for unsaved changes using useMemo for derived state
    const hasChanges = useMemo(
        () => JSON.stringify(services) !== JSON.stringify(originalServices),
        [services, originalServices]
    );

    const handleSave = async () => {
        try {
            await updateSettings.mutate({ services });
            setOriginalServices(JSON.parse(JSON.stringify(services)));
            setSnackbar({
                open: true,
                message: "Services settings saved successfully!",
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
        setServices(JSON.parse(JSON.stringify(originalServices)));
    };

    const handleAddService = () => {
        setServices({
            ...services,
            items: [
                ...services.items,
                {
                    title: "New Service",
                    description: "Service description",
                    icon: "sprout",
                    action: "Learn More",
                    url: "/about",
                },
            ],
        });
    };

    const handleRemoveService = (index: number) => {
        setServices({
            ...services,
            items: services.items.filter((_, i) => i !== index),
        });
    };

    const handleUpdateService = (index: number, field: keyof Service, value: string) => {
        const newItems = [...services.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setServices({ ...services, items: newItems });
    };

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        const items = Array.from(services.items);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setServices({ ...services, items });
    };

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="Services Section"
                help="Manage service cards displayed on the homepage"
                startComponent={<BackButton to={APP_LINKS.AdminHomepage} ariaLabel="Back to Homepage Management" />}
            />

            <Box p={3}>
                {/* Unsaved changes warning */}
                {hasChanges && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        You have unsaved changes. Don't forget to save before leaving!
                    </Alert>
                )}

                {/* Section Header Settings */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Section Header
                        </Typography>

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <TextField
                                fullWidth
                                label="Section Title"
                                value={services.title}
                                onChange={(e) => setServices({ ...services, title: e.target.value })}
                                helperText="Main heading for the services section"
                            />

                            <TextField
                                fullWidth
                                label="Section Subtitle"
                                value={services.subtitle}
                                onChange={(e) => setServices({ ...services, subtitle: e.target.value })}
                                helperText="Subtitle text below the main heading"
                            />
                        </Box>
                    </CardContent>
                </Card>

                {/* Service Cards */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                            <Typography variant="h6">Service Cards</Typography>
                            <Button variant="contained" startIcon={<Plus size={20} />} onClick={handleAddService}>
                                Add Service
                            </Button>
                        </Box>

                        <Alert severity="info" sx={{ mb: 3 }}>
                            Drag cards to reorder them. Services are displayed on the homepage in the order shown below.
                        </Alert>

                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="services">
                                {(provided) => (
                                    <Box {...provided.droppableProps} ref={provided.innerRef}>
                                        {services.items.map((service, index) => (
                                            <Draggable key={index} draggableId={`service-${index}`} index={index}>
                                                {(provided) => (
                                                    <Card
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        sx={{ mb: 2, position: "relative" }}
                                                    >
                                                        <CardContent>
                                                            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                                                                {/* Drag Handle */}
                                                                <Box
                                                                    {...provided.dragHandleProps}
                                                                    sx={{
                                                                        cursor: "grab",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        color: "text.secondary",
                                                                        pt: 1,
                                                                    }}
                                                                >
                                                                    <GripVertical size={20} />
                                                                </Box>

                                                                {/* Service Fields */}
                                                                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                                                                    <TextField
                                                                        fullWidth
                                                                        label="Service Title"
                                                                        value={service.title}
                                                                        onChange={(e) =>
                                                                            handleUpdateService(index, "title", e.target.value)
                                                                        }
                                                                    />

                                                                    <TextField
                                                                        fullWidth
                                                                        multiline
                                                                        rows={3}
                                                                        label="Description"
                                                                        value={service.description}
                                                                        onChange={(e) =>
                                                                            handleUpdateService(index, "description", e.target.value)
                                                                        }
                                                                    />

                                                                    <Box sx={{ display: "flex", gap: 2 }}>
                                                                        <FormControl sx={{ flex: 1 }}>
                                                                            <InputLabel>Icon</InputLabel>
                                                                            <Select
                                                                                value={service.icon}
                                                                                label="Icon"
                                                                                onChange={(e) =>
                                                                                    handleUpdateService(index, "icon", e.target.value)
                                                                                }
                                                                            >
                                                                                {SERVICE_ICONS.map((icon) => (
                                                                                    <MenuItem key={icon.value} value={icon.value}>
                                                                                        {icon.label}
                                                                                    </MenuItem>
                                                                                ))}
                                                                            </Select>
                                                                        </FormControl>

                                                                        <TextField
                                                                            sx={{ flex: 1 }}
                                                                            label="Button Text"
                                                                            value={service.action}
                                                                            onChange={(e) =>
                                                                                handleUpdateService(index, "action", e.target.value)
                                                                            }
                                                                        />
                                                                    </Box>

                                                                    <TextField
                                                                        fullWidth
                                                                        label="Button URL"
                                                                        value={service.url}
                                                                        onChange={(e) =>
                                                                            handleUpdateService(index, "url", e.target.value)
                                                                        }
                                                                        helperText="Internal path (e.g., /about) or external URL (e.g., https://...)"
                                                                    />
                                                                </Box>

                                                                {/* Delete Button */}
                                                                <IconButton
                                                                    color="error"
                                                                    onClick={() => handleRemoveService(index)}
                                                                    sx={{ mt: 1 }}
                                                                >
                                                                    <Trash2 size={20} />
                                                                </IconButton>
                                                            </Box>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </Box>
                                )}
                            </Droppable>
                        </DragDropContext>

                        {services.items.length === 0 && (
                            <Alert severity="warning">
                                No service cards configured. Click "Add Service" to create your first service card.
                            </Alert>
                        )}
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
