import React, { useMemo, useEffect, useRef } from "react";
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
import { restApi } from "api/rest/client";
import { handleError } from "utils/errorLogger";
import { getServerUrl } from "utils/serverUrl";

// Section component mapping
const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
    hero: Hero,
    services: ServiceShowcase,
    "social-proof": SocialProof,
    about: AboutStory,
    seasonal: InteractiveElements,
    location: LocationVisit,
};

const BOUNCE_THRESHOLD_MS = 10000; // 10 seconds

export const HomePage = () => {
    const { data: landingPageData, loading } = useLandingPage();
    const trackedViewVariantId = useRef<string | null>(null);
    const trackedBounceVariantId = useRef<string | null>(null);
    const bounceTracked = useRef(false);
    const visitStartTime = useRef<number | null>(null);

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

    // Track "view" event when landing page loads with variant
    // Resets and tracks again if variant changes (e.g., after localStorage expiration or variant reassignment)
    useEffect(() => {
        const currentVariantId = landingPageData?._meta?.variantId;

        // Only track if we have a variant and haven't tracked this specific variant yet
        if (currentVariantId && trackedViewVariantId.current !== currentVariantId) {
            trackedViewVariantId.current = currentVariantId;
            restApi
                .trackVariantEvent(currentVariantId, {
                    eventType: "view",
                })
                .catch((err) => {
                    handleError(err, "HomePage", "trackViewEvent");
                });
        }
    }, [landingPageData?._meta?.variantId]);

    // Track bounce if user leaves within 10 seconds
    // Resets timestamp if variant changes to accurately track bounce for each variant
    useEffect(() => {
        const currentVariantId = landingPageData?._meta?.variantId;

        if (!currentVariantId) return;

        // If this is a new variant, reset tracking state
        if (trackedBounceVariantId.current !== currentVariantId) {
            trackedBounceVariantId.current = currentVariantId;
            visitStartTime.current = Date.now();
            bounceTracked.current = false;
        }

        const handleBeforeUnload = () => {
            if (!visitStartTime.current || bounceTracked.current) return;

            const timeOnPage = Date.now() - visitStartTime.current;

            // Only track bounce if they leave within 10 seconds
            if (timeOnPage < BOUNCE_THRESHOLD_MS) {
                bounceTracked.current = true;

                if (navigator.sendBeacon) {
                    // Use Blob with explicit content type for proper JSON parsing on server
                    const blob = new Blob([JSON.stringify({ eventType: "bounce" })], {
                        type: "application/json",
                    });
                    const url = `${getServerUrl()}/rest/v1/landing-page/variants/${currentVariantId}/track`;
                    navigator.sendBeacon(url, blob);
                } else {
                    // Fallback for browsers that don't support sendBeacon
                    restApi
                        .trackVariantEvent(currentVariantId, {
                            eventType: "bounce",
                        })
                        .catch((err) => {
                            handleError(err, "HomePage", "trackBounceEvent");
                        });
                }
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [landingPageData?._meta?.variantId]);

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
