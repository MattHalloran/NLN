import {
    Box,
    Container,
    Grid,
    Typography,
    Card,
    CardContent,
    useTheme,
    Button,
} from "@mui/material";
import { useLocation } from "route";
import { Star, Home, Heart, Globe, Award, Leaf, TreePine, LucideIcon } from "lucide-react";
import { useLandingPage } from "hooks/useLandingPage";
import { COMPANY_INFO } from "@local/shared";

// Icon mapping for value cards
const VALUE_ICONS: Record<string, LucideIcon> = {
    star: Star,
    home: Home,
    heart: Heart,
    globe: Globe,
    award: Award,
    leaf: Leaf,
    tree: TreePine,
};

// Helper function to replace tokens in text (like {foundedYear})
const replaceTokens = (text: string, foundedYear: number): string => {
    return text.replace(/{foundedYear}/g, String(foundedYear));
};

// Type for value items
interface ValueItem {
    title: string;
    description: string;
    icon: string;
}

// Default values (fallback if API data not available)
const DEFAULT_VALUES = [
    {
        title: "Quality First",
        description:
            "We source only the healthiest plants and provide expert care guidance to ensure your success.",
        icon: "star",
    },
    {
        title: "Local Expertise",
        description:
            "40+ years of experience with Southern New Jersey growing conditions and climate-appropriate plant selection.",
        icon: "home",
    },
    {
        title: "Family Heritage",
        description:
            "Family-owned and operated by the Gianaris family, maintaining traditional values and expertise.",
        icon: "heart",
    },
    {
        title: "Sustainability",
        description:
            "Committed to environmentally responsible practices and promoting native plant species.",
        icon: "globe",
    },
];

export const AboutStory = () => {
    const { palette } = useTheme();
    const [, setLocation] = useLocation();
    const { data } = useLandingPage();

    // Get founded year from API or use default
    const foundedYear = data?.content?.company?.foundedYear || COMPANY_INFO.FoundedYear;

    // Get about section data from API or use defaults
    const aboutData = data?.content?.about;

    const storyData = aboutData?.story || {
        overline: "Our Story",
        title: "Growing Excellence Since {foundedYear}",
        subtitle:
            "What started as a family vision has grown into Southern New Jersey's premier wholesale nursery.",
        paragraphs: [
            "Founded by the Gianaris family in {foundedYear}, New Life Nursery Inc. began with a simple mission: to grow top quality material for buyers who are interested in the best. Today, after more than four decades, we continue as a family-owned and operated business, maintaining the traditional values and horticultural expertise that built our reputation.",
            "With over 70 acres in production in Bridgeton, New Jersey, we specialize in growing beautiful, healthy, and consistent plant material at competitive prices. Our wholesale operation serves landscape professionals and businesses throughout the region with sizes ranging from 3-gallon shrubs to 25-gallon specimen trees.",
        ],
        cta: {
            text: "Visit Our Nursery",
            link: "/about#contact",
        },
    };

    const valuesData = aboutData?.values || {
        title: "What Makes Us Different",
        items: DEFAULT_VALUES,
    };

    const missionData = aboutData?.mission || {
        title: "Our Mission",
        quote: "Growing top quality material for buyers who are interested in the best.",
        attribution: "The Gianaris Family",
    };

    // Replace tokens in text fields
    const title = replaceTokens(storyData.title, foundedYear);
    const subtitle = replaceTokens(storyData.subtitle, foundedYear);
    const paragraphs = storyData.paragraphs.map((p: string) => replaceTokens(p, foundedYear));

    return (
        <Box
            sx={{
                py: { xs: 6, md: 10 },
                backgroundColor: palette.primary.main,
                color: "white",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Background Pattern */}
            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0.1,
                    backgroundImage:
                        'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="white"/></svg>\')',
                    backgroundSize: "50px 50px",
                }}
            />

            <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
                <Grid container spacing={6} alignItems="center">
                    {/* Story Content */}
                    <Grid item xs={12} md={6}>
                        <Box>
                            <Typography
                                variant="overline"
                                sx={{
                                    color: palette.secondary.main,
                                    fontWeight: 600,
                                    letterSpacing: 2,
                                }}
                            >
                                {storyData.overline}
                            </Typography>

                            <Typography
                                variant="h3"
                                component="h2"
                                sx={{
                                    fontWeight: 700,
                                    mb: 3,
                                    fontSize: { xs: "2rem", md: "3rem" },
                                }}
                            >
                                {title}
                            </Typography>

                            <Typography
                                variant="h6"
                                sx={{
                                    mb: 3,
                                    opacity: 0.9,
                                    lineHeight: 1.6,
                                    fontSize: { xs: "1.1rem", md: "1.25rem" },
                                }}
                            >
                                {subtitle}
                            </Typography>

                            {paragraphs.map((paragraph: string, index: number) => (
                                <Typography
                                    key={index}
                                    variant="body1"
                                    sx={{
                                        mb: 3,
                                        opacity: 0.8,
                                        lineHeight: 1.8,
                                        fontSize: "1.1rem",
                                    }}
                                >
                                    {paragraph}
                                </Typography>
                            ))}

                            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    onClick={() => setLocation(storyData.cta.link)}
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
                                    {storyData.cta.text}
                                </Button>
                            </Box>
                        </Box>
                    </Grid>

                    {/* Values Grid */}
                    <Grid item xs={12} md={6}>
                        <Box>
                            <Typography
                                variant="h5"
                                sx={{
                                    fontWeight: 600,
                                    mb: 4,
                                    textAlign: { xs: "center", md: "left" },
                                }}
                            >
                                {valuesData.title}
                            </Typography>

                            <Grid container spacing={3}>
                                {valuesData.items.map((value: ValueItem, index: number) => {
                                    const IconComponent = VALUE_ICONS[value.icon] || Star;
                                    return (
                                        <Grid item xs={12} sm={6} key={index}>
                                            <Card
                                                sx={{
                                                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                                                    backdropFilter: "blur(10px)",
                                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                                    borderRadius: 3,
                                                    transition: "all 0.3s ease-in-out",
                                                    "&:hover": {
                                                        backgroundColor:
                                                            "rgba(255, 255, 255, 0.15)",
                                                        transform: "translateY(-4px)",
                                                    },
                                                }}
                                            >
                                                <CardContent sx={{ p: 3, textAlign: "center" }}>
                                                    <Box
                                                        sx={{
                                                            mb: 2,
                                                            display: "flex",
                                                            justifyContent: "center",
                                                            color: "white",
                                                        }}
                                                    >
                                                        <IconComponent size={40} />
                                                    </Box>

                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontWeight: 600,
                                                            mb: 1,
                                                            color: "white",
                                                        }}
                                                    >
                                                        {value.title}
                                                    </Typography>

                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            opacity: 0.9,
                                                            lineHeight: 1.6,
                                                            color: "white",
                                                        }}
                                                    >
                                                        {value.description}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Box>
                    </Grid>
                </Grid>

                {/* Mission Statement */}
                <Box
                    sx={{
                        mt: 8,
                        p: 4,
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        borderRadius: 3,
                        textAlign: "center",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                >
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 600,
                            mb: 2,
                        }}
                    >
                        {missionData.title}
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{
                            fontStyle: "italic",
                            opacity: 0.9,
                            maxWidth: "800px",
                            mx: "auto",
                            lineHeight: 1.6,
                        }}
                    >
                        "{missionData.quote}"
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            mt: 2,
                            opacity: 0.8,
                        }}
                    >
                        — {missionData.attribution}
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
};
