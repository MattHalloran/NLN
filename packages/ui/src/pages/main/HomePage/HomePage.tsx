import React from 'react';
import {
    FeaturedPlants,
    Hero
} from 'components';
import { Box } from '@mui/material';

export const HomePage = () => {
    return (
        <Box>
            <Hero text="Beautiful, healthy plants" subtext="At competitive prices" />
            <FeaturedPlants />
        </Box>
    );
}