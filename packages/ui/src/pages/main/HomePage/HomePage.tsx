import { Box } from "@mui/material";
import {
    Hero,
    ServiceShowcase,
    SocialProof,
    AboutStory,
    InteractiveElements,
    LocationVisit,
} from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";

export const HomePage = () => {
    return (
        <>
            <TopBar
                display="page"
            />
            <Box>
                {/* Hero Section */}
                <Hero text="Beautiful, healthy plants" subtext="At competitive prices" />

                {/* Service Showcase */}
                <ServiceShowcase />

                {/* Social Proof */}
                <SocialProof />

                {/* About Story */}
                <AboutStory />

                {/* Interactive Elements */}
                <InteractiveElements />

                {/* Location & Visit */}
                <LocationVisit />
            </Box>
        </>
    );
};
