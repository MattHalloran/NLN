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
import { Sprout, Leaf, Home, Truck, Package, Wrench, LucideIcon } from "lucide-react";
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
};

// Default services as fallback
const defaultServices: Service[] = [
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
                        Ready to get started?
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
                        Visit our nursery today or browse our online selection
                    </Typography>
                    <Box
                        sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}
                    >
                        <Button
                            variant="contained"
                            color="secondary"
                            size="large"
                            onClick={() =>
                                window.open("https://newlife.online-orders.sbiteam.com/", "_blank")
                            }
                            sx={{
                                px: 4,
                                py: 1.5,
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                            }}
                        >
                            Shop Online
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            onClick={() => setLocation("/about#contact")}
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
                            Visit Us
                        </Button>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
};
