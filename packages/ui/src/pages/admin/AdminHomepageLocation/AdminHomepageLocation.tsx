import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { APP_LINKS, COMPANY_INFO } from "@local/shared";
import {
    AccessTime as AccessTimeIcon,
    TouchApp as ButtonIcon,
    ContactPhone as ContactPhoneIcon,
    ExpandMore as ExpandMoreIcon,
    TextFields as TextFieldsIcon,
} from "@mui/icons-material";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Switch,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import { useLandingPageContent, useUpdateLandingPageContent } from "api/rest/hooks";
import { BackButton, PageContainer } from "components";
import { ABTestEditingBanner } from "components/admin/ABTestEditingBanner";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useABTestQueryParams } from "hooks/useABTestQueryParams";
import { useAdminForm } from "hooks/useAdminForm";
import {
    Car,
    Clock,
    Eye,
    Gift,
    GripVertical,
    Info as InfoIcon,
    Mail,
    Map,
    MapPin as MapPinIcon,
    Package,
    Phone,
    Plus,
    Smartphone,
    Trash2,
    Truck,
    Users,
} from "lucide-react";
import { useCallback, useEffect } from "react";

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
                id: window.crypto.randomUUID(),
                title: "What to Expect",
                icon: "eye",
                description:
                    "Browse over 70 acres of top-quality trees and shrubs, carefully grown for landscape professionals",
                displayOrder: 0,
                isActive: true,
            },
            {
                id: window.crypto.randomUUID(),
                title: "Wholesale Focus",
                icon: "gift",
                description:
                    "Specializing in 3 to 25-gallon container plants for landscapers, contractors, and garden centers",
                displayOrder: 1,
                isActive: true,
            },
            {
                id: window.crypto.randomUUID(),
                title: "Professional Service",
                icon: "smartphone",
                description:
                    "Expert horticultural advice from our experienced team with over 40 years in the industry",
                displayOrder: 2,
                isActive: true,
            },
            {
                id: window.crypto.randomUUID(),
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
                id: window.crypto.randomUUID(),
                text: "Get Directions",
                variant: "contained",
                color: "primary",
                action: "directions",
                displayOrder: 0,
                isActive: true,
            },
            {
                id: window.crypto.randomUUID(),
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
    locationData: LocationData | null;
    foundedYear: number;
}) => {
    const { palette } = useTheme();

    if (!locationData) return null;

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
                        {locationData.map.style === "embedded" ? (
                            // Embedded Google Maps Preview
                            <Box
                                sx={{
                                    height: "250px",
                                    position: "relative",
                                    bgcolor: "grey.100",
                                }}
                            >
                                <iframe
                                    title="Location Map Preview"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=106+S+Woodruff+Rd+Bridgeton+NJ+08302&zoom=15"
                                />
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
                                                boxShadow: 3,
                                            }}
                                        >
                                            {locationData.map.buttonText}
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        ) : (
                            // Gradient Placeholder
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
                                    <Typography
                                        variant="h6"
                                        sx={{ fontWeight: 600, mb: 0.5, fontSize: "1rem" }}
                                    >
                                        New Life Nursery Inc.
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ opacity: 0.9, fontSize: "0.85rem" }}
                                    >
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
                        )}
                    </Card>

                    {/* Contact Methods - Matches homepage */}
                    <Box>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 600,
                                mb: 2,
                                color: palette.primary.main,
                                fontSize: "1rem",
                            }}
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
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{ fontWeight: 600, fontSize: "0.9rem" }}
                                                >
                                                    {method.charAt(0).toUpperCase() +
                                                        method.slice(1)}
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
                                                    sx={{
                                                        color: palette.text.secondary,
                                                        fontSize: "0.75rem",
                                                    }}
                                                >
                                                    {
                                                        locationData.contactMethods.descriptions[
                                                            method
                                                        ]
                                                    }
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
                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 600,
                                        textAlign: "center",
                                        fontSize: "1.1rem",
                                    }}
                                >
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
                                        <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 500, fontSize: "0.85rem" }}
                                        >
                                            {schedule.day}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 600, fontSize: "0.85rem" }}
                                        >
                                            {schedule.time}
                                        </Typography>
                                    </Box>
                                    {index < mockHours.length - 1 && (
                                        <Divider
                                            sx={{ backgroundColor: "rgba(255, 255, 255, 0.3)" }}
                                        />
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
                                sx={{
                                    fontWeight: 600,
                                    mb: 2,
                                    color: palette.primary.main,
                                    fontSize: "1rem",
                                }}
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
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 600,
                        mb: 1.5,
                        color: palette.primary.main,
                        fontSize: "1.1rem",
                    }}
                >
                    {locationData.cta.title}
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ mb: 2, color: palette.text.secondary, fontSize: "0.85rem" }}
                >
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
    const { variantId } = useABTestQueryParams();
    // Admin needs to see ALL content (including inactive) so they can manage it
    const {
        data: landingPageData,
        loading: landingPageLoading,
        refetch: refetchLandingPage,
    } = useLandingPageContent(false, variantId);
    const updateContentMutation = useUpdateLandingPageContent();

    const foundedYear = landingPageData?.content?.company?.foundedYear || COMPANY_INFO.FoundedYear;

    // Use the useAdminForm hook to manage all state
    const form = useAdminForm<LocationData>({
        fetchFn: async () => {
            if (landingPageData?.content?.location) {
                return landingPageData.content.location;
            }
            return getDefaultLocationData();
        },
        saveFn: async (data) => {
            const queryParams = variantId ? { variantId } : undefined;
            await updateContentMutation.mutate({
                data: { location: data },
                queryParams,
            });
            return data;
        },
        refetchDependencies: [refetchLandingPage],
        pageName: "location-section",
        endpointName: "/api/v1/landing-page/location",
        successMessage: "Location settings saved successfully!",
        errorMessagePrefix: "Failed to save location settings",
    });

    // Trigger refetch when landing page data loads
    useEffect(() => {
        if (landingPageData && !landingPageLoading) {
            form.refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [landingPageData, landingPageLoading]);

    // Handlers for visit info items
    const handleAddVisitInfoItem = useCallback(() => {
        if (!form.data) return;
        const newItem: LocationVisitInfoItem = {
            id: window.crypto.randomUUID(),
            title: "New Item",
            icon: "eye",
            description: "Description here",
            displayOrder: form.data.visitInfo.items.length,
            isActive: true,
        };
        form.setData({
            ...form.data!,
            visitInfo: {
                ...form.data!.visitInfo,
                items: [...form.data.visitInfo.items, newItem],
            },
        });
    }, [form]);

    const handleDeleteVisitInfoItem = useCallback(
        (id: string) => {
            if (!form.data) return;
            const updatedItems = form.data.visitInfo.items.filter((item) => item.id !== id);
            const reorderedItems = updatedItems.map((item, index) => ({
                ...item,
                displayOrder: index,
            }));
            form.setData({
                ...form.data!,
                visitInfo: {
                    ...form.data!.visitInfo,
                    items: reorderedItems,
                },
            });
        },
        [form],
    );

    const handleVisitInfoDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination || !form.data) return;

            const items = Array.from(form.data.visitInfo.items);
            const [removed] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, removed);

            const reorderedItems = items.map((item, index) => ({
                ...item,
                displayOrder: index,
            }));

            form.setData({
                ...form.data!,
                visitInfo: {
                    ...form.data!.visitInfo,
                    items: reorderedItems,
                },
            });
        },
        [form],
    );

    // Handlers for CTA buttons
    const handleAddButton = useCallback(() => {
        if (!form.data) return;
        const newButton: LocationButton = {
            id: window.crypto.randomUUID(),
            text: "New Button",
            variant: "contained",
            color: "primary",
            action: "directions",
            displayOrder: form.data.cta.buttons.length,
            isActive: true,
        };
        form.setData({
            ...form.data!,
            cta: {
                ...form.data!.cta,
                buttons: [...form.data.cta.buttons, newButton],
            },
        });
    }, [form]);

    const handleDeleteButton = useCallback(
        (id: string) => {
            if (!form.data) return;
            const updatedButtons = form.data.cta.buttons.filter((btn) => btn.id !== id);
            const reorderedButtons = updatedButtons.map((btn, index) => ({
                ...btn,
                displayOrder: index,
            }));
            form.setData({
                ...form.data!,
                cta: {
                    ...form.data!.cta,
                    buttons: reorderedButtons,
                },
            });
        },
        [form],
    );

    const handleButtonDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination || !form.data) return;

            const buttons = Array.from(form.data.cta.buttons);
            const [removed] = buttons.splice(result.source.index, 1);
            buttons.splice(result.destination.index, 0, removed);

            const reorderedButtons = buttons.map((btn, index) => ({
                ...btn,
                displayOrder: index,
            }));

            form.setData({
                ...form.data!,
                cta: {
                    ...form.data!.cta,
                    buttons: reorderedButtons,
                },
            });
        },
        [form],
    );

    // Handler for contact methods ordering
    const handleContactMethodDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination || !form.data) return;

            const order = Array.from(form.data.contactMethods.order);
            const [removed] = order.splice(result.source.index, 1);
            order.splice(result.destination.index, 0, removed);

            form.setData({
                ...form.data!,
                contactMethods: {
                    ...form.data!.contactMethods,
                    order: order as ("phone" | "address" | "email")[],
                },
            });
        },
        [form],
    );

    const sortedVisitInfoItems = form.data
        ? [...form.data.visitInfo.items].sort((a, b) => a.displayOrder - b.displayOrder)
        : [];

    const sortedButtons = form.data
        ? [...form.data.cta.buttons].sort((a, b) => a.displayOrder - b.displayOrder)
        : [];

    const contactMethodLabels: Record<string, string> = {
        phone: "Phone",
        address: "Address",
        email: "Email",
    };

    if (form.isLoading) {
        return (
            <PageContainer variant="wide" sx={{ minHeight: "100vh", paddingBottom: 0 }}>
                <TopBar
                    display="page"
                    title="Location & Visit Section"
                    startComponent={
                        <BackButton
                            to={APP_LINKS.AdminHomepage}
                            ariaLabel="Back to Homepage Management"
                        />
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
                            onClick={form.save}
                            disabled={form.isSaving}
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
                            onClick={form.cancel}
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
                        <strong>Template Tokens:</strong> Use <code>{"{foundedYear}"}</code> to
                        automatically insert {foundedYear}
                    </Typography>
                    <Typography variant="body2">
                        <strong>Note:</strong> Phone, address, email values and hours are managed in
                        the Branding & Theme section.
                    </Typography>
                </Alert>

                {!form.data && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">Loading location data...</Typography>
                    </Alert>
                )}

                {form.data && (
                    <>
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
                                                    <MapPinIcon size={20} />
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                                    >
                                                        Live Preview
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        See your changes in real-time
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <LocationPreview
                                                locationData={form.data}
                                                foundedYear={foundedYear}
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
                                                    This preview updates in real-time as you make
                                                    changes.
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
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1.5,
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
                                                        bgcolor: "primary.main",
                                                        color: "white",
                                                    }}
                                                >
                                                    <TextFieldsIcon />
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                                    >
                                                        Header Settings
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Configure section title, subtitle, and badge
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails
                                            sx={{ p: 3, bgcolor: "background.paper" }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 3,
                                                }}
                                            >
                                                <TextField
                                                    fullWidth
                                                    label="Title"
                                                    value={form.data.header.title}
                                                    onChange={(e) => {
                                                        form.setData({
                                                            ...form.data!,
                                                            header: {
                                                                ...form.data!.header,
                                                                title: e.target.value,
                                                            },
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
                                                    value={form.data.header.subtitle}
                                                    onChange={(e) => {
                                                        form.setData({
                                                            ...form.data!,
                                                            header: {
                                                                ...form.data!.header,
                                                                subtitle: e.target.value,
                                                            },
                                                        });
                                                    }}
                                                    helperText={`Preview: ${replaceTokens(form.data.header.subtitle, foundedYear)}`}
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
                                                    value={form.data.header.chip}
                                                    onChange={(e) => {
                                                        form.setData({
                                                            ...form.data!,
                                                            header: {
                                                                ...form.data!.header,
                                                                chip: e.target.value,
                                                            },
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
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1.5,
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
                                                    <Map size={20} />
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                                    >
                                                        Map Settings
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Configure map display and directions button
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails
                                            sx={{ p: 3, bgcolor: "background.paper" }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 3,
                                                }}
                                            >
                                                <FormControl fullWidth>
                                                    <InputLabel>Map Style</InputLabel>
                                                    <Select
                                                        value={form.data.map.style}
                                                        label="Map Style"
                                                        onChange={(e) => {
                                                            form.setData({
                                                                ...form.data!,
                                                                map: {
                                                                    ...form.data!.map,
                                                                    style: e.target.value as
                                                                        | "gradient"
                                                                        | "embedded",
                                                                },
                                                            });
                                                        }}
                                                        sx={{
                                                            bgcolor: "background.paper",
                                                        }}
                                                    >
                                                        <MenuItem value="gradient">
                                                            Gradient Placeholder (Simple)
                                                        </MenuItem>
                                                        <MenuItem value="embedded">
                                                            Google Maps Embed (Interactive)
                                                        </MenuItem>
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
                                                                checked={
                                                                    form.data.map
                                                                        .showGetDirectionsButton
                                                                }
                                                                onChange={(e) => {
                                                                    form.setData({
                                                                        ...form.data!,
                                                                        map: {
                                                                            ...form.data!.map,
                                                                            showGetDirectionsButton:
                                                                                e.target.checked,
                                                                        },
                                                                    });
                                                                }}
                                                            />
                                                        }
                                                        label={
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontWeight: 500 }}
                                                            >
                                                                Show Get Directions Button
                                                            </Typography>
                                                        }
                                                    />
                                                </Paper>
                                                <TextField
                                                    fullWidth
                                                    label="Button Text"
                                                    value={form.data.map.buttonText}
                                                    onChange={(e) => {
                                                        form.setData({
                                                            ...form.data!,
                                                            map: {
                                                                ...form.data!.map,
                                                                buttonText: e.target.value,
                                                            },
                                                        });
                                                    }}
                                                    disabled={
                                                        !form.data.map.showGetDirectionsButton
                                                    }
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
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1.5,
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
                                                        bgcolor: "success.main",
                                                        color: "white",
                                                    }}
                                                >
                                                    <ContactPhoneIcon />
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                                    >
                                                        Contact Methods
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Configure contact information display order
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails
                                            sx={{ p: 3, bgcolor: "background.paper" }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 3,
                                                }}
                                            >
                                                <TextField
                                                    fullWidth
                                                    label="Section Title"
                                                    value={form.data.contactMethods.sectionTitle}
                                                    onChange={(e) => {
                                                        form.setData({
                                                            ...form.data!,
                                                            contactMethods: {
                                                                ...form.data!.contactMethods,
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
                                                    <Typography
                                                        variant="subtitle2"
                                                        sx={{ mb: 1.5, fontWeight: 600 }}
                                                    >
                                                        Order (drag to reorder):
                                                    </Typography>
                                                    <DragDropContext
                                                        onDragEnd={handleContactMethodDragEnd}
                                                    >
                                                        <Droppable droppableId="contact-methods">
                                                            {(provided) => (
                                                                <Box
                                                                    {...provided.droppableProps}
                                                                    ref={provided.innerRef}
                                                                >
                                                                    {form.data!.contactMethods.order.map(
                                                                        (method, index) => (
                                                                            <Draggable
                                                                                key={method}
                                                                                draggableId={method}
                                                                                index={index}
                                                                            >
                                                                                {(
                                                                                    provided,
                                                                                    snapshot,
                                                                                ) => (
                                                                                    <Paper
                                                                                        ref={
                                                                                            provided.innerRef
                                                                                        }
                                                                                        {...provided.draggableProps}
                                                                                        elevation={
                                                                                            0
                                                                                        }
                                                                                        sx={{
                                                                                            mb: 1,
                                                                                            display:
                                                                                                "flex",
                                                                                            alignItems:
                                                                                                "center",
                                                                                            gap: 2,
                                                                                            p: 1.5,
                                                                                            border: "2px solid",
                                                                                            borderColor:
                                                                                                snapshot.isDragging
                                                                                                    ? "primary.main"
                                                                                                    : "divider",
                                                                                            borderRadius: 2,
                                                                                            bgcolor:
                                                                                                "background.paper",
                                                                                            transition:
                                                                                                "all 0.2s",
                                                                                            "&:hover":
                                                                                                {
                                                                                                    borderColor:
                                                                                                        "primary.light",
                                                                                                    boxShadow:
                                                                                                        "0 2px 8px rgba(0,0,0,0.08)",
                                                                                                },
                                                                                        }}
                                                                                    >
                                                                                        <Box
                                                                                            {...provided.dragHandleProps}
                                                                                        >
                                                                                            <GripVertical
                                                                                                size={
                                                                                                    20
                                                                                                }
                                                                                                color={
                                                                                                    palette
                                                                                                        .text
                                                                                                        .secondary
                                                                                                }
                                                                                            />
                                                                                        </Box>
                                                                                        <Typography
                                                                                            sx={{
                                                                                                fontWeight: 600,
                                                                                                minWidth: 80,
                                                                                            }}
                                                                                        >
                                                                                            {
                                                                                                contactMethodLabels[
                                                                                                    method
                                                                                                ]
                                                                                            }
                                                                                        </Typography>
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
                                                </Box>
                                                <TextField
                                                    fullWidth
                                                    label="Phone Description"
                                                    value={
                                                        form.data.contactMethods.descriptions.phone
                                                    }
                                                    onChange={(e) => {
                                                        form.setData({
                                                            ...form.data!,
                                                            contactMethods: {
                                                                ...form.data!.contactMethods,
                                                                descriptions: {
                                                                    ...form.data!.contactMethods
                                                                        .descriptions,
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
                                                    value={
                                                        form.data.contactMethods.descriptions
                                                            .address
                                                    }
                                                    onChange={(e) => {
                                                        form.setData({
                                                            ...form.data!,
                                                            contactMethods: {
                                                                ...form.data!.contactMethods,
                                                                descriptions: {
                                                                    ...form.data!.contactMethods
                                                                        .descriptions,
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
                                                    value={
                                                        form.data.contactMethods.descriptions.email
                                                    }
                                                    onChange={(e) => {
                                                        form.setData({
                                                            ...form.data!,
                                                            contactMethods: {
                                                                ...form.data!.contactMethods,
                                                                descriptions: {
                                                                    ...form.data!.contactMethods
                                                                        .descriptions,
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
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1.5,
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
                                                        bgcolor: "info.main",
                                                        color: "white",
                                                    }}
                                                >
                                                    <AccessTimeIcon />
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                                    >
                                                        Business Hours Labels
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Configure section title and badge (hours
                                                        managed in Branding)
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails
                                            sx={{ p: 3, bgcolor: "background.paper" }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 3,
                                                }}
                                            >
                                                <TextField
                                                    fullWidth
                                                    label="Title"
                                                    value={form.data.businessHours.title}
                                                    onChange={(e) => {
                                                        form.setData({
                                                            ...form.data!,
                                                            businessHours: {
                                                                ...form.data!.businessHours,
                                                                title: e.target.value,
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
                                                    label="Chip Text"
                                                    value={form.data.businessHours.chip}
                                                    onChange={(e) => {
                                                        form.setData({
                                                            ...form.data!,
                                                            businessHours: {
                                                                ...form.data!.businessHours,
                                                                chip: e.target.value,
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
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1.5,
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
                                                        bgcolor: "warning.main",
                                                        color: "white",
                                                    }}
                                                >
                                                    <InfoIcon size={20} />
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                                    >
                                                        Visit Information Cards
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Add info cards about visiting your location
                                                        ({form.data.visitInfo.items.length} items,{" "}
                                                        {
                                                            form.data.visitInfo.items.filter(
                                                                (i) => i.isActive,
                                                            ).length
                                                        }{" "}
                                                        active)
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails
                                            sx={{ p: 3, bgcolor: "background.paper" }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 3,
                                                }}
                                            >
                                                <TextField
                                                    fullWidth
                                                    label="Section Title"
                                                    value={form.data.visitInfo.sectionTitle}
                                                    onChange={(e) => {
                                                        form.setData({
                                                            ...form.data!,
                                                            visitInfo: {
                                                                ...form.data!.visitInfo,
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
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            mb: 2,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="subtitle2"
                                                            sx={{ fontWeight: 600 }}
                                                        >
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
                                                    <DragDropContext
                                                        onDragEnd={handleVisitInfoDragEnd}
                                                    >
                                                        <Droppable droppableId="visit-info-items">
                                                            {(provided) => (
                                                                <Box
                                                                    {...provided.droppableProps}
                                                                    ref={provided.innerRef}
                                                                >
                                                                    {sortedVisitInfoItems.map(
                                                                        (item, index) => (
                                                                            <Draggable
                                                                                key={item.id}
                                                                                draggableId={
                                                                                    item.id
                                                                                }
                                                                                index={index}
                                                                            >
                                                                                {(
                                                                                    provided,
                                                                                    snapshot,
                                                                                ) => (
                                                                                    <Paper
                                                                                        ref={
                                                                                            provided.innerRef
                                                                                        }
                                                                                        {...provided.draggableProps}
                                                                                        elevation={
                                                                                            0
                                                                                        }
                                                                                        sx={{
                                                                                            mb: 2,
                                                                                            p: 2.5,
                                                                                            border: "2px solid",
                                                                                            borderColor:
                                                                                                snapshot.isDragging
                                                                                                    ? "primary.main"
                                                                                                    : item.isActive
                                                                                                      ? "success.light"
                                                                                                      : "divider",
                                                                                            borderRadius: 2,
                                                                                            transition:
                                                                                                "all 0.2s",
                                                                                            opacity:
                                                                                                snapshot.isDragging
                                                                                                    ? 0.7
                                                                                                    : 1,
                                                                                            boxShadow:
                                                                                                snapshot.isDragging
                                                                                                    ? "0 8px 16px rgba(0,0,0,0.15)"
                                                                                                    : "0 1px 3px rgba(0,0,0,0.05)",
                                                                                            "&:hover":
                                                                                                {
                                                                                                    borderColor:
                                                                                                        item.isActive
                                                                                                            ? "success.main"
                                                                                                            : "primary.light",
                                                                                                    boxShadow:
                                                                                                        "0 4px 12px rgba(0,0,0,0.1)",
                                                                                                },
                                                                                        }}
                                                                                    >
                                                                                        <Box
                                                                                            sx={{
                                                                                                display:
                                                                                                    "flex",
                                                                                                gap: 2,
                                                                                            }}
                                                                                        >
                                                                                            <Box
                                                                                                {...provided.dragHandleProps}
                                                                                            >
                                                                                                <GripVertical
                                                                                                    size={
                                                                                                        20
                                                                                                    }
                                                                                                    color={
                                                                                                        palette
                                                                                                            .text
                                                                                                            .secondary
                                                                                                    }
                                                                                                />
                                                                                            </Box>
                                                                                            <Box
                                                                                                sx={{
                                                                                                    flex: 1,
                                                                                                }}
                                                                                            >
                                                                                                <Grid
                                                                                                    container
                                                                                                    spacing={
                                                                                                        2
                                                                                                    }
                                                                                                >
                                                                                                    <Grid
                                                                                                        item
                                                                                                        xs={
                                                                                                            12
                                                                                                        }
                                                                                                        sm={
                                                                                                            6
                                                                                                        }
                                                                                                    >
                                                                                                        <TextField
                                                                                                            fullWidth
                                                                                                            label="Title"
                                                                                                            value={
                                                                                                                item.title
                                                                                                            }
                                                                                                            onChange={(
                                                                                                                e,
                                                                                                            ) => {
                                                                                                                const updated =
                                                                                                                    form.data!.visitInfo.items.map(
                                                                                                                        (
                                                                                                                            i,
                                                                                                                        ) =>
                                                                                                                            i.id ===
                                                                                                                            item.id
                                                                                                                                ? {
                                                                                                                                      ...i,
                                                                                                                                      title: e
                                                                                                                                          .target
                                                                                                                                          .value,
                                                                                                                                  }
                                                                                                                                : i,
                                                                                                                    );
                                                                                                                form.setData(
                                                                                                                    {
                                                                                                                        ...form.data!,
                                                                                                                        visitInfo:
                                                                                                                            {
                                                                                                                                ...form
                                                                                                                                    .data!
                                                                                                                                    .visitInfo,
                                                                                                                                items: updated,
                                                                                                                            },
                                                                                                                    },
                                                                                                                );
                                                                                                            }}
                                                                                                            size="small"
                                                                                                            sx={{
                                                                                                                "& .MuiOutlinedInput-root":
                                                                                                                    {
                                                                                                                        bgcolor:
                                                                                                                            "background.paper",
                                                                                                                    },
                                                                                                            }}
                                                                                                        />
                                                                                                    </Grid>
                                                                                                    <Grid
                                                                                                        item
                                                                                                        xs={
                                                                                                            12
                                                                                                        }
                                                                                                        sm={
                                                                                                            6
                                                                                                        }
                                                                                                    >
                                                                                                        <FormControl
                                                                                                            fullWidth
                                                                                                            size="small"
                                                                                                        >
                                                                                                            <InputLabel>
                                                                                                                Icon
                                                                                                            </InputLabel>
                                                                                                            <Select
                                                                                                                value={
                                                                                                                    item.icon
                                                                                                                }
                                                                                                                label="Icon"
                                                                                                                onChange={(
                                                                                                                    e,
                                                                                                                ) => {
                                                                                                                    const updated =
                                                                                                                        form.data!.visitInfo.items.map(
                                                                                                                            (
                                                                                                                                i,
                                                                                                                            ) =>
                                                                                                                                i.id ===
                                                                                                                                item.id
                                                                                                                                    ? {
                                                                                                                                          ...i,
                                                                                                                                          icon: e
                                                                                                                                              .target
                                                                                                                                              .value,
                                                                                                                                      }
                                                                                                                                    : i,
                                                                                                                        );
                                                                                                                    form.setData(
                                                                                                                        {
                                                                                                                            ...form.data!,
                                                                                                                            visitInfo:
                                                                                                                                {
                                                                                                                                    ...form
                                                                                                                                        .data!
                                                                                                                                        .visitInfo,
                                                                                                                                    items: updated,
                                                                                                                                },
                                                                                                                        },
                                                                                                                    );
                                                                                                                }}
                                                                                                                sx={{
                                                                                                                    bgcolor:
                                                                                                                        "background.paper",
                                                                                                                }}
                                                                                                            >
                                                                                                                {VISIT_INFO_ICONS.map(
                                                                                                                    (
                                                                                                                        icon,
                                                                                                                    ) => {
                                                                                                                        const IconComp =
                                                                                                                            icon.icon;
                                                                                                                        return (
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
                                                                                                                                    <IconComp
                                                                                                                                        size={
                                                                                                                                            16
                                                                                                                                        }
                                                                                                                                    />
                                                                                                                                    <Typography>
                                                                                                                                        {
                                                                                                                                            icon.label
                                                                                                                                        }
                                                                                                                                    </Typography>
                                                                                                                                </Box>
                                                                                                                            </MenuItem>
                                                                                                                        );
                                                                                                                    },
                                                                                                                )}
                                                                                                            </Select>
                                                                                                        </FormControl>
                                                                                                    </Grid>
                                                                                                    <Grid
                                                                                                        item
                                                                                                        xs={
                                                                                                            12
                                                                                                        }
                                                                                                    >
                                                                                                        <TextField
                                                                                                            fullWidth
                                                                                                            multiline
                                                                                                            rows={
                                                                                                                2
                                                                                                            }
                                                                                                            label="Description"
                                                                                                            value={
                                                                                                                item.description
                                                                                                            }
                                                                                                            onChange={(
                                                                                                                e,
                                                                                                            ) => {
                                                                                                                const updated =
                                                                                                                    form.data!.visitInfo.items.map(
                                                                                                                        (
                                                                                                                            i,
                                                                                                                        ) =>
                                                                                                                            i.id ===
                                                                                                                            item.id
                                                                                                                                ? {
                                                                                                                                      ...i,
                                                                                                                                      description:
                                                                                                                                          e
                                                                                                                                              .target
                                                                                                                                              .value,
                                                                                                                                  }
                                                                                                                                : i,
                                                                                                                    );
                                                                                                                form.setData(
                                                                                                                    {
                                                                                                                        ...form.data!,
                                                                                                                        visitInfo:
                                                                                                                            {
                                                                                                                                ...form
                                                                                                                                    .data!
                                                                                                                                    .visitInfo,
                                                                                                                                items: updated,
                                                                                                                            },
                                                                                                                    },
                                                                                                                );
                                                                                                            }}
                                                                                                            size="small"
                                                                                                            sx={{
                                                                                                                "& .MuiOutlinedInput-root":
                                                                                                                    {
                                                                                                                        bgcolor:
                                                                                                                            "background.paper",
                                                                                                                    },
                                                                                                            }}
                                                                                                        />
                                                                                                    </Grid>
                                                                                                    <Grid
                                                                                                        item
                                                                                                        xs={
                                                                                                            12
                                                                                                        }
                                                                                                    >
                                                                                                        <FormControlLabel
                                                                                                            control={
                                                                                                                <Switch
                                                                                                                    checked={
                                                                                                                        item.isActive
                                                                                                                    }
                                                                                                                    onChange={(
                                                                                                                        e,
                                                                                                                    ) => {
                                                                                                                        const updated =
                                                                                                                            form.data!.visitInfo.items.map(
                                                                                                                                (
                                                                                                                                    i,
                                                                                                                                ) =>
                                                                                                                                    i.id ===
                                                                                                                                    item.id
                                                                                                                                        ? {
                                                                                                                                              ...i,
                                                                                                                                              isActive:
                                                                                                                                                  e
                                                                                                                                                      .target
                                                                                                                                                      .checked,
                                                                                                                                          }
                                                                                                                                        : i,
                                                                                                                            );
                                                                                                                        form.setData(
                                                                                                                            {
                                                                                                                                ...form.data!,
                                                                                                                                visitInfo:
                                                                                                                                    {
                                                                                                                                        ...form
                                                                                                                                            .data!
                                                                                                                                            .visitInfo,
                                                                                                                                        items: updated,
                                                                                                                                    },
                                                                                                                            },
                                                                                                                        );
                                                                                                                    }}
                                                                                                                    color="success"
                                                                                                                />
                                                                                                            }
                                                                                                            label={
                                                                                                                <Typography
                                                                                                                    variant="body2"
                                                                                                                    sx={{
                                                                                                                        fontWeight: 500,
                                                                                                                    }}
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
                                                                                                onClick={() =>
                                                                                                    handleDeleteVisitInfoItem(
                                                                                                        item.id,
                                                                                                    )
                                                                                                }
                                                                                                sx={{
                                                                                                    "&:hover":
                                                                                                        {
                                                                                                            bgcolor:
                                                                                                                "error.lighter",
                                                                                                        },
                                                                                                }}
                                                                                            >
                                                                                                <Trash2
                                                                                                    size={
                                                                                                        20
                                                                                                    }
                                                                                                />
                                                                                            </IconButton>
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
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1.5,
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
                                                        bgcolor: "error.main",
                                                        color: "white",
                                                    }}
                                                >
                                                    <ButtonIcon />
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                                    >
                                                        Call-to-Action Section
                                                    </Typography>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        Add action buttons to drive user engagement
                                                        ({form.data.cta.buttons.length} buttons,{" "}
                                                        {
                                                            form.data.cta.buttons.filter(
                                                                (b) => b.isActive,
                                                            ).length
                                                        }{" "}
                                                        active)
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails
                                            sx={{ p: 3, bgcolor: "background.paper" }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 3,
                                                }}
                                            >
                                                <TextField
                                                    fullWidth
                                                    label="CTA Title"
                                                    value={form.data.cta.title}
                                                    onChange={(e) => {
                                                        form.setData({
                                                            ...form.data!,
                                                            cta: {
                                                                ...form.data!.cta,
                                                                title: e.target.value,
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
                                                    multiline
                                                    rows={2}
                                                    label="CTA Description"
                                                    value={form.data.cta.description}
                                                    onChange={(e) => {
                                                        form.setData({
                                                            ...form.data!,
                                                            cta: {
                                                                ...form.data!.cta,
                                                                description: e.target.value,
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
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            mb: 2,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="subtitle2"
                                                            sx={{ fontWeight: 600 }}
                                                        >
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
                                                    <DragDropContext
                                                        onDragEnd={handleButtonDragEnd}
                                                    >
                                                        <Droppable droppableId="cta-buttons">
                                                            {(provided) => (
                                                                <Box
                                                                    {...provided.droppableProps}
                                                                    ref={provided.innerRef}
                                                                >
                                                                    {sortedButtons.map(
                                                                        (button, index) => (
                                                                            <Draggable
                                                                                key={button.id}
                                                                                draggableId={
                                                                                    button.id
                                                                                }
                                                                                index={index}
                                                                            >
                                                                                {(
                                                                                    provided,
                                                                                    snapshot,
                                                                                ) => (
                                                                                    <Paper
                                                                                        ref={
                                                                                            provided.innerRef
                                                                                        }
                                                                                        {...provided.draggableProps}
                                                                                        elevation={
                                                                                            0
                                                                                        }
                                                                                        sx={{
                                                                                            mb: 2,
                                                                                            p: 2.5,
                                                                                            border: "2px solid",
                                                                                            borderColor:
                                                                                                snapshot.isDragging
                                                                                                    ? "primary.main"
                                                                                                    : button.isActive
                                                                                                      ? "success.light"
                                                                                                      : "divider",
                                                                                            borderRadius: 2,
                                                                                            transition:
                                                                                                "all 0.2s",
                                                                                            opacity:
                                                                                                snapshot.isDragging
                                                                                                    ? 0.7
                                                                                                    : 1,
                                                                                            boxShadow:
                                                                                                snapshot.isDragging
                                                                                                    ? "0 8px 16px rgba(0,0,0,0.15)"
                                                                                                    : "0 1px 3px rgba(0,0,0,0.05)",
                                                                                            "&:hover":
                                                                                                {
                                                                                                    borderColor:
                                                                                                        button.isActive
                                                                                                            ? "success.main"
                                                                                                            : "primary.light",
                                                                                                    boxShadow:
                                                                                                        "0 4px 12px rgba(0,0,0,0.1)",
                                                                                                },
                                                                                        }}
                                                                                    >
                                                                                        <Box
                                                                                            sx={{
                                                                                                display:
                                                                                                    "flex",
                                                                                                gap: 2,
                                                                                            }}
                                                                                        >
                                                                                            <Box
                                                                                                {...provided.dragHandleProps}
                                                                                            >
                                                                                                <GripVertical
                                                                                                    size={
                                                                                                        20
                                                                                                    }
                                                                                                    color={
                                                                                                        palette
                                                                                                            .text
                                                                                                            .secondary
                                                                                                    }
                                                                                                />
                                                                                            </Box>
                                                                                            <Box
                                                                                                sx={{
                                                                                                    flex: 1,
                                                                                                }}
                                                                                            >
                                                                                                <Grid
                                                                                                    container
                                                                                                    spacing={
                                                                                                        2
                                                                                                    }
                                                                                                >
                                                                                                    <Grid
                                                                                                        item
                                                                                                        xs={
                                                                                                            12
                                                                                                        }
                                                                                                        sm={
                                                                                                            6
                                                                                                        }
                                                                                                    >
                                                                                                        <TextField
                                                                                                            fullWidth
                                                                                                            label="Button Text"
                                                                                                            value={
                                                                                                                button.text
                                                                                                            }
                                                                                                            onChange={(
                                                                                                                e,
                                                                                                            ) => {
                                                                                                                const updated =
                                                                                                                    form.data!.cta.buttons.map(
                                                                                                                        (
                                                                                                                            b,
                                                                                                                        ) =>
                                                                                                                            b.id ===
                                                                                                                            button.id
                                                                                                                                ? {
                                                                                                                                      ...b,
                                                                                                                                      text: e
                                                                                                                                          .target
                                                                                                                                          .value,
                                                                                                                                  }
                                                                                                                                : b,
                                                                                                                    );
                                                                                                                form.setData(
                                                                                                                    {
                                                                                                                        ...form.data!,
                                                                                                                        cta: {
                                                                                                                            ...form
                                                                                                                                .data!
                                                                                                                                .cta,
                                                                                                                            buttons:
                                                                                                                                updated,
                                                                                                                        },
                                                                                                                    },
                                                                                                                );
                                                                                                            }}
                                                                                                            size="small"
                                                                                                            sx={{
                                                                                                                "& .MuiOutlinedInput-root":
                                                                                                                    {
                                                                                                                        bgcolor:
                                                                                                                            "background.paper",
                                                                                                                    },
                                                                                                            }}
                                                                                                        />
                                                                                                    </Grid>
                                                                                                    <Grid
                                                                                                        item
                                                                                                        xs={
                                                                                                            12
                                                                                                        }
                                                                                                        sm={
                                                                                                            6
                                                                                                        }
                                                                                                    >
                                                                                                        <FormControl
                                                                                                            fullWidth
                                                                                                            size="small"
                                                                                                        >
                                                                                                            <InputLabel>
                                                                                                                Variant
                                                                                                            </InputLabel>
                                                                                                            <Select
                                                                                                                value={
                                                                                                                    button.variant
                                                                                                                }
                                                                                                                label="Variant"
                                                                                                                onChange={(
                                                                                                                    e,
                                                                                                                ) => {
                                                                                                                    const updated =
                                                                                                                        form.data!.cta.buttons.map(
                                                                                                                            (
                                                                                                                                b,
                                                                                                                            ) =>
                                                                                                                                b.id ===
                                                                                                                                button.id
                                                                                                                                    ? {
                                                                                                                                          ...b,
                                                                                                                                          variant:
                                                                                                                                              e
                                                                                                                                                  .target
                                                                                                                                                  .value as LocationButton["variant"],
                                                                                                                                      }
                                                                                                                                    : b,
                                                                                                                        );
                                                                                                                    form.setData(
                                                                                                                        {
                                                                                                                            ...form.data!,
                                                                                                                            cta: {
                                                                                                                                ...form
                                                                                                                                    .data!
                                                                                                                                    .cta,
                                                                                                                                buttons:
                                                                                                                                    updated,
                                                                                                                            },
                                                                                                                        },
                                                                                                                    );
                                                                                                                }}
                                                                                                                sx={{
                                                                                                                    bgcolor:
                                                                                                                        "background.paper",
                                                                                                                }}
                                                                                                            >
                                                                                                                <MenuItem value="contained">
                                                                                                                    Contained
                                                                                                                </MenuItem>
                                                                                                                <MenuItem value="outlined">
                                                                                                                    Outlined
                                                                                                                </MenuItem>
                                                                                                                <MenuItem value="text">
                                                                                                                    Text
                                                                                                                </MenuItem>
                                                                                                            </Select>
                                                                                                        </FormControl>
                                                                                                    </Grid>
                                                                                                    <Grid
                                                                                                        item
                                                                                                        xs={
                                                                                                            12
                                                                                                        }
                                                                                                        sm={
                                                                                                            6
                                                                                                        }
                                                                                                    >
                                                                                                        <FormControl
                                                                                                            fullWidth
                                                                                                            size="small"
                                                                                                        >
                                                                                                            <InputLabel>
                                                                                                                Color
                                                                                                            </InputLabel>
                                                                                                            <Select
                                                                                                                value={
                                                                                                                    button.color
                                                                                                                }
                                                                                                                label="Color"
                                                                                                                onChange={(
                                                                                                                    e,
                                                                                                                ) => {
                                                                                                                    const updated =
                                                                                                                        form.data!.cta.buttons.map(
                                                                                                                            (
                                                                                                                                b,
                                                                                                                            ) =>
                                                                                                                                b.id ===
                                                                                                                                button.id
                                                                                                                                    ? {
                                                                                                                                          ...b,
                                                                                                                                          color: e
                                                                                                                                              .target
                                                                                                                                              .value as LocationButton["color"],
                                                                                                                                      }
                                                                                                                                    : b,
                                                                                                                        );
                                                                                                                    form.setData(
                                                                                                                        {
                                                                                                                            ...form.data!,
                                                                                                                            cta: {
                                                                                                                                ...form
                                                                                                                                    .data!
                                                                                                                                    .cta,
                                                                                                                                buttons:
                                                                                                                                    updated,
                                                                                                                            },
                                                                                                                        },
                                                                                                                    );
                                                                                                                }}
                                                                                                                sx={{
                                                                                                                    bgcolor:
                                                                                                                        "background.paper",
                                                                                                                }}
                                                                                                            >
                                                                                                                <MenuItem value="primary">
                                                                                                                    Primary
                                                                                                                </MenuItem>
                                                                                                                <MenuItem value="secondary">
                                                                                                                    Secondary
                                                                                                                </MenuItem>
                                                                                                            </Select>
                                                                                                        </FormControl>
                                                                                                    </Grid>
                                                                                                    <Grid
                                                                                                        item
                                                                                                        xs={
                                                                                                            12
                                                                                                        }
                                                                                                        sm={
                                                                                                            6
                                                                                                        }
                                                                                                    >
                                                                                                        <FormControl
                                                                                                            fullWidth
                                                                                                            size="small"
                                                                                                        >
                                                                                                            <InputLabel>
                                                                                                                Action
                                                                                                            </InputLabel>
                                                                                                            <Select
                                                                                                                value={
                                                                                                                    button.action
                                                                                                                }
                                                                                                                label="Action"
                                                                                                                onChange={(
                                                                                                                    e,
                                                                                                                ) => {
                                                                                                                    const updated =
                                                                                                                        form.data!.cta.buttons.map(
                                                                                                                            (
                                                                                                                                b,
                                                                                                                            ) =>
                                                                                                                                b.id ===
                                                                                                                                button.id
                                                                                                                                    ? {
                                                                                                                                          ...b,
                                                                                                                                          action: e
                                                                                                                                              .target
                                                                                                                                              .value as LocationButton["action"],
                                                                                                                                      }
                                                                                                                                    : b,
                                                                                                                        );
                                                                                                                    form.setData(
                                                                                                                        {
                                                                                                                            ...form.data!,
                                                                                                                            cta: {
                                                                                                                                ...form
                                                                                                                                    .data!
                                                                                                                                    .cta,
                                                                                                                                buttons:
                                                                                                                                    updated,
                                                                                                                            },
                                                                                                                        },
                                                                                                                    );
                                                                                                                }}
                                                                                                                sx={{
                                                                                                                    bgcolor:
                                                                                                                        "background.paper",
                                                                                                                }}
                                                                                                            >
                                                                                                                <MenuItem value="directions">
                                                                                                                    Get
                                                                                                                    Directions
                                                                                                                </MenuItem>
                                                                                                                <MenuItem value="contact">
                                                                                                                    Contact
                                                                                                                    Page
                                                                                                                </MenuItem>
                                                                                                                <MenuItem value="external">
                                                                                                                    External
                                                                                                                    URL
                                                                                                                </MenuItem>
                                                                                                            </Select>
                                                                                                        </FormControl>
                                                                                                    </Grid>
                                                                                                    {button.action ===
                                                                                                        "external" && (
                                                                                                        <Grid
                                                                                                            item
                                                                                                            xs={
                                                                                                                12
                                                                                                            }
                                                                                                        >
                                                                                                            <TextField
                                                                                                                fullWidth
                                                                                                                label="URL"
                                                                                                                value={
                                                                                                                    button.url ||
                                                                                                                    ""
                                                                                                                }
                                                                                                                onChange={(
                                                                                                                    e,
                                                                                                                ) => {
                                                                                                                    const updated =
                                                                                                                        form.data!.cta.buttons.map(
                                                                                                                            (
                                                                                                                                b,
                                                                                                                            ) =>
                                                                                                                                b.id ===
                                                                                                                                button.id
                                                                                                                                    ? {
                                                                                                                                          ...b,
                                                                                                                                          url: e
                                                                                                                                              .target
                                                                                                                                              .value,
                                                                                                                                      }
                                                                                                                                    : b,
                                                                                                                        );
                                                                                                                    form.setData(
                                                                                                                        {
                                                                                                                            ...form.data!,
                                                                                                                            cta: {
                                                                                                                                ...form
                                                                                                                                    .data!
                                                                                                                                    .cta,
                                                                                                                                buttons:
                                                                                                                                    updated,
                                                                                                                            },
                                                                                                                        },
                                                                                                                    );
                                                                                                                }}
                                                                                                                size="small"
                                                                                                                sx={{
                                                                                                                    "& .MuiOutlinedInput-root":
                                                                                                                        {
                                                                                                                            bgcolor:
                                                                                                                                "background.paper",
                                                                                                                        },
                                                                                                                }}
                                                                                                            />
                                                                                                        </Grid>
                                                                                                    )}
                                                                                                    <Grid
                                                                                                        item
                                                                                                        xs={
                                                                                                            12
                                                                                                        }
                                                                                                    >
                                                                                                        <FormControlLabel
                                                                                                            control={
                                                                                                                <Switch
                                                                                                                    checked={
                                                                                                                        button.isActive
                                                                                                                    }
                                                                                                                    onChange={(
                                                                                                                        e,
                                                                                                                    ) => {
                                                                                                                        const updated =
                                                                                                                            form.data!.cta.buttons.map(
                                                                                                                                (
                                                                                                                                    b,
                                                                                                                                ) =>
                                                                                                                                    b.id ===
                                                                                                                                    button.id
                                                                                                                                        ? {
                                                                                                                                              ...b,
                                                                                                                                              isActive:
                                                                                                                                                  e
                                                                                                                                                      .target
                                                                                                                                                      .checked,
                                                                                                                                          }
                                                                                                                                        : b,
                                                                                                                            );
                                                                                                                        form.setData(
                                                                                                                            {
                                                                                                                                ...form.data!,
                                                                                                                                cta: {
                                                                                                                                    ...form
                                                                                                                                        .data!
                                                                                                                                        .cta,
                                                                                                                                    buttons:
                                                                                                                                        updated,
                                                                                                                                },
                                                                                                                            },
                                                                                                                        );
                                                                                                                    }}
                                                                                                                    color="success"
                                                                                                                />
                                                                                                            }
                                                                                                            label={
                                                                                                                <Typography
                                                                                                                    variant="body2"
                                                                                                                    sx={{
                                                                                                                        fontWeight: 500,
                                                                                                                    }}
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
                                                                                                onClick={() =>
                                                                                                    handleDeleteButton(
                                                                                                        button.id,
                                                                                                    )
                                                                                                }
                                                                                                sx={{
                                                                                                    "&:hover":
                                                                                                        {
                                                                                                            bgcolor:
                                                                                                                "error.lighter",
                                                                                                        },
                                                                                                }}
                                                                                            >
                                                                                                <Trash2
                                                                                                    size={
                                                                                                        20
                                                                                                    }
                                                                                                />
                                                                                            </IconButton>
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
                                                onClick={form.save}
                                                disabled={form.isSaving}
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
                                                onClick={form.cancel}
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
                                                <MapPinIcon size={20} />
                                            </Box>
                                            <Box>
                                                <Typography
                                                    variant="h6"
                                                    sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                                >
                                                    Live Preview
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    See your changes in real-time
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <LocationPreview
                                            locationData={form.data}
                                            foundedYear={foundedYear}
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
                                                This preview updates in real-time as you make
                                                changes. The actual section may look slightly
                                                different based on screen size.
                                            </Typography>
                                        </Alert>
                                    </Paper>
                                </Box>
                            </Grid>
                        </Grid>
                    </>
                )}
            </Box>
        </PageContainer>
    );
};
