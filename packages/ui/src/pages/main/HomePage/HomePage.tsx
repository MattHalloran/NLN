import { Box } from "@mui/material";
import { FeaturedPlants, Hero } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";

export const HomePage = () => {
    return (
        <>
            <TopBar
                display="page"
            />
            <Box>
                <Hero text="Beautiful, healthy plants" subtext="At competitive prices" />
                <FeaturedPlants />
            </Box>
        </>
    );
};
