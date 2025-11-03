// Code inspired by https://github.com/rmolinamir/hero-slider
import { Box, Button, Chip, Stack, Typography, useTheme } from "@mui/material";
import { useLandingPage } from "hooks/useLandingPage";
import { Award, Leaf, Users, Package, Shield, Heart } from "lucide-react";
import { useLocation } from "route";
import { getShortBusinessHours } from "utils/businessHours";
import { Slider } from "./Slider";
import { COMPANY_INFO } from "@local/shared";

// Icon mapping for trust badges (matches AdminHomepageHeroBanner)
const TRUST_BADGE_ICONS = {
    users: Users,
    award: Award,
    leaf: Leaf,
    package: Package,
    shield: Shield,
    heart: Heart,
};

interface HeroProps {
    text?: string;
    subtext?: string;
}

const DEFAULT_HERO_TEXT = "Beautiful, healthy plants";
const DEFAULT_HERO_SUBTEXT = "At competitive prices";

const textPopStyle = {
    padding: "0",
    color: "white",
    textAlign: "center",
    fontWeight: "600",
    textShadow: "2px 2px 4px rgba(0,0,0,0.8), 0px 0px 20px rgba(0,0,0,0.5)",
};

export const Hero = ({
    text = DEFAULT_HERO_TEXT,
    subtext = DEFAULT_HERO_SUBTEXT,
}: HeroProps = {}) => {
    const [, setLocation] = useLocation();
    const { palette } = useTheme();

    // Fetch unified landing page content using REST API
    const { data } = useLandingPage();

    const heroBanners = data?.content?.hero?.banners || [];
    const heroSettings = data?.content?.hero?.settings;
    const heroText = data?.content?.hero?.text;
    const companyInfo = data?.content?.company;

    // Convert hero banners to the format expected by Slider
    const images = heroBanners.map((banner) => ({
        hash: banner.id,
        alt: banner.alt,
        description: banner.description,
        files: [
            {
                src: banner.src,
                width: banner.width,
                height: banner.height,
            },
        ],
    }));

    return (
        <Box
            sx={{
                overflow: "hidden",
                pointerEvents: "none",
                position: "relative",
                minHeight: "80vh",
            }}
        >
            <Slider
                images={images}
                autoPlay={heroSettings?.autoPlay ?? true}
                slidingDelay={heroSettings?.autoPlayDelay ?? 3000}
                showDots={heroSettings?.showDots ?? true}
                showArrows={heroSettings?.showArrows ?? false}
                fadeTransition={heroSettings?.fadeTransition ?? false}
            />
            <Box
                sx={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexFlow: "column",
                    width: "100%",
                    height: "100%",
                    margin: "0",
                    padding: { xs: "20px", md: "40px" },
                    pointerEvents: "none",
                    background:
                        "linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0.6) 100%)",
                }}
            >
                {/* Trust badges with icons */}
                <Stack
                    direction="row"
                    spacing={2}
                    sx={{
                        mb: 4,
                        pointerEvents: "auto",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: 2,
                    }}
                >
                    {(
                        heroText?.trustBadges || [
                            {
                                icon: "users",
                                text: `Family Owned Since ${companyInfo?.foundedYear || COMPANY_INFO.FoundedYear}`,
                            },
                            { icon: "award", text: "Licensed & Certified" },
                            { icon: "leaf", text: "Wide Plant Selection" },
                        ]
                    ).map((badge, index) => {
                        const IconComponent =
                            TRUST_BADGE_ICONS[badge.icon as keyof typeof TRUST_BADGE_ICONS] || Leaf;
                        return (
                            <Chip
                                key={index}
                                icon={<IconComponent size={16} />}
                                label={badge.text}
                                sx={{
                                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                                    fontWeight: 600,
                                    fontSize: "0.9rem",
                                    py: 2.5,
                                    px: 1,
                                    "& .MuiChip-icon": { color: palette.primary.main },
                                }}
                            />
                        );
                    })}
                </Stack>

                <Typography
                    variant="h2"
                    component="h1"
                    sx={{
                        margin: "0 auto",
                        width: "90%",
                        fontSize: { xs: "2.5rem", sm: "3rem", md: "4rem", lg: "4.5rem" },
                        letterSpacing: "-0.02em",
                        lineHeight: 1.1,
                        ...textPopStyle,
                        fontWeight: 800,
                    }}
                >
                    {heroText?.title || text}
                </Typography>

                <Typography
                    variant="h4"
                    component="h2"
                    sx={{
                        margin: "20px auto 0",
                        width: "80%",
                        fontSize: { xs: "1.25rem", sm: "1.75rem", md: "2.25rem" },
                        ...textPopStyle,
                        fontWeight: 500,
                    }}
                >
                    {heroText?.subtitle || subtext}
                </Typography>

                {/* Value proposition */}
                <Typography
                    variant="h6"
                    sx={{
                        margin: "24px auto 0",
                        width: "90%",
                        maxWidth: "700px",
                        ...textPopStyle,
                        fontWeight: 400,
                        fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
                        lineHeight: 1.5,
                        opacity: 0.95,
                    }}
                >
                    {heroText?.description ||
                        "Serving the community for over 30 years with the finest selection of plants, trees, and expert gardening advice"}
                </Typography>

                {/* Multiple CTAs */}
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{
                        mt: 4,
                        pointerEvents: "auto",
                        width: "100%",
                        maxWidth: "500px",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    {(
                        heroText?.buttons || [
                            {
                                text: "Browse Plants",
                                link: "https://newlife.online-orders.sbiteam.com/",
                                type: "primary",
                            },
                            { text: "Visit Our Nursery", link: "/about", type: "secondary" },
                        ]
                    ).map((button, index) => (
                        <Button
                            key={index}
                            color={button.type === "primary" ? "secondary" : undefined}
                            onClick={() => {
                                if (button.link.startsWith("http")) {
                                    window.open(button.link, "_blank");
                                } else {
                                    setLocation(button.link);
                                }
                            }}
                            sx={{
                                minWidth: { xs: "260px", sm: "180px" },
                                py: 2,
                                px: 4,
                                fontSize: "1.1rem",
                                fontWeight: 700,
                                backgroundColor:
                                    button.type === "primary"
                                        ? undefined
                                        : "rgba(255, 255, 255, 0.95)",
                                color: button.type === "primary" ? undefined : palette.primary.main,
                                border:
                                    button.type === "primary"
                                        ? undefined
                                        : "2px solid rgba(255, 255, 255, 0.95)",
                                boxShadow: "0 4px 14px 0 rgba(0,0,0,0.4)",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                "&:hover": {
                                    backgroundColor:
                                        button.type === "primary" ? undefined : "white",
                                    borderColor: button.type === "primary" ? undefined : "white",
                                    transform: "translateY(-2px)",
                                    boxShadow: "0 6px 20px 0 rgba(0,0,0,0.5)",
                                },
                            }}
                            variant={button.type === "primary" ? "contained" : "outlined"}
                            size="large"
                        >
                            {button.text}
                        </Button>
                    ))}
                </Stack>

                {/* Business hours */}
                <Box
                    sx={{
                        mt: 4,
                        px: 3,
                        py: 1.5,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        backdropFilter: "blur(10px)",
                        borderRadius: 2,
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                >
                    <Typography
                        variant="body1"
                        sx={{
                            ...textPopStyle,
                            fontWeight: 500,
                            fontSize: { xs: "0.9rem", sm: "1rem" },
                            letterSpacing: "0.02em",
                        }}
                    >
                        {heroText?.useContactInfoHours && data?.contact?.hours
                            ? getShortBusinessHours(data.contact.hours)
                            : heroText?.businessHours || "Contact us for hours"}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};
