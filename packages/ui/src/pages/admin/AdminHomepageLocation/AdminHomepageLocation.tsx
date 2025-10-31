import { APP_LINKS, COMPANY_INFO } from "@local/shared";
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
    IconButton,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Grid,
    useTheme,
    FormControlLabel,
    Switch,
    Paper,
    Stack,
    Chip,
    Avatar,
    Divider,
} from "@mui/material";
import {
    Plus,
    Trash2,
    GripVertical,
    Eye,
    Gift,
    Smartphone,
    Car,
    Truck,
    MapPin as MapPinIcon,
    Package,
    Users,
    Map,
    Phone,
    Clock,
    Target,
    Info as InfoIcon,
    Mail,
} from "lucide-react";
import {
    ExpandMore as ExpandMoreIcon,
    TextFields as TextFieldsIcon,
    Settings as SettingsIcon,
    ContactPhone as ContactPhoneIcon,
    AccessTime as AccessTimeIcon,
    TouchApp as ButtonIcon,
} from "@mui/icons-material";
import { BackButton, PageContainer } from "components";
import { ABTestEditingBanner } from "components/admin/ABTestEditingBanner";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLandingPage } from "hooks/useLandingPage";
import { useABTestQueryParams } from "hooks/useABTestQueryParams";
import { useUpdateLandingPageContent } from "api/rest/hooks";
import { useState, useEffect, useMemo, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PubSub } from "utils/pubsub";
import { SnackSeverity } from "components/dialogs/Snack/Snack";

// Available icons for visit info items
const VISIT_INFO_ICONS = [
    { value: "eye", label: "Eye", icon: Eye },
    { value: "gift", label: "Gift", icon: Gift },
    { value: "smartphone", label: "Phone", icon: Smartphone },
    { value: "car", label: "Car", icon: Car },
    { value: "truck", label: "Truck", icon: Truck },
    { value: "map-pin", label: "Map Pin", icon: MapPinIcon },
    { value: "package", label: "Package", icon: Package },
    { value: "users", label: "Users", icon: Users },
];

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    eye: Eye,
    gift: Gift,
    smartphone: Smartphone,
    car: Car,
    truck: Truck,
    "map-pin": MapPinIcon,
    package: Package,
    users: Users,
};

interface LocationVisitInfoItem {
    id: string;
    title: string;
    icon: string;
    description: string;
    displayOrder: number;
    isActive: boolean;
}

interface LocationButton {
    id: string;
    text: string;
    variant: "contained" | "outlined" | "text";
    color: "primary" | "secondary";
    action: "directions" | "contact" | "external";
    url?: string;
    displayOrder: number;
    isActive: boolean;
}

interface LocationData {
    header: {
        title: string;
        subtitle: string;
        chip: string;
    };
    map: {
        style: "gradient" | "embedded";
        showGetDirectionsButton: boolean;
        buttonText: string;
    };
    contactMethods: {
        sectionTitle: string;
        order: ("phone" | "address" | "email")[];
        descriptions: {
            phone: string;
            address: string;
            email: string;
        };
    };
    businessHours: {
        title: string;
        chip: string;
    };
    visitInfo: {
        sectionTitle: string;
        items: LocationVisitInfoItem[];
    };
    cta: {
        title: string;
        description: string;
        buttons: LocationButton[];
    };
}

// Helper function to replace tokens
const replaceTokens = (text: string, foundedYear: number): string => {
    return text.replace(/{foundedYear}/g, String(foundedYear));
};

// Default data
const getDefaultLocationData = (): LocationData => ({
    header: {
        title: "Visit Our Nursery",
        subtitle: "Southern New Jersey's premier wholesale nursery since {foundedYear}",
        chip: "Wholesale Only - Trade Customers Welcome",
    },
    map: {
        style: "gradient",
        showGetDirectionsButton: true,
        buttonText: "Get Directions",
    },
    contactMethods: {
        sectionTitle: "Get in Touch",
        order: ["phone", "address", "email"],
        descriptions: {
            phone: "Call for availability and wholesale pricing",
            address: "Visit our 70+ acre wholesale nursery facility",
            email: "Email us for quotes and availability lists",
        },
    },
    businessHours: {
        title: "Business Hours",
        chip: "Wholesale Hours - Trade Only",
    },
    visitInfo: {
        sectionTitle: "Plan Your Visit",
        items: [
            {
                id: crypto.randomUUID(),
                title: "What to Expect",
                icon: "eye",
                description:
                    "Browse over 70 acres of top-quality trees and shrubs, carefully grown for landscape professionals",
                displayOrder: 0,
                isActive: true,
            },
            {
                id: crypto.randomUUID(),
                title: "Wholesale Focus",
                icon: "gift",
                description:
                    "Specializing in 3 to 25-gallon container plants for landscapers, contractors, and garden centers",
                displayOrder: 1,
                isActive: true,
            },
            {
                id: crypto.randomUUID(),
                title: "Professional Service",
                icon: "smartphone",
                description:
                    "Expert horticultural advice from our experienced team with over 40 years in the industry",
                displayOrder: 2,
                isActive: true,
            },
            {
                id: crypto.randomUUID(),
                title: "Easy Access",
                icon: "car",
                description:
                    "Convenient location in Bridgeton with ample parking and loading facilities for commercial vehicles",
                displayOrder: 3,
                isActive: true,
            },
        ],
    },
    cta: {
        title: "Ready to Visit?",
        description:
            "Wholesale customers welcome! Visit during business hours or call ahead for availability and pricing.",
        buttons: [
            {
                id: crypto.randomUUID(),
                text: "Get Directions",
                variant: "contained",
                color: "primary",
                action: "directions",
                displayOrder: 0,
                isActive: true,
            },
            {
                id: crypto.randomUUID(),
                text: "Contact Us First",
                variant: "outlined",
                color: "primary",
                action: "contact",
                displayOrder: 1,
                isActive: true,
            },
        ],
    },
});

// Live Preview Component - Matches the actual homepage styling
const LocationPreview = ({
    locationData,
    foundedYear,
}: {
    locationData: LocationData;
    foundedYear: number;
}) => {
    const { palette } = useTheme();

    const activeVisitInfoItems = locationData.visitInfo.items
        .filter((item) => item.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder);

    const activeButtons = locationData.cta.buttons
        .filter((btn) => btn.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder);

    // Mock business hours for preview (same as homepage fallback)
    const mockHours = [
        { day: "Monday - Friday", time: "8:00 AM - 3:00 PM" },
        { day: "Saturday", time: "Closed" },
        { day: "Sunday", time: "Closed" },
        { day: "Note", time: "Closed daily 12:00 PM - 1:00 PM" },
    ];

    return (
        <Box
            sx={{
                width: "100%",
                maxHeight: "calc(100vh - 120px)",
                overflow: "auto",
                borderRadius: 2,
                border: "2px solid",
                borderColor: "divider",
                bgcolor: "background.default",
                py: { xs: 3, md: 5 },
                px: 2,
            }}
        >
            {/* Header - Matches homepage */}
            <Box sx={{ textAlign: "center", mb: 3 }}>
                <Typography
                    variant="h4"
                    component="h2"
                    sx={{
                        fontWeight: 700,
                        color: palette.primary.main,
                        mb: 1,
                        fontSize: { xs: "1.5rem", md: "2rem" },
                    }}
                >
                    {locationData.header.title}
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        color: palette.text.secondary,
                        maxWidth: "400px",
                        mx: "auto",
                        mb: 2,
                        fontSize: "0.95rem",
                    }}
                >
                    {replaceTokens(locationData.header.subtitle, foundedYear)}
                </Typography>
                <Chip
                    label={locationData.header.chip}
                    color="primary"
                    sx={{ fontSize: "0.8rem", py: 1.5, px: 0.5 }}
                />
            </Box>

            <Grid container spacing={3}>
                {/* Left Column - Map & Contact Methods */}
                <Grid item xs={12} md={6}>
                    {/* Map Card - Matches homepage */}
                    <Card
                        sx={{
                            borderRadius: 3,
                            overflow: "hidden",
                            boxShadow: 4,
                            mb: 3,
                        }}
                    >
                        <Box
                            sx={{
                                height: "200px",
                                background: `linear-gradient(135deg, ${palette.primary.light} 0%, ${palette.secondary.light} 100%)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                position: "relative",
                            }}
                        >
                            <Box sx={{ textAlign: "center" }}>
                                <Box
                                    sx={{
                                        mb: 1.5,
                                        display: "flex",
                                        justifyContent: "center",
                                        color: "white",
                                    }}
                                >
                                    <Map size={48} />
                                </Box>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, fontSize: "1rem" }}>
                                    New Life Nursery Inc.
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: "0.85rem" }}>
                                    106 S Woodruff Rd, Bridgeton, NJ
                                </Typography>
                            </Box>

                            {locationData.map.showGetDirectionsButton && (
                                <Box
                                    sx={{
                                        position: "absolute",
                                        bottom: 12,
                                        right: 12,
                                    }}
                                >
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        size="small"
                                        sx={{
                                            borderRadius: 2,
                                            textTransform: "none",
                                            fontWeight: 600,
                                            fontSize: "0.8rem",
                                            pointerEvents: "none",
                                        }}
                                    >
                                        {locationData.map.buttonText}
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    </Card>

                    {/* Contact Methods - Matches homepage */}
                    <Box>
                        <Typography
                            variant="h6"
                            sx={{ fontWeight: 600, mb: 2, color: palette.primary.main, fontSize: "1rem" }}
                        >
                            {locationData.contactMethods.sectionTitle}
                        </Typography>
                        {locationData.contactMethods.order.map((method, index) => {
                            const icons = { phone: Phone, address: MapPinIcon, email: Mail };
                            const IconComponent = icons[method];
                            const values = {
                                phone: "(856) 455-3601",
                                address: "106 S Woodruff Rd, Bridgeton, NJ 08302",
                                email: "info@newlifenurseryinc.com",
                            };
                            return (
                                <Card
                                    key={index}
                                    sx={{
                                        mb: 2,
                                        borderRadius: 2,
                                        transition: "all 0.3s ease-in-out",
                                        cursor: "default",
                                    }}
                                >
                                    <CardContent sx={{ p: 2 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: palette.primary.main,
                                                }}
                                            >
                                                <IconComponent size={20} />
                                            </Box>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
                                                    {method.charAt(0).toUpperCase() + method.slice(1)}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: palette.primary.main,
                                                        fontWeight: 600,
                                                        mb: 0.5,
                                                        fontSize: "0.85rem",
                                                    }}
                                                >
                                                    {values[method]}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: palette.text.secondary, fontSize: "0.75rem" }}
                                                >
                                                    {locationData.contactMethods.descriptions[method]}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>
                </Grid>

                {/* Right Column - Business Hours & Visit Info */}
                <Grid item xs={12} md={6}>
                    {/* Business Hours Card - Matches homepage */}
                    <Card
                        sx={{
                            borderRadius: 3,
                            boxShadow: 4,
                            mb: 3,
                            background: `linear-gradient(135deg, ${palette.secondary.main} 0%, ${palette.primary.main} 100%)`,
                            color: "white",
                        }}
                    >
                        <CardContent sx={{ p: 3 }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 1,
                                    mb: 2,
                                }}
                            >
                                <Clock size={20} color="white" />
                                <Typography variant="h6" sx={{ fontWeight: 600, textAlign: "center", fontSize: "1.1rem" }}>
                                    {locationData.businessHours.title}
                                </Typography>
                            </Box>
                            {mockHours.map((schedule, index) => (
                                <Box key={index}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            py: 1,
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.85rem" }}>
                                            {schedule.day}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
                                            {schedule.time}
                                        </Typography>
                                    </Box>
                                    {index < mockHours.length - 1 && (
                                        <Divider sx={{ backgroundColor: "rgba(255, 255, 255, 0.3)" }} />
                                    )}
                                </Box>
                            ))}
                            <Box sx={{ textAlign: "center", mt: 2 }}>
                                <Chip
                                    label={locationData.businessHours.chip}
                                    sx={{
                                        backgroundColor: "rgba(255, 255, 255, 0.2)",
                                        color: "white",
                                        fontWeight: 600,
                                        fontSize: "0.7rem",
                                    }}
                                    size="small"
                                />
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Visit Information Cards - Matches homepage */}
                    {activeVisitInfoItems.length > 0 && (
                        <Box>
                            <Typography
                                variant="h6"
                                sx={{ fontWeight: 600, mb: 2, color: palette.primary.main, fontSize: "1rem" }}
                            >
                                {locationData.visitInfo.sectionTitle}
                            </Typography>
                            <Grid container spacing={2}>
                                {activeVisitInfoItems.map((item) => {
                                    const IconComponent = ICON_MAP[item.icon] || Eye;
                                    return (
                                        <Grid item xs={12} sm={6} key={item.id}>
                                            <Card
                                                sx={{
                                                    height: "100%",
                                                    borderRadius: 2,
                                                    transition: "all 0.3s ease-in-out",
                                                }}
                                            >
                                                <CardContent sx={{ p: 2.5, textAlign: "center" }}>
                                                    <Box
                                                        sx={{
                                                            mb: 1,
                                                            display: "flex",
                                                            justifyContent: "center",
                                                            color: palette.primary.main,
                                                        }}
                                                    >
                                                        <IconComponent size={28} />
                                                    </Box>
                                                    <Typography
                                                        variant="subtitle1"
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: palette.primary.main,
                                                            mb: 1,
                                                            fontSize: "0.9rem",
                                                        }}
                                                    >
                                                        {item.title}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: palette.text.secondary,
                                                            lineHeight: 1.5,
                                                            fontSize: "0.8rem",
                                                        }}
                                                    >
                                                        {item.description}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Box>
                    )}
                </Grid>
            </Grid>

            {/* CTA Section - Matches homepage */}
            <Box
                sx={{
                    mt: 3,
                    p: 3,
                    backgroundColor: palette.grey[50],
                    borderRadius: 3,
                    textAlign: "center",
                    border: `2px solid ${palette.primary.light}`,
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, color: palette.primary.main, fontSize: "1.1rem" }}>
                    {locationData.cta.title}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: palette.text.secondary, fontSize: "0.85rem" }}>
                    {locationData.cta.description}
                </Typography>
                <Box
                    sx={{
                        display: "flex",
                        gap: 1.5,
                        justifyContent: "center",
                        flexWrap: "wrap",
                    }}
                >
                    {activeButtons.map((button) => (
                        <Button
                            key={button.id}
                            variant={button.variant}
                            color={button.color}
                            size="medium"
                            sx={{
                                px: 3,
                                py: 1,
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                                fontSize: "0.85rem",
                                pointerEvents: "none",
                            }}
                        >
                            {button.text}
                        </Button>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export const AdminHomepageLocation = () => {
    const { palette } = useTheme();
    const { data, loading, refetch } = useLandingPage();
    const { variantId, isEditingVariant } = useABTestQueryParams();
    const updateContentMutation = useUpdateLandingPageContent();

    const foundedYear = data?.content?.company?.foundedYear || COMPANY_INFO.FoundedYear;

    const [locationData, setLocationData] = useState<LocationData>(getDefaultLocationData());
    const [originalLocationData, setOriginalLocationData] = useState<LocationData>(getDefaultLocationData());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (data?.content?.location) {
            setLocationData(data.content.location);
            setOriginalLocationData(JSON.parse(JSON.stringify(data.content.location)));
        } else {
            const defaultData = getDefaultLocationData();
            setLocationData(defaultData);
            setOriginalLocationData(JSON.parse(JSON.stringify(defaultData)));
        }
    }, [data]);

    // Check for changes using useMemo
    const hasChanges = useMemo(() => {
        return JSON.stringify(locationData) !== JSON.stringify(originalLocationData);
    }, [locationData, originalLocationData]);

    const handleApiError = useCallback((error: any, defaultMessage: string) => {
        const message = error?.message || defaultMessage;
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Error });
    }, []);

    const handleApiSuccess = useCallback((message: string) => {
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Success });
    }, []);

    const handleSave = useCallback(async () => {
        try {
            setIsSaving(true);

            await updateContentMutation.mutate({
                data: { location: locationData },
                queryParams: variantId ? { variantId } : undefined,
            });

            await refetch();
            handleApiSuccess("Location settings saved successfully!");
            setOriginalLocationData(JSON.parse(JSON.stringify(locationData)));
        } catch (error: any) {
            handleApiError(error, "Failed to save location settings");
        } finally {
            setIsSaving(false);
        }
    }, [locationData, variantId, refetch, handleApiSuccess, handleApiError, updateContentMutation]);

    const handleReset = useCallback(() => {
        setLocationData(JSON.parse(JSON.stringify(originalLocationData)));
    }, [originalLocationData]);

    // Handlers for visit info items
    const handleAddVisitInfoItem = useCallback(() => {
        const newItem: LocationVisitInfoItem = {
            id: crypto.randomUUID(),
            title: "New Item",
            icon: "eye",
            description: "Description here",
            displayOrder: locationData.visitInfo.items.length,
            isActive: true,
        };
        setLocationData({
            ...locationData,
            visitInfo: {
                ...locationData.visitInfo,
                items: [...locationData.visitInfo.items, newItem],
            },
        });
    }, [locationData]);

    const handleDeleteVisitInfoItem = useCallback(
        (id: string) => {
            const updatedItems = locationData.visitInfo.items.filter((item) => item.id !== id);
            const reorderedItems = updatedItems.map((item, index) => ({
                ...item,
                displayOrder: index,
            }));
            setLocationData({
                ...locationData,
                visitInfo: {
                    ...locationData.visitInfo,
                    items: reorderedItems,
                },
            });
        },
        [locationData]
    );

    const handleVisitInfoDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination) return;

            const items = Array.from(locationData.visitInfo.items);
            const [removed] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, removed);

            const reorderedItems = items.map((item, index) => ({
                ...item,
                displayOrder: index,
            }));

            setLocationData({
                ...locationData,
                visitInfo: {
                    ...locationData.visitInfo,
                    items: reorderedItems,
                },
            });
        },
        [locationData]
    );

    // Handlers for CTA buttons
    const handleAddButton = useCallback(() => {
        const newButton: LocationButton = {
            id: crypto.randomUUID(),
            text: "New Button",
            variant: "contained",
            color: "primary",
            action: "directions",
            displayOrder: locationData.cta.buttons.length,
            isActive: true,
        };
        setLocationData({
            ...locationData,
            cta: {
                ...locationData.cta,
                buttons: [...locationData.cta.buttons, newButton],
            },
        });
    }, [locationData]);

    const handleDeleteButton = useCallback(
        (id: string) => {
            const updatedButtons = locationData.cta.buttons.filter((btn) => btn.id !== id);
            const reorderedButtons = updatedButtons.map((btn, index) => ({
                ...btn,
                displayOrder: index,
            }));
            setLocationData({
                ...locationData,
                cta: {
                    ...locationData.cta,
                    buttons: reorderedButtons,
                },
            });
        },
        [locationData]
    );

    const handleButtonDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination) return;

            const buttons = Array.from(locationData.cta.buttons);
            const [removed] = buttons.splice(result.source.index, 1);
            buttons.splice(result.destination.index, 0, removed);

            const reorderedButtons = buttons.map((btn, index) => ({
                ...btn,
                displayOrder: index,
            }));

            setLocationData({
                ...locationData,
                cta: {
                    ...locationData.cta,
                    buttons: reorderedButtons,
                },
            });
        },
        [locationData]
    );

    // Handler for contact methods ordering
    const handleContactMethodDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination) return;

            const order = Array.from(locationData.contactMethods.order);
            const [removed] = order.splice(result.source.index, 1);
            order.splice(result.destination.index, 0, removed);

            setLocationData({
                ...locationData,
                contactMethods: {
                    ...locationData.contactMethods,
                    order: order as ("phone" | "address" | "email")[],
                },
            });
        },
        [locationData]
    );

    const sortedVisitInfoItems = useMemo(
        () => [...locationData.visitInfo.items].sort((a, b) => a.displayOrder - b.displayOrder),
        [locationData.visitInfo.items]
    );

    const sortedButtons = useMemo(
        () => [...locationData.cta.buttons].sort((a, b) => a.displayOrder - b.displayOrder),
        [locationData.cta.buttons]
    );

    const contactMethodLabels: Record<string, string> = {
        phone: "Phone",
        address: "Address",
        email: "Email",
    };

    if (loading) {
        return (
            <PageContainer variant="wide" sx={{ minHeight: "100vh", paddingBottom: 0 }}>
                <TopBar
                    display="page"
                    title="Location & Visit Section"
                    startComponent={
                        <BackButton to={APP_LINKS.AdminHomepage} ariaLabel="Back to Homepage Management" />
                    }
                />
                <Box p={2}>
                    <Typography>Loading...</Typography>
                </Box>
            </PageContainer>
        );
    }

    return (
        <PageContainer variant="wide" sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="Location & Visit Section Settings"
                help="Configure all aspects of your location and visit section"
                startComponent={<BackButton to={APP_LINKS.AdminHomepage} ariaLabel="Back to Homepage Management" />}
            />

            <Box p={2}>
                <ABTestEditingBanner />

                {/* Unsaved changes warning */}
                {hasChanges && (
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
                            onClick={handleSave}
                            disabled={isSaving}
                            sx={{
                                px: 4,
                                fontWeight: 600,
                                boxShadow: 2,
                                "&:hover": {
                                    boxShadow: 4,
                                },
                            }}
                        >
                            {isSaving ? "Saving..." : "Save All Changes"}
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            onClick={handleReset}
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

                {/* Template Token Helper */}
                <Alert
                    severity="info"
                    sx={{
                        mb: 3,
                        bgcolor: "info.lighter",
                        border: "1px solid",
                        borderColor: "info.light",
                    }}
                >
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Template Tokens:</strong> Use <code>{"{foundedYear}"}</code> to automatically insert{" "}
                        {foundedYear}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Note:</strong> Phone, address, email values and hours are managed in the Branding &
                        Theme section.
                    </Typography>
                </Alert>

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
                                            <MapPinIcon size={20} />
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
                                    <LocationPreview locationData={locationData} foundedYear={foundedYear} />
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

                            {/* Accordion 1: Header Settings */}
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
                                            <TextFieldsIcon />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                Header Settings
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Configure section title, subtitle, and badge
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        <TextField
                                            fullWidth
                                            label="Title"
                                            value={locationData.header.title}
                                            onChange={(e) => {
                                                setLocationData({
                                                    ...locationData,
                                                    header: { ...locationData.header, title: e.target.value },
                                                });
                                            }}
                                            variant="outlined"
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="Subtitle"
                                            value={locationData.header.subtitle}
                                            onChange={(e) => {
                                                setLocationData({
                                                    ...locationData,
                                                    header: { ...locationData.header, subtitle: e.target.value },
                                                });
                                            }}
                                            helperText={`Preview: ${replaceTokens(locationData.header.subtitle, foundedYear)}`}
                                            variant="outlined"
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="Chip Text"
                                            value={locationData.header.chip}
                                            onChange={(e) => {
                                                setLocationData({
                                                    ...locationData,
                                                    header: { ...locationData.header, chip: e.target.value },
                                                });
                                            }}
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

                            {/* Accordion 2: Map Settings */}
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
                                                bgcolor: "secondary.main",
                                                color: "white",
                                            }}
                                        >
                                            <Map size={20} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                Map Settings
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Configure map display and directions button
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        <FormControl fullWidth>
                                            <InputLabel>Map Style</InputLabel>
                                            <Select
                                                value={locationData.map.style}
                                                label="Map Style"
                                                onChange={(e) => {
                                                    setLocationData({
                                                        ...locationData,
                                                        map: {
                                                            ...locationData.map,
                                                            style: e.target.value as "gradient" | "embedded",
                                                        },
                                                    });
                                                }}
                                                sx={{
                                                    bgcolor: "background.paper",
                                                }}
                                            >
                                                <MenuItem value="gradient">Gradient Placeholder</MenuItem>
                                                <MenuItem value="embedded">Embedded Map (Future)</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                bgcolor: "grey.50",
                                                border: "1px solid",
                                                borderColor: "divider",
                                                borderRadius: 1,
                                            }}
                                        >
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={locationData.map.showGetDirectionsButton}
                                                        onChange={(e) => {
                                                            setLocationData({
                                                                ...locationData,
                                                                map: {
                                                                    ...locationData.map,
                                                                    showGetDirectionsButton: e.target.checked,
                                                                },
                                                            });
                                                        }}
                                                    />
                                                }
                                                label={
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        Show Get Directions Button
                                                    </Typography>
                                                }
                                            />
                                        </Paper>
                                        <TextField
                                            fullWidth
                                            label="Button Text"
                                            value={locationData.map.buttonText}
                                            onChange={(e) => {
                                                setLocationData({
                                                    ...locationData,
                                                    map: { ...locationData.map, buttonText: e.target.value },
                                                });
                                            }}
                                            disabled={!locationData.map.showGetDirectionsButton}
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 3: Contact Methods */}
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
                                            <ContactPhoneIcon />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                Contact Methods
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Configure contact information display order
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        <TextField
                                            fullWidth
                                            label="Section Title"
                                            value={locationData.contactMethods.sectionTitle}
                                            onChange={(e) => {
                                                setLocationData({
                                                    ...locationData,
                                                    contactMethods: {
                                                        ...locationData.contactMethods,
                                                        sectionTitle: e.target.value,
                                                    },
                                                });
                                            }}
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <Box>
                                            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                                                Order (drag to reorder):
                                            </Typography>
                                            <DragDropContext onDragEnd={handleContactMethodDragEnd}>
                                                <Droppable droppableId="contact-methods">
                                                    {(provided) => (
                                                        <Box {...provided.droppableProps} ref={provided.innerRef}>
                                                            {locationData.contactMethods.order.map((method, index) => (
                                                                <Draggable key={method} draggableId={method} index={index}>
                                                                    {(provided, snapshot) => (
                                                                        <Paper
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            elevation={0}
                                                                            sx={{
                                                                                mb: 1,
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                gap: 2,
                                                                                p: 1.5,
                                                                                border: "2px solid",
                                                                                borderColor: snapshot.isDragging
                                                                                    ? "primary.main"
                                                                                    : "divider",
                                                                                borderRadius: 2,
                                                                                bgcolor: "background.paper",
                                                                                transition: "all 0.2s",
                                                                                "&:hover": {
                                                                                    borderColor: "primary.light",
                                                                                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                                                                },
                                                                            }}
                                                                        >
                                                                            <Box {...provided.dragHandleProps}>
                                                                                <GripVertical
                                                                                    size={20}
                                                                                    color={palette.text.secondary}
                                                                                />
                                                                            </Box>
                                                                            <Typography sx={{ fontWeight: 600, minWidth: 80 }}>
                                                                                {contactMethodLabels[method]}
                                                                            </Typography>
                                                                        </Paper>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </Box>
                                                    )}
                                                </Droppable>
                                            </DragDropContext>
                                        </Box>
                                        <TextField
                                            fullWidth
                                            label="Phone Description"
                                            value={locationData.contactMethods.descriptions.phone}
                                            onChange={(e) => {
                                                setLocationData({
                                                    ...locationData,
                                                    contactMethods: {
                                                        ...locationData.contactMethods,
                                                        descriptions: {
                                                            ...locationData.contactMethods.descriptions,
                                                            phone: e.target.value,
                                                        },
                                                    },
                                                });
                                            }}
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="Address Description"
                                            value={locationData.contactMethods.descriptions.address}
                                            onChange={(e) => {
                                                setLocationData({
                                                    ...locationData,
                                                    contactMethods: {
                                                        ...locationData.contactMethods,
                                                        descriptions: {
                                                            ...locationData.contactMethods.descriptions,
                                                            address: e.target.value,
                                                        },
                                                    },
                                                });
                                            }}
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="Email Description"
                                            value={locationData.contactMethods.descriptions.email}
                                            onChange={(e) => {
                                                setLocationData({
                                                    ...locationData,
                                                    contactMethods: {
                                                        ...locationData.contactMethods,
                                                        descriptions: {
                                                            ...locationData.contactMethods.descriptions,
                                                            email: e.target.value,
                                                        },
                                                    },
                                                });
                                            }}
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 4: Business Hours Labels */}
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
                                                bgcolor: "info.main",
                                                color: "white",
                                            }}
                                        >
                                            <AccessTimeIcon />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                Business Hours Labels
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Configure section title and badge (hours managed in Branding)
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        <TextField
                                            fullWidth
                                            label="Title"
                                            value={locationData.businessHours.title}
                                            onChange={(e) => {
                                                setLocationData({
                                                    ...locationData,
                                                    businessHours: { ...locationData.businessHours, title: e.target.value },
                                                });
                                            }}
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="Chip Text"
                                            value={locationData.businessHours.chip}
                                            onChange={(e) => {
                                                setLocationData({
                                                    ...locationData,
                                                    businessHours: { ...locationData.businessHours, chip: e.target.value },
                                                });
                                            }}
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 5: Visit Information Cards */}
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
                                                bgcolor: "warning.main",
                                                color: "white",
                                            }}
                                        >
                                            <InfoIcon size={20} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                Visit Information Cards
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Add info cards about visiting your location (
                                                {locationData.visitInfo.items.length} items,{" "}
                                                {locationData.visitInfo.items.filter((i) => i.isActive).length} active)
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        <TextField
                                            fullWidth
                                            label="Section Title"
                                            value={locationData.visitInfo.sectionTitle}
                                            onChange={(e) => {
                                                setLocationData({
                                                    ...locationData,
                                                    visitInfo: {
                                                        ...locationData.visitInfo,
                                                        sectionTitle: e.target.value,
                                                    },
                                                });
                                            }}
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <Box>
                                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                    Items (drag to reorder):
                                                </Typography>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<Plus size={16} />}
                                                    onClick={handleAddVisitInfoItem}
                                                    sx={{
                                                        borderStyle: "dashed",
                                                        borderWidth: 2,
                                                        "&:hover": {
                                                            borderWidth: 2,
                                                        },
                                                    }}
                                                >
                                                    Add Item
                                                </Button>
                                            </Box>
                                            <DragDropContext onDragEnd={handleVisitInfoDragEnd}>
                                                <Droppable droppableId="visit-info-items">
                                                    {(provided) => (
                                                        <Box {...provided.droppableProps} ref={provided.innerRef}>
                                                            {sortedVisitInfoItems.map((item, index) => (
                                                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                                                    {(provided, snapshot) => (
                                                                        <Paper
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            elevation={0}
                                                                            sx={{
                                                                                mb: 2,
                                                                                p: 2.5,
                                                                                border: "2px solid",
                                                                                borderColor: snapshot.isDragging
                                                                                    ? "primary.main"
                                                                                    : item.isActive
                                                                                    ? "success.light"
                                                                                    : "divider",
                                                                                borderRadius: 2,
                                                                                transition: "all 0.2s",
                                                                                opacity: snapshot.isDragging ? 0.7 : 1,
                                                                                boxShadow: snapshot.isDragging
                                                                                    ? "0 8px 16px rgba(0,0,0,0.15)"
                                                                                    : "0 1px 3px rgba(0,0,0,0.05)",
                                                                                "&:hover": {
                                                                                    borderColor: item.isActive
                                                                                        ? "success.main"
                                                                                        : "primary.light",
                                                                                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                                                                },
                                                                            }}
                                                                        >
                                                                            <Box sx={{ display: "flex", gap: 2 }}>
                                                                                <Box {...provided.dragHandleProps}>
                                                                                    <GripVertical
                                                                                        size={20}
                                                                                        color={palette.text.secondary}
                                                                                    />
                                                                                </Box>
                                                                                <Box sx={{ flex: 1 }}>
                                                                                    <Grid container spacing={2}>
                                                                                        <Grid item xs={12} sm={6}>
                                                                                            <TextField
                                                                                                fullWidth
                                                                                                label="Title"
                                                                                                value={item.title}
                                                                                                onChange={(e) => {
                                                                                                    const updated =
                                                                                                        locationData.visitInfo.items.map(
                                                                                                            (i) =>
                                                                                                                i.id === item.id
                                                                                                                    ? {
                                                                                                                          ...i,
                                                                                                                          title: e
                                                                                                                              .target
                                                                                                                              .value,
                                                                                                                      }
                                                                                                                    : i
                                                                                                        );
                                                                                                    setLocationData({
                                                                                                        ...locationData,
                                                                                                        visitInfo: {
                                                                                                            ...locationData.visitInfo,
                                                                                                            items: updated,
                                                                                                        },
                                                                                                    });
                                                                                                }}
                                                                                                size="small"
                                                                                                sx={{
                                                                                                    "& .MuiOutlinedInput-root": {
                                                                                                        bgcolor:
                                                                                                            "background.paper",
                                                                                                    },
                                                                                                }}
                                                                                            />
                                                                                        </Grid>
                                                                                        <Grid item xs={12} sm={6}>
                                                                                            <FormControl fullWidth size="small">
                                                                                                <InputLabel>Icon</InputLabel>
                                                                                                <Select
                                                                                                    value={item.icon}
                                                                                                    label="Icon"
                                                                                                    onChange={(e) => {
                                                                                                        const updated =
                                                                                                            locationData.visitInfo.items.map(
                                                                                                                (i) =>
                                                                                                                    i.id === item.id
                                                                                                                        ? {
                                                                                                                              ...i,
                                                                                                                              icon: e
                                                                                                                                  .target
                                                                                                                                  .value,
                                                                                                                          }
                                                                                                                        : i
                                                                                                            );
                                                                                                        setLocationData({
                                                                                                            ...locationData,
                                                                                                            visitInfo: {
                                                                                                                ...locationData.visitInfo,
                                                                                                                items: updated,
                                                                                                            },
                                                                                                        });
                                                                                                    }}
                                                                                                    sx={{
                                                                                                        bgcolor: "background.paper",
                                                                                                    }}
                                                                                                >
                                                                                                    {VISIT_INFO_ICONS.map((icon) => {
                                                                                                        const IconComp = icon.icon;
                                                                                                        return (
                                                                                                            <MenuItem
                                                                                                                key={icon.value}
                                                                                                                value={icon.value}
                                                                                                            >
                                                                                                                <Box
                                                                                                                    sx={{
                                                                                                                        display: "flex",
                                                                                                                        alignItems:
                                                                                                                            "center",
                                                                                                                        gap: 1,
                                                                                                                    }}
                                                                                                                >
                                                                                                                    <IconComp size={16} />
                                                                                                                    <Typography>
                                                                                                                        {icon.label}
                                                                                                                    </Typography>
                                                                                                                </Box>
                                                                                                            </MenuItem>
                                                                                                        );
                                                                                                    })}
                                                                                                </Select>
                                                                                            </FormControl>
                                                                                        </Grid>
                                                                                        <Grid item xs={12}>
                                                                                            <TextField
                                                                                                fullWidth
                                                                                                multiline
                                                                                                rows={2}
                                                                                                label="Description"
                                                                                                value={item.description}
                                                                                                onChange={(e) => {
                                                                                                    const updated =
                                                                                                        locationData.visitInfo.items.map(
                                                                                                            (i) =>
                                                                                                                i.id === item.id
                                                                                                                    ? {
                                                                                                                          ...i,
                                                                                                                          description:
                                                                                                                              e.target
                                                                                                                                  .value,
                                                                                                                      }
                                                                                                                    : i
                                                                                                        );
                                                                                                    setLocationData({
                                                                                                        ...locationData,
                                                                                                        visitInfo: {
                                                                                                            ...locationData.visitInfo,
                                                                                                            items: updated,
                                                                                                        },
                                                                                                    });
                                                                                                }}
                                                                                                size="small"
                                                                                                sx={{
                                                                                                    "& .MuiOutlinedInput-root": {
                                                                                                        bgcolor:
                                                                                                            "background.paper",
                                                                                                    },
                                                                                                }}
                                                                                            />
                                                                                        </Grid>
                                                                                        <Grid item xs={12}>
                                                                                            <FormControlLabel
                                                                                                control={
                                                                                                    <Switch
                                                                                                        checked={item.isActive}
                                                                                                        onChange={(e) => {
                                                                                                            const updated =
                                                                                                                locationData.visitInfo.items.map(
                                                                                                                    (i) =>
                                                                                                                        i.id ===
                                                                                                                        item.id
                                                                                                                            ? {
                                                                                                                                  ...i,
                                                                                                                                  isActive:
                                                                                                                                      e
                                                                                                                                          .target
                                                                                                                                          .checked,
                                                                                                                              }
                                                                                                                            : i
                                                                                                                );
                                                                                                            setLocationData({
                                                                                                                ...locationData,
                                                                                                                visitInfo: {
                                                                                                                    ...locationData.visitInfo,
                                                                                                                    items: updated,
                                                                                                                },
                                                                                                            });
                                                                                                        }}
                                                                                                        color="success"
                                                                                                    />
                                                                                                }
                                                                                                label={
                                                                                                    <Typography
                                                                                                        variant="body2"
                                                                                                        sx={{ fontWeight: 500 }}
                                                                                                    >
                                                                                                        Active
                                                                                                    </Typography>
                                                                                                }
                                                                                            />
                                                                                        </Grid>
                                                                                    </Grid>
                                                                                </Box>
                                                                                <IconButton
                                                                                    size="small"
                                                                                    color="error"
                                                                                    onClick={() => handleDeleteVisitInfoItem(item.id)}
                                                                                    sx={{
                                                                                        "&:hover": {
                                                                                            bgcolor: "error.lighter",
                                                                                        },
                                                                                    }}
                                                                                >
                                                                                    <Trash2 size={20} />
                                                                                </IconButton>
                                                                            </Box>
                                                                        </Paper>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </Box>
                                                    )}
                                                </Droppable>
                                            </DragDropContext>
                                        </Box>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 6: Call-to-Action Section */}
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
                                                bgcolor: "error.main",
                                                color: "white",
                                            }}
                                        >
                                            <ButtonIcon />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                Call-to-Action Section
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Add action buttons to drive user engagement (
                                                {locationData.cta.buttons.length} buttons,{" "}
                                                {locationData.cta.buttons.filter((b) => b.isActive).length} active)
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        <TextField
                                            fullWidth
                                            label="CTA Title"
                                            value={locationData.cta.title}
                                            onChange={(e) => {
                                                setLocationData({
                                                    ...locationData,
                                                    cta: { ...locationData.cta, title: e.target.value },
                                                });
                                            }}
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={2}
                                            label="CTA Description"
                                            value={locationData.cta.description}
                                            onChange={(e) => {
                                                setLocationData({
                                                    ...locationData,
                                                    cta: { ...locationData.cta, description: e.target.value },
                                                });
                                            }}
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <Box>
                                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                    Buttons (drag to reorder):
                                                </Typography>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={<Plus size={16} />}
                                                    onClick={handleAddButton}
                                                    sx={{
                                                        borderStyle: "dashed",
                                                        borderWidth: 2,
                                                        "&:hover": {
                                                            borderWidth: 2,
                                                        },
                                                    }}
                                                >
                                                    Add Button
                                                </Button>
                                            </Box>
                                            <DragDropContext onDragEnd={handleButtonDragEnd}>
                                                <Droppable droppableId="cta-buttons">
                                                    {(provided) => (
                                                        <Box {...provided.droppableProps} ref={provided.innerRef}>
                                                            {sortedButtons.map((button, index) => (
                                                                <Draggable key={button.id} draggableId={button.id} index={index}>
                                                                    {(provided, snapshot) => (
                                                                        <Paper
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            elevation={0}
                                                                            sx={{
                                                                                mb: 2,
                                                                                p: 2.5,
                                                                                border: "2px solid",
                                                                                borderColor: snapshot.isDragging
                                                                                    ? "primary.main"
                                                                                    : button.isActive
                                                                                    ? "success.light"
                                                                                    : "divider",
                                                                                borderRadius: 2,
                                                                                transition: "all 0.2s",
                                                                                opacity: snapshot.isDragging ? 0.7 : 1,
                                                                                boxShadow: snapshot.isDragging
                                                                                    ? "0 8px 16px rgba(0,0,0,0.15)"
                                                                                    : "0 1px 3px rgba(0,0,0,0.05)",
                                                                                "&:hover": {
                                                                                    borderColor: button.isActive
                                                                                        ? "success.main"
                                                                                        : "primary.light",
                                                                                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                                                                },
                                                                            }}
                                                                        >
                                                                            <Box sx={{ display: "flex", gap: 2 }}>
                                                                                <Box {...provided.dragHandleProps}>
                                                                                    <GripVertical
                                                                                        size={20}
                                                                                        color={palette.text.secondary}
                                                                                    />
                                                                                </Box>
                                                                                <Box sx={{ flex: 1 }}>
                                                                                    <Grid container spacing={2}>
                                                                                        <Grid item xs={12} sm={6}>
                                                                                            <TextField
                                                                                                fullWidth
                                                                                                label="Button Text"
                                                                                                value={button.text}
                                                                                                onChange={(e) => {
                                                                                                    const updated =
                                                                                                        locationData.cta.buttons.map(
                                                                                                            (b) =>
                                                                                                                b.id === button.id
                                                                                                                    ? {
                                                                                                                          ...b,
                                                                                                                          text: e
                                                                                                                              .target
                                                                                                                              .value,
                                                                                                                      }
                                                                                                                    : b
                                                                                                        );
                                                                                                    setLocationData({
                                                                                                        ...locationData,
                                                                                                        cta: {
                                                                                                            ...locationData.cta,
                                                                                                            buttons: updated,
                                                                                                        },
                                                                                                    });
                                                                                                }}
                                                                                                size="small"
                                                                                                sx={{
                                                                                                    "& .MuiOutlinedInput-root": {
                                                                                                        bgcolor:
                                                                                                            "background.paper",
                                                                                                    },
                                                                                                }}
                                                                                            />
                                                                                        </Grid>
                                                                                        <Grid item xs={12} sm={6}>
                                                                                            <FormControl fullWidth size="small">
                                                                                                <InputLabel>Variant</InputLabel>
                                                                                                <Select
                                                                                                    value={button.variant}
                                                                                                    label="Variant"
                                                                                                    onChange={(e) => {
                                                                                                        const updated =
                                                                                                            locationData.cta.buttons.map(
                                                                                                                (b) =>
                                                                                                                    b.id === button.id
                                                                                                                        ? {
                                                                                                                              ...b,
                                                                                                                              variant:
                                                                                                                                  e
                                                                                                                                      .target
                                                                                                                                      .value as LocationButton["variant"],
                                                                                                                          }
                                                                                                                        : b
                                                                                                            );
                                                                                                        setLocationData({
                                                                                                            ...locationData,
                                                                                                            cta: {
                                                                                                                ...locationData.cta,
                                                                                                                buttons: updated,
                                                                                                            },
                                                                                                        });
                                                                                                    }}
                                                                                                    sx={{
                                                                                                        bgcolor: "background.paper",
                                                                                                    }}
                                                                                                >
                                                                                                    <MenuItem value="contained">
                                                                                                        Contained
                                                                                                    </MenuItem>
                                                                                                    <MenuItem value="outlined">
                                                                                                        Outlined
                                                                                                    </MenuItem>
                                                                                                    <MenuItem value="text">Text</MenuItem>
                                                                                                </Select>
                                                                                            </FormControl>
                                                                                        </Grid>
                                                                                        <Grid item xs={12} sm={6}>
                                                                                            <FormControl fullWidth size="small">
                                                                                                <InputLabel>Color</InputLabel>
                                                                                                <Select
                                                                                                    value={button.color}
                                                                                                    label="Color"
                                                                                                    onChange={(e) => {
                                                                                                        const updated =
                                                                                                            locationData.cta.buttons.map(
                                                                                                                (b) =>
                                                                                                                    b.id === button.id
                                                                                                                        ? {
                                                                                                                              ...b,
                                                                                                                              color: e
                                                                                                                                  .target
                                                                                                                                  .value as LocationButton["color"],
                                                                                                                          }
                                                                                                                        : b
                                                                                                            );
                                                                                                        setLocationData({
                                                                                                            ...locationData,
                                                                                                            cta: {
                                                                                                                ...locationData.cta,
                                                                                                                buttons: updated,
                                                                                                            },
                                                                                                        });
                                                                                                    }}
                                                                                                    sx={{
                                                                                                        bgcolor: "background.paper",
                                                                                                    }}
                                                                                                >
                                                                                                    <MenuItem value="primary">Primary</MenuItem>
                                                                                                    <MenuItem value="secondary">
                                                                                                        Secondary
                                                                                                    </MenuItem>
                                                                                                </Select>
                                                                                            </FormControl>
                                                                                        </Grid>
                                                                                        <Grid item xs={12} sm={6}>
                                                                                            <FormControl fullWidth size="small">
                                                                                                <InputLabel>Action</InputLabel>
                                                                                                <Select
                                                                                                    value={button.action}
                                                                                                    label="Action"
                                                                                                    onChange={(e) => {
                                                                                                        const updated =
                                                                                                            locationData.cta.buttons.map(
                                                                                                                (b) =>
                                                                                                                    b.id === button.id
                                                                                                                        ? {
                                                                                                                              ...b,
                                                                                                                              action: e
                                                                                                                                  .target
                                                                                                                                  .value as LocationButton["action"],
                                                                                                                          }
                                                                                                                        : b
                                                                                                            );
                                                                                                        setLocationData({
                                                                                                            ...locationData,
                                                                                                            cta: {
                                                                                                                ...locationData.cta,
                                                                                                                buttons: updated,
                                                                                                            },
                                                                                                        });
                                                                                                    }}
                                                                                                    sx={{
                                                                                                        bgcolor: "background.paper",
                                                                                                    }}
                                                                                                >
                                                                                                    <MenuItem value="directions">
                                                                                                        Get Directions
                                                                                                    </MenuItem>
                                                                                                    <MenuItem value="contact">
                                                                                                        Contact Page
                                                                                                    </MenuItem>
                                                                                                    <MenuItem value="external">
                                                                                                        External URL
                                                                                                    </MenuItem>
                                                                                                </Select>
                                                                                            </FormControl>
                                                                                        </Grid>
                                                                                        {button.action === "external" && (
                                                                                            <Grid item xs={12}>
                                                                                                <TextField
                                                                                                    fullWidth
                                                                                                    label="URL"
                                                                                                    value={button.url || ""}
                                                                                                    onChange={(e) => {
                                                                                                        const updated =
                                                                                                            locationData.cta.buttons.map(
                                                                                                                (b) =>
                                                                                                                    b.id === button.id
                                                                                                                        ? {
                                                                                                                              ...b,
                                                                                                                              url: e
                                                                                                                                  .target
                                                                                                                                  .value,
                                                                                                                          }
                                                                                                                        : b
                                                                                                            );
                                                                                                        setLocationData({
                                                                                                            ...locationData,
                                                                                                            cta: {
                                                                                                                ...locationData.cta,
                                                                                                                buttons: updated,
                                                                                                            },
                                                                                                        });
                                                                                                    }}
                                                                                                    size="small"
                                                                                                    sx={{
                                                                                                        "& .MuiOutlinedInput-root": {
                                                                                                            bgcolor:
                                                                                                                "background.paper",
                                                                                                        },
                                                                                                    }}
                                                                                                />
                                                                                            </Grid>
                                                                                        )}
                                                                                        <Grid item xs={12}>
                                                                                            <FormControlLabel
                                                                                                control={
                                                                                                    <Switch
                                                                                                        checked={button.isActive}
                                                                                                        onChange={(e) => {
                                                                                                            const updated =
                                                                                                                locationData.cta.buttons.map(
                                                                                                                    (b) =>
                                                                                                                        b.id ===
                                                                                                                        button.id
                                                                                                                            ? {
                                                                                                                                  ...b,
                                                                                                                                  isActive:
                                                                                                                                      e
                                                                                                                                          .target
                                                                                                                                          .checked,
                                                                                                                              }
                                                                                                                            : b
                                                                                                                );
                                                                                                            setLocationData({
                                                                                                                ...locationData,
                                                                                                                cta: {
                                                                                                                    ...locationData.cta,
                                                                                                                    buttons: updated,
                                                                                                                },
                                                                                                            });
                                                                                                        }}
                                                                                                        color="success"
                                                                                                    />
                                                                                                }
                                                                                                label={
                                                                                                    <Typography
                                                                                                        variant="body2"
                                                                                                        sx={{ fontWeight: 500 }}
                                                                                                    >
                                                                                                        Active
                                                                                                    </Typography>
                                                                                                }
                                                                                            />
                                                                                        </Grid>
                                                                                    </Grid>
                                                                                </Box>
                                                                                <IconButton
                                                                                    size="small"
                                                                                    color="error"
                                                                                    onClick={() => handleDeleteButton(button.id)}
                                                                                    sx={{
                                                                                        "&:hover": {
                                                                                            bgcolor: "error.lighter",
                                                                                        },
                                                                                    }}
                                                                                >
                                                                                    <Trash2 size={20} />
                                                                                </IconButton>
                                                                            </Box>
                                                                        </Paper>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </Box>
                                                    )}
                                                </Droppable>
                                            </DragDropContext>
                                        </Box>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Action Buttons at Bottom */}
                            {hasChanges && (
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
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        sx={{
                                            px: 4,
                                            fontWeight: 600,
                                            boxShadow: 2,
                                            "&:hover": {
                                                boxShadow: 4,
                                            },
                                        }}
                                    >
                                        {isSaving ? "Saving..." : "Save All Changes"}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        onClick={handleReset}
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
                                        <MapPinIcon size={20} />
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
                                <LocationPreview locationData={locationData} foundedYear={foundedYear} />
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
                                        This preview updates in real-time as you make changes. The actual section may
                                        look slightly different based on screen size.
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
