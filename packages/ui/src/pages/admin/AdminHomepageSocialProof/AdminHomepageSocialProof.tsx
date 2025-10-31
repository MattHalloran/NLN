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
    Chip,
    Divider,
} from "@mui/material";
import {
    Plus,
    Trash2,
    GripVertical,
    Building2,
    Users,
    TreePine,
    Clock,
    Award,
    Truck,
    Shield,
    Sprout,
    BarChart2 as StatsIcon,
    Zap as MissionIcon,
    CheckCircle as StrengthsIcon,
    Briefcase as ClientsIcon,
    FileText as HeaderIcon,
    Info as FooterIcon,
} from "lucide-react";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { BackButton, PageContainer } from "components";
import { ABTestEditingBanner } from "components/admin/ABTestEditingBanner";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLandingPage } from "hooks/useLandingPage";
import { useABTestQueryParams } from "hooks/useABTestQueryParams";
import { useUpdateLandingPageContent } from "api/rest/hooks";
import { useState, useEffect, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PubSub } from "utils/pubsub";
import { SnackSeverity } from "components/dialogs/Snack/Snack";

// Available icons for selection
const SOCIAL_PROOF_ICONS = [
    { value: "users", label: "Users", icon: Users },
    { value: "award", label: "Award", icon: Award },
    { value: "leaf", label: "Leaf", icon: TreePine },
    { value: "clock", label: "Clock", icon: Clock },
    { value: "truck", label: "Truck", icon: Truck },
    { value: "shield", label: "Shield", icon: Shield },
    { value: "building", label: "Building", icon: Building2 },
    { value: "sprout", label: "Sprout", icon: Sprout },
];

interface SocialProofStat {
    number: string;
    label: string;
    subtext: string;
}

interface SocialProofStrength {
    icon: string;
    title: string;
    description: string;
    highlight: string;
}

interface SocialProofClientType {
    icon: string;
    label: string;
}

interface SocialProofData {
    header: {
        title: string;
        subtitle: string;
    };
    stats: SocialProofStat[];
    mission: {
        title: string;
        quote: string;
        attribution: string;
    };
    strengths: {
        title: string;
        items: SocialProofStrength[];
    };
    clientTypes: {
        title: string;
        items: SocialProofClientType[];
    };
    footer: {
        description: string;
        chips: string[];
    };
}

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    users: Users,
    award: Award,
    leaf: TreePine,
    clock: Clock,
    truck: Truck,
    shield: Shield,
    building: Building2,
    sprout: Sprout,
};

// Helper function to replace tokens
const replaceTokens = (text: string, foundedYear: number, yearsInBusiness: number): string => {
    return text
        .replace(/{foundedYear}/g, String(foundedYear))
        .replace(/{yearsInBusiness}/g, String(yearsInBusiness));
};

// Default data
const getDefaultSocialProofData = (foundedYear: number): SocialProofData => ({
    header: {
        title: "Why Choose New Life Nursery",
        subtitle: "Southern New Jersey's trusted wholesale nursery partner for over four decades"
    },
    stats: [
        {
            number: "{yearsInBusiness}+",
            label: "Years of Excellence",
            subtext: "Since {foundedYear}"
        },
        {
            number: "100+",
            label: "Plant Varieties",
            subtext: "Extensive Selection"
        },
        {
            number: "3-25",
            label: "Gallon Sizes",
            subtext: "Full Range"
        },
        {
            number: "500+",
            label: "Trade Partners",
            subtext: "Wholesale Only"
        }
    ],
    mission: {
        title: "Our Founding Mission Since {foundedYear}",
        quote: "Growing top quality material for buyers who are interested in the best.",
        attribution: "The Gianaris Family"
    },
    strengths: {
        title: "What Sets Us Apart",
        items: [
            {
                icon: "users",
                title: "Family Heritage",
                description: "Owned and operated by the Gianaris family for over four decades, maintaining traditional values and personal service.",
                highlight: "Family-Owned Since {foundedYear}"
            },
            {
                icon: "leaf",
                title: "Extensive Inventory",
                description: "We maintain one of Southern New Jersey's largest selections of quality nursery stock across a wide range of varieties and sizes.",
                highlight: "Diverse Selection"
            },
            {
                icon: "award",
                title: "Quality Commitment",
                description: "Our founding motto remains unchanged: Growing top quality material for buyers who are interested in the best.",
                highlight: "Premium Quality Only"
            },
            {
                icon: "clock",
                title: "Trade-Friendly Hours",
                description: "Opening early, we help contractors get loaded and to job sites early.",
                highlight: "Early Opening"
            },
            {
                icon: "truck",
                title: "Wholesale Expertise",
                description: "Specializing exclusively in wholesale, we understand the unique needs of landscapers and contractors.",
                highlight: "Trade Professionals Only"
            },
            {
                icon: "shield",
                title: "Licensed & Certified",
                description: "Fully licensed New Jersey nursery meeting all state requirements for commercial plant production and sales.",
                highlight: "NJ Licensed Nursery"
            }
        ]
    },
    clientTypes: {
        title: "Proudly Serving Trade Professionals",
        items: [
            { icon: "building", label: "Landscape Contractors" },
            { icon: "sprout", label: "Garden Centers" },
            { icon: "users", label: "Property Developers" },
            { icon: "leaf", label: "Municipalities" }
        ]
    },
    footer: {
        description: "References available upon request for qualified wholesale buyers",
        chips: ["Licensed NJ Nursery", "Wholesale Only", "Est. {foundedYear}"]
    }
});

// Preview component
const SocialProofPreview = ({ socialProofData, foundedYear, yearsInBusiness }: { socialProofData: SocialProofData; foundedYear: number; yearsInBusiness: number }) => {
    const { palette } = useTheme();

    return (
        <Box
            sx={{
                position: "relative",
                width: "100%",
                maxHeight: "calc(100vh - 200px)",
                overflow: "auto",
                borderRadius: 2,
                border: "2px solid",
                borderColor: "divider",
                backgroundColor: palette.grey[50],
                p: 1.5,
            }}
        >
            {/* Header */}
            <Typography variant="h5" sx={{ fontWeight: 700, color: palette.primary.main, mb: 1, textAlign: "center", fontSize: "1.5rem" }}>
                {socialProofData.header.title}
            </Typography>
            <Typography variant="body2" sx={{ color: palette.text.secondary, mb: 3, textAlign: "center" }}>
                {socialProofData.header.subtitle}
            </Typography>

            {/* Stats Section */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {socialProofData.stats.map((stat, index) => (
                    <Grid item xs={6} md={3} key={index}>
                        <Card
                            sx={{
                                textAlign: "center",
                                p: 2,
                                height: "100%",
                                border: `1px solid ${palette.divider}`,
                            }}
                        >
                            <Typography variant="h4" sx={{ fontWeight: 800, color: palette.primary.main, fontSize: "2rem", mb: 0.5 }}>
                                {replaceTokens(stat.number, foundedYear, yearsInBusiness)}
                            </Typography>
                            <Typography variant="subtitle2" sx={{ color: palette.text.primary, fontWeight: 600, mb: 0.5 }}>
                                {stat.label}
                            </Typography>
                            <Typography variant="caption" sx={{ color: palette.text.secondary, fontStyle: "italic" }}>
                                {replaceTokens(stat.subtext, foundedYear, yearsInBusiness)}
                            </Typography>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Mission Statement */}
            <Box
                sx={{
                    mb: 4,
                    p: 3,
                    backgroundColor: palette.primary.main,
                    color: "white",
                    borderRadius: 2,
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
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, position: "relative", zIndex: 1 }}>
                    {replaceTokens(socialProofData.mission.title, foundedYear, yearsInBusiness)}
                </Typography>
                <Typography
                    variant="h6"
                    component="blockquote"
                    sx={{
                        fontStyle: "italic",
                        fontWeight: 400,
                        lineHeight: 1.5,
                        position: "relative",
                        zIndex: 1,
                    }}
                >
                    "{socialProofData.mission.quote}"
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.9, position: "relative", zIndex: 1 }}>
                    — {socialProofData.mission.attribution}
                </Typography>
            </Box>

            {/* Strengths Section */}
            <Typography variant="h6" sx={{ fontWeight: 600, color: palette.primary.main, mb: 2, textAlign: "center" }}>
                {socialProofData.strengths.title}
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {socialProofData.strengths.items.map((strength, index) => {
                    const IconComponent = ICON_MAP[strength.icon] || Users;
                    return (
                        <Grid item xs={12} md={6} key={index}>
                            <Card sx={{ height: "100%", borderRadius: 2 }}>
                                <CardContent sx={{ p: 2 }}>
                                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                                        <Box
                                            sx={{
                                                p: 1,
                                                borderRadius: 1,
                                                backgroundColor: palette.primary.main + "10",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            <IconComponent size={20} color={palette.primary.main} />
                                        </Box>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: palette.primary.main, mb: 0.5 }}>
                                                {strength.title}
                                            </Typography>
                                            <Chip
                                                label={replaceTokens(strength.highlight, foundedYear, yearsInBusiness)}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                                sx={{ mb: 1 }}
                                            />
                                            <Typography variant="caption" sx={{ color: palette.text.secondary, lineHeight: 1.4, display: "block" }}>
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

            {/* Client Types Section */}
            <Box
                sx={{
                    textAlign: "center",
                    p: 3,
                    backgroundColor: "white",
                    borderRadius: 2,
                    border: `1px solid ${palette.divider}`,
                }}
            >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: palette.primary.main, mb: 2 }}>
                    {socialProofData.clientTypes.title}
                </Typography>
                <Grid container spacing={2} justifyContent="center" sx={{ mb: 2 }}>
                    {socialProofData.clientTypes.items.map((client, index) => {
                        const IconComponent = ICON_MAP[client.icon] || Building2;
                        return (
                            <Grid item xs={6} sm={3} key={index}>
                                <Box sx={{ p: 1 }}>
                                    <Box sx={{ mb: 0.5, display: "flex", justifyContent: "center", color: palette.primary.main }}>
                                        <IconComponent size={24} />
                                    </Box>
                                    <Typography variant="caption" sx={{ fontWeight: 500, color: palette.text.primary }}>
                                        {client.label}
                                    </Typography>
                                </Box>
                            </Grid>
                        );
                    })}
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" sx={{ color: palette.text.secondary, fontStyle: "italic", display: "block", mb: 1 }}>
                    {socialProofData.footer.description}
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                    {socialProofData.footer.chips.map((chip, index) => (
                        <Chip key={index} label={replaceTokens(chip, foundedYear, yearsInBusiness)} color="primary" size="small" />
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export const AdminHomepageSocialProof = () => {
    const { palette } = useTheme();
    const { data: landingPageData, refetch } = useLandingPage();
    const { mutate: updateContent, loading: isSaving } = useUpdateLandingPageContent();
    const { variantId } = useABTestQueryParams();

    const foundedYear = landingPageData?.content?.company?.foundedYear || COMPANY_INFO.FoundedYear;
    const yearsInBusiness = new Date().getFullYear() - foundedYear;

    const [socialProofData, setSocialProofData] = useState<SocialProofData>(getDefaultSocialProofData(foundedYear));
    const [originalData, setOriginalData] = useState<SocialProofData>(getDefaultSocialProofData(foundedYear));
    const [isLoading, setIsLoading] = useState(false);

    // Load initial data
    useEffect(() => {
        if (landingPageData?.content?.socialProof) {
            setSocialProofData(landingPageData.content.socialProof);
            setOriginalData(JSON.parse(JSON.stringify(landingPageData.content.socialProof)));
        } else {
            const defaultData = getDefaultSocialProofData(foundedYear);
            setSocialProofData(defaultData);
            setOriginalData(JSON.parse(JSON.stringify(defaultData)));
        }
    }, [landingPageData, foundedYear]);

    const hasChanges = useMemo(() => {
        return JSON.stringify(socialProofData) !== JSON.stringify(originalData);
    }, [socialProofData, originalData]);

    const handleApiError = (error: any, defaultMessage: string) => {
        const message = error?.message || defaultMessage;
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Error });
    };

    const handleApiSuccess = (message: string) => {
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Success });
    };

    // Header handlers
    const updateHeader = (field: keyof SocialProofData["header"], value: string) => {
        setSocialProofData(prev => ({
            ...prev,
            header: { ...prev.header, [field]: value }
        }));
    };

    // Stats handlers
    const updateStat = (index: number, field: keyof SocialProofStat, value: string) => {
        setSocialProofData(prev => ({
            ...prev,
            stats: prev.stats.map((stat, i) => i === index ? { ...stat, [field]: value } : stat)
        }));
    };

    const addStat = () => {
        setSocialProofData(prev => ({
            ...prev,
            stats: [...prev.stats, { number: "", label: "", subtext: "" }]
        }));
    };

    const removeStat = (index: number) => {
        if (socialProofData.stats.length <= 1) {
            handleApiError(new Error("At least one stat is required"), "Cannot remove last stat");
            return;
        }
        setSocialProofData(prev => ({
            ...prev,
            stats: prev.stats.filter((_, i) => i !== index)
        }));
    };

    const onDragEndStats = (result: DropResult) => {
        if (!result.destination) return;
        const items = Array.from(socialProofData.stats);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setSocialProofData(prev => ({ ...prev, stats: items }));
    };

    // Mission handlers
    const updateMission = (field: keyof SocialProofData["mission"], value: string) => {
        setSocialProofData(prev => ({
            ...prev,
            mission: { ...prev.mission, [field]: value }
        }));
    };

    // Strengths handlers
    const updateStrengthsTitle = (value: string) => {
        setSocialProofData(prev => ({
            ...prev,
            strengths: { ...prev.strengths, title: value }
        }));
    };

    const updateStrength = (index: number, field: keyof SocialProofStrength, value: string) => {
        setSocialProofData(prev => ({
            ...prev,
            strengths: {
                ...prev.strengths,
                items: prev.strengths.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
            }
        }));
    };

    const addStrength = () => {
        setSocialProofData(prev => ({
            ...prev,
            strengths: {
                ...prev.strengths,
                items: [...prev.strengths.items, { icon: "users", title: "", description: "", highlight: "" }]
            }
        }));
    };

    const removeStrength = (index: number) => {
        if (socialProofData.strengths.items.length <= 1) {
            handleApiError(new Error("At least one strength is required"), "Cannot remove last strength");
            return;
        }
        setSocialProofData(prev => ({
            ...prev,
            strengths: {
                ...prev.strengths,
                items: prev.strengths.items.filter((_, i) => i !== index)
            }
        }));
    };

    const onDragEndStrengths = (result: DropResult) => {
        if (!result.destination) return;
        const items = Array.from(socialProofData.strengths.items);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setSocialProofData(prev => ({
            ...prev,
            strengths: { ...prev.strengths, items }
        }));
    };

    // Client Types handlers
    const updateClientTypesTitle = (value: string) => {
        setSocialProofData(prev => ({
            ...prev,
            clientTypes: { ...prev.clientTypes, title: value }
        }));
    };

    const updateClientType = (index: number, field: keyof SocialProofClientType, value: string) => {
        setSocialProofData(prev => ({
            ...prev,
            clientTypes: {
                ...prev.clientTypes,
                items: prev.clientTypes.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
            }
        }));
    };

    const addClientType = () => {
        setSocialProofData(prev => ({
            ...prev,
            clientTypes: {
                ...prev.clientTypes,
                items: [...prev.clientTypes.items, { icon: "users", label: "" }]
            }
        }));
    };

    const removeClientType = (index: number) => {
        if (socialProofData.clientTypes.items.length <= 1) {
            handleApiError(new Error("At least one client type is required"), "Cannot remove last client type");
            return;
        }
        setSocialProofData(prev => ({
            ...prev,
            clientTypes: {
                ...prev.clientTypes,
                items: prev.clientTypes.items.filter((_, i) => i !== index)
            }
        }));
    };

    const onDragEndClientTypes = (result: DropResult) => {
        if (!result.destination) return;
        const items = Array.from(socialProofData.clientTypes.items);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setSocialProofData(prev => ({
            ...prev,
            clientTypes: { ...prev.clientTypes, items }
        }));
    };

    // Footer handlers
    const updateFooterDescription = (value: string) => {
        setSocialProofData(prev => ({
            ...prev,
            footer: { ...prev.footer, description: value }
        }));
    };

    const updateFooterChip = (index: number, value: string) => {
        setSocialProofData(prev => ({
            ...prev,
            footer: {
                ...prev.footer,
                chips: prev.footer.chips.map((chip, i) => i === index ? value : chip)
            }
        }));
    };

    const addFooterChip = () => {
        setSocialProofData(prev => ({
            ...prev,
            footer: {
                ...prev.footer,
                chips: [...prev.footer.chips, ""]
            }
        }));
    };

    const removeFooterChip = (index: number) => {
        if (socialProofData.footer.chips.length <= 1) {
            handleApiError(new Error("At least one chip is required"), "Cannot remove last chip");
            return;
        }
        setSocialProofData(prev => ({
            ...prev,
            footer: {
                ...prev.footer,
                chips: prev.footer.chips.filter((_, i) => i !== index)
            }
        }));
    };

    // Save and reset handlers
    const handleSaveAllChanges = async () => {
        try {
            setIsLoading(true);
            const queryParams = variantId ? { variantId } : undefined;
            await updateContent({
                data: { socialProof: socialProofData },
                queryParams,
            });
            await refetch();
            handleApiSuccess("Social proof settings saved successfully!");
            setOriginalData(JSON.parse(JSON.stringify(socialProofData)));
        } catch (error: any) {
            handleApiError(error, "Failed to save changes");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelChanges = () => {
        setSocialProofData(JSON.parse(JSON.stringify(originalData)));
    };

    return (
        <PageContainer variant="wide" sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="Social Proof Settings"
                help="Configure testimonials, stats, strengths, and trust indicators"
                startComponent={<BackButton to={APP_LINKS.AdminHomepage} ariaLabel="Back to Homepage Management" />}
            />

            <Box p={2}>
                <ABTestEditingBanner />

                {hasChanges && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            You have unsaved changes. Don't forget to save before leaving!
                        </Typography>
                    </Alert>
                )}

                {hasChanges && (
                    <Paper elevation={0} sx={{ mb: 3, p: 2, display: "flex", gap: 2, bgcolor: "grey.50", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                        <Button variant="contained" size="large" onClick={handleSaveAllChanges} disabled={isLoading} sx={{ px: 4, fontWeight: 600 }}>
                            {isLoading ? "Saving..." : "Save All Changes"}
                        </Button>
                        <Button variant="outlined" size="large" onClick={handleCancelChanges} sx={{ px: 4, fontWeight: 600 }}>
                            Cancel
                        </Button>
                    </Paper>
                )}

                <Grid container spacing={3}>
                    {/* Left Column - Editing Controls */}
                    <Grid item xs={12} lg={7}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {/* Preview on Mobile */}
                            <Box sx={{ display: { xs: "block", lg: "none" } }}>
                                <Paper elevation={0} sx={{ p: 3, bgcolor: "background.paper", borderRadius: 2, border: "2px solid", borderColor: "divider" }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Live Preview</Typography>
                                    <SocialProofPreview socialProofData={socialProofData} foundedYear={foundedYear} yearsInBusiness={yearsInBusiness} />
                                </Paper>
                            </Box>

                            {/* Accordion 1: Header */}
                            <Accordion defaultExpanded sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px !important", "&:before": { display: "none" } }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "grey.50", minHeight: 64 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 2, bgcolor: "primary.main", color: "white" }}>
                                            <HeaderIcon size={20} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Header Section</Typography>
                                            <Typography variant="caption" color="text.secondary">Main title and subtitle</Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3 }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <TextField fullWidth label="Title" value={socialProofData.header.title} onChange={(e) => updateHeader("title", e.target.value)} />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField fullWidth multiline rows={2} label="Subtitle" value={socialProofData.header.subtitle} onChange={(e) => updateHeader("subtitle", e.target.value)} />
                                        </Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 2: Stats */}
                            <Accordion defaultExpanded sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px !important", "&:before": { display: "none" } }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "grey.50", minHeight: 64 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 2, bgcolor: "secondary.main", color: "white" }}>
                                            <StatsIcon size={20} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Stats Section</Typography>
                                            <Typography variant="caption" color="text.secondary">Key statistics and numbers</Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3 }}>
                                    <DragDropContext onDragEnd={onDragEndStats}>
                                        <Droppable droppableId="stats">
                                            {(provided) => (
                                                <div {...provided.droppableProps} ref={provided.innerRef}>
                                                    {socialProofData.stats.map((stat, index) => (
                                                        <Draggable key={index} draggableId={`stat-${index}`} index={index}>
                                                            {(provided) => (
                                                                <Card ref={provided.innerRef} {...provided.draggableProps} sx={{ mb: 2 }}>
                                                                    <CardContent>
                                                                        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
                                                                            <div {...provided.dragHandleProps}>
                                                                                <GripVertical size={24} style={{ cursor: "grab" }} />
                                                                            </div>
                                                                            <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>Stat {index + 1}</Typography>
                                                                            <IconButton color="error" size="small" onClick={() => removeStat(index)} disabled={socialProofData.stats.length <= 1}>
                                                                                <Trash2 size={18} />
                                                                            </IconButton>
                                                                        </Box>
                                                                        <Grid container spacing={2}>
                                                                            <Grid item xs={12} sm={4}>
                                                                                <TextField fullWidth size="small" label="Number" value={stat.number} onChange={(e) => updateStat(index, "number", e.target.value)} />
                                                                            </Grid>
                                                                            <Grid item xs={12} sm={4}>
                                                                                <TextField fullWidth size="small" label="Label" value={stat.label} onChange={(e) => updateStat(index, "label", e.target.value)} />
                                                                            </Grid>
                                                                            <Grid item xs={12} sm={4}>
                                                                                <TextField fullWidth size="small" label="Subtext" value={stat.subtext} onChange={(e) => updateStat(index, "subtext", e.target.value)} />
                                                                            </Grid>
                                                                        </Grid>
                                                                    </CardContent>
                                                                </Card>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                    <Button startIcon={<Plus size={20} />} onClick={addStat} variant="outlined" size="small">Add Stat</Button>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 3: Mission */}
                            <Accordion defaultExpanded sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px !important", "&:before": { display: "none" } }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "grey.50", minHeight: 64 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 2, bgcolor: "success.main", color: "white" }}>
                                            <MissionIcon size={20} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Mission Section</Typography>
                                            <Typography variant="caption" color="text.secondary">Mission statement quote</Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3 }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <TextField fullWidth label="Title" value={socialProofData.mission.title} onChange={(e) => updateMission("title", e.target.value)} />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField fullWidth multiline rows={3} label="Quote" value={socialProofData.mission.quote} onChange={(e) => updateMission("quote", e.target.value)} />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField fullWidth label="Attribution" value={socialProofData.mission.attribution} onChange={(e) => updateMission("attribution", e.target.value)} />
                                        </Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 4: Strengths */}
                            <Accordion defaultExpanded sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px !important", "&:before": { display: "none" } }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "grey.50", minHeight: 64 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 2, bgcolor: "info.main", color: "white" }}>
                                            <StrengthsIcon size={20} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Strengths Section</Typography>
                                            <Typography variant="caption" color="text.secondary">Key differentiators and strengths</Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3 }}>
                                    <TextField fullWidth label="Section Title" value={socialProofData.strengths.title} onChange={(e) => updateStrengthsTitle(e.target.value)} sx={{ mb: 2 }} />
                                    <DragDropContext onDragEnd={onDragEndStrengths}>
                                        <Droppable droppableId="strengths">
                                            {(provided) => (
                                                <div {...provided.droppableProps} ref={provided.innerRef}>
                                                    {socialProofData.strengths.items.map((strength, index) => (
                                                        <Draggable key={index} draggableId={`strength-${index}`} index={index}>
                                                            {(provided) => (
                                                                <Card ref={provided.innerRef} {...provided.draggableProps} sx={{ mb: 2 }}>
                                                                    <CardContent>
                                                                        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
                                                                            <div {...provided.dragHandleProps}>
                                                                                <GripVertical size={24} style={{ cursor: "grab" }} />
                                                                            </div>
                                                                            <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>Strength {index + 1}</Typography>
                                                                            <IconButton color="error" size="small" onClick={() => removeStrength(index)} disabled={socialProofData.strengths.items.length <= 1}>
                                                                                <Trash2 size={18} />
                                                                            </IconButton>
                                                                        </Box>
                                                                        <Grid container spacing={2}>
                                                                            <Grid item xs={12} sm={6}>
                                                                                <FormControl fullWidth size="small">
                                                                                    <InputLabel>Icon</InputLabel>
                                                                                    <Select value={strength.icon} label="Icon" onChange={(e) => updateStrength(index, "icon", e.target.value)}>
                                                                                        {SOCIAL_PROOF_ICONS.map((iconOption) => {
                                                                                            const IconComponent = iconOption.icon;
                                                                                            return (
                                                                                                <MenuItem key={iconOption.value} value={iconOption.value}>
                                                                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                                                        <IconComponent size={16} />
                                                                                                        {iconOption.label}
                                                                                                    </Box>
                                                                                                </MenuItem>
                                                                                            );
                                                                                        })}
                                                                                    </Select>
                                                                                </FormControl>
                                                                            </Grid>
                                                                            <Grid item xs={12} sm={6}>
                                                                                <TextField fullWidth size="small" label="Title" value={strength.title} onChange={(e) => updateStrength(index, "title", e.target.value)} />
                                                                            </Grid>
                                                                            <Grid item xs={12}>
                                                                                <TextField fullWidth multiline rows={2} label="Description" value={strength.description} onChange={(e) => updateStrength(index, "description", e.target.value)} />
                                                                            </Grid>
                                                                            <Grid item xs={12}>
                                                                                <TextField fullWidth size="small" label="Highlight (chip text)" value={strength.highlight} onChange={(e) => updateStrength(index, "highlight", e.target.value)} />
                                                                            </Grid>
                                                                        </Grid>
                                                                    </CardContent>
                                                                </Card>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                    <Button startIcon={<Plus size={20} />} onClick={addStrength} variant="outlined" size="small">Add Strength</Button>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 5: Client Types */}
                            <Accordion defaultExpanded sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px !important", "&:before": { display: "none" } }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "grey.50", minHeight: 64 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 2, bgcolor: "warning.main", color: "white" }}>
                                            <ClientsIcon size={20} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Client Types</Typography>
                                            <Typography variant="caption" color="text.secondary">Who you serve</Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3 }}>
                                    <TextField fullWidth label="Section Title" value={socialProofData.clientTypes.title} onChange={(e) => updateClientTypesTitle(e.target.value)} sx={{ mb: 2 }} />
                                    <DragDropContext onDragEnd={onDragEndClientTypes}>
                                        <Droppable droppableId="clientTypes">
                                            {(provided) => (
                                                <div {...provided.droppableProps} ref={provided.innerRef}>
                                                    {socialProofData.clientTypes.items.map((client, index) => (
                                                        <Draggable key={index} draggableId={`client-${index}`} index={index}>
                                                            {(provided) => (
                                                                <Card ref={provided.innerRef} {...provided.draggableProps} sx={{ mb: 2 }}>
                                                                    <CardContent>
                                                                        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
                                                                            <div {...provided.dragHandleProps}>
                                                                                <GripVertical size={24} style={{ cursor: "grab" }} />
                                                                            </div>
                                                                            <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>Client Type {index + 1}</Typography>
                                                                            <IconButton color="error" size="small" onClick={() => removeClientType(index)} disabled={socialProofData.clientTypes.items.length <= 1}>
                                                                                <Trash2 size={18} />
                                                                            </IconButton>
                                                                        </Box>
                                                                        <Grid container spacing={2}>
                                                                            <Grid item xs={12} sm={6}>
                                                                                <FormControl fullWidth size="small">
                                                                                    <InputLabel>Icon</InputLabel>
                                                                                    <Select value={client.icon} label="Icon" onChange={(e) => updateClientType(index, "icon", e.target.value)}>
                                                                                        {SOCIAL_PROOF_ICONS.map((iconOption) => {
                                                                                            const IconComponent = iconOption.icon;
                                                                                            return (
                                                                                                <MenuItem key={iconOption.value} value={iconOption.value}>
                                                                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                                                        <IconComponent size={16} />
                                                                                                        {iconOption.label}
                                                                                                    </Box>
                                                                                                </MenuItem>
                                                                                            );
                                                                                        })}
                                                                                    </Select>
                                                                                </FormControl>
                                                                            </Grid>
                                                                            <Grid item xs={12} sm={6}>
                                                                                <TextField fullWidth size="small" label="Label" value={client.label} onChange={(e) => updateClientType(index, "label", e.target.value)} />
                                                                            </Grid>
                                                                        </Grid>
                                                                    </CardContent>
                                                                </Card>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                    <Button startIcon={<Plus size={20} />} onClick={addClientType} variant="outlined" size="small">Add Client Type</Button>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 6: Footer */}
                            <Accordion defaultExpanded sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px !important", "&:before": { display: "none" } }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: "grey.50", minHeight: 64 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 2, bgcolor: "error.main", color: "white" }}>
                                            <FooterIcon size={20} />
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Footer Section</Typography>
                                            <Typography variant="caption" color="text.secondary">Description and chips</Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3 }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12}>
                                            <TextField fullWidth multiline rows={2} label="Description" value={socialProofData.footer.description} onChange={(e) => updateFooterDescription(e.target.value)} />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Footer Chips</Typography>
                                            {socialProofData.footer.chips.map((chip, index) => (
                                                <Box key={index} sx={{ display: "flex", gap: 1, mb: 1 }}>
                                                    <TextField fullWidth size="small" label={`Chip ${index + 1}`} value={chip} onChange={(e) => updateFooterChip(index, e.target.value)} />
                                                    <IconButton color="error" onClick={() => removeFooterChip(index)} disabled={socialProofData.footer.chips.length <= 1}>
                                                        <Trash2 size={18} />
                                                    </IconButton>
                                                </Box>
                                            ))}
                                            <Button startIcon={<Plus size={20} />} onClick={addFooterChip} variant="outlined" size="small">Add Chip</Button>
                                        </Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>

                            {hasChanges && (
                                <Paper elevation={0} sx={{ mt: 3, p: 2, display: "flex", gap: 2, bgcolor: "grey.50", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                                    <Button variant="contained" size="large" onClick={handleSaveAllChanges} disabled={isLoading} sx={{ px: 4, fontWeight: 600 }}>
                                        {isLoading ? "Saving..." : "Save All Changes"}
                                    </Button>
                                    <Button variant="outlined" size="large" onClick={handleCancelChanges} sx={{ px: 4, fontWeight: 600 }}>
                                        Cancel
                                    </Button>
                                </Paper>
                            )}

                            <Alert severity="info" sx={{ mt: 3 }}>
                                <Typography variant="caption">
                                    <strong>Tip:</strong> Use {"{foundedYear}"} and {"{yearsInBusiness}"} tokens in text fields for dynamic values.
                                </Typography>
                            </Alert>
                        </Box>
                    </Grid>

                    {/* Right Column - Live Preview (Desktop) */}
                    <Grid item xs={12} lg={5}>
                        <Box sx={{ display: { xs: "none", lg: "block" } }}>
                            <Paper elevation={0} sx={{ position: "sticky", top: 16, p: 3, bgcolor: "background.paper", borderRadius: 2, border: "2px solid", borderColor: "divider" }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Live Preview</Typography>
                                <SocialProofPreview socialProofData={socialProofData} foundedYear={foundedYear} yearsInBusiness={yearsInBusiness} />
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    <Typography variant="caption">
                                        This preview updates in real-time as you make changes.
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
