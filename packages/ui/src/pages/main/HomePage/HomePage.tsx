import React, { useMemo } from "react";
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
import { useLandingPage } from "hooks/useLandingPage";

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
    const { data: landingPageData, loading } = useLandingPage();

    // Get section configuration with fallback to default
    const sectionConfig = useMemo(() => {
        if (landingPageData?.layout?.sections) {
            return landingPageData.layout.sections;
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
