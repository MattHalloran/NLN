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
} from "@mui/material";
import {
    Delete as DeleteIcon,
    DragIndicator as DragIcon,
    ExpandMore as ExpandMoreIcon,
    Add as AddIcon,
} from "@mui/icons-material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useLandingPage } from "hooks/useLandingPage";
import { useUpdateLandingPageSettings } from "api/rest/hooks";
import { useABTestQueryParams } from "hooks/useABTestQueryParams";
import { restApi } from "api/rest/client";
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

export const AdminHomepageHeroBanner = () => {
    const { abTestId, variant } = useABTestQueryParams();
    const [heroBanners, setHeroBanners] = useState<any[]>([]);
    const [originalHeroBanners, setOriginalHeroBanners] = useState<any[]>([]);
    const [heroSettings, setHeroSettings] = useState<HeroSettings>({
        autoPlay: true,
        autoPlayDelay: 5000,
        showDots: true,
        showArrows: true,
        fadeTransition: true,
    });
    const [originalHeroSettings, setOriginalHeroSettings] = useState<HeroSettings>(heroSettings);
    const [heroContent, setHeroContent] = useState<HeroContent>({
        title: "Beautiful, healthy plants",
        subtitle: "At competitive prices",
        description: "Serving landscape professionals for over 40 years with the finest selection of wholesale plants, trees, and shrubs",
        businessHours: "OPEN 7 DAYS A WEEK | Mon-Sat 8AM-6PM | Sun 9AM-5PM",
        useContactInfoHours: false,
    });
    const [originalHeroContent, setOriginalHeroContent] = useState<HeroContent>(heroContent);
    const [trustBadges, setTrustBadges] = useState<TrustBadge[]>([
        { icon: "users", text: "Family Owned Since 1981" },
        { icon: "award", text: "Licensed & Certified" },
        { icon: "leaf", text: "Expert Plant Care" },
    ]);
    const [originalTrustBadges, setOriginalTrustBadges] = useState<TrustBadge[]>(trustBadges);
    const [ctaButtons, setCtaButtons] = useState<CTAButton[]>([
        { text: "Browse Plants", link: "https://newlife.online-orders.sbiteam.com/", type: "primary" },
        { text: "Visit Our Nursery", link: "/about", type: "secondary" },
    ]);
    const [originalCtaButtons, setOriginalCtaButtons] = useState<CTAButton[]>(ctaButtons);
    const [isLoading, setIsLoading] = useState(false);

    const { data: landingPageContent, refetch } = useLandingPage();
    const updateSettings = useUpdateLandingPageSettings();

    // Load all hero-related content
    useEffect(() => {
        if (landingPageContent) {
            // Load hero banners
            if (landingPageContent.content?.hero?.banners) {
                const sorted = [...landingPageContent.content?.hero?.banners].sort(
                    (a: any, b: any) => a.displayOrder - b.displayOrder,
                );
                setHeroBanners(sorted);
                setOriginalHeroBanners(JSON.parse(JSON.stringify(sorted)));
            }

            // Load hero settings
            if (landingPageContent.content?.hero?.settings) {
                setHeroSettings(landingPageContent.content?.hero?.settings);
                setOriginalHeroSettings(JSON.parse(JSON.stringify(landingPageContent.content?.hero?.settings)));
            }

            // Load hero content
            if (landingPageContent.content?.hero?.text) {
                const content = landingPageContent.content.hero.text;
                setHeroContent({
                    title: content.title || heroContent.title,
                    subtitle: content.subtitle || heroContent.subtitle,
                    description: content.description || heroContent.description,
                    businessHours: content.businessHours || heroContent.businessHours,
                    useContactInfoHours: (content as any).useContactInfoHours ?? false,
                });
                setOriginalHeroContent(JSON.parse(JSON.stringify({
                    title: content.title || heroContent.title,
                    subtitle: content.subtitle || heroContent.subtitle,
                    description: content.description || heroContent.description,
                    businessHours: content.businessHours || heroContent.businessHours,
                    useContactInfoHours: (content as any).useContactInfoHours ?? false,
                })));

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

            const uploadResult = await restApi.writeAssets(acceptedFiles);

            if (!uploadResult.success) {
                throw new Error("Failed to upload images to server");
            }

            const newBanners: any[] = [];
            const currentLength = heroBanners.length;

            for (const file of acceptedFiles) {
                const reader = new window.FileReader();
                const base64 = await new Promise<string>((resolve) => {
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.readAsDataURL(file);
                });

                const img = new window.Image();
                await new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.src = base64;
                });

                const newBanner = {
                    id: `hero-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    src: `/${file.name}`,
                    alt: file.name.replace(/\.[^/.]+$/, ""),
                    description: "",
                    width: img.width,
                    height: img.height,
                    displayOrder: currentLength + newBanners.length + 1,
                    isActive: true,
                };
                newBanners.push(newBanner);
            }

            setHeroBanners((prev) => [...prev, ...newBanners]);
            handleApiSuccess(`Added ${acceptedFiles.length} image(s). Remember to save changes.`);
        } catch (error) {
            handleApiError(error, "Failed to add images");
        } finally {
            setIsLoading(false);
        }
    }, [heroBanners.length, handleApiSuccess, handleApiError]);

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

            const queryParams = abTestId && variant ? { abTestId, variant } : undefined;

            // Update hero banners and settings
            await restApi.updateLandingPageContent(
                {
                    heroBanners,
                    heroSettings,
                },
                queryParams,
            );

            // Update hero content, trust badges, and CTA buttons
            await updateSettings.mutate({
                settings: {
                    hero: {
                        ...heroContent,
                        trustBadges,
                        buttons: ctaButtons,
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
    }, [heroBanners, heroSettings, heroContent, trustBadges, ctaButtons, refetch, handleApiSuccess, handleApiError, updateSettings, abTestId, variant]);

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

                {/* Accordion 1: Hero Text Content */}
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">Hero Text Content</Typography>
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
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">Trust Badges</Typography>
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
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">Call-to-Action Buttons</Typography>
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
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">Carousel Behavior Settings</Typography>
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
                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">Hero Banner Images</Typography>
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
        </PageContainer>
    );
};
