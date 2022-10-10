import { Box, useTheme } from '@mui/material';
import React from 'react';

 makeStyles((theme) => ({
    dotContainer: {
        position: 'absolute',
        bottom: '25px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    dot: {
        padding: '10px',
        marginRight: '5px',
        cursor: 'pointer',
        borderRadius: '50%',
        opacity: '80%',
        border: '1px solid black',
    },
    active: {
        background: palette.primary.main,
        opacity: '0.9',
    },
    inactive: {
        background: 'white',
    }
}));

export const Dots = ({
    quantity = 0,
    activeIndex
}) => {
    const { palette } = useTheme();

    let slides = [];
    for (let i = 0; i < quantity; i++) {
        slides.push(<Box key={'dot-'+i} className={`${classes.dot} ${activeIndex === i ? classes.active : classes.inactive}`} />)
    }

    return (
        <Box className={classes.dotContainer}>
            {slides}
        </Box>
    )
}