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
    const bounceTracked = useRef(false);
    const visitStartTime = useRef(Date.now());

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
    useEffect(() => {
        if (landingPageData?._meta?.variantId) {
            restApi.trackVariantEvent(landingPageData._meta.variantId, {
                eventType: "view",
            }).catch((err) => {
                console.error("Error tracking view event:", err);
            });
        }
    }, [landingPageData?._meta?.variantId]);

    // Track bounce if user leaves within 10 seconds
    useEffect(() => {
        const handleBeforeUnload = () => {
            const timeOnPage = Date.now() - visitStartTime.current;

            // Only track bounce if they leave within 10 seconds and haven't already tracked
            if (timeOnPage < BOUNCE_THRESHOLD_MS && !bounceTracked.current && landingPageData?._meta?.variantId) {
                bounceTracked.current = true;

                const data = JSON.stringify({
                    eventType: "bounce",
                });

                if (navigator.sendBeacon) {
                    const url = `${window.location.origin}/rest/v1/landing-page/variants/${landingPageData._meta.variantId}/track`;
                    navigator.sendBeacon(url, data);
                } else {
                    // Fallback for browsers that don't support sendBeacon
                    restApi.trackVariantEvent(landingPageData._meta.variantId, {
                        eventType: "bounce",
                    }).catch((err) => {
                        console.error("Error tracking bounce event:", err);
                    });
                }
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [landingPageData]);

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
