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
import { Building2, Users, TreePine, Clock, Award, Truck, Shield, Sprout } from "lucide-react";
import { useContext, useMemo } from "react";
import { BusinessContext } from "contexts/BusinessContext";
import { getEarliestOpeningTime } from "utils/businessHours";
import { useLandingPageContent } from "api/rest/hooks";
import { COMPANY_INFO } from "@local/shared";

const clientTypes = [
    { icon: Building2, label: "Landscape Contractors" },
    { icon: Sprout, label: "Garden Centers" },
    { icon: Users, label: "Property Developers" },
    { icon: TreePine, label: "Municipalities" },
];

export const SocialProof = () => {
    const { palette } = useTheme();
    const business = useContext(BusinessContext);
    const { data } = useLandingPageContent(true);

    const foundedYear = data?.settings?.companyInfo?.foundedYear || COMPANY_INFO.FoundedYear;

    const stats = useMemo(() => [
        { number: `${new Date().getFullYear() - foundedYear}+`, label: "Years of Excellence", subtext: `Since ${foundedYear}` },
        { number: "100+", label: "Plant Varieties", subtext: "Extensive Selection" },
        { number: "3-25", label: "Gallon Sizes", subtext: "Full Range" },
        { number: "500+", label: "Trade Partners", subtext: "Wholesale Only" },
    ], [foundedYear]);

    const earliestOpeningTime = useMemo(() => {
        if (!business?.hours) return null;
        return getEarliestOpeningTime(business.hours);
    }, [business]);

    const strengths = useMemo(
        () => [
            {
                icon: Users,
                title: "Family Heritage",
                description:
                    "Owned and operated by the Gianaris family for over four decades, maintaining traditional values and personal service.",
                highlight: `Family-Owned Since ${foundedYear}`,
            },
            {
                icon: TreePine,
                title: "Extensive Inventory",
                description:
                    "We maintain one of Southern New Jersey's largest selections of quality nursery stock across a wide range of varieties and sizes.",
                highlight: "Diverse Selection",
            },
            {
                icon: Award,
                title: "Quality Commitment",
                description:
                    "Our founding motto remains unchanged: Growing top quality material for buyers who are interested in the best.",
                highlight: "Premium Quality Only",
            },
            {
                icon: Clock,
                title: "Trade-Friendly Hours",
                description: earliestOpeningTime
                    ? `Opening at ${earliestOpeningTime}, we help contractors get loaded and to job sites early.`
                    : "We help contractors get loaded and to job sites early with convenient morning hours.",
                highlight: earliestOpeningTime
                    ? `Early ${earliestOpeningTime} Opening`
                    : "Early Opening",
            },
            {
                icon: Truck,
                title: "Wholesale Expertise",
                description:
                    "Specializing exclusively in wholesale, we understand the unique needs of landscapers and contractors.",
                highlight: "Trade Professionals Only",
            },
            {
                icon: Shield,
                title: "Licensed & Certified",
                description:
                    "Fully licensed New Jersey nursery meeting all state requirements for commercial plant production and sales.",
                highlight: "NJ Licensed Nursery",
            },
        ],
        [earliestOpeningTime, foundedYear],
    );

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
                        Why Choose New Life Nursery
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
                        Southern New Jersey's trusted wholesale nursery partner for over four
                        decades
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
                                'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="white"/></svg>\')',
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
                        Our Founding Mission Since {foundedYear}
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
                        "Growing top quality material for buyers who are interested in the best."
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
                        — The Gianaris Family
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
                    What Sets Us Apart
                </Typography>

                <Grid container spacing={4} sx={{ mb: 8 }}>
                    {strengths.map((strength, index) => (
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
                                            {(() => {
                                                const IconComponent = strength.icon;
                                                return (
                                                    <IconComponent
                                                        size={28}
                                                        color={palette.primary.main}
                                                    />
                                                );
                                            })()}
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
                    ))}
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
                        Proudly Serving Trade Professionals
                    </Typography>

                    <Grid container spacing={3} justifyContent="center">
                        {clientTypes.map((client, index) => (
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
                                        {(() => {
                                            const IconComponent = client.icon;
                                            return <IconComponent size={40} />;
                                        })()}
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
                        ))}
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
                        References available upon request for qualified wholesale buyers
                    </Typography>

                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 2,
                            flexWrap: "wrap",
                        }}
                    >
                        <Chip label="Licensed NJ Nursery" color="primary" />
                        <Chip label="Wholesale Only" color="primary" />
                        <Chip label={`Est. ${foundedYear}`} color="primary" />
                    </Box>
                </Box>
            </Container>
        </Box>
    );
};
