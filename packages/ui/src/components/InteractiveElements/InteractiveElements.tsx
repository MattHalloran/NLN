import { 
    Box, 
    Container, 
    Grid, 
    Typography, 
    Card, 
    CardContent, 
    TextField, 
    Button, 
    Chip, 
    useTheme,
    CardMedia,
    IconButton,
    Tab,
    Tabs
} from "@mui/material";
import { useState, useEffect } from "react";
import { useLandingPageContent } from "api/rest/hooks";
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Leaf, Lightbulb, Sprout, Flower, Snowflake, LucideIcon, Star } from "lucide-react";

interface SeasonalPlant {
    id: string;
    name: string;
    description: string;
    season: string;
    careLevel: string;
    icon: string;
    displayOrder: number;
    isActive: boolean;
}

interface PlantTip {
    id: string;
    title: string;
    description: string;
    category: string;
    season: string;
    displayOrder: number;
    isActive: boolean;
}

// Icon mapping for different plant types
const getIconComponent = (iconName: string): LucideIcon => {
    switch (iconName) {
        case "leaf": return Leaf;
        case "flower": 
        case "flower2": return Flower;
        case "snowflake": return Snowflake;
        case "sprout": return Sprout;
        case "star": return Star;
        default: return Leaf;
    }
};

export const InteractiveElements = () => {
    const { palette } = useTheme();
    const [currentPlant, setCurrentPlant] = useState(0);
    const [selectedTipCategory, setSelectedTipCategory] = useState(0);
    const [email, setEmail] = useState("");
    const [subscribed, setSubscribed] = useState(false);

    // Fetch landing page content using REST API
    const { data, loading, error } = useLandingPageContent(true);

    const seasonalPlants = data?.seasonalPlants || [];
    const plantTips = data?.plantTips || [];
    const settings = data?.settings;

    // Get unique categories from tips
    const tipCategories = ["All", ...Array.from(new Set(plantTips.map(tip => tip.category)))];
    
    const filteredTips = selectedTipCategory === 0 
        ? plantTips 
        : plantTips.filter(tip => tip.category === tipCategories[selectedTipCategory]);

    // Reset current plant if index is out of bounds
    useEffect(() => {
        if (currentPlant >= seasonalPlants.length && seasonalPlants.length > 0) {
            setCurrentPlant(0);
        }
    }, [seasonalPlants.length, currentPlant]);

    const nextPlant = () => {
        setCurrentPlant((prev) => (prev + 1) % seasonalPlants.length);
    };

    const prevPlant = () => {
        setCurrentPlant((prev) => (prev - 1 + seasonalPlants.length) % seasonalPlants.length);
    };

    const handleNewsletterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            setSubscribed(true);
            setTimeout(() => {
                setSubscribed(false);
                setEmail("");
            }, 3000);
        }
    };

    const getCareColor = (level: string) => {
        switch (level) {
            case "Easy": return palette.success.main;
            case "Medium": return palette.warning.main;
            case "Advanced": return palette.error.main;
            default: return palette.grey[500];
        }
    };

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
                            fontSize: { xs: "2rem", md: "3rem" }
                        }}
                    >
                        Seasonal Highlights & Expert Tips
                    </Typography>
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            color: palette.text.secondary,
                            maxWidth: "600px",
                            mx: "auto"
                        }}
                    >
                        Discover what's blooming now and get expert care advice for every season
                    </Typography>
                </Box>

                <Grid container spacing={6}>
                    {/* Seasonal Plants Carousel */}
                    <Grid item xs={12} md={6}>
                        <Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                                <Leaf size={24} color={palette.primary.main} />
                                <Typography 
                                    variant="h5" 
                                    sx={{ 
                                        fontWeight: 600,
                                        color: palette.primary.main
                                    }}
                                >
                                    What's Blooming Now
                                </Typography>
                            </Box>
                            
                            <Card sx={{
                                borderRadius: 3,
                                boxShadow: 4,
                                overflow: "hidden",
                                position: "relative"
                            }}>
                                <Box sx={{ 
                                    display: "flex", 
                                    alignItems: "center",
                                    minHeight: "300px",
                                    background: `linear-gradient(135deg, ${palette.primary.light} 0%, ${palette.secondary.light} 100%)`,
                                    position: "relative"
                                }}>
                                    {/* Navigation Arrows */}
                                    <IconButton
                                        onClick={prevPlant}
                                        sx={{
                                            position: "absolute",
                                            left: 16,
                                            zIndex: 2,
                                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                                            "&:hover": {
                                                backgroundColor: "white"
                                            }
                                        }}
                                    >
                                        <ArrowBackIosIcon />
                                    </IconButton>

                                    <IconButton
                                        onClick={nextPlant}
                                        sx={{
                                            position: "absolute",
                                            right: 16,
                                            zIndex: 2,
                                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                                            "&:hover": {
                                                backgroundColor: "white"
                                            }
                                        }}
                                    >
                                        <ArrowForwardIosIcon />
                                    </IconButton>

                                    {/* Plant Content */}
                                    <Box sx={{ 
                                        width: "100%",
                                        textAlign: "center",
                                        p: 4,
                                        color: "white"
                                    }}>
                                        <Box sx={{ 
                                            mb: 2,
                                            display: "flex",
                                            justifyContent: "center",
                                            color: "white"
                                        }}>
                                            {seasonalPlants.length > 0 && (() => {
                                                const IconComponent = getIconComponent(seasonalPlants[currentPlant]?.icon || "leaf");
                                                return <IconComponent size={64} />;
                                            })()}
                                        </Box>
                                        
                                        {seasonalPlants.length > 0 && (
                                            <>
                                                <Typography 
                                                    variant="h5" 
                                                    sx={{ 
                                                        fontWeight: 600,
                                                        mb: 1,
                                                        textShadow: "1px 1px 2px rgba(0,0,0,0.3)"
                                                    }}
                                                >
                                                    {seasonalPlants[currentPlant]?.name || "Loading..."}
                                                </Typography>
                                                
                                                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 2 }}>
                                                    <Chip 
                                                        label={seasonalPlants[currentPlant]?.season || "Season"}
                                                        color="secondary"
                                                        size="small"
                                                    />
                                                    <Chip 
                                                        label={seasonalPlants[currentPlant]?.careLevel || "Easy"}
                                                        sx={{
                                                            backgroundColor: getCareColor(seasonalPlants[currentPlant]?.careLevel || "Easy"),
                                                            color: "white"
                                                        }}
                                                        size="small"
                                                    />
                                                </Box>
                                                
                                                <Typography 
                                                    variant="body1" 
                                                    sx={{ 
                                                        opacity: 0.9,
                                                        textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
                                                        lineHeight: 1.6
                                                    }}
                                                >
                                                    {seasonalPlants[currentPlant]?.description || "Loading plant information..."}
                                                </Typography>
                                            </>
                                        )}
                                    </Box>
                                </Box>

                                {/* Plant Navigation Dots */}
                                <Box sx={{ 
                                    display: "flex", 
                                    justifyContent: "center", 
                                    gap: 1, 
                                    p: 2,
                                    backgroundColor: "white"
                                }}>
                                    {seasonalPlants.map((_, index) => (
                                        <Box
                                            key={index}
                                            onClick={() => setCurrentPlant(index)}
                                            sx={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: "50%",
                                                backgroundColor: index === currentPlant ? palette.primary.main : palette.grey[300],
                                                cursor: "pointer",
                                                transition: "all 0.3s ease-in-out",
                                                "&:hover": {
                                                    backgroundColor: palette.primary.main,
                                                    transform: "scale(1.2)"
                                                }
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Card>
                        </Box>
                    </Grid>

                    {/* Plant Care Tips */}
                    <Grid item xs={12} md={6}>
                        <Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                                <Lightbulb size={24} color={palette.primary.main} />
                                <Typography 
                                    variant="h5" 
                                    sx={{ 
                                        fontWeight: 600,
                                        color: palette.primary.main
                                    }}
                                >
                                    Expert Plant Care Tips
                                </Typography>
                            </Box>

                            {/* Tip Category Tabs */}
                            <Tabs
                                value={selectedTipCategory}
                                onChange={(_, newValue) => setSelectedTipCategory(newValue)}
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{ mb: 3 }}
                            >
                                {tipCategories.map((category, index) => (
                                    <Tab 
                                        key={index}
                                        label={category}
                                        sx={{ textTransform: "none", fontWeight: 600 }}
                                    />
                                ))}
                            </Tabs>

                            {/* Tips List */}
                            <Box sx={{ maxHeight: "400px", overflowY: "auto" }}>
                                {filteredTips.map((tip, index) => (
                                    <Card key={index} sx={{
                                        mb: 2,
                                        borderRadius: 2,
                                        transition: "all 0.3s ease-in-out",
                                        "&:hover": {
                                            boxShadow: 4,
                                            transform: "translateX(4px)"
                                        }
                                    }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                                                <Typography 
                                                    variant="h6" 
                                                    sx={{ 
                                                        fontWeight: 600,
                                                        color: palette.primary.main,
                                                        flexGrow: 1
                                                    }}
                                                >
                                                    {tip.title}
                                                </Typography>
                                                <Box sx={{ display: "flex", gap: 0.5 }}>
                                                    <Chip 
                                                        label={tip.category}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                    <Chip 
                                                        label={tip.season}
                                                        size="small"
                                                        color="secondary"
                                                        variant="outlined"
                                                    />
                                                </Box>
                                            </Box>
                                            <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                    color: palette.text.secondary,
                                                    lineHeight: 1.6
                                                }}
                                            >
                                                {tip.description}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Box>
                        </Box>
                    </Grid>
                </Grid>

                {/* Newsletter Signup */}
                <Box sx={{
                    mt: 8,
                    p: 4,
                    background: `linear-gradient(135deg, ${palette.secondary.main} 0%, ${palette.primary.main} 100%)`,
                    borderRadius: 3,
                    textAlign: "center",
                    color: "white"
                }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 2 }}>
                        <Sprout size={24} color="white" />
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {settings?.newsletter?.title || "Stay in the Grow"}
                        </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
                        {settings?.newsletter?.description || "Get seasonal care tips, new arrival notifications, and exclusive offers delivered to your inbox"}
                    </Typography>
                    
                    {!subscribed ? (
                        <Box
                            component="form"
                            onSubmit={handleNewsletterSubmit}
                            sx={{
                                display: "flex",
                                gap: 2,
                                maxWidth: "500px",
                                mx: "auto",
                                flexDirection: { xs: "column", sm: "row" }
                            }}
                        >
                            <TextField
                                type="email"
                                placeholder="Enter your email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                sx={{
                                    flexGrow: 1,
                                    "& .MuiOutlinedInput-root": {
                                        backgroundColor: "white",
                                        borderRadius: 2
                                    }
                                }}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                color="secondary"
                                size="large"
                                sx={{
                                    px: 4,
                                    borderRadius: 2,
                                    textTransform: "none",
                                    fontWeight: 600,
                                    minWidth: { xs: "100%", sm: "150px" }
                                }}
                            >
                                Subscribe
                            </Button>
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="h6" sx={{ color: palette.secondary.main, fontWeight: 600 }}>
                                ✅ Thank you for subscribing!
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                                You'll receive our next seasonal guide in your inbox soon.
                            </Typography>
                        </Box>
                    )}
                    
                    <Typography variant="caption" sx={{ display: "block", mt: 2, opacity: 0.8 }}>
                        {settings?.newsletter?.disclaimer || "No spam, just helpful gardening tips. Unsubscribe anytime."}
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
};