import { APP_LINKS } from "@local/shared";
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Switch,
    Chip,
    Snackbar,
    Alert,
} from "@mui/material";
import { GripVertical, Eye, EyeOff, Save, RotateCcw } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { SectionConfiguration } from "api/rest/client";
import { useUpdateSectionConfiguration } from "api/rest/hooks";
import { BackButton, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLandingPage } from "hooks/useLandingPage";
import { useBlockNavigation } from "hooks/useBlockNavigation";
import { useCallback as _useCallback, useEffect, useState, useMemo } from "react";

// Section metadata for section configuration
const SECTION_METADATA: Record<string, { name: string; description: string; required?: boolean }> =
    {
        hero: {
            name: "Hero Banner",
            description: "Main hero section with carousel and call-to-action",
            required: true,
        },
        services: {
            name: "Services Showcase",
            description: "Display of available services (plants, advice, design, delivery)",
        },
        "social-proof": {
            name: "Social Proof",
            description: "Customer testimonials and trust indicators",
        },
        about: {
            name: "About Story",
            description: "Company history and story section",
        },
        seasonal: {
            name: "Seasonal Content",
            description: "What's blooming now and expert care tips",
        },
        location: {
            name: "Location & Visit",
            description: "Contact information and visit details",
        },
    };

export const AdminHomepageSections = () => {
    const updateSections = useUpdateSectionConfiguration();
    const { data: landingPageContent, refetch } = useLandingPage();

    const [sectionConfig, setSectionConfig] = useState<SectionConfiguration>({
        order: ["hero", "services", "social-proof", "about", "seasonal", "location"],
        enabled: {
            hero: true,
            services: true,
            "social-proof": true,
            about: true,
            seasonal: true,
            location: true,
        },
    });
    const [originalSectionConfig, setOriginalSectionConfig] =
        useState<SectionConfiguration>(sectionConfig);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error";
    }>({
        open: false,
        message: "",
        severity: "success",
    });

    // Load section configuration
    useEffect(() => {
        if (landingPageContent?.layout?.sections) {
            const config = landingPageContent.layout.sections;
            setSectionConfig(config);
            setOriginalSectionConfig(JSON.parse(JSON.stringify(config)));
        }
    }, [landingPageContent]);

    // Check for unsaved section changes
    const hasChanges = useMemo(() => {
        return JSON.stringify(sectionConfig) !== JSON.stringify(originalSectionConfig);
    }, [sectionConfig, originalSectionConfig]);

    // Block navigation when there are unsaved changes
    useBlockNavigation(hasChanges);

    const handleSectionDragEnd = (result: any) => {
        if (!result.destination) return;

        const newOrder = Array.from(sectionConfig.order);
        const [removed] = newOrder.splice(result.source.index, 1);
        newOrder.splice(result.destination.index, 0, removed);

        setSectionConfig({ ...sectionConfig, order: newOrder });
    };

    const handleToggleSection = (sectionId: string) => {
        if (sectionId === "hero") return; // Hero is always enabled

        setSectionConfig({
            ...sectionConfig,
            enabled: {
                ...sectionConfig.enabled,
                [sectionId]: !sectionConfig.enabled[sectionId],
            },
        });
    };

    const handleSaveSections = async () => {
        try {
            await updateSections.mutate(sectionConfig);
            setOriginalSectionConfig(JSON.parse(JSON.stringify(sectionConfig)));
            setSnackbar({
                open: true,
                message: "Section configuration saved successfully!",
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

    const handleCancelSectionChanges = () => {
        setSectionConfig(JSON.parse(JSON.stringify(originalSectionConfig)));
    };

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="Section Configuration"
                help="Control which sections appear on your homepage and their display order"
                startComponent={
                    <BackButton
                        to={APP_LINKS.AdminHomepage}
                        ariaLabel="Back to Homepage Management"
                    />
                }
            />

            <Box p={2}>
                {/* Unsaved changes warning */}
                {hasChanges && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        You have unsaved changes. Don't forget to save before leaving!
                    </Alert>
                )}

                {/* Instructions Card */}
                <Card sx={{ mb: 3, backgroundColor: "#f5f5f5" }}>
                    <CardContent>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Instructions:</strong>
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: "20px" }}>
                            <li>
                                <Typography variant="body2">
                                    Drag sections using the grip handle to reorder them
                                </Typography>
                            </li>
                            <li>
                                <Typography variant="body2">
                                    Toggle sections on/off using the switches (Hero banner is always
                                    enabled)
                                </Typography>
                            </li>
                            <li>
                                <Typography variant="body2">
                                    Click "Save Changes" to apply your configuration
                                </Typography>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                {/* Drag-drop section list */}
                <DragDropContext onDragEnd={handleSectionDragEnd}>
                    <Droppable droppableId="sections">
                        {(provided) => (
                            <Box
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                sx={{ mb: 3 }}
                            >
                                {sectionConfig.order.map((sectionId, index) => {
                                    const metadata = SECTION_METADATA[sectionId];
                                    if (!metadata) return null;

                                    return (
                                        <Draggable
                                            key={sectionId}
                                            draggableId={sectionId}
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <Card
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    sx={{
                                                        mb: 2,
                                                        opacity: snapshot.isDragging ? 0.5 : 1,
                                                        backgroundColor: snapshot.isDragging
                                                            ? "action.hover"
                                                            : "background.paper",
                                                    }}
                                                >
                                                    <CardContent>
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "space-between",
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    flex: 1,
                                                                }}
                                                            >
                                                                <Box
                                                                    {...provided.dragHandleProps}
                                                                    sx={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        mr: 2,
                                                                        cursor: "grab",
                                                                    }}
                                                                >
                                                                    <GripVertical size={20} />
                                                                </Box>
                                                                <Box sx={{ flex: 1 }}>
                                                                    <Typography variant="h6">
                                                                        {metadata.name}
                                                                    </Typography>
                                                                    <Typography
                                                                        variant="body2"
                                                                        color="text.secondary"
                                                                    >
                                                                        {metadata.description}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 2,
                                                                }}
                                                            >
                                                                {metadata.required && (
                                                                    <Chip
                                                                        label="Required"
                                                                        size="small"
                                                                        color="primary"
                                                                    />
                                                                )}
                                                                <Switch
                                                                    checked={
                                                                        sectionConfig.enabled[
                                                                            sectionId
                                                                        ]
                                                                    }
                                                                    onChange={() =>
                                                                        handleToggleSection(
                                                                            sectionId,
                                                                        )
                                                                    }
                                                                    disabled={metadata.required}
                                                                />
                                                                {sectionConfig.enabled[
                                                                    sectionId
                                                                ] ? (
                                                                    <Eye size={20} />
                                                                ) : (
                                                                    <EyeOff size={20} />
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </Draggable>
                                    );
                                })}
                                {provided.placeholder}
                            </Box>
                        )}
                    </Droppable>
                </DragDropContext>

                {/* Action Buttons */}
                <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Save size={20} />}
                        onClick={handleSaveSections}
                        disabled={!hasChanges || updateSections.loading}
                    >
                        {updateSections.loading ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<RotateCcw size={20} />}
                        onClick={handleCancelSectionChanges}
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
