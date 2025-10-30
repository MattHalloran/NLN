import {
    Box,
    Card,
    CardContent,
    Container,
    Grid,
    Typography,
    Button,
    useTheme,
} from "@mui/material";
import { useState } from "react";
import { useLocation } from "route";
import { Sprout, Leaf, Home, Truck, Package, Wrench, Headset, LucideIcon } from "lucide-react";
import { useLandingPage } from "hooks/useLandingPage";

interface Service {
    title: string;
    description: string;
    icon: string;
    action: string;
    url?: string;
}

// Icon mapping for service cards
const SERVICE_ICONS: Record<string, LucideIcon> = {
    sprout: Sprout,
    leaf: Leaf,
    home: Home,
    truck: Truck,
    package: Package,
    wrench: Wrench,
    headset: Headset,
};

// Default services as fallback
const defaultServices: Service[] = [
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
        description:
            "Order in quantity with competitive wholesale pricing.",
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
];

export const ServiceShowcase = () => {
    const { palette } = useTheme();
    const [, setLocation] = useLocation();
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const { data: landingPageData } = useLandingPage();

    // Get services from content or use defaults
    const servicesConfig = landingPageData?.content?.services;
    const services = servicesConfig?.items || defaultServices;
    const sectionTitle = servicesConfig?.title || "Our Services";
    const sectionSubtitle =
        servicesConfig?.subtitle || "Everything you need to create and maintain your perfect garden";

    // Get CTA section config or use defaults
    const ctaConfig = servicesConfig?.cta || {
        title: "Ready to get started?",
        subtitle: "Browse our online catalog or contact us to discuss your project needs",
        primaryButton: {
            text: "Shop Online",
            url: "https://newlife.online-orders.sbiteam.com/"
        },
        secondaryButton: {
            text: "Contact Us",
            url: "/about#contact"
        }
    };

    const handleAction = (service: Service) => {
        if (service.url?.startsWith("http")) {
            window.open(service.url, "_blank");
        } else {
            setLocation(service.url || "/");
        }
    };

    return (
        <Box
            sx={{
                py: { xs: 6, md: 10 },
                backgroundColor: palette.grey[50],
            }}
        >
            <Container maxWidth="lg">
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
                        {sectionTitle}
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{
                            color: palette.text.secondary,
                            maxWidth: "600px",
                            mx: "auto",
                            fontSize: { xs: "1.1rem", md: "1.25rem" },
                        }}
                    >
                        {sectionSubtitle}
                    </Typography>
                </Box>

                <Grid container spacing={4}>
                    {services.map((service: Service, index: number) => (
                        <Grid item xs={12} sm={6} md={3} key={index}>
                            <Card
                                sx={{
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    transition: "all 0.3s ease-in-out",
                                    transform:
                                        hoveredCard === index
                                            ? "translateY(-8px)"
                                            : "translateY(0)",
                                    boxShadow: hoveredCard === index ? 8 : 2,
                                    cursor: "pointer",
                                    border: `1px solid ${palette.divider}`,
                                    "&:hover": {
                                        boxShadow: 8,
                                        transform: "translateY(-8px)",
                                    },
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
                                        p: 3,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            mb: 2,
                                            display: "flex",
                                            justifyContent: "center",
                                            color: palette.primary.main,
                                        }}
                                    >
                                        {(() => {
                                            const IconComponent = SERVICE_ICONS[service.icon] || Sprout;
                                            return <IconComponent size={48} />;
                                        })()}
                                    </Box>

                                    <Typography
                                        variant="h6"
                                        component="h3"
                                        sx={{
                                            fontWeight: 600,
                                            color: palette.primary.main,
                                            mb: 2,
                                            minHeight: "2.5rem",
                                            display: "flex",
                                            alignItems: "center",
                                        }}
                                    >
                                        {service.title}
                                    </Typography>

                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: palette.text.secondary,
                                            flexGrow: 1,
                                            mb: 3,
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        {service.description}
                                    </Typography>

                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        onClick={() => handleAction(service)}
                                        sx={{
                                            borderRadius: 2,
                                            textTransform: "none",
                                            fontWeight: 600,
                                            px: 3,
                                            py: 1,
                                            transition: "all 0.2s ease-in-out",
                                            "&:hover": {
                                                backgroundColor: palette.primary.main,
                                                color: "white",
                                            },
                                        }}
                                    >
                                        {service.action}
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* Call to action section */}
                <Box
                    sx={{
                        textAlign: "center",
                        mt: 8,
                        p: 4,
                        backgroundColor: palette.primary.main,
                        borderRadius: 3,
                        color: "white",
                    }}
                >
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                        {ctaConfig.title}
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
                        {ctaConfig.subtitle}
                    </Typography>
                    <Box
                        sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}
                    >
                        <Button
                            variant="contained"
                            color="secondary"
                            size="large"
                            onClick={() => {
                                if (ctaConfig.primaryButton.url.startsWith("http")) {
                                    window.open(ctaConfig.primaryButton.url, "_blank");
                                } else {
                                    setLocation(ctaConfig.primaryButton.url);
                                }
                            }}
                            sx={{
                                px: 4,
                                py: 1.5,
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                            }}
                        >
                            {ctaConfig.primaryButton.text}
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            onClick={() => {
                                if (ctaConfig.secondaryButton.url.startsWith("http")) {
                                    window.open(ctaConfig.secondaryButton.url, "_blank");
                                } else {
                                    setLocation(ctaConfig.secondaryButton.url);
                                }
                            }}
                            sx={{
                                px: 4,
                                py: 1.5,
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                                borderColor: "white",
                                color: "white",
                                "&:hover": {
                                    borderColor: "white",
                                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                                },
                            }}
                        >
                            {ctaConfig.secondaryButton.text}
                        </Button>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
};
