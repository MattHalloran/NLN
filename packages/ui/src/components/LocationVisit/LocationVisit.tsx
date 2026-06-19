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
import { Clock, Phone, MapPin, Mail, Map, AlertCircle, Eye } from "lucide-react";
import { useLandingPage } from "hooks/useLandingPage";
import { parseBusinessHours, checkBusinessHoursStatus } from "utils/businessHours";
import { BusinessContext } from "contexts/BusinessContext";
import { useContext, useMemo } from "react";
import {
    activeByDisplayOrder,
    BUSINESS_CONTACT_DEFAULTS,
    buildGoogleMapsEmbedUrl,
    COMPANY_INFO,
    DEFAULT_BUSINESS_ADDRESS,
    DEFAULT_LOCATION_CONTENT,
    replaceLandingPageTokens,
} from "@local/shared";
import { resolveLandingPageIcon } from "utils/landingPageIcons";

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

    const headerTitle = locationContent?.header?.title || DEFAULT_LOCATION_CONTENT.header.title;
    const headerSubtitle = replaceLandingPageTokens(
        locationContent?.header?.subtitle || DEFAULT_LOCATION_CONTENT.header.subtitle,
        { foundedYear },
    );
    const headerChip = locationContent?.header?.chip || DEFAULT_LOCATION_CONTENT.header.chip;

    const mapSettings = locationContent?.map || DEFAULT_LOCATION_CONTENT.map;
    const mapAddress = business?.ADDRESS?.Label || DEFAULT_BUSINESS_ADDRESS;
    const googleMapsEmbedUrl = buildGoogleMapsEmbedUrl({
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY,
        address: mapAddress,
    });

    const contactMethodsConfig =
        locationContent?.contactMethods || DEFAULT_LOCATION_CONTENT.contactMethods;

    const businessHoursConfig =
        locationContent?.businessHours || DEFAULT_LOCATION_CONTENT.businessHours;

    const visitInfoSectionTitle =
        locationContent?.visitInfo?.sectionTitle || DEFAULT_LOCATION_CONTENT.visitInfo.sectionTitle;
    const visitInfo = useMemo(() => {
        const items = locationContent?.visitInfo?.items || DEFAULT_LOCATION_CONTENT.visitInfo.items;
        return activeByDisplayOrder(items).map((item) => ({
            title: item.title,
            icon: resolveLandingPageIcon(item.icon, Eye),
            description: item.description,
        }));
    }, [locationContent?.visitInfo?.items]);

    // CTA section from API with fallbacks
    const ctaConfig = locationContent?.cta || DEFAULT_LOCATION_CONTENT.cta;

    const ctaButtons = useMemo(() => {
        return activeByDisplayOrder(ctaConfig.buttons);
    }, [ctaConfig.buttons]);

    // Get real business hours from API or use fallback
    const businessHours = data?.contact?.hours ? parseBusinessHours(data.contact.hours) : [];
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
    const contactMethods = useMemo(() => {
        const contactMethodsMap = {
            phone: {
                method: "Phone",
                value: business?.PHONE?.Label || BUSINESS_CONTACT_DEFAULTS.phone.label,
                href: business?.PHONE?.Link || BUSINESS_CONTACT_DEFAULTS.phone.link,
                description: contactMethodsConfig.descriptions.phone,
                icon: Phone,
            },
            address: {
                method: "Address",
                value: business?.ADDRESS?.Label || BUSINESS_CONTACT_DEFAULTS.address.label,
                href: business?.ADDRESS?.Link || BUSINESS_CONTACT_DEFAULTS.address.mapsUrl,
                description: contactMethodsConfig.descriptions.address,
                icon: MapPin,
            },
            email: {
                method: "Email",
                value: business?.EMAIL?.Label || BUSINESS_CONTACT_DEFAULTS.email.label,
                href: business?.EMAIL?.Link || BUSINESS_CONTACT_DEFAULTS.email.link,
                description: contactMethodsConfig.descriptions.email,
                icon: Mail,
            },
        };
        return contactMethodsConfig.order.map((key) => contactMethodsMap[key]).filter(Boolean);
    }, [contactMethodsConfig.order, contactMethodsConfig.descriptions, business]);

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
                            {/* Map - Embedded or Gradient Placeholder */}
                            {mapSettings.style === "embedded" && googleMapsEmbedUrl ? (
                                // Embedded Google Maps iframe
                                <Box
                                    sx={{
                                        height: "400px",
                                        position: "relative",
                                        bgcolor: "grey.100",
                                    }}
                                >
                                    <iframe
                                        title="Location Map"
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        src={googleMapsEmbedUrl}
                                    />
                                    {/* Directions button overlay on embedded map */}
                                    {mapSettings.showGetDirectionsButton && (
                                        <Box
                                            sx={{
                                                position: "absolute",
                                                bottom: 16,
                                                right: 16,
                                                pointerEvents: "auto",
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
                                                    boxShadow: 3,
                                                }}
                                            >
                                                {mapSettings.buttonText}
                                            </Button>
                                        </Box>
                                    )}
                                </Box>
                            ) : (
                                // Gradient placeholder (original design)
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
                                            {business?.BUSINESS_NAME?.Short ||
                                                "New Life Nursery Inc."}
                                        </Typography>
                                        <Typography variant="body1" sx={{ opacity: 0.9 }}>
                                            {mapAddress}
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
                            )}
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
