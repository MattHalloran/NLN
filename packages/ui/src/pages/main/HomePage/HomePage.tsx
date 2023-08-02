import { Box } from "@mui/material";
import {
    FeaturedPlants,
    Hero,
} from "components";

export const HomePage = () => {
    return (
        <Box>
            <Hero text="Beautiful, healthy plants" subtext="At competitive prices" />
            <FeaturedPlants />
        </Box>
    );
};
