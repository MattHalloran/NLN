import { Box, Container, Grid, Typography, Card, CardContent, useTheme, Button } from "@mui/material";
import { useLocation } from "route";
import { Star, Home, Heart, Globe } from "lucide-react";
import { useLandingPage } from "hooks/useLandingPage";
import { COMPANY_INFO } from "@local/shared";

export const AboutStory = () => {
    const { palette } = useTheme();
    const [, setLocation] = useLocation();
    const { data } = useLandingPage();

    const foundedYear = data?.content?.company?.foundedYear || COMPANY_INFO.FoundedYear;

    const values = [
        {
            title: "Quality First",
            description: "We source only the healthiest plants and provide expert care guidance to ensure your success.",
            icon: Star,
        },
        {
            title: "Local Expertise",
            description: "40+ years of experience with Southern New Jersey growing conditions and climate-appropriate plant selection.",
            icon: Home,
        },
        {
            title: "Family Heritage",
            description: "Family-owned and operated by the Gianaris family, maintaining traditional values and expertise.",
            icon: Heart,
        },
        {
            title: "Sustainability",
            description: "Committed to environmentally responsible practices and promoting native plant species.",
            icon: Globe,
        },
    ];

    return (
        <Box sx={{ 
            py: { xs: 6, md: 10 },
            backgroundColor: palette.primary.main,
            color: "white",
            position: "relative",
            overflow: "hidden",
        }}>
            {/* Background Pattern */}
            <Box sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.1,
                backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"2\" fill=\"white\"/></svg>')",
                backgroundSize: "50px 50px",
            }} />
            
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
                                Our Story
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
                                Growing Excellence Since {foundedYear}
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
                                What started as a family vision has grown into Southern New Jersey's premier wholesale nursery.
                            </Typography>
                            
                            <Typography 
                                variant="body1" 
                                sx={{ 
                                    mb: 3,
                                    opacity: 0.8,
                                    lineHeight: 1.8,
                                    fontSize: "1.1rem",
                                }}
                            >
                                Founded by the Gianaris family in {foundedYear}, New Life Nursery Inc. began with a simple mission:
                                to grow top quality material for buyers who are interested in the best. 
                                Today, after more than four decades, we continue as a family-owned and operated business, 
                                maintaining the traditional values and horticultural expertise that built our reputation.
                            </Typography>
                            
                            <Typography 
                                variant="body1" 
                                sx={{ 
                                    mb: 4,
                                    opacity: 0.8,
                                    lineHeight: 1.8,
                                    fontSize: "1.1rem",
                                }}
                            >
                                With over 70 acres in production in Bridgeton, New Jersey, we specialize in growing 
                                beautiful, healthy, and consistent plant material at competitive prices. Our wholesale operation 
                                serves landscape professionals and businesses throughout the region with sizes ranging from 
                                3-gallon shrubs to 25-gallon specimen trees.
                            </Typography>

                            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
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
                                    Visit Our Nursery
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
                                What Makes Us Different
                            </Typography>
                            
                            <Grid container spacing={3}>
                                {values.map((value, index) => (
                                    <Grid item xs={12} sm={6} key={index}>
                                        <Card sx={{
                                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                                            backdropFilter: "blur(10px)",
                                            border: "1px solid rgba(255, 255, 255, 0.2)",
                                            borderRadius: 3,
                                            transition: "all 0.3s ease-in-out",
                                            "&:hover": {
                                                backgroundColor: "rgba(255, 255, 255, 0.15)",
                                                transform: "translateY(-4px)",
                                            },
                                        }}>
                                            <CardContent sx={{ p: 3, textAlign: "center" }}>
                                                <Box sx={{ 
                                                    mb: 2,
                                                    display: "flex",
                                                    justifyContent: "center",
                                                    color: "white",
                                                }}>
                                                    {(() => {
                                                        const IconComponent = value.icon;
                                                        return <IconComponent size={40} />;
                                                    })()}
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
                                ))}
                            </Grid>
                        </Box>
                    </Grid>
                </Grid>

                {/* Mission Statement */}
                <Box sx={{
                    mt: 8,
                    p: 4,
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 3,
                    textAlign: "center",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                }}>
                    <Typography 
                        variant="h5" 
                        sx={{ 
                            fontWeight: 600,
                            mb: 2,
                        }}
                    >
                        Our Mission
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
                        "Growing top quality material for buyers who are interested in the best."
                    </Typography>
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            mt: 2,
                            opacity: 0.8,
                        }}
                    >
                        — The Gianaris Family
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
};
