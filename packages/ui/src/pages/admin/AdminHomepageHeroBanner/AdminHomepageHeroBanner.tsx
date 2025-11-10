import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { APP_LINKS } from "@local/shared";
import {
    Add as AddIcon,
    EmojiEvents as BadgeIcon,
    TouchApp as ButtonIcon,
    Delete as DeleteIcon,
    DragIndicator as DragIcon,
    ExpandMore as ExpandMoreIcon,
    Image as ImageIcon,
    Settings as SettingsIcon,
    TextFields as TextFieldsIcon,
} from "@mui/icons-material";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    CardMedia,
    Chip,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import {
    useAddImages,
    useLandingPageContent,
    useUpdateLandingPageContent,
    useUpdateLandingPageSettings,
} from "api/rest/hooks";
import { BackButton, Dropzone, PageContainer } from "components";
import { ABTestEditingBanner } from "components/admin/ABTestEditingBanner/ABTestEditingBanner";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useABTestQueryParams } from "hooks/useABTestQueryParams";
import { useAdminForm } from "hooks/useAdminForm";
import { Award, Heart, Leaf, Package, Shield, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { pagePaddingBottom } from "styles";
import { getServerUrl } from "utils/serverUrl";

// Available icons for trust badges
const TRUST_BADGE_ICONS = {
    users: Users,
    award: Award,
    leaf: Leaf,
    package: Package,
    shield: Shield,
    heart: Heart,
};

interface HeroBanner {
    id: string;
    src: string;
    alt: string;
    description: string;
    isActive: boolean;
    displayOrder?: number;
    width?: number;
    height?: number;
}

interface HeroSettings {
    autoPlay: boolean;
    autoPlayDelay: number;
    showDots: boolean;
    showArrows: boolean;
    fadeTransition: boolean;
    fadeTransitionDuration: number;
}

interface HeroContent {
    title: string;
    subtitle: string;
    description: string;
    businessHours: string;
    useContactInfoHours: boolean;
}

interface TrustBadge {
    icon: string;
    text: string;
}

interface CTAButton {
    text: string;
    link: string;
    type: string;
}

// Consolidated hero data structure for useAdminForm
interface HeroData {
    banners: HeroBanner[];
    settings: HeroSettings;
    content: HeroContent;
    trustBadges: TrustBadge[];
    ctaButtons: CTAButton[];
}

// Default values
const DEFAULT_HERO_SETTINGS: HeroSettings = {
    autoPlay: true,
    autoPlayDelay: 5000,
    showDots: true,
    showArrows: true,
    fadeTransition: true,
    fadeTransitionDuration: 1000,
};

const DEFAULT_HERO_CONTENT: HeroContent = {
    title: "Beautiful, healthy plants",
    subtitle: "At competitive prices",
    description:
        "Your trusted wholesale plant source for over 40 years, with the finest selection of plants, trees, and shrubs",
    businessHours: "OPEN 7 DAYS A WEEK | Mon-Sat 8AM-6PM | Sun 9AM-5PM",
    useContactInfoHours: false,
};

const DEFAULT_TRUST_BADGES: TrustBadge[] = [
    { icon: "users", text: "Family Owned Since 1981" },
    { icon: "award", text: "Licensed & Certified" },
    { icon: "leaf", text: "Wide Plant Selection" },
];

const DEFAULT_CTA_BUTTONS: CTAButton[] = [
    { text: "Browse Plants", link: "https://newlife.online-orders.sbiteam.com/", type: "primary" },
    { text: "Visit Our Nursery", link: "/about", type: "secondary" },
];

// Preview component that shows how the hero will look
const HeroPreview = ({ heroData }: { heroData: HeroData | null }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const activeImages = heroData?.banners.filter((b) => b.isActive) || [];

    // Auto-play carousel in preview
    useEffect(() => {
        if (!heroData || !heroData.settings.autoPlay || activeImages.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % activeImages.length);
        }, heroData.settings.autoPlayDelay);

        return () => clearInterval(interval);
    }, [
        heroData,
        heroData?.settings.autoPlay,
        heroData?.settings.autoPlayDelay,
        activeImages.length,
    ]);

    if (!heroData) return null;

    const textPopStyle = {
        padding: "0",
        color: "white",
        textAlign: "center",
        fontWeight: "600",
        textShadow: "2px 2px 4px rgba(0,0,0,0.8), 0px 0px 20px rgba(0,0,0,0.5)",
    };

    const _currentImage = activeImages[currentSlide];

    return (
        <Box
            sx={{
                position: "relative",
                width: "100%",
                height: "500px",
                overflow: "hidden",
                borderRadius: 2,
                border: "2px solid",
                borderColor: "divider",
                bgcolor: "grey.900",
            }}
        >
            {activeImages.length > 0 ? (
                <>
                    {/* Background image carousel - render all images for proper fade transition */}
                    {activeImages.map((banner, index) => (
                        <Box
                            key={banner.id}
                            component="img"
                            src={
                                banner.src.startsWith("http")
                                    ? banner.src
                                    : `${getServerUrl()}${banner.src}`
                            }
                            alt={banner.alt}
                            sx={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                opacity: index === currentSlide ? 1 : 0,
                                // Active slide appears instantly (0ms), inactive slides fade out
                                transition: heroData.settings.fadeTransition
                                    ? `opacity ${index === currentSlide ? 0 : heroData.settings.fadeTransitionDuration || 1000}ms ease-out`
                                    : "opacity 0.1s",
                                // Inactive slides on top (fading out), active underneath (already visible)
                                zIndex: index === currentSlide ? 0 : 1,
                            }}
                        />
                    ))}

                    {/* Navigation dots */}
                    {heroData.settings.showDots && activeImages.length > 1 && (
                        <Box
                            sx={{
                                position: "absolute",
                                bottom: 16,
                                left: "50%",
                                transform: "translateX(-50%)",
                                display: "flex",
                                gap: 1,
                                zIndex: 2,
                            }}
                        >
                            {activeImages.map((_, index) => (
                                <Box
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        bgcolor:
                                            index === currentSlide
                                                ? "white"
                                                : "rgba(255,255,255,0.5)",
                                        cursor: "pointer",
                                        transition: "all 0.3s",
                                    }}
                                />
                            ))}
                        </Box>
                    )}

                    {/* Navigation arrows */}
                    {heroData.settings.showArrows && activeImages.length > 1 && (
                        <>
                            <IconButton
                                size="small"
                                onClick={() =>
                                    setCurrentSlide(
                                        (prev) =>
                                            (prev - 1 + activeImages.length) % activeImages.length,
                                    )
                                }
                                sx={{
                                    position: "absolute",
                                    left: 8,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    zIndex: 2,
                                    bgcolor: "rgba(255, 255, 255, 0.9)",
                                    "&:hover": { bgcolor: "white" },
                                    width: 32,
                                    height: 32,
                                }}
                            >
                                <Box component="span" sx={{ fontSize: "20px" }}>
                                    ‹
                                </Box>
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() =>
                                    setCurrentSlide((prev) => (prev + 1) % activeImages.length)
                                }
                                sx={{
                                    position: "absolute",
                                    right: 8,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    zIndex: 2,
                                    bgcolor: "rgba(255, 255, 255, 0.9)",
                                    "&:hover": { bgcolor: "white" },
                                    width: 32,
                                    height: 32,
                                }}
                            >
                                <Box component="span" sx={{ fontSize: "20px" }}>
                                    ›
                                </Box>
                            </IconButton>
                        </>
                    )}

                    {/* Content overlay - stays static while images fade beneath */}
                    <Box
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            background:
                                "linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0.6) 100%)",
                            pointerEvents: "none",
                            p: 2,
                            zIndex: 10,
                        }}
                    >
                        {/* Trust badges - match actual spacing from Hero.tsx */}
                        <Stack
                            direction="row"
                            spacing={2}
                            sx={{
                                mb: 2,
                                flexWrap: "wrap",
                                justifyContent: "center",
                                gap: 2,
                            }}
                        >
                            {heroData.trustBadges.map((badge, index) => {
                                const IconComponent =
                                    TRUST_BADGE_ICONS[
                                        badge.icon as keyof typeof TRUST_BADGE_ICONS
                                    ] || Users;
                                return (
                                    <Chip
                                        key={index}
                                        icon={<IconComponent size={12} />}
                                        label={badge.text}
                                        size="small"
                                        sx={{
                                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                                            fontWeight: 600,
                                            fontSize: "0.65rem",
                                        }}
                                    />
                                );
                            })}
                        </Stack>

                        {/* Title */}
                        <Typography
                            variant="h4"
                            sx={{
                                ...textPopStyle,
                                fontWeight: 800,
                                fontSize: { xs: "1.5rem", md: "2rem" },
                                mb: 1,
                            }}
                        >
                            {heroData.content.title}
                        </Typography>

                        {/* Subtitle */}
                        <Typography
                            variant="h6"
                            sx={{
                                ...textPopStyle,
                                fontWeight: 500,
                                fontSize: { xs: "1rem", md: "1.25rem" },
                                mb: 1,
                            }}
                        >
                            {heroData.content.subtitle}
                        </Typography>

                        {/* Description */}
                        <Typography
                            variant="body2"
                            sx={{
                                ...textPopStyle,
                                fontWeight: 400,
                                fontSize: "0.85rem",
                                maxWidth: "80%",
                                mb: 2,
                                opacity: 0.95,
                            }}
                        >
                            {heroData.content.description}
                        </Typography>

                        {/* CTA Buttons */}
                        <Stack direction="row" spacing={2} sx={{ mb: 2, pointerEvents: "auto" }}>
                            {heroData.ctaButtons.map((button, index) => (
                                <Button
                                    key={index}
                                    variant={button.type === "primary" ? "contained" : "outlined"}
                                    color={button.type === "primary" ? "secondary" : undefined}
                                    size="small"
                                    sx={{
                                        fontSize: "0.75rem",
                                        px: 2,
                                        backgroundColor:
                                            button.type === "primary"
                                                ? undefined
                                                : "rgba(255, 255, 255, 0.95)",
                                        pointerEvents: "none",
                                    }}
                                >
                                    {button.text}
                                </Button>
                            ))}
                        </Stack>

                        {/* Business hours */}
                        <Box
                            sx={{
                                px: 2,
                                py: 1,
                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                                backdropFilter: "blur(10px)",
                                borderRadius: 1,
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    ...textPopStyle,
                                    fontWeight: 500,
                                    fontSize: "0.7rem",
                                }}
                            >
                                {heroData.content.businessHours}
                            </Typography>
                        </Box>
                    </Box>
                </>
            ) : (
                <Box
                    sx={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "grey.200",
                    }}
                >
                    <Typography variant="body1" color="text.secondary">
                        Add images to see preview
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export const AdminHomepageHeroBanner = () => {
    const { variantId: queryVariantId } = useABTestQueryParams();
    // Admin needs to see ALL images (including inactive) so they can activate/deactivate them
    const {
        data: landingPageContent,
        loading: landingPageLoading,
        refetch: refetchLandingPage,
    } = useLandingPageContent(false, queryVariantId);
    const updateSettings = useUpdateLandingPageSettings();
    const { mutate: addImages } = useAddImages();
    const updateLandingPageContent = useUpdateLandingPageContent();

    // Consolidated form state using useAdminForm hook
    const form = useAdminForm<HeroData>({
        fetchFn: async () => {
            const defaultData: HeroData = {
                banners: [],
                settings: DEFAULT_HERO_SETTINGS,
                content: DEFAULT_HERO_CONTENT,
                trustBadges: DEFAULT_TRUST_BADGES,
                ctaButtons: DEFAULT_CTA_BUTTONS,
            };

            if (!landingPageContent) {
                return defaultData;
            }

            // Load hero banners
            const banners = landingPageContent.content?.hero?.banners || [];
            const sorted = [...banners].sort(
                (a: HeroBanner, b: HeroBanner) => (a.displayOrder || 0) - (b.displayOrder || 0),
            );

            // Load hero content
            const heroText = landingPageContent.content?.hero?.text;
            const content = heroText
                ? {
                      title: heroText.title || DEFAULT_HERO_CONTENT.title,
                      subtitle: heroText.subtitle || DEFAULT_HERO_CONTENT.subtitle,
                      description: heroText.description || DEFAULT_HERO_CONTENT.description,
                      businessHours: heroText.businessHours || DEFAULT_HERO_CONTENT.businessHours,
                      useContactInfoHours: (heroText as any).useContactInfoHours ?? false,
                  }
                : DEFAULT_HERO_CONTENT;

            return {
                banners: sorted,
                settings: landingPageContent.content?.hero?.settings || DEFAULT_HERO_SETTINGS,
                content,
                trustBadges: heroText?.trustBadges || DEFAULT_TRUST_BADGES,
                ctaButtons: heroText?.buttons || DEFAULT_CTA_BUTTONS,
            };
        },
        saveFn: async (data) => {
            const queryParams = queryVariantId ? { variantId: queryVariantId } : undefined;

            // Update hero banners and settings
            await updateLandingPageContent.mutate({
                data: {
                    heroBanners: data.banners.map((b) => ({
                        ...b,
                        width: b.width || 0,
                        height: b.height || 0,
                        displayOrder: b.displayOrder || 0,
                    })),
                    heroSettings: data.settings,
                },
                queryParams,
            });

            // Update hero content, trust badges, and CTA buttons
            await updateSettings.mutate({
                settings: {
                    content: {
                        hero: {
                            text: {
                                ...data.content,
                                trustBadges: data.trustBadges,
                                buttons: data.ctaButtons,
                            },
                        },
                    },
                },
                queryParams,
            });

            return data;
        },
        refetchDependencies: [refetchLandingPage],
        pageName: "hero-section",
        endpointName: "/api/v1/landing-page",
        successMessage: "All hero settings saved successfully!",
        errorMessagePrefix: "Failed to save changes",
    });

    // Trigger refetch when landing page data loads
    useEffect(() => {
        if (landingPageContent && !landingPageLoading) {
            form.refetch();
        }
    }, [landingPageContent, landingPageLoading]);

    const uploadImages = useCallback(
        async (acceptedFiles: File[]) => {
            if (!form.data) return;

            try {
                // Upload images using the images API (which creates multiple sizes + WebP)
                const uploadResults = await addImages({ label: "hero", files: acceptedFiles });

                const newBanners: HeroBanner[] = [];
                const currentLength = form.data.banners.length;

                for (let i = 0; i < uploadResults.length; i++) {
                    const result = uploadResults[i];
                    const file = acceptedFiles[i];

                    if (result.success && result.src) {
                        const newBanner = {
                            id: `hero-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            src: `/${result.src}`,
                            alt: file.name.replace(/\.[^/.]+$/, ""),
                            description: "",
                            displayOrder: currentLength + newBanners.length + 1,
                            isActive: true,
                        };
                        newBanners.push(newBanner);
                    }
                }

                form.setData({
                    ...form.data,
                    banners: [...form.data.banners, ...newBanners],
                });
            } catch (error) {
                console.error("Failed to upload images:", error);
            }
        },
        [form, addImages],
    );

    const handleDragEnd = useCallback(
        (result: DropResult) => {
            if (!result.destination || !form.data) return;

            const items = Array.from(form.data.banners);
            const [reorderedItem] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, reorderedItem);

            const reordered = items.map((item, index) => ({
                ...item,
                displayOrder: index + 1,
            }));

            form.setData({
                ...form.data,
                banners: reordered,
            });
        },
        [form],
    );

    const handleDeleteBanner = useCallback(
        (id: string) => {
            if (!form.data) return;

            const filtered = form.data.banners
                .filter((b) => b.id !== id)
                .map((item, index) => ({
                    ...item,
                    displayOrder: index + 1,
                }));

            form.setData({
                ...form.data,
                banners: filtered,
            });
        },
        [form],
    );

    const handleFieldChange = useCallback(
        (id: string, field: string, value: string | boolean) => {
            if (!form.data) return;

            const updated = form.data.banners.map((banner) =>
                banner.id === id ? { ...banner, [field]: value } : banner,
            );

            form.setData({
                ...form.data,
                banners: updated,
            });
        },
        [form],
    );

    const IconComponent = ({ iconName }: { iconName: string }) => {
        const Icon = TRUST_BADGE_ICONS[iconName as keyof typeof TRUST_BADGE_ICONS] || Users;
        return <Icon size={20} />;
    };

    return (
        <PageContainer variant="wide" sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="Hero Section Settings"
                help="Configure all aspects of your hero section"
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
                {form.isDirty && (
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
                {form.isDirty && (
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
                            onClick={form.save}
                            disabled={form.isSaving}
                            sx={{
                                px: 4,
                                fontWeight: 600,
                                boxShadow: 2,
                                "&:hover": {
                                    boxShadow: 4,
                                },
                            }}
                        >
                            {form.isSaving ? "Saving..." : "Save All Changes"}
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            onClick={form.cancel}
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
                                            <ImageIcon fontSize="small" />
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
                                    <HeroPreview heroData={form.data} />
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

                            {/* Accordion 1: Hero Text Content */}
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
                                            <TextFieldsIcon />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
                                                Hero Text Content
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Configure title, subtitle, and description
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        <TextField
                                            fullWidth
                                            label="Title"
                                            value={form.data?.content.title}
                                            onChange={(e) => {
                                                if (!form.data) return;
                                                form.setData({
                                                    ...form.data,
                                                    content: {
                                                        ...form.data.content,
                                                        title: e.target.value,
                                                    },
                                                });
                                            }}
                                            helperText="Main hero title"
                                            variant="outlined"
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="Subtitle"
                                            value={form.data?.content.subtitle}
                                            onChange={(e) => {
                                                if (!form.data) return;
                                                form.setData({
                                                    ...form.data,
                                                    content: {
                                                        ...form.data.content,
                                                        subtitle: e.target.value,
                                                    },
                                                });
                                            }}
                                            helperText="Subtitle below the title"
                                            variant="outlined"
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={3}
                                            label="Description"
                                            value={form.data?.content.description}
                                            onChange={(e) => {
                                                if (!form.data) return;
                                                form.setData({
                                                    ...form.data,
                                                    content: {
                                                        ...form.data.content,
                                                        description: e.target.value,
                                                    },
                                                });
                                            }}
                                            helperText="Longer description text"
                                            variant="outlined"
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="Business Hours"
                                            value={form.data?.content.businessHours}
                                            onChange={(e) => {
                                                if (!form.data) return;
                                                form.setData({
                                                    ...form.data,
                                                    content: {
                                                        ...form.data.content,
                                                        businessHours: e.target.value,
                                                    },
                                                });
                                            }}
                                            helperText="Custom business hours text for hero (used when toggle below is OFF)"
                                            variant="outlined"
                                            sx={{
                                                "& .MuiOutlinedInput-root": {
                                                    bgcolor: "background.paper",
                                                },
                                            }}
                                        />
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                bgcolor: "grey.50",
                                                border: "1px solid",
                                                borderColor: "divider",
                                                borderRadius: 1,
                                            }}
                                        >
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={
                                                            form.data?.content
                                                                .useContactInfoHours ?? false
                                                        }
                                                        onChange={(e) => {
                                                            if (!form.data) return;
                                                            form.setData({
                                                                ...form.data,
                                                                content: {
                                                                    ...form.data.content,
                                                                    useContactInfoHours:
                                                                        e.target.checked,
                                                                },
                                                            });
                                                        }}
                                                    />
                                                }
                                                label={
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontWeight: 500 }}
                                                    >
                                                        Use detailed hours from Contact Info
                                                    </Typography>
                                                }
                                            />
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: "block", mt: 1, ml: 4.5 }}
                                            >
                                                When enabled, displays the detailed hours from the
                                                Contact page (if available). When disabled, displays
                                                the custom text above.
                                            </Typography>
                                        </Paper>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 2: Trust Badges */}
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
                                            <BadgeIcon />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
                                                Trust Badges
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Add credibility indicators for your business
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box
                                        sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
                                    >
                                        {form.data?.trustBadges.map((badge, index) => (
                                            <Paper
                                                key={index}
                                                elevation={0}
                                                sx={{
                                                    p: 2.5,
                                                    border: "2px solid",
                                                    borderColor: "divider",
                                                    borderRadius: 2,
                                                    transition: "all 0.2s",
                                                    "&:hover": {
                                                        borderColor: "primary.light",
                                                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                                    },
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        gap: 2,
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <FormControl sx={{ minWidth: 150 }}>
                                                        <InputLabel>Icon</InputLabel>
                                                        <Select
                                                            value={badge.icon}
                                                            label="Icon"
                                                            onChange={(e) => {
                                                                const newBadges = [
                                                                    ...(form.data?.trustBadges ||
                                                                        []),
                                                                ];
                                                                newBadges[index].icon =
                                                                    e.target.value;
                                                                if (form.data)
                                                                    form.setData({
                                                                        ...form.data,
                                                                        trustBadges: newBadges,
                                                                    });
                                                            }}
                                                            sx={{
                                                                bgcolor: "background.paper",
                                                            }}
                                                        >
                                                            {Object.keys(TRUST_BADGE_ICONS).map(
                                                                (iconName) => (
                                                                    <MenuItem
                                                                        key={iconName}
                                                                        value={iconName}
                                                                    >
                                                                        <Box
                                                                            sx={{
                                                                                display: "flex",
                                                                                alignItems:
                                                                                    "center",
                                                                                gap: 1,
                                                                            }}
                                                                        >
                                                                            <IconComponent
                                                                                iconName={iconName}
                                                                            />
                                                                            <Typography
                                                                                sx={{
                                                                                    textTransform:
                                                                                        "capitalize",
                                                                                }}
                                                                            >
                                                                                {iconName}
                                                                            </Typography>
                                                                        </Box>
                                                                    </MenuItem>
                                                                ),
                                                            )}
                                                        </Select>
                                                    </FormControl>
                                                    <TextField
                                                        fullWidth
                                                        label="Text"
                                                        value={badge.text}
                                                        onChange={(e) => {
                                                            const newBadges = [
                                                                ...(form.data?.trustBadges || []),
                                                            ];
                                                            newBadges[index].text = e.target.value;
                                                            if (form.data)
                                                                form.setData({
                                                                    ...form.data,
                                                                    trustBadges: newBadges,
                                                                });
                                                        }}
                                                        sx={{
                                                            "& .MuiOutlinedInput-root": {
                                                                bgcolor: "background.paper",
                                                            },
                                                        }}
                                                    />
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => {
                                                            if (!form.data) return;
                                                            form.setData({
                                                                ...form.data,
                                                                trustBadges:
                                                                    form.data.trustBadges.filter(
                                                                        (_, i) => i !== index,
                                                                    ),
                                                            });
                                                        }}
                                                        sx={{
                                                            "&:hover": {
                                                                bgcolor: "error.lighter",
                                                            },
                                                        }}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Box>
                                            </Paper>
                                        ))}
                                        <Button
                                            variant="outlined"
                                            startIcon={<AddIcon />}
                                            onClick={() => {
                                                if (!form.data) return;
                                                form.setData({
                                                    ...form.data,
                                                    trustBadges: [
                                                        ...(form.data.trustBadges || []),
                                                        { icon: "users", text: "New Badge" },
                                                    ],
                                                });
                                            }}
                                            sx={{
                                                mt: 1,
                                                borderStyle: "dashed",
                                                borderWidth: 2,
                                                py: 1.5,
                                                "&:hover": {
                                                    borderWidth: 2,
                                                    bgcolor: "action.hover",
                                                },
                                            }}
                                        >
                                            Add Trust Badge
                                        </Button>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 3: CTA Buttons */}
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
                                            <ButtonIcon />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
                                                Call-to-Action Buttons
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Add action buttons to drive user engagement
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box
                                        sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
                                    >
                                        {form.data?.ctaButtons.map((button, index) => (
                                            <Paper
                                                key={index}
                                                elevation={0}
                                                sx={{
                                                    p: 2.5,
                                                    border: "2px solid",
                                                    borderColor: "divider",
                                                    borderRadius: 2,
                                                    transition: "all 0.2s",
                                                    "&:hover": {
                                                        borderColor: "success.light",
                                                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                                    },
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: "flex",
                                                        gap: 2,
                                                        alignItems: "center",
                                                        flexWrap: "wrap",
                                                    }}
                                                >
                                                    <TextField
                                                        label="Button Text"
                                                        value={button.text}
                                                        onChange={(e) => {
                                                            const newButtons = [
                                                                ...(form.data?.ctaButtons || []),
                                                            ];
                                                            newButtons[index].text = e.target.value;
                                                            if (form.data)
                                                                form.setData({
                                                                    ...form.data,
                                                                    ctaButtons: newButtons,
                                                                });
                                                        }}
                                                        sx={{
                                                            flex: 1,
                                                            minWidth: 150,
                                                            "& .MuiOutlinedInput-root": {
                                                                bgcolor: "background.paper",
                                                            },
                                                        }}
                                                    />
                                                    <TextField
                                                        label="Link"
                                                        value={button.link}
                                                        onChange={(e) => {
                                                            const newButtons = [
                                                                ...(form.data?.ctaButtons || []),
                                                            ];
                                                            newButtons[index].link = e.target.value;
                                                            if (form.data)
                                                                form.setData({
                                                                    ...form.data,
                                                                    ctaButtons: newButtons,
                                                                });
                                                        }}
                                                        sx={{
                                                            flex: 2,
                                                            minWidth: 200,
                                                            "& .MuiOutlinedInput-root": {
                                                                bgcolor: "background.paper",
                                                            },
                                                        }}
                                                    />
                                                    <FormControl sx={{ minWidth: 120 }}>
                                                        <InputLabel>Type</InputLabel>
                                                        <Select
                                                            value={button.type}
                                                            label="Type"
                                                            onChange={(e) => {
                                                                const newButtons = [
                                                                    ...(form.data?.ctaButtons ||
                                                                        []),
                                                                ];
                                                                newButtons[index].type =
                                                                    e.target.value;
                                                                if (form.data)
                                                                    form.setData({
                                                                        ...form.data,
                                                                        ctaButtons: newButtons,
                                                                    });
                                                            }}
                                                            sx={{
                                                                bgcolor: "background.paper",
                                                            }}
                                                        >
                                                            <MenuItem value="primary">
                                                                Primary
                                                            </MenuItem>
                                                            <MenuItem value="secondary">
                                                                Secondary
                                                            </MenuItem>
                                                        </Select>
                                                    </FormControl>
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => {
                                                            if (!form.data) return;
                                                            form.setData({
                                                                ...form.data,
                                                                ctaButtons:
                                                                    form.data.ctaButtons.filter(
                                                                        (_, i) => i !== index,
                                                                    ),
                                                            });
                                                        }}
                                                        sx={{
                                                            "&:hover": {
                                                                bgcolor: "error.lighter",
                                                            },
                                                        }}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Box>
                                            </Paper>
                                        ))}
                                        {(form.data?.ctaButtons.length || 0) < 3 && (
                                            <Button
                                                variant="outlined"
                                                startIcon={<AddIcon />}
                                                onClick={() => {
                                                    if (!form.data) return;
                                                    form.setData({
                                                        ...form.data,
                                                        ctaButtons: [
                                                            ...(form.data.ctaButtons || []),
                                                            {
                                                                text: "New Button",
                                                                link: "/",
                                                                type: "primary",
                                                            },
                                                        ],
                                                    });
                                                }}
                                                sx={{
                                                    mt: 1,
                                                    borderStyle: "dashed",
                                                    borderWidth: 2,
                                                    py: 1.5,
                                                    "&:hover": {
                                                        borderWidth: 2,
                                                        bgcolor: "action.hover",
                                                    },
                                                }}
                                            >
                                                Add CTA Button
                                            </Button>
                                        )}
                                        {(form.data?.ctaButtons.length || 0) >= 3 && (
                                            <Alert severity="info" sx={{ mt: 1 }}>
                                                Maximum of 3 CTA buttons reached for optimal user
                                                experience
                                            </Alert>
                                        )}
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 4: Carousel Behavior */}
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
                                                bgcolor: "info.main",
                                                color: "white",
                                            }}
                                        >
                                            <SettingsIcon />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
                                                Carousel Behavior Settings
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Configure slideshow timing and navigation
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                        {/* Current Settings Preview Card */}
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                bgcolor: "info.lighter",
                                                border: "2px solid",
                                                borderColor: "info.light",
                                                borderRadius: 2,
                                                p: 2.5,
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle1"
                                                sx={{ fontWeight: 600, mb: 2, color: "info.dark" }}
                                            >
                                                Current Configuration
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={6}>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: 0.5,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{ fontWeight: 600 }}
                                                        >
                                                            Auto-play
                                                        </Typography>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ fontWeight: 500 }}
                                                        >
                                                            {form.data?.settings.autoPlay
                                                                ? `Enabled (${form.data?.settings.autoPlayDelay / 1000}s delay)`
                                                                : "Disabled"}
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: 0.5,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{ fontWeight: 600 }}
                                                        >
                                                            Navigation Dots
                                                        </Typography>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ fontWeight: 500 }}
                                                        >
                                                            {form.data?.settings.showDots
                                                                ? "Visible"
                                                                : "Hidden"}
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: 0.5,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{ fontWeight: 600 }}
                                                        >
                                                            Navigation Arrows
                                                        </Typography>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ fontWeight: 500 }}
                                                        >
                                                            {form.data?.settings.showArrows
                                                                ? "Visible"
                                                                : "Hidden"}
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            gap: 0.5,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{ fontWeight: 600 }}
                                                        >
                                                            Transition Style
                                                        </Typography>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ fontWeight: 500 }}
                                                        >
                                                            {form.data?.settings.fadeTransition
                                                                ? `Fade (${(form.data?.settings.fadeTransitionDuration || 1000) / 1000}s)`
                                                                : "Slide"}
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </Paper>

                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2.5,
                                                bgcolor: "grey.50",
                                                border: "1px solid",
                                                borderColor: "divider",
                                                borderRadius: 2,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 2.5,
                                                }}
                                            >
                                                <Box>
                                                    <FormControlLabel
                                                        control={
                                                            <Switch
                                                                checked={
                                                                    form.data?.settings.autoPlay ??
                                                                    false
                                                                }
                                                                onChange={(e) => {
                                                                    if (!form.data) return;
                                                                    form.setData({
                                                                        ...form.data,
                                                                        settings: {
                                                                            ...form.data.settings,
                                                                            autoPlay:
                                                                                e.target.checked,
                                                                        },
                                                                    });
                                                                }}
                                                            />
                                                        }
                                                        label={
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontWeight: 500 }}
                                                            >
                                                                Auto-play carousel
                                                            </Typography>
                                                        }
                                                    />
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ display: "block", ml: 4.5 }}
                                                    >
                                                        Automatically cycle through images without
                                                        user interaction
                                                    </Typography>
                                                </Box>

                                                <TextField
                                                    fullWidth
                                                    type="number"
                                                    label="Auto-play Delay (milliseconds)"
                                                    value={form.data?.settings.autoPlayDelay}
                                                    onChange={(e) => {
                                                        if (!form.data) return;
                                                        form.setData({
                                                            ...form.data,
                                                            settings: {
                                                                ...form.data.settings,
                                                                autoPlayDelay:
                                                                    parseInt(e.target.value) ||
                                                                    5000,
                                                            },
                                                        });
                                                    }}
                                                    disabled={!form.data?.settings.autoPlay}
                                                    helperText={`Time between automatic slide changes (currently ${(form.data?.settings.autoPlayDelay || 5000) / 1000} seconds)`}
                                                    inputProps={{
                                                        min: 1000,
                                                        max: 10000,
                                                        step: 500,
                                                    }}
                                                    sx={{
                                                        "& .MuiOutlinedInput-root": {
                                                            bgcolor: "background.paper",
                                                        },
                                                    }}
                                                />

                                                <Box>
                                                    <FormControlLabel
                                                        control={
                                                            <Switch
                                                                checked={
                                                                    form.data?.settings.showDots ??
                                                                    false
                                                                }
                                                                onChange={(e) => {
                                                                    if (!form.data) return;
                                                                    form.setData({
                                                                        ...form.data,
                                                                        settings: {
                                                                            ...form.data.settings,
                                                                            showDots:
                                                                                e.target.checked,
                                                                        },
                                                                    });
                                                                }}
                                                            />
                                                        }
                                                        label={
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontWeight: 500 }}
                                                            >
                                                                Show navigation dots
                                                            </Typography>
                                                        }
                                                    />
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ display: "block", ml: 4.5 }}
                                                    >
                                                        Display small dots at bottom indicating
                                                        current slide and allowing direct navigation
                                                    </Typography>
                                                </Box>

                                                <Box>
                                                    <FormControlLabel
                                                        control={
                                                            <Switch
                                                                checked={
                                                                    form.data?.settings
                                                                        .showArrows ?? false
                                                                }
                                                                onChange={(e) => {
                                                                    if (!form.data) return;
                                                                    form.setData({
                                                                        ...form.data,
                                                                        settings: {
                                                                            ...form.data.settings,
                                                                            showArrows:
                                                                                e.target.checked,
                                                                        },
                                                                    });
                                                                }}
                                                            />
                                                        }
                                                        label={
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontWeight: 500 }}
                                                            >
                                                                Show navigation arrows
                                                            </Typography>
                                                        }
                                                    />
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ display: "block", ml: 4.5 }}
                                                    >
                                                        Display left/right arrows on sides of
                                                        carousel for manual navigation
                                                    </Typography>
                                                </Box>

                                                <Box>
                                                    <FormControlLabel
                                                        control={
                                                            <Switch
                                                                checked={
                                                                    form.data?.settings
                                                                        .fadeTransition ?? false
                                                                }
                                                                onChange={(e) => {
                                                                    if (!form.data) return;
                                                                    form.setData({
                                                                        ...form.data,
                                                                        settings: {
                                                                            ...form.data.settings,
                                                                            fadeTransition:
                                                                                e.target.checked,
                                                                        },
                                                                    });
                                                                }}
                                                            />
                                                        }
                                                        label={
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ fontWeight: 500 }}
                                                            >
                                                                Use fade transition
                                                            </Typography>
                                                        }
                                                    />
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ display: "block", ml: 4.5 }}
                                                    >
                                                        Fade between images (smooth) vs. slide
                                                        horizontally (dynamic)
                                                    </Typography>
                                                </Box>

                                                <TextField
                                                    fullWidth
                                                    type="number"
                                                    label="Fade Transition Duration (milliseconds)"
                                                    value={
                                                        form.data?.settings.fadeTransitionDuration
                                                    }
                                                    onChange={(e) => {
                                                        if (!form.data) return;
                                                        form.setData({
                                                            ...form.data,
                                                            settings: {
                                                                ...form.data.settings,
                                                                fadeTransitionDuration:
                                                                    parseInt(e.target.value) ||
                                                                    1000,
                                                            },
                                                        });
                                                    }}
                                                    disabled={!form.data?.settings.fadeTransition}
                                                    helperText={`How long the fade transition takes (currently ${(form.data?.settings.fadeTransitionDuration || 1000) / 1000} seconds)`}
                                                    inputProps={{
                                                        min: 100,
                                                        max: 5000,
                                                        step: 100,
                                                    }}
                                                    sx={{
                                                        "& .MuiOutlinedInput-root": {
                                                            bgcolor: "background.paper",
                                                        },
                                                    }}
                                                />
                                            </Box>
                                        </Paper>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Accordion 5: Hero Banner Images */}
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
                                                bgcolor: "warning.main",
                                                color: "white",
                                            }}
                                        >
                                            <ImageIcon />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{ fontWeight: 600, lineHeight: 1.2 }}
                                            >
                                                Hero Banner Images
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Upload and manage carousel images (
                                                {form.data?.banners.length || 0} total,{" "}
                                                {form.data?.banners.filter((b) => b.isActive)
                                                    .length || 0}{" "}
                                                active)
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 3, bgcolor: "background.paper" }}>
                                    <Box>
                                        <Dropzone
                                            dropzoneText={"Drag 'n' drop new images here or click"}
                                            onUpload={uploadImages}
                                            uploadText="Upload Images"
                                            sxs={{
                                                root: {
                                                    maxWidth: "min(100%, 700px)",
                                                    margin: "auto",
                                                    mb: 3,
                                                },
                                            }}
                                        />

                                        <DragDropContext onDragEnd={handleDragEnd}>
                                            <Droppable droppableId="hero-banners">
                                                {(provided) => (
                                                    <Box
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        sx={{ pb: pagePaddingBottom }}
                                                    >
                                                        {form.data?.banners.map((banner, index) => (
                                                            <Draggable
                                                                key={banner.id}
                                                                draggableId={banner.id}
                                                                index={index}
                                                            >
                                                                {(provided, snapshot) => (
                                                                    <Paper
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        data-testid={`hero-banner-card-${index}`}
                                                                        elevation={0}
                                                                        sx={{
                                                                            mb: 2.5,
                                                                            opacity:
                                                                                snapshot.isDragging
                                                                                    ? 0.7
                                                                                    : 1,
                                                                            border: "2px solid",
                                                                            borderColor:
                                                                                snapshot.isDragging
                                                                                    ? "primary.main"
                                                                                    : banner.isActive
                                                                                      ? "success.light"
                                                                                      : "divider",
                                                                            borderRadius: 2,
                                                                            overflow: "hidden",
                                                                            transition: "all 0.2s",
                                                                            boxShadow:
                                                                                snapshot.isDragging
                                                                                    ? "0 8px 16px rgba(0,0,0,0.15)"
                                                                                    : "0 1px 3px rgba(0,0,0,0.05)",
                                                                            "&:hover": {
                                                                                boxShadow:
                                                                                    "0 4px 12px rgba(0,0,0,0.1)",
                                                                                borderColor:
                                                                                    banner.isActive
                                                                                        ? "success.main"
                                                                                        : "primary.light",
                                                                            },
                                                                        }}
                                                                    >
                                                                        <Box
                                                                            sx={{
                                                                                display: "flex",
                                                                                alignItems:
                                                                                    "stretch",
                                                                            }}
                                                                        >
                                                                            <Box
                                                                                {...provided.dragHandleProps}
                                                                                sx={{
                                                                                    display: "flex",
                                                                                    flexDirection:
                                                                                        "column",
                                                                                    alignItems:
                                                                                        "center",
                                                                                    justifyContent:
                                                                                        "center",
                                                                                    px: 2,
                                                                                    cursor: "grab",
                                                                                    backgroundColor:
                                                                                        "grey.50",
                                                                                    borderRight:
                                                                                        "1px solid",
                                                                                    borderColor:
                                                                                        "divider",
                                                                                    "&:active": {
                                                                                        cursor: "grabbing",
                                                                                    },
                                                                                }}
                                                                            >
                                                                                <DragIcon
                                                                                    sx={{
                                                                                        color: "text.secondary",
                                                                                    }}
                                                                                />
                                                                                <Typography
                                                                                    variant="caption"
                                                                                    sx={{
                                                                                        mt: 0.5,
                                                                                        fontWeight: 600,
                                                                                        color: "text.secondary",
                                                                                    }}
                                                                                >
                                                                                    #
                                                                                    {
                                                                                        banner.displayOrder
                                                                                    }
                                                                                </Typography>
                                                                            </Box>

                                                                            <Box
                                                                                sx={{
                                                                                    position:
                                                                                        "relative",
                                                                                    width: 280,
                                                                                    height: 180,
                                                                                    flexShrink: 0,
                                                                                }}
                                                                            >
                                                                                <CardMedia
                                                                                    component="img"
                                                                                    image={
                                                                                        banner.src.startsWith(
                                                                                            "http",
                                                                                        )
                                                                                            ? banner.src
                                                                                            : `${getServerUrl()}${banner.src}`
                                                                                    }
                                                                                    alt={banner.alt}
                                                                                    sx={{
                                                                                        width: "100%",
                                                                                        height: "100%",
                                                                                        objectFit:
                                                                                            "cover",
                                                                                    }}
                                                                                />
                                                                                {!banner.isActive && (
                                                                                    <Box
                                                                                        sx={{
                                                                                            position:
                                                                                                "absolute",
                                                                                            top: 0,
                                                                                            left: 0,
                                                                                            right: 0,
                                                                                            bottom: 0,
                                                                                            bgcolor:
                                                                                                "rgba(0, 0, 0, 0.6)",
                                                                                            display:
                                                                                                "flex",
                                                                                            alignItems:
                                                                                                "center",
                                                                                            justifyContent:
                                                                                                "center",
                                                                                        }}
                                                                                    >
                                                                                        <Typography
                                                                                            variant="caption"
                                                                                            sx={{
                                                                                                color: "white",
                                                                                                fontWeight: 600,
                                                                                                px: 2,
                                                                                                py: 1,
                                                                                                bgcolor:
                                                                                                    "rgba(0, 0, 0, 0.8)",
                                                                                                borderRadius: 1,
                                                                                            }}
                                                                                        >
                                                                                            INACTIVE
                                                                                        </Typography>
                                                                                    </Box>
                                                                                )}
                                                                            </Box>

                                                                            <Box
                                                                                sx={{
                                                                                    flex: 1,
                                                                                    p: 2.5,
                                                                                }}
                                                                            >
                                                                                <Box
                                                                                    sx={{
                                                                                        display:
                                                                                            "flex",
                                                                                        flexDirection:
                                                                                            "column",
                                                                                        gap: 2,
                                                                                    }}
                                                                                >
                                                                                    <TextField
                                                                                        label="Alt Text"
                                                                                        value={
                                                                                            banner.alt
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) =>
                                                                                            handleFieldChange(
                                                                                                banner.id,
                                                                                                "alt",
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                            )
                                                                                        }
                                                                                        fullWidth
                                                                                        size="small"
                                                                                        data-testid={`hero-alt-input-${index}`}
                                                                                        sx={{
                                                                                            "& .MuiOutlinedInput-root":
                                                                                                {
                                                                                                    bgcolor:
                                                                                                        "background.paper",
                                                                                                },
                                                                                        }}
                                                                                    />
                                                                                    <TextField
                                                                                        label="Description"
                                                                                        value={
                                                                                            banner.description
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) =>
                                                                                            handleFieldChange(
                                                                                                banner.id,
                                                                                                "description",
                                                                                                e
                                                                                                    .target
                                                                                                    .value,
                                                                                            )
                                                                                        }
                                                                                        fullWidth
                                                                                        size="small"
                                                                                        multiline
                                                                                        rows={2}
                                                                                        data-testid={`hero-description-input-${index}`}
                                                                                        sx={{
                                                                                            "& .MuiOutlinedInput-root":
                                                                                                {
                                                                                                    bgcolor:
                                                                                                        "background.paper",
                                                                                                },
                                                                                        }}
                                                                                    />
                                                                                    <Box
                                                                                        sx={{
                                                                                            display:
                                                                                                "flex",
                                                                                            alignItems:
                                                                                                "center",
                                                                                            justifyContent:
                                                                                                "space-between",
                                                                                        }}
                                                                                    >
                                                                                        <FormControlLabel
                                                                                            control={
                                                                                                <Switch
                                                                                                    checked={
                                                                                                        banner.isActive
                                                                                                    }
                                                                                                    onChange={(
                                                                                                        e,
                                                                                                    ) =>
                                                                                                        handleFieldChange(
                                                                                                            banner.id,
                                                                                                            "isActive",
                                                                                                            e
                                                                                                                .target
                                                                                                                .checked,
                                                                                                        )
                                                                                                    }
                                                                                                    data-testid={`hero-active-switch-${index}`}
                                                                                                    color="success"
                                                                                                />
                                                                                            }
                                                                                            label={
                                                                                                <Typography
                                                                                                    variant="body2"
                                                                                                    sx={{
                                                                                                        fontWeight: 500,
                                                                                                    }}
                                                                                                >
                                                                                                    Active
                                                                                                </Typography>
                                                                                            }
                                                                                        />
                                                                                        <IconButton
                                                                                            onClick={() =>
                                                                                                handleDeleteBanner(
                                                                                                    banner.id,
                                                                                                )
                                                                                            }
                                                                                            color="error"
                                                                                            data-testid={`hero-delete-button-${index}`}
                                                                                            sx={{
                                                                                                "&:hover":
                                                                                                    {
                                                                                                        bgcolor:
                                                                                                            "error.lighter",
                                                                                                    },
                                                                                            }}
                                                                                        >
                                                                                            <DeleteIcon />
                                                                                        </IconButton>
                                                                                    </Box>
                                                                                </Box>
                                                                            </Box>
                                                                        </Box>
                                                                    </Paper>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </Box>
                                                )}
                                            </Droppable>
                                        </DragDropContext>
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            {/* Action Buttons at Bottom */}
                            {form.isDirty && (
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
                                        onClick={form.save}
                                        disabled={form.isSaving}
                                        sx={{
                                            px: 4,
                                            fontWeight: 600,
                                            boxShadow: 2,
                                            "&:hover": {
                                                boxShadow: 4,
                                            },
                                        }}
                                    >
                                        {form.isSaving ? "Saving..." : "Save All Changes"}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        onClick={form.cancel}
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
                                        <ImageIcon fontSize="small" />
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
                                <HeroPreview heroData={form.data} />
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
                                        actual hero section may look slightly different based on
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
