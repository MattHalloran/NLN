import {
    Box,
    Card,
    CardContent,
    Container,
    Grid,
    Typography,
    Chip,
    useTheme,
    Divider,
} from "@mui/material";
import { Building2, Users, TreePine, Clock, Award, Truck, Shield, Sprout, LucideIcon } from "lucide-react";
import { useContext, useMemo } from "react";
import { BusinessContext } from "contexts/BusinessContext";
import { getEarliestOpeningTime } from "utils/businessHours";
import { useLandingPage } from "hooks/useLandingPage";
import { COMPANY_INFO } from "@local/shared";

// Icon mapping for dynamic icon selection
const ICON_MAP: Record<string, LucideIcon> = {
    users: Users,
    award: Award,
    leaf: TreePine,
    clock: Clock,
    truck: Truck,
    shield: Shield,
    building: Building2,
    sprout: Sprout,
};

// Helper function to replace tokens in text
const replaceTokens = (text: string, foundedYear: number, yearsInBusiness: number): string => {
    return text
        .replace(/{foundedYear}/g, String(foundedYear))
        .replace(/{yearsInBusiness}/g, String(yearsInBusiness));
};

// Default client types (fallback if not in API)
const DEFAULT_CLIENT_TYPES = [
    { icon: "building", label: "Landscape Contractors" },
    { icon: "sprout", label: "Garden Centers" },
    { icon: "users", label: "Property Developers" },
    { icon: "leaf", label: "Municipalities" },
];

export const SocialProof = () => {
    const { palette } = useTheme();
    const business = useContext(BusinessContext);
    const { data } = useLandingPage();

    const foundedYear = data?.content?.company?.foundedYear || COMPANY_INFO.FoundedYear;
    const yearsInBusiness = new Date().getFullYear() - foundedYear;

    // Get social proof data from API or use computed defaults
    const socialProofData = data?.content?.socialProof;

    // Header
    const header = socialProofData?.header || {
        title: "Why Choose New Life Nursery",
        subtitle: "Southern New Jersey's trusted wholesale nursery partner for over four decades"
    };

    // Stats with token replacement
    const stats = useMemo(() => {
        const rawStats = socialProofData?.stats || [
            { number: `${yearsInBusiness}+`, label: "Years of Excellence", subtext: `Since ${foundedYear}` },
            { number: "100+", label: "Plant Varieties", subtext: "Extensive Selection" },
            { number: "3-25", label: "Gallon Sizes", subtext: "Full Range" },
            { number: "500+", label: "Trade Partners", subtext: "Wholesale Only" },
        ];
        return rawStats.map(stat => ({
            number: replaceTokens(stat.number, foundedYear, yearsInBusiness),
            label: stat.label,
            subtext: replaceTokens(stat.subtext, foundedYear, yearsInBusiness),
        }));
    }, [socialProofData, foundedYear, yearsInBusiness]);

    // Mission statement
    const mission = useMemo(() => {
        const rawMission = socialProofData?.mission || {
            title: `Our Founding Mission Since ${foundedYear}`,
            quote: "Growing top quality material for buyers who are interested in the best.",
            attribution: "The Gianaris Family"
        };
        return {
            title: replaceTokens(rawMission.title, foundedYear, yearsInBusiness),
            quote: rawMission.quote,
            attribution: rawMission.attribution,
        };
    }, [socialProofData, foundedYear, yearsInBusiness]);

    const earliestOpeningTime = useMemo(() => {
        if (!business?.hours) return null;
        return getEarliestOpeningTime(business.hours);
    }, [business]);

    // Strengths with token replacement
    const strengths = useMemo(() => {
        const rawStrengths = socialProofData?.strengths || {
            title: "What Sets Us Apart",
            items: [
                {
                    icon: "users",
                    title: "Family Heritage",
                    description: "Owned and operated by the Gianaris family for over four decades, maintaining traditional values and personal service.",
                    highlight: `Family-Owned Since ${foundedYear}`,
                },
                {
                    icon: "leaf",
                    title: "Extensive Inventory",
                    description: "We maintain one of Southern New Jersey's largest selections of quality nursery stock across a wide range of varieties and sizes.",
                    highlight: "Diverse Selection",
                },
                {
                    icon: "award",
                    title: "Quality Commitment",
                    description: "Our founding motto remains unchanged: Growing top quality material for buyers who are interested in the best.",
                    highlight: "Premium Quality Only",
                },
                {
                    icon: "clock",
                    title: "Trade-Friendly Hours",
                    description: earliestOpeningTime
                        ? `Opening at ${earliestOpeningTime}, we help contractors get loaded and to job sites early.`
                        : "We help contractors get loaded and to job sites early with convenient morning hours.",
                    highlight: earliestOpeningTime
                        ? `Early ${earliestOpeningTime} Opening`
                        : "Early Opening",
                },
                {
                    icon: "truck",
                    title: "Wholesale Expertise",
                    description: "Specializing exclusively in wholesale, we understand the unique needs of landscapers and contractors.",
                    highlight: "Trade Professionals Only",
                },
                {
                    icon: "shield",
                    title: "Licensed & Certified",
                    description: "Fully licensed New Jersey nursery meeting all state requirements for commercial plant production and sales.",
                    highlight: "NJ Licensed Nursery",
                },
            ]
        };

        return {
            title: rawStrengths.title,
            items: rawStrengths.items.map(item => ({
                icon: item.icon,
                title: item.title,
                description: item.description,
                highlight: replaceTokens(item.highlight, foundedYear, yearsInBusiness),
            })),
        };
    }, [socialProofData, earliestOpeningTime, foundedYear, yearsInBusiness]);

    // Client types
    const clientTypes = useMemo(() => {
        return socialProofData?.clientTypes || {
            title: "Proudly Serving Trade Professionals",
            items: DEFAULT_CLIENT_TYPES
        };
    }, [socialProofData]);

    // Footer with token replacement
    const footer = useMemo(() => {
        const rawFooter = socialProofData?.footer || {
            description: "References available upon request for qualified wholesale buyers",
            chips: ["Licensed NJ Nursery", "Wholesale Only", `Est. ${foundedYear}`]
        };
        return {
            description: rawFooter.description,
            chips: rawFooter.chips.map(chip => replaceTokens(chip, foundedYear, yearsInBusiness)),
        };
    }, [socialProofData, foundedYear, yearsInBusiness]);

    return (
        <Box sx={{ py: { xs: 6, md: 10 }, backgroundColor: palette.grey[50] }}>
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
                        {header.title}
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{
                            color: palette.text.secondary,
                            maxWidth: "700px",
                            mx: "auto",
                            fontSize: { xs: "1.1rem", md: "1.25rem" },
                        }}
                    >
                        {header.subtitle}
                    </Typography>
                </Box>

                {/* Stats Section */}
                <Grid container spacing={4} sx={{ mb: 8 }}>
                    {stats.map((stat, index) => (
                        <Grid item xs={6} md={3} key={index}>
                            <Card
                                sx={{
                                    textAlign: "center",
                                    p: 3,
                                    height: "100%",
                                    border: `1px solid ${palette.divider}`,
                                    transition: "all 0.3s ease-in-out",
                                    "&:hover": {
                                        boxShadow: 4,
                                        transform: "translateY(-4px)",
                                    },
                                }}
                            >
                                <Typography
                                    variant="h3"
                                    sx={{
                                        fontWeight: 800,
                                        color: palette.primary.main,
                                        fontSize: { xs: "2.5rem", md: "3rem" },
                                        mb: 1,
                                    }}
                                >
                                    {stat.number}
                                </Typography>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        color: palette.text.primary,
                                        fontWeight: 600,
                                        mb: 0.5,
                                        fontSize: { xs: "1rem", md: "1.1rem" },
                                    }}
                                >
                                    {stat.label}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: palette.text.secondary,
                                        fontStyle: "italic",
                                    }}
                                >
                                    {stat.subtext}
                                </Typography>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* Mission Statement */}
                <Box
                    sx={{
                        mb: 8,
                        p: 4,
                        backgroundColor: palette.primary.main,
                        color: "white",
                        borderRadius: 3,
                        textAlign: "center",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <Box
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            opacity: 0.1,
                            backgroundImage:
                                "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"2\" fill=\"white\"/></svg>')",
                            backgroundSize: "50px 50px",
                        }}
                    />

                    <Typography
                        variant="h5"
                        sx={{
                            mb: 3,
                            fontWeight: 600,
                            position: "relative",
                            zIndex: 1,
                        }}
                    >
                        {mission.title}
                    </Typography>
                    <Typography
                        variant="h4"
                        component="blockquote"
                        sx={{
                            fontStyle: "italic",
                            fontWeight: 400,
                            fontSize: { xs: "1.5rem", md: "2rem" },
                            lineHeight: 1.5,
                            maxWidth: "900px",
                            mx: "auto",
                            position: "relative",
                            zIndex: 1,
                        }}
                    >
                        "{mission.quote}"
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            mt: 2,
                            opacity: 0.9,
                            position: "relative",
                            zIndex: 1,
                        }}
                    >
                        — {mission.attribution}
                    </Typography>
                </Box>

                {/* Strengths Grid */}
                <Typography
                    variant="h4"
                    component="h3"
                    sx={{
                        fontWeight: 600,
                        color: palette.primary.main,
                        mb: 4,
                        textAlign: "center",
                    }}
                >
                    {strengths.title}
                </Typography>

                <Grid container spacing={4} sx={{ mb: 8 }}>
                    {strengths.items.map((strength, index) => {
                        const IconComponent = ICON_MAP[strength.icon] || Users;
                        return (
                            <Grid item xs={12} md={6} lg={4} key={index}>
                                <Card
                                    sx={{
                                        height: "100%",
                                        borderRadius: 2,
                                        transition: "all 0.3s ease-in-out",
                                        "&:hover": {
                                            boxShadow: 6,
                                            transform: "translateY(-4px)",
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                                            <Box
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    backgroundColor: palette.primary.main + "10",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                <IconComponent
                                                    size={28}
                                                    color={palette.primary.main}
                                                />
                                            </Box>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: palette.primary.main,
                                                        mb: 1,
                                                    }}
                                                >
                                                    {strength.title}
                                                </Typography>
                                                <Chip
                                                    label={strength.highlight}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{ mb: 2 }}
                                                />
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: palette.text.secondary,
                                                        lineHeight: 1.6,
                                                    }}
                                                >
                                                    {strength.description}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>

                {/* Who We Serve */}
                <Box
                    sx={{
                        textAlign: "center",
                        p: 4,
                        backgroundColor: "white",
                        borderRadius: 3,
                        border: `1px solid ${palette.divider}`,
                    }}
                >
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 600,
                            color: palette.primary.main,
                            mb: 3,
                        }}
                    >
                        {clientTypes.title}
                    </Typography>

                    <Grid container spacing={3} justifyContent="center">
                        {clientTypes.items.map((client, index) => {
                            const IconComponent = ICON_MAP[client.icon] || Building2;
                            return (
                                <Grid item xs={6} sm={3} key={index}>
                                    <Box
                                        sx={{
                                            p: 2,
                                            transition: "all 0.3s ease-in-out",
                                            "&:hover": {
                                                transform: "translateY(-4px)",
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                mb: 1,
                                                display: "flex",
                                                justifyContent: "center",
                                                color: palette.primary.main,
                                            }}
                                        >
                                            <IconComponent size={40} />
                                        </Box>
                                        <Typography
                                            variant="body1"
                                            sx={{
                                                fontWeight: 500,
                                                color: palette.text.primary,
                                            }}
                                        >
                                            {client.label}
                                        </Typography>
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>

                    <Divider sx={{ my: 3 }} />

                    <Typography
                        variant="body1"
                        sx={{
                            color: palette.text.secondary,
                            fontStyle: "italic",
                            mb: 2,
                        }}
                    >
                        {footer.description}
                    </Typography>

                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 2,
                            flexWrap: "wrap",
                        }}
                    >
                        {footer.chips.map((chip, index) => (
                            <Chip key={index} label={chip} color="primary" />
                        ))}
                    </Box>
                </Box>
            </Container>
        </Box>
    );
};
