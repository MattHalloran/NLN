import { APP_LINKS } from "@local/shared";
import {
    Box,
    Button,
    Card,
    CardContent,
    TextField,
    Typography,
    Alert,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Grid,
    Paper,
    useTheme,
} from "@mui/material";
import {
    Save,
    RotateCcw,
    Plus,
    Trash2,
    GripVertical,
    Sprout,
    Leaf,
    Home,
    Truck,
    Package,
    Wrench,
    Headset,
    Type as TextFieldsIcon,
    Grid3x3 as GridIcon,
    Eye as EyeIcon,
} from "lucide-react";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { BackButton, PageContainer } from "components";
import { ABTestEditingBanner } from "components/admin/ABTestEditingBanner";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useABTestQueryParams } from "hooks/useABTestQueryParams";
import { useUpdateLandingPageSettings, useLandingPageContent } from "api/rest/hooks";
import { useAdminForm } from "hooks/useAdminForm";
import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface Service {
    title: string;
    description: string;
    icon: string;
    action: string;
    url: string;
}

interface CTAButton {
    text: string;
    url: string;
}

interface CTASettings {
    title: string;
    subtitle: string;
    primaryButton: CTAButton;
    secondaryButton: CTAButton;
}

interface ServicesSettings {
    title: string;
    subtitle: string;
    cta: CTASettings;
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
    { value: "headset", label: "Headset" },
];

// Icon mapping for preview
const ICON_COMPONENTS: Record<string, any> = {
    sprout: Sprout,
    leaf: Leaf,
    home: Home,
    truck: Truck,
    package: Package,
    wrench: Wrench,
    headset: Headset,
};

// Preview component that shows how services will look
const ServicesPreview = ({
    services,
    sectionTitle,
    sectionSubtitle,
}: {
    services: ServicesSettings;
    sectionTitle: string;
    sectionSubtitle: string;
}) => {
    const { palette } = useTheme();
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

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
            <Box sx={{ p: 3 }}>
                {/* Section Header */}
                <Box sx={{ textAlign: "center", mb: 3 }}>
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 700,
                            color: palette.primary.main,
                            mb: 1,
                        }}
                    >
                        {sectionTitle}
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: palette.text.secondary,
                            maxWidth: "400px",
                            mx: "auto",
                        }}
                    >
                        {sectionSubtitle}
                    </Typography>
                </Box>

                {/* Service Cards Grid */}
                {services.items.length > 0 ? (
                    <Grid container spacing={2}>
                        {services.items.map((service: Service, index: number) => {
                            const IconComponent = ICON_COMPONENTS[service.icon] || Sprout;
                            return (
                                <Grid item xs={12} sm={6} key={index}>
                                    <Card
                                        sx={{
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            transition: "all 0.3s ease-in-out",
                                            transform:
                                                hoveredCard === index
                                                    ? "translateY(-4px)"
                                                    : "translateY(0)",
                                            boxShadow: hoveredCard === index ? 4 : 1,
                                            cursor: "pointer",
                                            border: `1px solid ${palette.divider}`,
                                        }}
                                        onMouseEnter={() => setHoveredCard(index)}
                                        onMouseLeave={() => setHoveredCard(null)}
                                    >
                                        <CardContent
                                            sx={{
                                                flexGrow: 1,
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                textAlign: "center",
                                                p: 2,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    mb: 1.5,
                                                    display: "flex",
                                                    justifyContent: "center",
                                                    color: palette.primary.main,
                                                }}
                                            >
                                                <IconComponent size={36} />
                                            </Box>

                                            <Typography
                                                variant="subtitle1"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: palette.primary.main,
                                                    mb: 1,
                                                    fontSize: "0.95rem",
                                                    minHeight: "2.5rem",
                                                    display: "flex",
                                                    alignItems: "center",
                                                }}
                                            >
                                                {service.title}
                                            </Typography>

                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: palette.text.secondary,
                                                    flexGrow: 1,
                                                    mb: 1.5,
                                                    lineHeight: 1.4,
                                                    fontSize: "0.75rem",
                                                }}
                                            >
                                                {service.description}
                                            </Typography>

                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                size="small"
                                                sx={{
                                                    borderRadius: 1,
                                                    textTransform: "none",
                                                    fontWeight: 600,
                                                    px: 2,
                                                    fontSize: "0.75rem",
                                                    pointerEvents: "none",
                                                }}
                                            >
                                                {service.action}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                ) : (
                    <Box
                        sx={{
                            p: 4,
                            textAlign: "center",
                            bgcolor: "grey.200",
                            borderRadius: 2,
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            Add service cards to see preview
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export const AdminHomepageServices = () => {
    const { variantId: queryVariantId } = useABTestQueryParams();
    const updateSettings = useUpdateLandingPageSettings();
    // Admin needs to see ALL content (including inactive) so they can manage it
    const {
        data: landingPageContent,
        loading: landingPageLoading,
        refetch: refetchLandingPage,
    } = useLandingPageContent(false, queryVariantId);

    // Use variantId from URL query params, or fall back to the loaded data's variant
    const variantId = queryVariantId || landingPageContent?._meta?.variantId;

    // Default values
    const DEFAULT_SERVICES: ServicesSettings = {
        title: "Our Services",
        subtitle: "Everything you need to create and maintain your perfect garden",
        cta: {
            title: "Ready to get started?",
            subtitle: "Browse our online catalog or contact us to discuss your project needs",
            primaryButton: {
                text: "Shop Online",
                url: "https://newlife.online-orders.sbiteam.com/",
            },
            secondaryButton: {
                text: "Contact Us",
                url: "/about#contact",
            },
        },
        items: [
            {
                title: "Wholesale Plant Catalog",
                description:
                    "Browse our extensive inventory of plants, trees, and shrubs. Wholesale pricing for landscapers, contractors, and garden centers.",
                icon: "sprout",
                action: "View Catalog",
                url: "https://newlife.online-orders.sbiteam.com/",
            },
            {
                title: "Bulk Ordering & Pricing",
                description: "Order in quantity with competitive wholesale pricing.",
                icon: "package",
                action: "Get Pricing",
                url: "/about#contact",
            },
            {
                title: "Wholesale Delivery",
                description:
                    "Professional delivery service for wholesale orders. Flexible scheduling to meet your project timelines.",
                icon: "truck",
                action: "Delivery Info",
                url: "/about#contact",
            },
            {
                title: "Real-Time Availability",
                description:
                    "Check current stock levels and reserve plants online. Updated inventory ensures you get what you need when you need it.",
                icon: "leaf",
                action: "Check Stock",
                url: "https://newlife.online-orders.sbiteam.com/",
            },
        ],
    };

    const form = useAdminForm<ServicesSettings>({
        fetchFn: async () => {
            if (landingPageContent?.content?.services) {
                return {
                    title: landingPageContent.content.services.title || DEFAULT_SERVICES.title,
                    subtitle:
                        landingPageContent.content.services.subtitle || DEFAULT_SERVICES.subtitle,
                    cta: landingPageContent.content.services.cta || DEFAULT_SERVICES.cta,
                    items: landingPageContent.content.services.items || DEFAULT_SERVICES.items,
                };
            }
            return DEFAULT_SERVICES;
        },
        saveFn: async (data) => {
            await updateSettings.mutate({
                settings: {
                    content: {
                        services: data,
                    },
                },
                queryParams: variantId ? { variantId } : undefined,
            });
            return data;
        },
        refetchDependencies: [refetchLandingPage],
        pageName: "services-section",
        endpointName: "/api/v1/landing-page",
        successMessage: "Services settings saved successfully!",
        errorMessagePrefix: "Failed to save",
    });

    // Trigger refetch when landing page data loads
    useEffect(() => {
        if (landingPageContent && !landingPageLoading) {
            form.refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [landingPageContent, landingPageLoading]);

    const handleAddService = () => {
        if (!form.data) return;
        form.setData({
            ...form.data,
            items: [
                ...form.data.items,
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
        if (!form.data) return;
        form.setData({
            ...form.data,
            items: form.data.items.filter((_, i) => i !== index),
        });
    };

    const handleUpdateService = (index: number, field: keyof Service, value: string) => {
        if (!form.data) return;
        const newItems = [...form.data.items];
        newItems[index] = { ...newItems[index], [field]: value };
        form.setData({ ...form.data, items: newItems });
    };

    const handleDragEnd = (result: any) => {
        if (!result.destination || !form.data) return;

        const items = Array.from(form.data.items);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        form.setData({ ...form.data, items });
    };

    return (
        <PageContainer variant="wide" sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="Services Section Settings"
                help="Configure all aspects of your services section"
                startComponent={
                    <BackButton
                        to={APP_LINKS.AdminHomepage}
                        ariaLabel="Back to Homepage Management"
                    />
                }
            />

            <Box p={2}>
                <ABTestEditingBanner />

                {/* Unsaved changes warning */}
                {form.isDirty && (
                    <Alert
                        severity="warning"
                        sx={{
                            mb: 3,
                            borderLeft: "4px solid",
                            borderColor: "warning.main",
                            bgcolor: "warning.lighter",
                            "& .MuiAlert-icon": {
                                color: "warning.main",
                            },
                        }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            You have unsaved changes. Don't forget to save before leaving!
                        </Typography>
                    </Alert>
                )}

                {/* Action Buttons at Top */}
                {form.isDirty && (
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
                            onClick={form.save}
                            disabled={!form.isDirty || form.isSaving}
                            sx={{
                                px: 4,
                                fontWeight: 600,
                                boxShadow: 2,
                                "&:hover": {
                                    boxShadow: 4,
                                },
                            }}
                        >
                            {form.isSaving ? "Saving..." : "Save All Changes"}
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<RotateCcw size={20} />}
                            onClick={form.cancel}
                            disabled={!form.isDirty}
                            sx={{
                                px: 4,
                                fontWeight: 600,
                                borderWidth: 2,
                                "&:hover": {
                                    borderWidth: 2,
                                },
                            }}
                        >
                            Cancel
                        </Button>
                    </Paper>
                )}

                {/* Two-column layout: Controls on left, Preview on right */}
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
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                            mb: 3,
                                        }}
                                    >
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
                                            <EyeIcon size={20} />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
                                                Live Preview
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                See your changes in real-time
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <ServicesPreview
                                        services={form.data || DEFAULT_SERVICES}
                                        sectionTitle={form.data?.title || ""}
                                        sectionSubtitle={form.data?.subtitle || ""}
                                    />
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
                                            This preview updates in real-time as you make changes.
                                        </Typography>
                                    </Alert>
                                </Paper>
                            </Box>

                            {/* Accordion 1: Section Header */}
                            <Accordion
                                defaultExpanded
                                sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: "8px !important",
                                    "&:before": { display: "none" },
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                    mb: 2,
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{
                                        bgcolor: "grey.50",
                                        borderRadius: "8px 8px 0 0",
                                        minHeight: 64,
                                        "&:hover": {
                                            bgcolor: "grey.100",
                                        },
                                        "& .MuiAccordionSummary-content": {
                                            my: 2,
                                        },
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
                                            <TextFieldsIcon size={20} />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
                                                Section Header
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Configure title and subtitle
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        <TextField
                                            fullWidth
                                            label="Section Title"
                                            value={form.data?.title}
                                            onChange={(e) =>
                                                form.setData({
                                                    ...form.data!,
                                                    title: e.target.value,
                                                })
                                            }
                                            helperText="Main heading for the services section"
                                            variant="outlined"
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="Section Subtitle"
                                            value={form.data?.subtitle}
                                            onChange={(e) =>
                                                form.setData({
                                                    ...form.data!,
                                                    subtitle: e.target.value,
                                                })
                                            }
                                            helperText="Subtitle text below the main heading"
                                            variant="outlined"
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 2: Service Cards */}
                            <Accordion
                                defaultExpanded
                                sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: "8px !important",
                                    "&:before": { display: "none" },
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                    mb: 2,
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{
                                        bgcolor: "grey.50",
                                        borderRadius: "8px 8px 0 0",
                                        minHeight: 64,
                                        "&:hover": {
                                            bgcolor: "grey.100",
                                        },
                                        "& .MuiAccordionSummary-content": {
                                            my: 2,
                                        },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                            width: "100%",
                                        }}
                                    >
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
                                            <GridIcon size={20} />
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
                                                Service Cards
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Manage your service offerings (
                                                {(form.data?.items || []).length} cards)
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box sx={{ mb: 3 }}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<Plus size={20} />}
                                            onClick={handleAddService}
                                            sx={{
                                                borderStyle: "dashed",
                                                borderWidth: 2,
                                                py: 1.5,
                                                width: "100%",
                                                "&:hover": {
                                                    borderWidth: 2,
                                                    bgcolor: "action.hover",
                                                },
                                            }}
                                        >
                                            Add Service Card
                                        </Button>
                                    </Box>

                                    {(form.data?.items || []).length > 0 && (
                                        <Alert
                                            severity="info"
                                            sx={{
                                                mb: 3,
                                                bgcolor: "info.lighter",
                                                border: "1px solid",
                                                borderColor: "info.light",
                                            }}
                                        >
                                            <Typography variant="caption">
                                                Drag cards to reorder them. Services are displayed
                                                on the homepage in the order shown below.
                                            </Typography>
                                        </Alert>
                                    )}

                                    <DragDropContext onDragEnd={handleDragEnd}>
                                        <Droppable droppableId="services">
                                            {(provided) => (
                                                <Box
                                                    {...provided.droppableProps}
                                                    ref={provided.innerRef}
                                                >
                                                    {(form.data?.items || []).map(
                                                        (service, index) => (
                                                            <Draggable
                                                                key={index}
                                                                draggableId={`service-${index}`}
                                                                index={index}
                                                            >
                                                                {(provided, snapshot) => (
                                                                    <Paper
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        elevation={0}
                                                                        sx={{
                                                                            mb: 2.5,
                                                                            opacity:
                                                                                snapshot.isDragging
                                                                                    ? 0.7
                                                                                    : 1,
                                                                            border: "2px solid",
                                                                            borderColor:
                                                                                snapshot.isDragging
                                                                                    ? "primary.main"
                                                                                    : "divider",
                                                                            borderRadius: 2,
                                                                            overflow: "hidden",
                                                                            transition: "all 0.2s",
                                                                            boxShadow:
                                                                                snapshot.isDragging
                                                                                    ? "0 8px 16px rgba(0,0,0,0.15)"
                                                                                    : "0 1px 3px rgba(0,0,0,0.05)",
                                                                            "&:hover": {
                                                                                boxShadow:
                                                                                    "0 4px 12px rgba(0,0,0,0.1)",
                                                                                borderColor:
                                                                                    "primary.light",
                                                                            },
                                                                        }}
                                                                    >
                                                                        <Box
                                                                            sx={{
                                                                                display: "flex",
                                                                                alignItems:
                                                                                    "stretch",
                                                                            }}
                                                                        >
                                                                            <Box
                                                                                {...provided.dragHandleProps}
                                                                                sx={{
                                                                                    display: "flex",
                                                                                    flexDirection:
                                                                                        "column",
                                                                                    alignItems:
                                                                                        "center",
                                                                                    justifyContent:
                                                                                        "center",
                                                                                    px: 2,
                                                                                    cursor: "grab",
                                                                                    backgroundColor:
                                                                                        "grey.50",
                                                                                    borderRight:
                                                                                        "1px solid",
                                                                                    borderColor:
                                                                                        "divider",
                                                                                    "&:active": {
                                                                                        cursor: "grabbing",
                                                                                    },
                                                                                }}
                                                                            >
                                                                                <GripVertical
                                                                                    size={20}
                                                                                />
                                                                                <Typography
                                                                                    variant="caption"
                                                                                    sx={{
                                                                                        mt: 0.5,
                                                                                        fontWeight: 600,
                                                                                        color: "text.secondary",
                                                                                    }}
                                                                                >
                                                                                    #{index + 1}
                                                                                </Typography>
                                                                            </Box>

                                                                            <Box
                                                                                sx={{
                                                                                    flex: 1,
                                                                                    p: 2.5,
                                                                                }}
                                                                            >
                                                                                <Box
                                                                                    sx={{
                                                                                        display:
                                                                                            "flex",
                                                                                        flexDirection:
                                                                                            "column",
                                                                                        gap: 2,
                                                                                    }}
                                                                                >
                                                                                    <TextField
                                                                                        fullWidth
                                                                                        label="Service Title"
                                                                                        value={
                                                                                            service.title
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) =>
                                                                                            handleUpdateService(
                                                                                                index,
                                                                                                "title",
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                            )
                                                                                        }
                                                                                        size="small"
                                                                                        sx={{
                                                                                            "& .MuiOutlinedInput-root":
                                                                                                {
                                                                                                    bgcolor:
                                                                                                        "background.paper",
                                                                                                },
                                                                                        }}
                                                                                    />

                                                                                    <TextField
                                                                                        fullWidth
                                                                                        multiline
                                                                                        rows={3}
                                                                                        label="Description"
                                                                                        value={
                                                                                            service.description
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) =>
                                                                                            handleUpdateService(
                                                                                                index,
                                                                                                "description",
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                            )
                                                                                        }
                                                                                        size="small"
                                                                                        sx={{
                                                                                            "& .MuiOutlinedInput-root":
                                                                                                {
                                                                                                    bgcolor:
                                                                                                        "background.paper",
                                                                                                },
                                                                                        }}
                                                                                    />

                                                                                    <Box
                                                                                        sx={{
                                                                                            display:
                                                                                                "flex",
                                                                                            gap: 2,
                                                                                        }}
                                                                                    >
                                                                                        <FormControl
                                                                                            sx={{
                                                                                                flex: 1,
                                                                                            }}
                                                                                            size="small"
                                                                                        >
                                                                                            <InputLabel>
                                                                                                Icon
                                                                                            </InputLabel>
                                                                                            <Select
                                                                                                value={
                                                                                                    service.icon
                                                                                                }
                                                                                                label="Icon"
                                                                                                onChange={(
                                                                                                    e,
                                                                                                ) =>
                                                                                                    handleUpdateService(
                                                                                                        index,
                                                                                                        "icon",
                                                                                                        e
                                                                                                            .target
                                                                                                            .value,
                                                                                                    )
                                                                                                }
                                                                                                sx={{
                                                                                                    bgcolor:
                                                                                                        "background.paper",
                                                                                                }}
                                                                                            >
                                                                                                {SERVICE_ICONS.map(
                                                                                                    (
                                                                                                        icon,
                                                                                                    ) => (
                                                                                                        <MenuItem
                                                                                                            key={
                                                                                                                icon.value
                                                                                                            }
                                                                                                            value={
                                                                                                                icon.value
                                                                                                            }
                                                                                                        >
                                                                                                            <Box
                                                                                                                sx={{
                                                                                                                    display:
                                                                                                                        "flex",
                                                                                                                    alignItems:
                                                                                                                        "center",
                                                                                                                    gap: 1,
                                                                                                                }}
                                                                                                            >
                                                                                                                {(() => {
                                                                                                                    const IconComp =
                                                                                                                        ICON_COMPONENTS[
                                                                                                                            icon
                                                                                                                                .value
                                                                                                                        ];
                                                                                                                    return IconComp ? (
                                                                                                                        <IconComp
                                                                                                                            size={
                                                                                                                                16
                                                                                                                            }
                                                                                                                        />
                                                                                                                    ) : null;
                                                                                                                })()}
                                                                                                                <Typography>
                                                                                                                    {
                                                                                                                        icon.label
                                                                                                                    }
                                                                                                                </Typography>
                                                                                                            </Box>
                                                                                                        </MenuItem>
                                                                                                    ),
                                                                                                )}
                                                                                            </Select>
                                                                                        </FormControl>

                                                                                        <TextField
                                                                                            sx={{
                                                                                                flex: 1,
                                                                                                "& .MuiOutlinedInput-root":
                                                                                                    {
                                                                                                        bgcolor:
                                                                                                            "background.paper",
                                                                                                    },
                                                                                            }}
                                                                                            label="Button Text"
                                                                                            value={
                                                                                                service.action
                                                                                            }
                                                                                            onChange={(
                                                                                                e,
                                                                                            ) =>
                                                                                                handleUpdateService(
                                                                                                    index,
                                                                                                    "action",
                                                                                                    e
                                                                                                        .target
                                                                                                        .value,
                                                                                                )
                                                                                            }
                                                                                            size="small"
                                                                                        />
                                                                                    </Box>

                                                                                    <TextField
                                                                                        fullWidth
                                                                                        label="Button URL"
                                                                                        value={
                                                                                            service.url
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) =>
                                                                                            handleUpdateService(
                                                                                                index,
                                                                                                "url",
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                            )
                                                                                        }
                                                                                        helperText="Internal path (e.g., /about) or external URL (e.g., https://...)"
                                                                                        size="small"
                                                                                        sx={{
                                                                                            "& .MuiOutlinedInput-root":
                                                                                                {
                                                                                                    bgcolor:
                                                                                                        "background.paper",
                                                                                                },
                                                                                        }}
                                                                                    />

                                                                                    <Box
                                                                                        sx={{
                                                                                            display:
                                                                                                "flex",
                                                                                            justifyContent:
                                                                                                "flex-end",
                                                                                        }}
                                                                                    >
                                                                                        <Button
                                                                                            variant="outlined"
                                                                                            color="error"
                                                                                            startIcon={
                                                                                                <Trash2
                                                                                                    size={
                                                                                                        16
                                                                                                    }
                                                                                                />
                                                                                            }
                                                                                            onClick={() =>
                                                                                                handleRemoveService(
                                                                                                    index,
                                                                                                )
                                                                                            }
                                                                                            size="small"
                                                                                            sx={{
                                                                                                "&:hover":
                                                                                                    {
                                                                                                        bgcolor:
                                                                                                            "error.lighter",
                                                                                                    },
                                                                                            }}
                                                                                        >
                                                                                            Remove
                                                                                            Card
                                                                                        </Button>
                                                                                    </Box>
                                                                                </Box>
                                                                            </Box>
                                                                        </Box>
                                                                    </Paper>
                                                                )}
                                                            </Draggable>
                                                        ),
                                                    )}
                                                    {provided.placeholder}
                                                </Box>
                                            )}
                                        </Droppable>
                                    </DragDropContext>

                                    {(form.data?.items || []).length === 0 && (
                                        <Alert severity="warning">
                                            No service cards configured. Click "Add Service Card"
                                            above to create your first service card.
                                        </Alert>
                                    )}
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 3: Call-to-Action Section */}
                            <Accordion
                                defaultExpanded
                                sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: "8px !important",
                                    "&:before": { display: "none" },
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                    mb: 2,
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{
                                        bgcolor: "grey.50",
                                        borderRadius: "8px 8px 0 0",
                                        minHeight: 64,
                                        "&:hover": {
                                            bgcolor: "grey.100",
                                        },
                                        "& .MuiAccordionSummary-content": {
                                            my: 2,
                                        },
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
                                                bgcolor: "success.main",
                                                color: "white",
                                            }}
                                        >
                                            <Package size={20} />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
                                                Call-to-Action Section
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Configure the "Ready to get started?" section
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        <TextField
                                            fullWidth
                                            label="CTA Title"
                                            value={form.data?.cta.title}
                                            onChange={(e) =>
                                                form.setData({
                                                    ...form.data!,
                                                    cta: {
                                                        ...form.data!.cta,
                                                        title: e.target.value,
                                                    },
                                                })
                                            }
                                            helperText="Main heading for the call-to-action section"
                                            variant="outlined"
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="CTA Subtitle"
                                            value={form.data?.cta.subtitle}
                                            onChange={(e) =>
                                                form.setData({
                                                    ...form.data!,
                                                    cta: {
                                                        ...form.data!.cta,
                                                        subtitle: e.target.value,
                                                    },
                                                })
                                            }
                                            helperText="Subtitle text below the CTA heading"
                                            variant="outlined"
                                            multiline
                                            rows={2}
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />

                                        <Box sx={{ mt: 2 }}>
                                            <Typography
                                                variant="subtitle2"
                                                sx={{ mb: 2, fontWeight: 600 }}
                                            >
                                                Primary Button (Left)
                                            </Typography>
                                            <Box sx={{ display: "flex", gap: 2 }}>
                                                <TextField
                                                    sx={{ flex: 1 }}
                                                    label="Button Text"
                                                    value={form.data?.cta.primaryButton.text}
                                                    onChange={(e) =>
                                                        form.setData({
                                                            ...form.data!,
                                                            cta: {
                                                                ...form.data!.cta,
                                                                primaryButton: {
                                                                    ...form.data!.cta.primaryButton,
                                                                    text: e.target.value,
                                                                },
                                                            },
                                                        })
                                                    }
                                                    size="small"
                                                />
                                                <TextField
                                                    sx={{ flex: 2 }}
                                                    label="Button URL"
                                                    value={form.data?.cta.primaryButton.url}
                                                    onChange={(e) =>
                                                        form.setData({
                                                            ...form.data!,
                                                            cta: {
                                                                ...form.data!.cta,
                                                                primaryButton: {
                                                                    ...form.data!.cta.primaryButton,
                                                                    url: e.target.value,
                                                                },
                                                            },
                                                        })
                                                    }
                                                    helperText="Internal path or external URL"
                                                    size="small"
                                                />
                                            </Box>
                                        </Box>

                                        <Box>
                                            <Typography
                                                variant="subtitle2"
                                                sx={{ mb: 2, fontWeight: 600 }}
                                            >
                                                Secondary Button (Right)
                                            </Typography>
                                            <Box sx={{ display: "flex", gap: 2 }}>
                                                <TextField
                                                    sx={{ flex: 1 }}
                                                    label="Button Text"
                                                    value={form.data?.cta.secondaryButton.text}
                                                    onChange={(e) =>
                                                        form.setData({
                                                            ...form.data!,
                                                            cta: {
                                                                ...form.data!.cta,
                                                                secondaryButton: {
                                                                    ...form.data!.cta
                                                                        .secondaryButton,
                                                                    text: e.target.value,
                                                                },
                                                            },
                                                        })
                                                    }
                                                    size="small"
                                                />
                                                <TextField
                                                    sx={{ flex: 2 }}
                                                    label="Button URL"
                                                    value={form.data?.cta.secondaryButton.url}
                                                    onChange={(e) =>
                                                        form.setData({
                                                            ...form.data!,
                                                            cta: {
                                                                ...form.data!.cta,
                                                                secondaryButton: {
                                                                    ...form.data!.cta
                                                                        .secondaryButton,
                                                                    url: e.target.value,
                                                                },
                                                            },
                                                        })
                                                    }
                                                    helperText="Internal path or external URL"
                                                    size="small"
                                                />
                                            </Box>
                                        </Box>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Action Buttons at Bottom */}
                            {form.isDirty && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        mt: 3,
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
                                        onClick={form.save}
                                        disabled={!form.isDirty || form.isSaving}
                                        sx={{
                                            px: 4,
                                            fontWeight: 600,
                                            boxShadow: 2,
                                            "&:hover": {
                                                boxShadow: 4,
                                            },
                                        }}
                                    >
                                        {form.isSaving ? "Saving..." : "Save All Changes"}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        startIcon={<RotateCcw size={20} />}
                                        onClick={form.cancel}
                                        disabled={!form.isDirty}
                                        sx={{
                                            px: 4,
                                            fontWeight: 600,
                                            borderWidth: 2,
                                            "&:hover": {
                                                borderWidth: 2,
                                            },
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
                                <Box
                                    sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}
                                >
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
                                        <EyeIcon size={20} />
                                    </Box>
                                    <Box>
                                        <Typography
                                            variant="h6"
                                            sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                        >
                                            Live Preview
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            See your changes in real-time
                                        </Typography>
                                    </Box>
                                </Box>
                                <ServicesPreview
                                    services={form.data || DEFAULT_SERVICES}
                                    sectionTitle={form.data?.title || ""}
                                    sectionSubtitle={form.data?.subtitle || ""}
                                />
                                <Alert
                                    severity="info"
                                    sx={{
                                        mt: 2,
                                        bgcolor: "info.lighter",
                                        border: "1px solid",
                                        borderColor: "info.light",
                                        "& .MuiAlert-icon": {
                                            color: "info.main",
                                        },
                                    }}
                                >
                                    <Typography variant="caption">
                                        This preview updates in real-time as you make changes. The
                                        actual services section may look slightly different based on
                                        screen size.
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
