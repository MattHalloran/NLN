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
import { Star } from "lucide-react";
import { useLandingPage } from "hooks/useLandingPage";
import { COMPANY_INFO, DEFAULT_ABOUT_CONTENT, replaceLandingPageTokens } from "@local/shared";
import { resolveLandingPageIcon } from "utils/landingPageIcons";

export const AboutStory = () => {
    const { palette } = useTheme();
    const [, setLocation] = useLocation();
    const { data } = useLandingPage();

    // Get founded year from API or use default
    const foundedYear = data?.content?.company?.foundedYear || COMPANY_INFO.FoundedYear;

    // Get about section data from API or use defaults
    const aboutData = data?.content?.about;

    const storyData = aboutData?.story || DEFAULT_ABOUT_CONTENT.story;

    const valuesData = aboutData?.values || DEFAULT_ABOUT_CONTENT.values;

    const missionData = aboutData?.mission || DEFAULT_ABOUT_CONTENT.mission;

    // Replace tokens in text fields
    const title = replaceLandingPageTokens(storyData.title, { foundedYear });
    const subtitle = replaceLandingPageTokens(storyData.subtitle, { foundedYear });
    const paragraphs = storyData.paragraphs.map((p: string) =>
        replaceLandingPageTokens(p, { foundedYear }),
    );

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
                                {valuesData.items.map((value, index: number) => {
                                    const IconComponent = resolveLandingPageIcon(value.icon, Star);
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
