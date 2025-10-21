import { Box, CircularProgress } from "@mui/material";
import {
    Hero,
    ServiceShowcase,
    SocialProof,
    AboutStory,
    InteractiveElements,
    LocationVisit,
} from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useLandingPageContent } from "api/rest/hooks";
import { useMemo } from "react";
import { useAnalyticsTracking } from "hooks/useAnalyticsTracking";

// Section component mapping
const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
    hero: Hero,
    services: ServiceShowcase,
    "social-proof": SocialProof,
    about: AboutStory,
    seasonal: InteractiveElements,
    location: LocationVisit,
};

export const HomePage = () => {
    const { data: landingPageData, loading } = useLandingPageContent(true);
    const { trackConversion } = useAnalyticsTracking(); // Track analytics events for A/B testing

    // Get section configuration with fallback to default
    const sectionConfig = useMemo(() => {
        if (landingPageData?.settings?.sections) {
            return landingPageData.settings.sections;
        }
        // Default configuration if not available
        return {
            order: ["hero", "services", "social-proof", "about", "seasonal", "location"],
            enabled: {
                hero: true,
                services: true,
                "social-proof": true,
                about: true,
                seasonal: true,
                location: true,
            },
        };
    }, [landingPageData]);

    // Filter and order sections based on configuration
    const orderedSections = useMemo(() => {
        return sectionConfig.order
            .filter((sectionId) => sectionConfig.enabled[sectionId])
            .filter((sectionId) => SECTION_COMPONENTS[sectionId]); // Only render sections we have components for
    }, [sectionConfig]);

    return (
        <>
            <TopBar display="page" />
            <Box>
                {loading ? (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "400px",
                        }}
                    >
                        <CircularProgress />
                    </Box>
                ) : (
                    orderedSections.map((sectionId) => {
                        const SectionComponent = SECTION_COMPONENTS[sectionId];
                        return <SectionComponent key={sectionId} />;
                    })
                )}
            </Box>
        </>
    );
};
