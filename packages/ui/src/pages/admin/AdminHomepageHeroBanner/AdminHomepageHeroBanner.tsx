import { APP_LINKS } from "@local/shared";
import {
    Box,
    Button,
    Card,
    CardMedia,
    CardActions,
    IconButton,
    TextField,
    FormControlLabel,
    Switch,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    Grid,
    Paper,
    Chip,
    Stack,
} from "@mui/material";
import {
    Delete as DeleteIcon,
    DragIndicator as DragIcon,
    ExpandMore as ExpandMoreIcon,
    Add as AddIcon,
    TextFields as TextFieldsIcon,
    EmojiEvents as BadgeIcon,
    TouchApp as ButtonIcon,
    Settings as SettingsIcon,
    Image as ImageIcon,
} from "@mui/icons-material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useLandingPage } from "hooks/useLandingPage";
import { useUpdateLandingPageSettings, useAddImages, useUpdateLandingPageContent } from "api/rest/hooks";
import { useABTestQueryParams } from "hooks/useABTestQueryParams";
import { BackButton, Dropzone, PageContainer } from "components";
import { ABTestEditingBanner } from "components/admin/ABTestEditingBanner/ABTestEditingBanner";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { getServerUrl } from "utils/serverUrl";
import { PubSub } from "utils/pubsub";
import { SnackSeverity } from "components/dialogs/Snack/Snack";
import { useCallback, useEffect, useState, useMemo } from "react";
import { pagePaddingBottom } from "styles";
import { Users, Award, Leaf, Package, Shield, Heart } from "lucide-react";

// Available icons for trust badges
const TRUST_BADGE_ICONS = {
    users: Users,
    award: Award,
    leaf: Leaf,
    package: Package,
    shield: Shield,
    heart: Heart,
};

interface HeroSettings {
    autoPlay: boolean;
    autoPlayDelay: number;
    showDots: boolean;
    showArrows: boolean;
    fadeTransition: boolean;
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

// Default values
const DEFAULT_HERO_SETTINGS: HeroSettings = {
    autoPlay: true,
    autoPlayDelay: 5000,
    showDots: true,
    showArrows: true,
    fadeTransition: true,
};

const DEFAULT_HERO_CONTENT: HeroContent = {
    title: "Beautiful, healthy plants",
    subtitle: "At competitive prices",
    description: "Serving landscape professionals for over 40 years with the finest selection of wholesale plants, trees, and shrubs",
    businessHours: "OPEN 7 DAYS A WEEK | Mon-Sat 8AM-6PM | Sun 9AM-5PM",
    useContactInfoHours: false,
};

const DEFAULT_TRUST_BADGES: TrustBadge[] = [
    { icon: "users", text: "Family Owned Since 1981" },
    { icon: "award", text: "Licensed & Certified" },
    { icon: "leaf", text: "Expert Plant Care" },
];

const DEFAULT_CTA_BUTTONS: CTAButton[] = [
    { text: "Browse Plants", link: "https://newlife.online-orders.sbiteam.com/", type: "primary" },
    { text: "Visit Our Nursery", link: "/about", type: "secondary" },
];

// Preview component that shows how the hero will look
const HeroPreview = ({
    heroBanners,
    heroSettings,
    heroContent,
    trustBadges,
    ctaButtons,
}: {
    heroBanners: any[];
    heroSettings: HeroSettings;
    heroContent: HeroContent;
    trustBadges: TrustBadge[];
    ctaButtons: CTAButton[];
}) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const activeImages = heroBanners.filter((b) => b.isActive);

    // Auto-play carousel in preview
    useEffect(() => {
        if (!heroSettings.autoPlay || activeImages.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % activeImages.length);
        }, heroSettings.autoPlayDelay);

        return () => clearInterval(interval);
    }, [heroSettings.autoPlay, heroSettings.autoPlayDelay, activeImages.length]);

    const textPopStyle = {
        padding: "0",
        color: "white",
        textAlign: "center",
        fontWeight: "600",
        textShadow: "2px 2px 4px rgba(0,0,0,0.8), 0px 0px 20px rgba(0,0,0,0.5)",
    };

    const currentImage = activeImages[currentSlide];

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
                                transition: heroSettings.fadeTransition
                                    ? "opacity 1s ease-in-out"
                                    : "opacity 0.1s",
                                zIndex: index === currentSlide ? 1 : 0,
                            }}
                        />
                    ))}

                    {/* Navigation dots */}
                    {heroSettings.showDots && activeImages.length > 1 && (
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
                                        bgcolor: index === currentSlide ? "white" : "rgba(255,255,255,0.5)",
                                        cursor: "pointer",
                                        transition: "all 0.3s",
                                    }}
                                />
                            ))}
                        </Box>
                    )}

                    {/* Navigation arrows */}
                    {heroSettings.showArrows && activeImages.length > 1 && (
                        <>
                            <IconButton
                                size="small"
                                onClick={() =>
                                    setCurrentSlide((prev) => (prev - 1 + activeImages.length) % activeImages.length)
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
                                onClick={() => setCurrentSlide((prev) => (prev + 1) % activeImages.length)}
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
                            {trustBadges.map((badge, index) => {
                                const IconComponent =
                                    TRUST_BADGE_ICONS[badge.icon as keyof typeof TRUST_BADGE_ICONS] || Users;
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
                            {heroContent.title}
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
                            {heroContent.subtitle}
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
                            {heroContent.description}
                        </Typography>

                        {/* CTA Buttons */}
                        <Stack direction="row" spacing={2} sx={{ mb: 2, pointerEvents: "auto" }}>
                            {ctaButtons.map((button, index) => (
                                <Button
                                    key={index}
                                    variant={button.type === "primary" ? "contained" : "outlined"}
                                    color={button.type === "primary" ? "secondary" : undefined}
                                    size="small"
                                    sx={{
                                        fontSize: "0.75rem",
                                        px: 2,
                                        backgroundColor:
                                            button.type === "primary" ? undefined : "rgba(255, 255, 255, 0.95)",
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
                                {heroContent.businessHours}
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
    const [heroBanners, setHeroBanners] = useState<any[]>([]);
    const [originalHeroBanners, setOriginalHeroBanners] = useState<any[]>([]);
    const [heroSettings, setHeroSettings] = useState<HeroSettings>(DEFAULT_HERO_SETTINGS);
    const [originalHeroSettings, setOriginalHeroSettings] = useState<HeroSettings>(DEFAULT_HERO_SETTINGS);
    const [heroContent, setHeroContent] = useState<HeroContent>(DEFAULT_HERO_CONTENT);
    const [originalHeroContent, setOriginalHeroContent] = useState<HeroContent>(DEFAULT_HERO_CONTENT);
    const [trustBadges, setTrustBadges] = useState<TrustBadge[]>(DEFAULT_TRUST_BADGES);
    const [originalTrustBadges, setOriginalTrustBadges] = useState<TrustBadge[]>(DEFAULT_TRUST_BADGES);
    const [ctaButtons, setCtaButtons] = useState<CTAButton[]>(DEFAULT_CTA_BUTTONS);
    const [originalCtaButtons, setOriginalCtaButtons] = useState<CTAButton[]>(DEFAULT_CTA_BUTTONS);
    const [isLoading, setIsLoading] = useState(false);

    const { data: landingPageContent, refetch } = useLandingPage();
    const updateSettings = useUpdateLandingPageSettings();
    const { mutate: addImages } = useAddImages();
    const updateLandingPageContent = useUpdateLandingPageContent();

    // Use variantId from URL query params, or fall back to the loaded data's variant
    const variantId = queryVariantId || landingPageContent?._meta?.variantId;

    // Load all hero-related content
    useEffect(() => {
        if (landingPageContent) {
            // Load hero banners - fix unsafe optional chaining
            if (landingPageContent.content?.hero?.banners) {
                const banners = landingPageContent.content.hero.banners;
                const sorted = [...banners].sort(
                    (a: any, b: any) => a.displayOrder - b.displayOrder,
                );
                setHeroBanners(sorted);
                setOriginalHeroBanners(JSON.parse(JSON.stringify(sorted)));
            }

            // Load hero settings
            if (landingPageContent.content?.hero?.settings) {
                setHeroSettings(landingPageContent.content.hero.settings);
                setOriginalHeroSettings(JSON.parse(JSON.stringify(landingPageContent.content.hero.settings)));
            }

            // Load hero content
            if (landingPageContent.content?.hero?.text) {
                const content = landingPageContent.content.hero.text;
                const newContent = {
                    title: content.title || DEFAULT_HERO_CONTENT.title,
                    subtitle: content.subtitle || DEFAULT_HERO_CONTENT.subtitle,
                    description: content.description || DEFAULT_HERO_CONTENT.description,
                    businessHours: content.businessHours || DEFAULT_HERO_CONTENT.businessHours,
                    useContactInfoHours: (content as any).useContactInfoHours ?? false,
                };
                setHeroContent(newContent);
                setOriginalHeroContent(JSON.parse(JSON.stringify(newContent)));

                // Load trust badges
                if (content.trustBadges) {
                    setTrustBadges(content.trustBadges);
                    setOriginalTrustBadges(JSON.parse(JSON.stringify(content.trustBadges)));
                }

                // Load CTA buttons
                if (content.buttons) {
                    setCtaButtons(content.buttons);
                    setOriginalCtaButtons(JSON.parse(JSON.stringify(content.buttons)));
                }
            }
        }
    }, [landingPageContent]);

    // Check for changes using useMemo for derived state
    const hasChanges = useMemo(() => {
        const bannersChanged = JSON.stringify(heroBanners) !== JSON.stringify(originalHeroBanners);
        const settingsChanged = JSON.stringify(heroSettings) !== JSON.stringify(originalHeroSettings);
        const contentChanged = JSON.stringify(heroContent) !== JSON.stringify(originalHeroContent);
        const badgesChanged = JSON.stringify(trustBadges) !== JSON.stringify(originalTrustBadges);
        const buttonsChanged = JSON.stringify(ctaButtons) !== JSON.stringify(originalCtaButtons);
        return bannersChanged || settingsChanged || contentChanged || badgesChanged || buttonsChanged;
    }, [heroBanners, originalHeroBanners, heroSettings, originalHeroSettings, heroContent, originalHeroContent, trustBadges, originalTrustBadges, ctaButtons, originalCtaButtons]);

    const handleApiError = useCallback((error: any, defaultMessage: string) => {
        const message = error?.message || defaultMessage;
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Error });
    }, []);

    const handleApiSuccess = useCallback((message: string) => {
        PubSub.get().publishSnack({ message, severity: SnackSeverity.Success });
    }, []);

    const uploadImages = useCallback(async (acceptedFiles: File[]) => {
        try {
            setIsLoading(true);

            // Upload images using the images API (which creates multiple sizes + WebP)
            const uploadResults = await addImages({ label: "hero", files: acceptedFiles });

            const newBanners: any[] = [];
            const currentLength = heroBanners.length;

            for (let i = 0; i < uploadResults.length; i++) {
                const result = uploadResults[i];
                const file = acceptedFiles[i];

                if (result.success && result.src) {
                    const newBanner = {
                        id: `hero-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        src: `/${result.src}`, // Use the server-generated path (e.g., /images/filename-XXL.jpg)
                        alt: file.name.replace(/\.[^/.]+$/, ""),
                        description: "",
                        width: 0, // Width/height will be determined by the image rendering
                        height: 0,
                        displayOrder: currentLength + newBanners.length + 1,
                        isActive: true,
                    };
                    newBanners.push(newBanner);
                }
            }

            setHeroBanners((prev) => [...prev, ...newBanners]);
            handleApiSuccess(`Added ${newBanners.length} image(s). Remember to save changes.`);
        } catch (error) {
            handleApiError(error, "Failed to add images");
        } finally {
            setIsLoading(false);
        }
    }, [heroBanners.length, addImages, handleApiSuccess, handleApiError]);

    const handleDragEnd = useCallback((result: any) => {
        if (!result.destination) return;

        setHeroBanners((prev) => {
            const items = Array.from(prev);
            const [reorderedItem] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, reorderedItem);

            return items.map((item, index) => ({
                ...item,
                displayOrder: index + 1,
            }));
        });
    }, []);

    const handleDeleteBanner = useCallback((id: string) => {
        setHeroBanners((prev) =>
            prev
                .filter((b) => b.id !== id)
                .map((item, index) => ({
                    ...item,
                    displayOrder: index + 1,
                })),
        );
    }, []);

    const handleFieldChange = useCallback((id: string, field: string, value: any) => {
        setHeroBanners((prev) =>
            prev.map((banner) => (banner.id === id ? { ...banner, [field]: value } : banner)),
        );
    }, []);

    const handleSaveAllChanges = useCallback(async () => {
        try {
            setIsLoading(true);

            const queryParams = variantId ? { variantId } : undefined;

            // Update hero banners and settings
            await updateLandingPageContent.mutate({
                data: {
                    heroBanners,
                    heroSettings,
                },
                queryParams,
            });

            // Update hero content, trust badges, and CTA buttons
            // Send nested structure matching LandingPageContent for type safety
            await updateSettings.mutate({
                settings: {
                    content: {
                        hero: {
                            text: {
                                ...heroContent,
                                trustBadges,
                                buttons: ctaButtons,
                            },
                        },
                    },
                },
                queryParams,
            });

            await refetch();
            handleApiSuccess("All hero settings saved successfully!");

            // Update original values
            setOriginalHeroBanners(JSON.parse(JSON.stringify(heroBanners)));
            setOriginalHeroSettings(JSON.parse(JSON.stringify(heroSettings)));
            setOriginalHeroContent(JSON.parse(JSON.stringify(heroContent)));
            setOriginalTrustBadges(JSON.parse(JSON.stringify(trustBadges)));
            setOriginalCtaButtons(JSON.parse(JSON.stringify(ctaButtons)));
        } catch (error: any) {
            handleApiError(error, "Failed to save changes");
        } finally {
            setIsLoading(false);
        }
    }, [heroBanners, heroSettings, heroContent, trustBadges, ctaButtons, refetch, handleApiSuccess, handleApiError, updateSettings, updateLandingPageContent, variantId]);

    const handleCancelChanges = useCallback(() => {
        setHeroBanners(JSON.parse(JSON.stringify(originalHeroBanners)));
        setHeroSettings(JSON.parse(JSON.stringify(originalHeroSettings)));
        setHeroContent(JSON.parse(JSON.stringify(originalHeroContent)));
        setTrustBadges(JSON.parse(JSON.stringify(originalTrustBadges)));
        setCtaButtons(JSON.parse(JSON.stringify(originalCtaButtons)));
    }, [originalHeroBanners, originalHeroSettings, originalHeroContent, originalTrustBadges, originalCtaButtons]);

    const IconComponent = ({ iconName }: { iconName: string }) => {
        const Icon = TRUST_BADGE_ICONS[iconName as keyof typeof TRUST_BADGE_ICONS] || Users;
        return <Icon size={20} />;
    };

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                title="Hero Section Settings"
                help="Configure all aspects of your hero section"
                startComponent={<BackButton to={APP_LINKS.AdminHomepage} ariaLabel="Back to Homepage Management" />}
            />

            <Box p={2}>
                <ABTestEditingBanner />

                {/* Unsaved changes warning */}
                {hasChanges && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        You have unsaved changes. Don't forget to save before leaving!
                    </Alert>
                )}

                {/* Action Buttons at Top */}
                {hasChanges && (
                    <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleSaveAllChanges}
                            disabled={isLoading}
                        >
                            Save All Changes
                        </Button>
                        <Button
                            onClick={handleCancelChanges}
                        >
                            Cancel
                        </Button>
                    </Box>
                )}

                {/* Two-column layout: Controls on left, Preview on right */}
                <Grid container spacing={3}>
                    {/* Left Column - Editing Controls */}
                    <Grid item xs={12} lg={7}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

                {/* Accordion 1: Hero Text Content */}
                <Accordion defaultExpanded sx={{ border: "1px solid", borderColor: "divider" }}>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{ bgcolor: "action.hover" }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <TextFieldsIcon color="primary" />
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Hero Text Content
                            </Typography>
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <TextField
                                fullWidth
                                label="Title"
                                value={heroContent.title}
                                onChange={(e) => setHeroContent({ ...heroContent, title: e.target.value })}
                                helperText="Main hero title"
                            />
                            <TextField
                                fullWidth
                                label="Subtitle"
                                value={heroContent.subtitle}
                                onChange={(e) => setHeroContent({ ...heroContent, subtitle: e.target.value })}
                                helperText="Subtitle below the title"
                            />
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Description"
                                value={heroContent.description}
                                onChange={(e) => setHeroContent({ ...heroContent, description: e.target.value })}
                                helperText="Longer description text"
                            />
                            <TextField
                                fullWidth
                                label="Business Hours"
                                value={heroContent.businessHours}
                                onChange={(e) => setHeroContent({ ...heroContent, businessHours: e.target.value })}
                                helperText="Custom business hours text for hero (used when toggle below is OFF)"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={heroContent.useContactInfoHours}
                                        onChange={(e) => setHeroContent({ ...heroContent, useContactInfoHours: e.target.checked })}
                                    />
                                }
                                label="Use detailed hours from Contact Info"
                            />
                            <Alert severity="info" sx={{ mt: 1 }}>
                                When enabled, displays the detailed hours from the Contact page (if available). When disabled, displays the custom text above.
                            </Alert>
                        </Box>
                    </AccordionDetails>
                </Accordion>

                {/* Accordion 2: Trust Badges */}
                <Accordion defaultExpanded sx={{ border: "1px solid", borderColor: "divider" }}>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{ bgcolor: "action.hover" }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <BadgeIcon color="primary" />
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Trust Badges
                            </Typography>
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {trustBadges.map((badge, index) => (
                                <Card key={index} sx={{ p: 2 }}>
                                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                                        <FormControl sx={{ minWidth: 150 }}>
                                            <InputLabel>Icon</InputLabel>
                                            <Select
                                                value={badge.icon}
                                                label="Icon"
                                                onChange={(e) => {
                                                    const newBadges = [...trustBadges];
                                                    newBadges[index].icon = e.target.value;
                                                    setTrustBadges(newBadges);
                                                }}
                                            >
                                                {Object.keys(TRUST_BADGE_ICONS).map((iconName) => (
                                                    <MenuItem key={iconName} value={iconName}>
                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                            <IconComponent iconName={iconName} />
                                                            {iconName}
                                                        </Box>
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            fullWidth
                                            label="Text"
                                            value={badge.text}
                                            onChange={(e) => {
                                                const newBadges = [...trustBadges];
                                                newBadges[index].text = e.target.value;
                                                setTrustBadges(newBadges);
                                            }}
                                        />
                                        <IconButton
                                            color="error"
                                            onClick={() => setTrustBadges(trustBadges.filter((_, i) => i !== index))}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                </Card>
                            ))}
                            <Button
                                startIcon={<AddIcon />}
                                onClick={() => setTrustBadges([...trustBadges, { icon: "users", text: "New Badge" }])}
                            >
                                Add Trust Badge
                            </Button>
                        </Box>
                    </AccordionDetails>
                </Accordion>

                {/* Accordion 3: CTA Buttons */}
                <Accordion defaultExpanded sx={{ border: "1px solid", borderColor: "divider" }}>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{ bgcolor: "action.hover" }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <ButtonIcon color="primary" />
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Call-to-Action Buttons
                            </Typography>
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {ctaButtons.map((button, index) => (
                                <Card key={index} sx={{ p: 2 }}>
                                    <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                                        <TextField
                                            label="Button Text"
                                            value={button.text}
                                            onChange={(e) => {
                                                const newButtons = [...ctaButtons];
                                                newButtons[index].text = e.target.value;
                                                setCtaButtons(newButtons);
                                            }}
                                            sx={{ flex: 1, minWidth: 150 }}
                                        />
                                        <TextField
                                            label="Link"
                                            value={button.link}
                                            onChange={(e) => {
                                                const newButtons = [...ctaButtons];
                                                newButtons[index].link = e.target.value;
                                                setCtaButtons(newButtons);
                                            }}
                                            sx={{ flex: 2, minWidth: 200 }}
                                        />
                                        <FormControl sx={{ minWidth: 120 }}>
                                            <InputLabel>Type</InputLabel>
                                            <Select
                                                value={button.type}
                                                label="Type"
                                                onChange={(e) => {
                                                    const newButtons = [...ctaButtons];
                                                    newButtons[index].type = e.target.value;
                                                    setCtaButtons(newButtons);
                                                }}
                                            >
                                                <MenuItem value="primary">Primary</MenuItem>
                                                <MenuItem value="secondary">Secondary</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <IconButton
                                            color="error"
                                            onClick={() => setCtaButtons(ctaButtons.filter((_, i) => i !== index))}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                </Card>
                            ))}
                            {ctaButtons.length < 3 && (
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={() => setCtaButtons([...ctaButtons, { text: "New Button", link: "/", type: "primary" }])}
                                >
                                    Add CTA Button
                                </Button>
                            )}
                        </Box>
                    </AccordionDetails>
                </Accordion>

                {/* Accordion 4: Carousel Behavior */}
                <Accordion defaultExpanded sx={{ border: "1px solid", borderColor: "divider" }}>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{ bgcolor: "action.hover" }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <SettingsIcon color="primary" />
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Carousel Behavior Settings
                            </Typography>
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {/* Current Settings Preview Card */}
                            <Card sx={{ bgcolor: "primary.main", color: "white", p: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                    Current Carousel Configuration:
                                </Typography>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                    <Typography variant="body2">
                                        🔄 Auto-play: <strong>{heroSettings.autoPlay ? `ON (${heroSettings.autoPlayDelay / 1000}s delay)` : "OFF"}</strong>
                                    </Typography>
                                    <Typography variant="body2">
                                        ⚫ Navigation Dots: <strong>{heroSettings.showDots ? "VISIBLE" : "HIDDEN"}</strong>
                                    </Typography>
                                    <Typography variant="body2">
                                        ⬅➡ Navigation Arrows: <strong>{heroSettings.showArrows ? "VISIBLE" : "HIDDEN"}</strong>
                                    </Typography>
                                    <Typography variant="body2">
                                        ✨ Transition Style: <strong>{heroSettings.fadeTransition ? "FADE" : "SLIDE"}</strong>
                                    </Typography>
                                </Box>
                            </Card>

                            <Alert severity="info">
                                These settings control how hero banner images are displayed and animated. Save changes and visit the homepage to see the effect.
                            </Alert>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={heroSettings.autoPlay}
                                        onChange={(e) => setHeroSettings({ ...heroSettings, autoPlay: e.target.checked })}
                                    />
                                }
                                label="🔄 Auto-play carousel"
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: -1, ml: 4 }}>
                                Automatically cycle through images without user interaction
                            </Typography>

                            <TextField
                                fullWidth
                                type="number"
                                label="Auto-play Delay (milliseconds)"
                                value={heroSettings.autoPlayDelay}
                                onChange={(e) => setHeroSettings({ ...heroSettings, autoPlayDelay: parseInt(e.target.value) || 5000 })}
                                disabled={!heroSettings.autoPlay}
                                helperText={`Time between automatic slide changes (currently ${heroSettings.autoPlayDelay / 1000} seconds)`}
                                inputProps={{ min: 1000, max: 10000, step: 500 }}
                            />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={heroSettings.showDots}
                                        onChange={(e) => setHeroSettings({ ...heroSettings, showDots: e.target.checked })}
                                    />
                                }
                                label="⚫ Show navigation dots"
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: -1, ml: 4 }}>
                                Display small dots at bottom indicating current slide and allowing direct navigation
                            </Typography>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={heroSettings.showArrows}
                                        onChange={(e) => setHeroSettings({ ...heroSettings, showArrows: e.target.checked })}
                                    />
                                }
                                label="⬅➡ Show navigation arrows"
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: -1, ml: 4 }}>
                                Display left/right arrows on sides of carousel for manual navigation
                            </Typography>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={heroSettings.fadeTransition}
                                        onChange={(e) => setHeroSettings({ ...heroSettings, fadeTransition: e.target.checked })}
                                    />
                                }
                                label="✨ Use fade transition"
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: -1, ml: 4 }}>
                                Fade between images (smooth) vs. slide horizontally (dynamic)
                            </Typography>
                        </Box>
                    </AccordionDetails>
                </Accordion>

                {/* Accordion 5: Hero Banner Images */}
                <Accordion defaultExpanded sx={{ border: "1px solid", borderColor: "divider" }}>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{ bgcolor: "action.hover" }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <ImageIcon color="primary" />
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                Hero Banner Images
                            </Typography>
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Box>
                            <Dropzone
                                dropzoneText={"Drag 'n' drop new images here or click"}
                                onUpload={uploadImages}
                                uploadText="Upload Images"
                                sxs={{ root: { maxWidth: "min(100%, 700px)", margin: "auto", mb: 3 } }}
                            />

                            <DragDropContext onDragEnd={handleDragEnd}>
                                <Droppable droppableId="hero-banners">
                                    {(provided) => (
                                        <Box
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            sx={{ pb: pagePaddingBottom }}
                                        >
                                            {heroBanners.map((banner, index) => (
                                                <Draggable
                                                    key={banner.id}
                                                    draggableId={banner.id}
                                                    index={index}
                                                >
                                                    {(provided, snapshot) => (
                                                        <Card
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            data-testid={`hero-banner-card-${index}`}
                                                            sx={{
                                                                mb: 2,
                                                                opacity: snapshot.isDragging ? 0.5 : 1,
                                                                backgroundColor: snapshot.isDragging
                                                                    ? "action.hover"
                                                                    : "background.paper",
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    alignItems: "stretch",
                                                                }}
                                                            >
                                                                <Box
                                                                    {...provided.dragHandleProps}
                                                                    sx={{
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        px: 2,
                                                                        cursor: "grab",
                                                                        backgroundColor: "action.hover",
                                                                    }}
                                                                >
                                                                    <DragIcon />
                                                                </Box>

                                                                <CardMedia
                                                                    component="img"
                                                                    height="200"
                                                                    image={
                                                                        banner.src.startsWith("http")
                                                                            ? banner.src
                                                                            : `${getServerUrl()}${banner.src}`
                                                                    }
                                                                    alt={banner.alt}
                                                                    sx={{ width: 300, objectFit: "cover" }}
                                                                />

                                                                <Box sx={{ flex: 1, p: 2 }}>
                                                                    <Typography
                                                                        variant="subtitle2"
                                                                        gutterBottom
                                                                    >
                                                                        Order: {banner.displayOrder}
                                                                    </Typography>
                                                                    <TextField
                                                                        label="Alt Text"
                                                                        value={banner.alt}
                                                                        onChange={(e) =>
                                                                            handleFieldChange(
                                                                                banner.id,
                                                                                "alt",
                                                                                e.target.value,
                                                                            )
                                                                        }
                                                                        fullWidth
                                                                        size="small"
                                                                        sx={{ mb: 1 }}
                                                                        data-testid={`hero-alt-input-${index}`}
                                                                    />
                                                                    <TextField
                                                                        label="Description"
                                                                        value={banner.description}
                                                                        onChange={(e) =>
                                                                            handleFieldChange(
                                                                                banner.id,
                                                                                "description",
                                                                                e.target.value,
                                                                            )
                                                                        }
                                                                        fullWidth
                                                                        size="small"
                                                                        multiline
                                                                        rows={2}
                                                                        data-testid={`hero-description-input-${index}`}
                                                                    />
                                                                    <FormControlLabel
                                                                        control={
                                                                            <Switch
                                                                                checked={banner.isActive}
                                                                                onChange={(e) =>
                                                                                    handleFieldChange(
                                                                                        banner.id,
                                                                                        "isActive",
                                                                                        e.target.checked,
                                                                                    )
                                                                                }
                                                                                data-testid={`hero-active-switch-${index}`}
                                                                            />
                                                                        }
                                                                        label="Active"
                                                                        sx={{ mt: 1 }}
                                                                    />
                                                                </Box>

                                                                <CardActions>
                                                                    <IconButton
                                                                        onClick={() =>
                                                                            handleDeleteBanner(banner.id)
                                                                        }
                                                                        color="error"
                                                                        data-testid={`hero-delete-button-${index}`}
                                                                    >
                                                                        <DeleteIcon />
                                                                    </IconButton>
                                                                </CardActions>
                                                            </Box>
                                                        </Card>
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
                        {hasChanges && (
                            <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
                                <Button
                                    variant="contained"
                                    onClick={handleSaveAllChanges}
                                    disabled={isLoading}
                                >
                                    Save All Changes
                                </Button>
                                <Button
                                    onClick={handleCancelChanges}
                                >
                                    Cancel
                                </Button>
                            </Box>
                        )}
                        </Box>
                    </Grid>

                    {/* Right Column - Live Preview (Desktop only, sticky) */}
                    <Grid item xs={12} lg={5} sx={{ display: { xs: "none", lg: "block" } }}>
                        <Paper
                            elevation={3}
                            sx={{
                                position: "sticky",
                                top: 16,
                                p: 2,
                                bgcolor: "background.paper",
                                borderRadius: 2,
                            }}
                        >
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                                Live Preview
                            </Typography>
                            <HeroPreview
                                heroBanners={heroBanners}
                                heroSettings={heroSettings}
                                heroContent={heroContent}
                                trustBadges={trustBadges}
                                ctaButtons={ctaButtons}
                            />
                            <Alert severity="info" sx={{ mt: 2 }}>
                                This preview updates in real-time as you make changes. The actual hero section may look slightly different based on screen size.
                            </Alert>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </PageContainer>
    );
};
