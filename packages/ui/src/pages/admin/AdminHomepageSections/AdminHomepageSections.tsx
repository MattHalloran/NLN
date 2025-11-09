import { APP_LINKS } from "@local/shared";
import { Box, Button, Card, CardContent, Typography, Switch, Chip, Alert } from "@mui/material";
import { GripVertical, Eye, EyeOff, Save, RotateCcw } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { SectionConfiguration } from "api/rest/client";
import { useUpdateLandingPageSettings } from "api/rest/hooks";
import { useABTestQueryParams } from "hooks/useABTestQueryParams";
import { BackButton, PageContainer } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLandingPage } from "hooks/useLandingPage";
import { useAdminForm } from "hooks/useAdminForm";
import { useEffect, useRef } from "react";

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
    const { data: landingPageContent, refetch: refetchLandingPage } = useLandingPage();
    const updateSettings = useUpdateLandingPageSettings();
    const { variantId: queryVariantId } = useABTestQueryParams();

    // Use variantId from URL query params, or fall back to the loaded data's variant
    const variantId = queryVariantId || landingPageContent?._meta?.variantId;

    // Track if landingPageContent has loaded
    const hasLoadedRef = useRef(false);

    // Use the standardized useAdminForm hook
    const form = useAdminForm<SectionConfiguration>({
        fetchFn: async () => {
            // Fetch section configuration from landing page content
            if (landingPageContent?.layout?.sections) {
                return landingPageContent.layout.sections;
            }

            // Return default configuration if none exists
            return {
                order: ["hero", "services", "social-proof", "about", "seasonal", "location"],
                enabled: {
                    hero: true,
                    services: true,
                    "social-proof": true,
                    about: true,
                    seasonal: true,
                    location: true,
                },
            };
        },
        saveFn: async (sectionConfig) => {
            // Use the unified landing page settings endpoint like all other admin pages
            await updateSettings.mutate({
                settings: {
                    layout: {
                        sections: sectionConfig,
                    },
                },
                queryParams: variantId ? { variantId } : undefined,
            });

            // Return the updated configuration
            return sectionConfig;
        },
        refetchDependencies: [refetchLandingPage],
        successMessage: "Section configuration saved successfully!",
        errorMessagePrefix: "Failed to save",
    });

    // Refetch form data when landingPageContent loads
    useEffect(() => {
        if (landingPageContent && !hasLoadedRef.current) {
            hasLoadedRef.current = true;
            form.refetch();
        }
    }, [landingPageContent, form.refetch]);

    const handleSectionDragEnd = (result: any) => {
        if (!result.destination || !form.data) return;

        const newOrder = Array.from(form.data.order);
        const [removed] = newOrder.splice(result.source.index, 1);
        newOrder.splice(result.destination.index, 0, removed);

        form.setData({ ...form.data, order: newOrder });
    };

    const handleToggleSection = (sectionId: string) => {
        if (sectionId === "hero" || !form.data) return; // Hero is always enabled

        form.setData({
            ...form.data,
            enabled: {
                ...form.data.enabled,
                [sectionId]: !form.data.enabled[sectionId],
            },
        });
    };

    if (form.isLoading) {
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
                    <Typography>Loading section configuration...</Typography>
                </Box>
            </PageContainer>
        );
    }

    if (!form.data) {
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
                    <Alert severity="error">Failed to load section configuration</Alert>
                </Box>
            </PageContainer>
        );
    }

    // Type guard: At this point we know form.data is not null
    const sectionData = form.data;

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
                {form.isDirty && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        You have unsaved changes. Don't forget to save before leaving!
                    </Alert>
                )}

                {/* Error alert */}
                {form.error && (
                    <Alert severity="error" sx={{ mb: 3 }} onClose={form.clearError}>
                        {form.error.message}
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
                                {sectionData.order.map((sectionId, index) => {
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
                                                                        sectionData.enabled[
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
                                                                {sectionData.enabled[sectionId] ? (
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
                        onClick={form.save}
                        disabled={!form.isDirty || form.isSaving}
                    >
                        {form.isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<RotateCcw size={20} />}
                        onClick={form.cancel}
                        disabled={!form.isDirty}
                    >
                        Cancel
                    </Button>
                </Box>
            </Box>
        </PageContainer>
    );
};
