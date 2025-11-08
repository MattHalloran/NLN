import { APP_LINKS, COMPANY_INFO } from "@local/shared";
import {
    Box,
    Button,
    Card,
    CardContent,
    TextField,
    Typography,
    Alert,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Grid,
    useTheme,
    Paper,
} from "@mui/material";
import {
    Plus,
    Trash2,
    GripVertical,
    Star,
    Home,
    Heart,
    Globe,
    Award,
    Leaf,
    TreePine,
    BookOpen,
    FileText as TextFieldsIcon,
    Target as ValuesIcon,
    Zap as MissionIcon,
} from "lucide-react";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { BackButton, PageContainer } from "components";
import { ABTestEditingBanner } from "components/admin/ABTestEditingBanner";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLandingPage } from "hooks/useLandingPage";
import { useABTestQueryParams } from "hooks/useABTestQueryParams";
import { useUpdateLandingPageContent } from "api/rest/hooks";
import { useBlockNavigation } from "hooks/useBlockNavigation";
import { useState, useEffect, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PubSub } from "utils/pubsub";
import { SnackSeverity } from "components/dialogs/Snack/Snack";

// Available icons for value cards
const VALUE_ICONS = [
    { value: "star", label: "Star", icon: Star },
    { value: "home", label: "Home", icon: Home },
    { value: "heart", label: "Heart", icon: Heart },
    { value: "globe", label: "Globe", icon: Globe },
    { value: "award", label: "Award", icon: Award },
    { value: "leaf", label: "Leaf", icon: Leaf },
    { value: "tree", label: "Tree", icon: TreePine },
];

interface ValueItem {
    icon: string;
    title: string;
    description: string;
}

interface StoryData {
    overline: string;
    title: string;
    subtitle: string;
    paragraphs: string[];
    cta: {
        text: string;
        link: string;
    };
}

interface ValuesData {
    title: string;
    items: ValueItem[];
}

interface MissionData {
    title: string;
    quote: string;
    attribution: string;
}

interface AboutData {
    story: StoryData;
    values: ValuesData;
    mission: MissionData;
}

// Icon mapping
const VALUE_ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    star: Star,
    home: Home,
    heart: Heart,
    globe: Globe,
    award: Award,
    leaf: Leaf,
    tree: TreePine,
};

// Helper function to replace tokens
const replaceTokens = (text: string, foundedYear: number): string => {
    return text.replace(/{foundedYear}/g, String(foundedYear));
};

// Default data
const getDefaultAboutData = (): AboutData => ({
    story: {
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
    },
    values: {
        title: "What Makes Us Different",
        items: [
            {
                icon: "star",
                title: "Quality First",
                description:
                    "We source only the healthiest plants and provide expert care guidance to ensure your success.",
            },
            {
                icon: "home",
                title: "Local Expertise",
                description:
                    "40+ years of experience with Southern New Jersey growing conditions and climate-appropriate plant selection.",
            },
            {
                icon: "heart",
                title: "Family Heritage",
                description:
                    "Family-owned and operated by the Gianaris family, maintaining traditional values and expertise.",
            },
            {
                icon: "globe",
                title: "Sustainability",
                description:
                    "Committed to environmentally responsible practices and promoting native plant species.",
            },
        ],
    },
    mission: {
        title: "Our Mission",
        quote: "Growing top quality material for buyers who are interested in the best.",
        attribution: "The Gianaris Family",
    },
});

// Preview component that shows how the about section will look
const AboutStoryPreview = ({
    aboutData,
    foundedYear,
}: {
    aboutData: AboutData;
    foundedYear: number;
}) => {
    const { palette } = useTheme();

    const storyData = aboutData.story;
    const valuesData = aboutData.values;
    const missionData = aboutData.mission;

    // Replace tokens in text fields
    const title = replaceTokens(storyData.title, foundedYear);
    const subtitle = replaceTokens(storyData.subtitle, foundedYear);
    const paragraphs = storyData.paragraphs.map((p: string) => replaceTokens(p, foundedYear));

    return (
        <Box
            sx={{
                position: "relative",
                width: "100%",
                minHeight: "600px",
                overflow: "auto",
                borderRadius: 2,
                border: "2px solid",
                borderColor: "divider",
                backgroundColor: palette.primary.main,
                color: "white",
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

            <Box sx={{ position: "relative", zIndex: 1, p: 3 }}>
                {/* Story Content - Simplified for preview */}
                <Box sx={{ mb: 4 }}>
                    <Typography
                        variant="overline"
                        sx={{
                            color: palette.secondary.main,
                            fontWeight: 600,
                            letterSpacing: 2,
                            fontSize: "0.7rem",
                        }}
                    >
                        {storyData.overline}
                    </Typography>

                    <Typography
                        variant="h5"
                        component="h2"
                        sx={{
                            fontWeight: 700,
                            mb: 2,
                            fontSize: "1.5rem",
                        }}
                    >
                        {title}
                    </Typography>

                    <Typography
                        variant="body1"
                        sx={{
                            mb: 2,
                            opacity: 0.9,
                            lineHeight: 1.6,
                            fontSize: "0.9rem",
                        }}
                    >
                        {subtitle}
                    </Typography>

                    {paragraphs.slice(0, 1).map((paragraph: string, index: number) => (
                        <Typography
                            key={index}
                            variant="body2"
                            sx={{
                                mb: 2,
                                opacity: 0.8,
                                lineHeight: 1.6,
                                fontSize: "0.8rem",
                            }}
                        >
                            {paragraph.length > 200
                                ? paragraph.substring(0, 200) + "..."
                                : paragraph}
                        </Typography>
                    ))}

                    <Button
                        variant="outlined"
                        size="small"
                        sx={{
                            px: 2,
                            py: 0.5,
                            borderRadius: 1,
                            textTransform: "none",
                            fontWeight: 600,
                            borderColor: "white",
                            color: "white",
                            fontSize: "0.75rem",
                            pointerEvents: "none",
                            "&:hover": {
                                borderColor: "white",
                            },
                        }}
                    >
                        {storyData.cta.text}
                    </Button>
                </Box>

                {/* Values Grid - Simplified */}
                <Box sx={{ mb: 4 }}>
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 600,
                            mb: 2,
                            fontSize: "1rem",
                        }}
                    >
                        {valuesData.title}
                    </Typography>

                    <Grid container spacing={2}>
                        {valuesData.items.slice(0, 4).map((value: any, index: number) => {
                            const IconComponent = VALUE_ICON_MAP[value.icon] || Star;
                            return (
                                <Grid item xs={6} key={index}>
                                    <Card
                                        sx={{
                                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                                            backdropFilter: "blur(10px)",
                                            border: "1px solid rgba(255, 255, 255, 0.2)",
                                            borderRadius: 2,
                                        }}
                                    >
                                        <CardContent sx={{ p: 2, textAlign: "center" }}>
                                            <Box
                                                sx={{
                                                    mb: 1,
                                                    display: "flex",
                                                    justifyContent: "center",
                                                    color: "white",
                                                }}
                                            >
                                                <IconComponent size={24} />
                                            </Box>

                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    fontWeight: 600,
                                                    mb: 0.5,
                                                    color: "white",
                                                    fontSize: "0.8rem",
                                                }}
                                            >
                                                {value.title}
                                            </Typography>

                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    opacity: 0.9,
                                                    lineHeight: 1.4,
                                                    color: "white",
                                                    fontSize: "0.7rem",
                                                    display: "block",
                                                }}
                                            >
                                                {value.description.length > 80
                                                    ? value.description.substring(0, 80) + "..."
                                                    : value.description}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>

                {/* Mission Statement */}
                <Box
                    sx={{
                        p: 2,
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        borderRadius: 2,
                        textAlign: "center",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                >
                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontWeight: 600,
                            mb: 1,
                            fontSize: "0.9rem",
                        }}
                    >
                        {missionData.title}
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            fontStyle: "italic",
                            opacity: 0.9,
                            lineHeight: 1.6,
                            fontSize: "0.8rem",
                        }}
                    >
                        "{missionData.quote}"
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            mt: 1,
                            opacity: 0.8,
                            display: "block",
                            fontSize: "0.7rem",
                        }}
                    >
                        — {missionData.attribution}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export const AdminHomepageAbout = () => {
    const { palette } = useTheme();
    const { data: landingPageData, refetch } = useLandingPage();
    const { mutate: updateContent } = useUpdateLandingPageContent();
    const { variantId } = useABTestQueryParams();

    // State for form data and change tracking
    const [aboutData, setAboutData] = useState<AboutData>(getDefaultAboutData());
    const [originalAboutData, setOriginalAboutData] = useState<AboutData>(getDefaultAboutData());
    const [isLoading, setIsLoading] = useState(false);

    // Get founded year
    const foundedYear = landingPageData?.content?.company?.foundedYear || COMPANY_INFO.FoundedYear;

    // Load initial data
    useEffect(() => {
        if (landingPageData?.content?.about) {
            setAboutData(landingPageData.content.about);
            setOriginalAboutData(JSON.parse(JSON.stringify(landingPageData.content.about)));
        } else {
            const defaultData = getDefaultAboutData();
            setAboutData(defaultData);
            setOriginalAboutData(JSON.parse(JSON.stringify(defaultData)));
        }
    }, [landingPageData]);

    // Check for changes using useMemo
    const hasChanges = useMemo(() => {
        return JSON.stringify(aboutData) !== JSON.stringify(originalAboutData);
    }, [aboutData, originalAboutData]);

    // Block navigation when there are unsaved changes
    useBlockNavigation(hasChanges);

    const handleApiError = (error: any, defaultMessage: string) => {
        const message = error?.message || defaultMessage;
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Error });
    };

    const handleApiSuccess = (message: string) => {
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Success });
    };

    // Story section handlers
    const updateStoryField = (field: keyof StoryData, value: any) => {
        setAboutData((prev) => ({
            ...prev,
            story: { ...prev.story, [field]: value },
        }));
    };

    const updateParagraph = (index: number, value: string) => {
        setAboutData((prev) => ({
            ...prev,
            story: {
                ...prev.story,
                paragraphs: prev.story.paragraphs.map((p, i) => (i === index ? value : p)),
            },
        }));
    };

    const addParagraph = () => {
        setAboutData((prev) => ({
            ...prev,
            story: {
                ...prev.story,
                paragraphs: [...prev.story.paragraphs, ""],
            },
        }));
    };

    const removeParagraph = (index: number) => {
        if (aboutData.story.paragraphs.length <= 1) {
            handleApiError(
                new Error("At least one paragraph is required"),
                "Cannot remove last paragraph",
            );
            return;
        }
        setAboutData((prev) => ({
            ...prev,
            story: {
                ...prev.story,
                paragraphs: prev.story.paragraphs.filter((_, i) => i !== index),
            },
        }));
    };

    // Values section handlers
    const updateValuesTitle = (value: string) => {
        setAboutData((prev) => ({
            ...prev,
            values: { ...prev.values, title: value },
        }));
    };

    const updateValueItem = (index: number, field: keyof ValueItem, value: string) => {
        setAboutData((prev) => ({
            ...prev,
            values: {
                ...prev.values,
                items: prev.values.items.map((item, i) =>
                    i === index ? { ...item, [field]: value } : item,
                ),
            },
        }));
    };

    const addValueItem = () => {
        setAboutData((prev) => ({
            ...prev,
            values: {
                ...prev.values,
                items: [...prev.values.items, { icon: "star", title: "", description: "" }],
            },
        }));
    };

    const removeValueItem = (index: number) => {
        if (aboutData.values.items.length <= 1) {
            handleApiError(
                new Error("At least one value item is required"),
                "Cannot remove last value item",
            );
            return;
        }
        setAboutData((prev) => ({
            ...prev,
            values: {
                ...prev.values,
                items: prev.values.items.filter((_, i) => i !== index),
            },
        }));
    };

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(aboutData.values.items);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setAboutData((prev) => ({
            ...prev,
            values: { ...prev.values, items },
        }));
    };

    // Mission section handlers
    const updateMissionField = (field: keyof MissionData, value: string) => {
        setAboutData((prev) => ({
            ...prev,
            mission: { ...prev.mission, [field]: value },
        }));
    };

    // Save and reset handlers
    const handleSaveAllChanges = async () => {
        try {
            setIsLoading(true);

            const queryParams = variantId ? { variantId } : undefined;

            await updateContent({
                data: { about: aboutData },
                queryParams,
            });

            await refetch();
            handleApiSuccess("About section settings saved successfully!");

            // Update original values
            setOriginalAboutData(JSON.parse(JSON.stringify(aboutData)));
        } catch (error: any) {
            handleApiError(error, "Failed to save changes");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelChanges = () => {
        setAboutData(JSON.parse(JSON.stringify(originalAboutData)));
    };

    return (
        <PageContainer variant="wide" sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="About Story Settings"
                help="Configure your company story, values, and mission statement"
                startComponent={
                    <BackButton
                        to={APP_LINKS.AdminHomepage}
                        ariaLabel="Back to Homepage Management"
                    />
                }
            />

            <Box p={2}>
                <ABTestEditingBanner />

                {/* Unsaved changes warning */}
                {hasChanges && (
                    <Alert
                        severity="warning"
                        sx={{
                            mb: 3,
                            borderLeft: "4px solid",
                            borderColor: "warning.main",
                            bgcolor: "warning.lighter",
                            "& .MuiAlert-icon": {
                                color: "warning.main",
                            },
                        }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            You have unsaved changes. Don't forget to save before leaving!
                        </Typography>
                    </Alert>
                )}

                {/* Action Buttons at Top */}
                {hasChanges && (
                    <Paper
                        elevation={0}
                        sx={{
                            mb: 3,
                            p: 2,
                            display: "flex",
                            gap: 2,
                            bgcolor: "grey.50",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                        }}
                    >
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleSaveAllChanges}
                            disabled={isLoading}
                            sx={{
                                px: 4,
                                fontWeight: 600,
                                boxShadow: 2,
                                "&:hover": {
                                    boxShadow: 4,
                                },
                            }}
                        >
                            {isLoading ? "Saving..." : "Save All Changes"}
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            onClick={handleCancelChanges}
                            sx={{
                                px: 4,
                                fontWeight: 600,
                                borderWidth: 2,
                                "&:hover": {
                                    borderWidth: 2,
                                },
                            }}
                        >
                            Cancel
                        </Button>
                    </Paper>
                )}

                {/* Two-column layout: Controls on left, Preview on right */}
                <Grid container spacing={3}>
                    {/* Left Column - Editing Controls */}
                    <Grid item xs={12} lg={7}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {/* Preview on Mobile Only */}
                            <Box sx={{ display: { xs: "block", lg: "none" } }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        bgcolor: "background.paper",
                                        borderRadius: 2,
                                        border: "2px solid",
                                        borderColor: "divider",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1.5,
                                            mb: 3,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 36,
                                                height: 36,
                                                borderRadius: 1.5,
                                                bgcolor: "primary.main",
                                                color: "white",
                                            }}
                                        >
                                            <BookOpen size={20} />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
                                                Live Preview
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                See your changes in real-time
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <AboutStoryPreview
                                        aboutData={aboutData}
                                        foundedYear={foundedYear}
                                    />
                                    <Alert
                                        severity="info"
                                        sx={{
                                            mt: 2,
                                            bgcolor: "info.lighter",
                                            border: "1px solid",
                                            borderColor: "info.light",
                                        }}
                                    >
                                        <Typography variant="caption">
                                            This preview updates in real-time as you make changes.
                                        </Typography>
                                    </Alert>
                                </Paper>
                            </Box>

                            {/* Accordion 1: Story Section */}
                            <Accordion
                                defaultExpanded
                                sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: "8px !important",
                                    "&:before": { display: "none" },
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                    mb: 2,
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{
                                        bgcolor: "grey.50",
                                        borderRadius: "8px 8px 0 0",
                                        minHeight: 64,
                                        "&:hover": {
                                            bgcolor: "grey.100",
                                        },
                                        "& .MuiAccordionSummary-content": {
                                            my: 2,
                                        },
                                    }}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 40,
                                                height: 40,
                                                borderRadius: 2,
                                                bgcolor: "primary.main",
                                                color: "white",
                                            }}
                                        >
                                            <TextFieldsIcon size={20} />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
                                                Story Section
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Configure company story and narrative
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Overline Text"
                                                value={aboutData.story.overline}
                                                onChange={(e) =>
                                                    updateStoryField("overline", e.target.value)
                                                }
                                                helperText="Small text that appears above the title"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Title"
                                                value={aboutData.story.title}
                                                onChange={(e) =>
                                                    updateStoryField("title", e.target.value)
                                                }
                                                helperText="Main headline (use {foundedYear} for dynamic year)"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Subtitle"
                                                value={aboutData.story.subtitle}
                                                onChange={(e) =>
                                                    updateStoryField("subtitle", e.target.value)
                                                }
                                                multiline
                                                rows={2}
                                                helperText="Introductory text below the title"
                                            />
                                        </Grid>

                                        {/* Paragraphs */}
                                        <Grid item xs={12}>
                                            <Typography
                                                variant="subtitle1"
                                                sx={{ fontWeight: 600, mb: 2 }}
                                            >
                                                Story Paragraphs
                                            </Typography>
                                            {aboutData.story.paragraphs.map((paragraph, index) => (
                                                <Box
                                                    key={index}
                                                    sx={{
                                                        mb: 2,
                                                        display: "flex",
                                                        gap: 1,
                                                        alignItems: "flex-start",
                                                    }}
                                                >
                                                    <TextField
                                                        fullWidth
                                                        label={`Paragraph ${index + 1}`}
                                                        value={paragraph}
                                                        onChange={(e) =>
                                                            updateParagraph(index, e.target.value)
                                                        }
                                                        multiline
                                                        rows={4}
                                                    />
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => removeParagraph(index)}
                                                        disabled={
                                                            aboutData.story.paragraphs.length <= 1
                                                        }
                                                    >
                                                        <Trash2 size={20} />
                                                    </IconButton>
                                                </Box>
                                            ))}
                                            <Button
                                                startIcon={<Plus size={20} />}
                                                onClick={addParagraph}
                                                variant="outlined"
                                                size="small"
                                            >
                                                Add Paragraph
                                            </Button>
                                        </Grid>

                                        {/* CTA Button */}
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="CTA Button Text"
                                                value={aboutData.story.cta.text}
                                                onChange={(e) =>
                                                    updateStoryField("cta", {
                                                        ...aboutData.story.cta,
                                                        text: e.target.value,
                                                    })
                                                }
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="CTA Button Link"
                                                value={aboutData.story.cta.link}
                                                onChange={(e) =>
                                                    updateStoryField("cta", {
                                                        ...aboutData.story.cta,
                                                        link: e.target.value,
                                                    })
                                                }
                                                helperText="Internal links start with /, external with http"
                                            />
                                        </Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 2: Values Section */}
                            <Accordion
                                defaultExpanded
                                sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: "8px !important",
                                    "&:before": { display: "none" },
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                    mb: 2,
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{
                                        bgcolor: "grey.50",
                                        borderRadius: "8px 8px 0 0",
                                        minHeight: 64,
                                        "&:hover": {
                                            bgcolor: "grey.100",
                                        },
                                        "& .MuiAccordionSummary-content": {
                                            my: 2,
                                        },
                                    }}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 40,
                                                height: 40,
                                                borderRadius: 2,
                                                bgcolor: "secondary.main",
                                                color: "white",
                                            }}
                                        >
                                            <ValuesIcon size={20} />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
                                                Values Section
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Define company values and differentiators
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Values Section Title"
                                                value={aboutData.values.title}
                                                onChange={(e) => updateValuesTitle(e.target.value)}
                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Typography
                                                variant="subtitle1"
                                                sx={{ fontWeight: 600, mb: 2 }}
                                            >
                                                Value Items (Drag to reorder)
                                            </Typography>
                                            <DragDropContext onDragEnd={onDragEnd}>
                                                <Droppable droppableId="values">
                                                    {(provided) => (
                                                        <div
                                                            {...provided.droppableProps}
                                                            ref={provided.innerRef}
                                                        >
                                                            {aboutData.values.items.map(
                                                                (item, index) => (
                                                                    <Draggable
                                                                        key={index}
                                                                        draggableId={`value-${index}`}
                                                                        index={index}
                                                                    >
                                                                        {(provided, snapshot) => (
                                                                            <Card
                                                                                ref={
                                                                                    provided.innerRef
                                                                                }
                                                                                {...provided.draggableProps}
                                                                                sx={{
                                                                                    mb: 2,
                                                                                    opacity:
                                                                                        snapshot.isDragging
                                                                                            ? 0.8
                                                                                            : 1,
                                                                                    backgroundColor:
                                                                                        snapshot.isDragging
                                                                                            ? palette
                                                                                                  .action
                                                                                                  .hover
                                                                                            : "white",
                                                                                }}
                                                                            >
                                                                                <CardContent>
                                                                                    <Box
                                                                                        sx={{
                                                                                            display:
                                                                                                "flex",
                                                                                            gap: 2,
                                                                                            mb: 2,
                                                                                            alignItems:
                                                                                                "center",
                                                                                        }}
                                                                                    >
                                                                                        <div
                                                                                            {...provided.dragHandleProps}
                                                                                        >
                                                                                            <GripVertical
                                                                                                size={
                                                                                                    24
                                                                                                }
                                                                                                style={{
                                                                                                    cursor: "grab",
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                        <Typography
                                                                                            variant="subtitle2"
                                                                                            sx={{
                                                                                                flexGrow: 1,
                                                                                            }}
                                                                                        >
                                                                                            Value
                                                                                            Item{" "}
                                                                                            {index +
                                                                                                1}
                                                                                        </Typography>
                                                                                        <IconButton
                                                                                            color="error"
                                                                                            size="small"
                                                                                            onClick={() =>
                                                                                                removeValueItem(
                                                                                                    index,
                                                                                                )
                                                                                            }
                                                                                            disabled={
                                                                                                aboutData
                                                                                                    .values
                                                                                                    .items
                                                                                                    .length <=
                                                                                                1
                                                                                            }
                                                                                        >
                                                                                            <Trash2
                                                                                                size={
                                                                                                    18
                                                                                                }
                                                                                            />
                                                                                        </IconButton>
                                                                                    </Box>

                                                                                    <Grid
                                                                                        container
                                                                                        spacing={2}
                                                                                    >
                                                                                        <Grid
                                                                                            item
                                                                                            xs={12}
                                                                                            sm={4}
                                                                                        >
                                                                                            <FormControl
                                                                                                fullWidth
                                                                                                size="small"
                                                                                            >
                                                                                                <InputLabel>
                                                                                                    Icon
                                                                                                </InputLabel>
                                                                                                <Select
                                                                                                    value={
                                                                                                        item.icon
                                                                                                    }
                                                                                                    label="Icon"
                                                                                                    onChange={(
                                                                                                        e,
                                                                                                    ) =>
                                                                                                        updateValueItem(
                                                                                                            index,
                                                                                                            "icon",
                                                                                                            e
                                                                                                                .target
                                                                                                                .value,
                                                                                                        )
                                                                                                    }
                                                                                                >
                                                                                                    {VALUE_ICONS.map(
                                                                                                        (
                                                                                                            iconOption,
                                                                                                        ) => {
                                                                                                            const IconComponent =
                                                                                                                iconOption.icon;
                                                                                                            return (
                                                                                                                <MenuItem
                                                                                                                    key={
                                                                                                                        iconOption.value
                                                                                                                    }
                                                                                                                    value={
                                                                                                                        iconOption.value
                                                                                                                    }
                                                                                                                >
                                                                                                                    <Box
                                                                                                                        sx={{
                                                                                                                            display:
                                                                                                                                "flex",
                                                                                                                            alignItems:
                                                                                                                                "center",
                                                                                                                            gap: 1,
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        <IconComponent
                                                                                                                            size={
                                                                                                                                16
                                                                                                                            }
                                                                                                                        />
                                                                                                                        {
                                                                                                                            iconOption.label
                                                                                                                        }
                                                                                                                    </Box>
                                                                                                                </MenuItem>
                                                                                                            );
                                                                                                        },
                                                                                                    )}
                                                                                                </Select>
                                                                                            </FormControl>
                                                                                        </Grid>
                                                                                        <Grid
                                                                                            item
                                                                                            xs={12}
                                                                                            sm={8}
                                                                                        >
                                                                                            <TextField
                                                                                                fullWidth
                                                                                                label="Title"
                                                                                                size="small"
                                                                                                value={
                                                                                                    item.title
                                                                                                }
                                                                                                onChange={(
                                                                                                    e,
                                                                                                ) =>
                                                                                                    updateValueItem(
                                                                                                        index,
                                                                                                        "title",
                                                                                                        e
                                                                                                            .target
                                                                                                            .value,
                                                                                                    )
                                                                                                }
                                                                                            />
                                                                                        </Grid>
                                                                                        <Grid
                                                                                            item
                                                                                            xs={12}
                                                                                        >
                                                                                            <TextField
                                                                                                fullWidth
                                                                                                label="Description"
                                                                                                multiline
                                                                                                rows={
                                                                                                    2
                                                                                                }
                                                                                                value={
                                                                                                    item.description
                                                                                                }
                                                                                                onChange={(
                                                                                                    e,
                                                                                                ) =>
                                                                                                    updateValueItem(
                                                                                                        index,
                                                                                                        "description",
                                                                                                        e
                                                                                                            .target
                                                                                                            .value,
                                                                                                    )
                                                                                                }
                                                                                            />
                                                                                        </Grid>
                                                                                    </Grid>
                                                                                </CardContent>
                                                                            </Card>
                                                                        )}
                                                                    </Draggable>
                                                                ),
                                                            )}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </DragDropContext>

                                            <Button
                                                startIcon={<Plus size={20} />}
                                                onClick={addValueItem}
                                                variant="outlined"
                                                size="small"
                                            >
                                                Add Value Item
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 3: Mission Section */}
                            <Accordion
                                defaultExpanded
                                sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: "8px !important",
                                    "&:before": { display: "none" },
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                    mb: 2,
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{
                                        bgcolor: "grey.50",
                                        borderRadius: "8px 8px 0 0",
                                        minHeight: 64,
                                        "&:hover": {
                                            bgcolor: "grey.100",
                                        },
                                        "& .MuiAccordionSummary-content": {
                                            my: 2,
                                        },
                                    }}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 40,
                                                height: 40,
                                                borderRadius: 2,
                                                bgcolor: "success.main",
                                                color: "white",
                                            }}
                                        >
                                            <MissionIcon size={20} />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
                                                Mission Section
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Define your company mission statement
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Mission Title"
                                                value={aboutData.mission.title}
                                                onChange={(e) =>
                                                    updateMissionField("title", e.target.value)
                                                }
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Mission Quote"
                                                value={aboutData.mission.quote}
                                                onChange={(e) =>
                                                    updateMissionField("quote", e.target.value)
                                                }
                                                multiline
                                                rows={3}
                                                helperText="The main mission statement quote"
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Attribution"
                                                value={aboutData.mission.attribution}
                                                onChange={(e) =>
                                                    updateMissionField(
                                                        "attribution",
                                                        e.target.value,
                                                    )
                                                }
                                                helperText="Who the quote is attributed to"
                                            />
                                        </Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>

                            {/* Action Buttons at Bottom */}
                            {hasChanges && (
                                <Paper
                                    elevation={0}
                                    sx={{
                                        mt: 3,
                                        p: 2,
                                        display: "flex",
                                        gap: 2,
                                        bgcolor: "grey.50",
                                        border: "1px solid",
                                        borderColor: "divider",
                                        borderRadius: 2,
                                    }}
                                >
                                    <Button
                                        variant="contained"
                                        size="large"
                                        onClick={handleSaveAllChanges}
                                        disabled={isLoading}
                                        sx={{
                                            px: 4,
                                            fontWeight: 600,
                                            boxShadow: 2,
                                            "&:hover": {
                                                boxShadow: 4,
                                            },
                                        }}
                                    >
                                        {isLoading ? "Saving..." : "Save All Changes"}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        onClick={handleCancelChanges}
                                        sx={{
                                            px: 4,
                                            fontWeight: 600,
                                            borderWidth: 2,
                                            "&:hover": {
                                                borderWidth: 2,
                                            },
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </Paper>
                            )}

                            {/* Help Text */}
                            <Alert severity="info" sx={{ mt: 3 }}>
                                <Typography variant="caption">
                                    <strong>Tip:</strong> Use the token {"{foundedYear}"} in any
                                    text field to automatically display your company's founding year
                                    (currently: {foundedYear}). This keeps your content dynamic and
                                    up-to-date.
                                </Typography>
                            </Alert>
                        </Box>
                    </Grid>

                    {/* Right Column - Live Preview (Desktop only, sticky) */}
                    <Grid item xs={12} lg={5}>
                        <Box sx={{ display: { xs: "none", lg: "block" } }}>
                            <Paper
                                elevation={0}
                                sx={{
                                    position: "sticky",
                                    top: 16,
                                    p: 3,
                                    bgcolor: "background.paper",
                                    borderRadius: 2,
                                    border: "2px solid",
                                    borderColor: "divider",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                }}
                            >
                                <Box
                                    sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: 36,
                                            height: 36,
                                            borderRadius: 1.5,
                                            bgcolor: "primary.main",
                                            color: "white",
                                        }}
                                    >
                                        <BookOpen size={20} />
                                    </Box>
                                    <Box>
                                        <Typography
                                            variant="h6"
                                            sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                        >
                                            Live Preview
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            See your changes in real-time
                                        </Typography>
                                    </Box>
                                </Box>
                                <AboutStoryPreview
                                    aboutData={aboutData}
                                    foundedYear={foundedYear}
                                />
                                <Alert
                                    severity="info"
                                    sx={{
                                        mt: 2,
                                        bgcolor: "info.lighter",
                                        border: "1px solid",
                                        borderColor: "info.light",
                                        "& .MuiAlert-icon": {
                                            color: "info.main",
                                        },
                                    }}
                                >
                                    <Typography variant="caption">
                                        This preview updates in real-time as you make changes. The
                                        actual about section may look slightly different based on
                                        screen size.
                                    </Typography>
                                </Alert>
                            </Paper>
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </PageContainer>
    );
};
