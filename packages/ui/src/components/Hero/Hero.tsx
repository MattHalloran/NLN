// Code inspired by https://github.com/rmolinamir/hero-slider
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Typography, Button, Box, useTheme } from '@mui/material';
import { Slider } from './Slider.js'
import { imagesByLabelQuery } from 'graphql/query';
import { useQuery } from '@apollo/client';
import { APP_LINKS } from '@shared/consts';

makeStyles(() => ({
    textPop: {
        padding: '0',
        color: 'white',
        textAlign: 'center',
        fontWeight: '600',
        textShadow:
            `-1px -1px 0 black,  
            1px -1px 0 black,
            -1px 1px 0 black,
            1px 1px 0 black`
    },
    title: {
        margin: '0 auto',
        width: '90%'
    },
    subtitle: {
        margin: '24px auto 0',
        width: '80%'
    },
    mainButton: {
        pointerEvents: 'auto'
    }
}));

export const Hero = ({
    text,
    subtext,
}) => {
    let history = useHistory();
    const { palette } = useTheme();

    const [images, setImages] = useState([]);
    const { data } = useQuery(imagesByLabelQuery, { variables: { input: { label: 'hero' } } });
    useEffect(() => {
        setImages(data?.imagesByLabel);
    }, [data])

    return (
        <Box sx={{
            position: 'relative',
            overflow: 'hidden',
            pointerEvents: 'none',
        }}>
            <Slider images={images} autoPlay={true} />
            <Box sx={{
                position: 'absolute',
                top: '0',
                left: '0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexFlow: 'column',
                width: '100%',
                height: '100%',
                margin: '0',
                padding: '0',
                pointerEvents: 'none',
                backgroundColor: 'rgba(0, 0, 0, 0.1)'
            }}>
                <Typography variant='h2' component='h1' className={classes.title + ' ' + classes.textPop}>{text}</Typography>
                <Typography variant='h4' component='h2' className={classes.subtitle + ' ' + classes.textPop}>{subtext}</Typography>
                <Button
                    type="submit"
                    color="secondary"
                    className={classes.mainButton}
                    onClick={() => history.push(APP_LINKS.Shopping)}
                >
                    Request Quote
                </Button>
            </Box>
        </Box>
    );
};