import {
    Box,
    Container,
    Grid,
    Typography,
    Card,
    CardContent,
    Button,
    useTheme,
    Chip,
    Divider,
    Alert,
} from "@mui/material";
import { useLocation } from "route";
import { Eye, Gift, Smartphone, Car, Clock, Phone, MapPin, Mail, Map, AlertCircle, Truck, Package, Users } from "lucide-react";
import { useLandingPage } from "hooks/useLandingPage";
import { parseBusinessHours, checkBusinessHoursStatus } from "utils/businessHours";
import { BusinessContext } from "contexts/BusinessContext";
import { useContext, useMemo } from "react";
import { COMPANY_INFO } from "@local/shared";

// Icon mapping for visit info items
const VISIT_INFO_ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    eye: Eye,
    gift: Gift,
    smartphone: Smartphone,
    car: Car,
    truck: Truck,
    "map-pin": MapPin,
    package: Package,
    users: Users,
};

// Helper function to replace tokens
const replaceTokens = (text: string, foundedYear: number): string => {
    return text.replace(/{foundedYear}/g, String(foundedYear));
};

export const LocationVisit = () => {
    const { palette } = useTheme();
    const [, setLocation] = useLocation();
    const business = useContext(BusinessContext);

    // Fetch business hours from API
    const { data } = useLandingPage();

    const foundedYear = data?.content?.company?.foundedYear || COMPANY_INFO.FoundedYear;

    const businessHoursStatus = useMemo(() => {
        return checkBusinessHoursStatus(business?.hours || data?.contact?.hours || "");
    }, [business?.hours, data?.contact?.hours]);

    // Get location content from API with fallbacks
    const locationContent = data?.content?.location;

    const headerTitle = locationContent?.header?.title || "Visit Our Nursery";
    const headerSubtitle = replaceTokens(
        locationContent?.header?.subtitle || `Southern New Jersey's premier wholesale nursery since {foundedYear}`,
        foundedYear
    );
    const headerChip = locationContent?.header?.chip || "Wholesale Only - Trade Customers Welcome";

    const mapSettings = locationContent?.map || {
        style: "gradient" as const,
        showGetDirectionsButton: true,
        buttonText: "Get Directions",
    };

    const contactMethodsConfig = locationContent?.contactMethods || {
        sectionTitle: "Get in Touch",
        order: ["phone" as const, "address" as const, "email" as const],
        descriptions: {
            phone: "Call for availability and wholesale pricing",
            address: "Visit our 70+ acre wholesale nursery facility",
            email: "Email us for quotes and availability lists",
        },
    };

    const businessHoursConfig = locationContent?.businessHours || {
        title: "Business Hours",
        chip: "Wholesale Hours - Trade Only",
    };

    // Visit info items from API with fallbacks
    const defaultVisitInfo = [
        {
            id: "1",
            title: "What to Expect",
            icon: "eye",
            description: "Browse over 70 acres of top-quality trees and shrubs, carefully grown for landscape professionals",
            displayOrder: 0,
            isActive: true,
        },
        {
            id: "2",
            title: "Wholesale Focus",
            icon: "gift",
            description: "Specializing in 3 to 25-gallon container plants for landscapers, contractors, and garden centers",
            displayOrder: 1,
            isActive: true,
        },
        {
            id: "3",
            title: "Professional Service",
            icon: "smartphone",
            description: "Expert horticultural advice from our experienced team with over 40 years in the industry",
            displayOrder: 2,
            isActive: true,
        },
        {
            id: "4",
            title: "Easy Access",
            icon: "car",
            description: "Convenient location in Bridgeton with ample parking and loading facilities for commercial vehicles",
            displayOrder: 3,
            isActive: true,
        },
    ];

    const visitInfoSectionTitle = locationContent?.visitInfo?.sectionTitle || "Plan Your Visit";
    const visitInfo = useMemo(() => {
        const items = locationContent?.visitInfo?.items || defaultVisitInfo;
        return items
            .filter((item) => item.isActive)
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((item) => ({
                title: item.title,
                icon: VISIT_INFO_ICON_MAP[item.icon] || Eye,
                description: item.description,
            }));
    }, [locationContent?.visitInfo?.items]);

    // CTA section from API with fallbacks
    const ctaConfig = locationContent?.cta || {
        title: "Ready to Visit?",
        description: "Wholesale customers welcome! Visit during business hours or call ahead for availability and pricing.",
        buttons: [
            {
                id: "1",
                text: "Get Directions",
                variant: "contained" as const,
                color: "primary" as const,
                action: "directions" as const,
                displayOrder: 0,
                isActive: true,
            },
            {
                id: "2",
                text: "Contact Us First",
                variant: "outlined" as const,
                color: "primary" as const,
                action: "contact" as const,
                displayOrder: 1,
                isActive: true,
            },
            {
                id: "3",
                text: "Browse Online First",
                variant: "text" as const,
                color: "secondary" as const,
                action: "external" as const,
                url: "https://newlife.online-orders.sbiteam.com/",
                displayOrder: 2,
                isActive: true,
            },
        ],
    };

    const ctaButtons = useMemo(() => {
        return ctaConfig.buttons
            .filter((btn) => btn.isActive)
            .sort((a, b) => a.displayOrder - b.displayOrder);
    }, [ctaConfig.buttons]);

    // Get real business hours from API or use fallback
    const businessHours = data?.contact?.hours
        ? parseBusinessHours(data.contact.hours)
        : [];
    const hours =
        businessHours.length > 0
            ? businessHours.map((hour) => {
                  const [day, time] = hour.split(": ");
                  return { day, time };
              })
            : [
                  { day: "Monday - Friday", time: "8:00 AM - 3:00 PM" },
                  { day: "Saturday", time: "Closed" },
                  { day: "Sunday", time: "Closed" },
                  { day: "Note", time: "Closed daily 12:00 PM - 1:00 PM" },
              ];

    // Build contact methods with dynamic ordering
    const contactMethodsMap = {
        phone: {
            method: "Phone",
            value: business?.PHONE?.Label || "(856) 455-3601",
            href: business?.PHONE?.Link || "tel:+18564553601",
            description: contactMethodsConfig.descriptions.phone,
            icon: Phone,
        },
        address: {
            method: "Address",
            value: business?.ADDRESS?.Label || "106 S Woodruff Rd, Bridgeton, NJ 08302",
            href:
                business?.ADDRESS?.Link ||
                "https://maps.google.com/?q=106+S+Woodruff+Rd+Bridgeton+NJ+08302",
            description: contactMethodsConfig.descriptions.address,
            icon: MapPin,
        },
        email: {
            method: "Email",
            value: business?.EMAIL?.Label || "info@newlifenurseryinc.com",
            href: business?.EMAIL?.Link || "mailto:info@newlifenurseryinc.com",
            description: contactMethodsConfig.descriptions.email,
            icon: Mail,
        },
    };

    const contactMethods = useMemo(() => {
        return contactMethodsConfig.order.map((key) => contactMethodsMap[key]).filter(Boolean);
    }, [contactMethodsConfig.order, business]);

    const getDirections = () => {
        // Use the dynamic link from business context, or fallback to hardcoded address
        const mapLink =
            business?.ADDRESS?.Link ||
            "https://maps.google.com/?q=106+S+Woodruff+Rd+Bridgeton+NJ+08302";
        window.open(mapLink, "_blank");
    };

    return (
        <Box sx={{ py: { xs: 6, md: 10 } }}>
            <Container maxWidth="lg">
                {/* Header */}
                <Box sx={{ textAlign: "center", mb: 6 }}>
                    <Typography
                        variant="h3"
                        component="h2"
                        sx={{
                            fontWeight: 700,
                            color: palette.primary.main,
                            mb: 2,
                            fontSize: { xs: "2rem", md: "3rem" },
                        }}
                    >
                        {headerTitle}
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{
                            color: palette.text.secondary,
                            maxWidth: "600px",
                            mx: "auto",
                            mb: 3,
                        }}
                    >
                        {headerSubtitle}
                    </Typography>
                    <Chip
                        label={headerChip}
                        color="primary"
                        sx={{ fontSize: "1rem", py: 2, px: 1 }}
                    />
                </Box>

                <Grid container spacing={6}>
                    {/* Map Placeholder & Directions */}
                    <Grid item xs={12} md={6}>
                        <Card
                            sx={{
                                borderRadius: 3,
                                overflow: "hidden",
                                boxShadow: 4,
                                mb: 3,
                            }}
                        >
                            {/* Map Placeholder */}
                            <Box
                                sx={{
                                    height: "300px",
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
                                            mb: 2,
                                            display: "flex",
                                            justifyContent: "center",
                                            color: "white",
                                        }}
                                    >
                                        <Map size={64} />
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                        {business?.BUSINESS_NAME?.Short || "New Life Nursery Inc."}
                                    </Typography>
                                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                                        {business?.ADDRESS?.Label ||
                                            "106 S Woodruff Rd, Bridgeton, NJ"}
                                    </Typography>
                                </Box>

                                {/* Interactive Map Overlay */}
                                {mapSettings.showGetDirectionsButton && (
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            bottom: 16,
                                            right: 16,
                                        }}
                                    >
                                        <Button
                                            variant="contained"
                                            color="secondary"
                                            onClick={getDirections}
                                            sx={{
                                                borderRadius: 2,
                                                textTransform: "none",
                                                fontWeight: 600,
                                            }}
                                        >
                                            {mapSettings.buttonText}
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        </Card>

                        {/* Contact Methods */}
                        <Box>
                            <Typography
                                variant="h6"
                                sx={{ fontWeight: 600, mb: 3, color: palette.primary.main }}
                            >
                                {contactMethodsConfig.sectionTitle}
                            </Typography>
                            {contactMethods.map((contact, index) => (
                                <Card
                                    key={index}
                                    component="a"
                                    href={contact.href}
                                    target={contact.href.startsWith("http") ? "_blank" : undefined}
                                    rel={
                                        contact.href.startsWith("http")
                                            ? "noopener noreferrer"
                                            : undefined
                                    }
                                    sx={{
                                        mb: 2,
                                        borderRadius: 2,
                                        transition: "all 0.3s ease-in-out",
                                        textDecoration: "none",
                                        cursor: "pointer",
                                        "&:hover": {
                                            boxShadow: 4,
                                            transform: "translateY(-2px)",
                                        },
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
                                                {(() => {
                                                    const IconComponent = contact.icon;
                                                    return <IconComponent size={24} />;
                                                })()}
                                            </Box>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography
                                                    variant="subtitle1"
                                                    sx={{ fontWeight: 600 }}
                                                >
                                                    {contact.method}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: palette.primary.main,
                                                        fontWeight: 600,
                                                        mb: 0.5,
                                                    }}
                                                >
                                                    {contact.value}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: palette.text.secondary }}
                                                >
                                                    {contact.description}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    </Grid>

                    {/* Hours & Visit Info */}
                    <Grid item xs={12} md={6}>
                        {/* Business Hours */}
                        <Card
                            sx={{
                                borderRadius: 3,
                                boxShadow: 4,
                                mb: 3,
                                background: `linear-gradient(135deg, ${palette.secondary.main} 0%, ${palette.primary.main} 100%)`,
                                color: "white",
                            }}
                        >
                            <CardContent sx={{ p: 4 }}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 1,
                                        mb: 3,
                                    }}
                                >
                                    <Clock size={24} color="white" />
                                    <Typography
                                        variant="h5"
                                        sx={{ fontWeight: 600, textAlign: "center" }}
                                    >
                                        {businessHoursConfig.title}
                                    </Typography>
                                </Box>
                                {hours.map((schedule, index) => (
                                    <Box key={index}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                py: 1.5,
                                            }}
                                        >
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {schedule.day}
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                {schedule.time}
                                            </Typography>
                                        </Box>
                                        {index < hours.length - 1 && (
                                            <Divider
                                                sx={{ backgroundColor: "rgba(255, 255, 255, 0.3)" }}
                                            />
                                        )}
                                    </Box>
                                ))}
                                <Box sx={{ textAlign: "center", mt: 3 }}>
                                    <Chip
                                        label={businessHoursConfig.chip}
                                        sx={{
                                            backgroundColor: "rgba(255, 255, 255, 0.2)",
                                            color: "white",
                                            fontWeight: 600,
                                        }}
                                        size="small"
                                    />
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Business Hours Status Alert */}
                        {!businessHoursStatus.isOpen && (
                            <Alert
                                severity="info"
                                icon={<AlertCircle size={18} />}
                                sx={{
                                    mb: 3,
                                    fontSize: "0.85rem",
                                    alignItems: "center",
                                    "& .MuiAlert-icon": {
                                        padding: "0",
                                        marginRight: "8px",
                                        alignItems: "center",
                                    },
                                    "& .MuiAlert-message": {
                                        padding: "0",
                                        display: "flex",
                                        alignItems: "center",
                                    },
                                }}
                            >
                                {businessHoursStatus.message}
                            </Alert>
                        )}

                        {/* Visit Information */}
                        <Box>
                            <Typography
                                variant="h6"
                                sx={{ fontWeight: 600, mb: 3, color: palette.primary.main }}
                            >
                                {visitInfoSectionTitle}
                            </Typography>
                            <Grid container spacing={2}>
                                {visitInfo.map((info, index) => (
                                    <Grid item xs={12} sm={6} key={index}>
                                        <Card
                                            sx={{
                                                height: "100%",
                                                borderRadius: 2,
                                                transition: "all 0.3s ease-in-out",
                                                "&:hover": {
                                                    boxShadow: 4,
                                                    transform: "translateY(-4px)",
                                                },
                                            }}
                                        >
                                            <CardContent sx={{ p: 3, textAlign: "center" }}>
                                                <Box
                                                    sx={{
                                                        mb: 1,
                                                        display: "flex",
                                                        justifyContent: "center",
                                                        color: palette.primary.main,
                                                    }}
                                                >
                                                    {(() => {
                                                        const IconComponent = info.icon;
                                                        return <IconComponent size={32} />;
                                                    })()}
                                                </Box>
                                                <Typography
                                                    variant="subtitle1"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: palette.primary.main,
                                                        mb: 1,
                                                    }}
                                                >
                                                    {info.title}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: palette.text.secondary,
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    {info.description}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    </Grid>
                </Grid>

                {/* Call to Action */}
                <Box
                    sx={{
                        mt: 6,
                        p: 4,
                        backgroundColor: palette.grey[50],
                        borderRadius: 3,
                        textAlign: "center",
                        border: `2px solid ${palette.primary.light}`,
                    }}
                >
                    <Typography
                        variant="h5"
                        sx={{ fontWeight: 600, mb: 2, color: palette.primary.main }}
                    >
                        {ctaConfig.title}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3, color: palette.text.secondary }}>
                        {ctaConfig.description}
                    </Typography>
                    <Box
                        sx={{
                            display: "flex",
                            gap: 2,
                            justifyContent: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        {ctaButtons.map((button) => {
                            const handleClick = () => {
                                switch (button.action) {
                                    case "directions":
                                        getDirections();
                                        break;
                                    case "contact":
                                        setLocation("/about#contact");
                                        break;
                                    case "external":
                                        if (button.url) {
                                            window.open(button.url, "_blank");
                                        }
                                        break;
                                }
                            };

                            return (
                                <Button
                                    key={button.id}
                                    variant={button.variant}
                                    color={button.color}
                                    size="large"
                                    onClick={handleClick}
                                    sx={{
                                        px: 4,
                                        py: 1.5,
                                        borderRadius: 2,
                                        textTransform: "none",
                                        fontWeight: 600,
                                    }}
                                >
                                    {button.text}
                                </Button>
                            );
                        })}
                    </Box>
                </Box>
            </Container>
        </Box>
    );
};
