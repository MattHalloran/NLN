import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import { LINKS } from 'utils';

makeStyles((theme) => ({
    center: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translateX(-50%) translateY(-50%)',
    },
}));

export const NotFoundPage = () => {
    const { palette } = useTheme();

    return (
        <Box id="page">
            <Box className={classes.center}>
                <h1>Page Not Found</h1>
                <h3>Looks like you've followed a broken link or entered a URL that doesn't exist on this site</h3>
                <br />
                <Link to={LINKS.Home}>
                    <Button>Go to Home</Button>
                </Link>
            </Box>
        </Box>
    );
}