import { Box } from "@mui/material";
import { 
    FeaturedPlants, 
    Hero, 
    ServiceShowcase, 
    SocialProof, 
    AboutStory, 
    InteractiveElements, 
    LocationVisit,
    ScrollAnimation 
} from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";

export const HomePage = () => {
    return (
        <>
            <TopBar
                display="page"
            />
            <Box>
                {/* Hero Section - No animation as it's the first thing users see */}
                <Hero text="Beautiful, healthy plants" subtext="At competitive prices" />
                
                {/* Service Showcase */}
                <ScrollAnimation animation="fadeIn">
                    <ServiceShowcase />
                </ScrollAnimation>
                
                {/* Featured Plants */}
                <ScrollAnimation animation="slideUp" delay={200}>
                    <FeaturedPlants />
                </ScrollAnimation>
                
                {/* Social Proof */}
                <ScrollAnimation animation="fadeIn" delay={300}>
                    <SocialProof />
                </ScrollAnimation>
                
                {/* About Story */}
                <ScrollAnimation animation="slideUp" delay={400}>
                    <AboutStory />
                </ScrollAnimation>
                
                {/* Interactive Elements */}
                <ScrollAnimation animation="fadeIn" delay={500}>
                    <InteractiveElements />
                </ScrollAnimation>
                
                {/* Location & Visit */}
                <ScrollAnimation animation="slideUp" delay={600}>
                    <LocationVisit />
                </ScrollAnimation>
            </Box>
        </>
    );
};
