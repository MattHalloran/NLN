import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

const useStyles = makeStyles((theme) => ({
    root: {
        background: theme.palette.background.paper,
    },
}));

export const TabPanel = (props) => {
    const { palette } = useTheme();

    const { children, value, index, ...other } = props;

    return (
        <Box
            className={classes.root}
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box p={3}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </Box>
    );
}