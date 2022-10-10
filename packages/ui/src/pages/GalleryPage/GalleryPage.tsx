import React, { useEffect, useState } from 'react';
import Carousel from 'react-gallery-carousel';
import 'react-gallery-carousel/dist/index.css';
import { InformationalBreadcrumbs, PageContainer, SnackSeverity } from 'components';
import { getImageSrc, getServerUrl, PubSub } from 'utils';
import { imagesByLabelQuery } from 'graphql/query';
import { useQuery } from '@apollo/client';
import { IMAGE_SIZE } from '@shared/consts';
import { useTheme } from '@mui/material';

 makeStyles(() => ({
    imageList: {
        spacing: 0,
    },
    tileImg: {

    },
    popupMain: {
        display: 'flex',
        width: '100%',
        height: '100%',
    },
    popupImg: {
        maxHeight: '90vh',
        maxWidth: '100%',
        display: 'block',
        borderRadius: '10px',
        objectFit: 'contain',
    },
    carousel: {
        width: '100%',
        height: 'calc(100vw * 0.8)'
    }
}));

export const GalleryPage = () => {
    const { palette } = useTheme();

    const [images, setImages] = useState([]);
    const { data: imageData, error } = useQuery(imagesByLabelQuery, { variables: { label: 'gallery' } });

    if (error) PubSub.get().publishSnack({ message: error.message ?? 'Unknown error occurred', severity: SnackSeverity.Error, data: error });

    useEffect(() => {
        if (!Array.isArray(imageData?.imagesByLabel)) {
            setImages([]);
            return;
        }
        setImages(imageData.imagesByLabel.map((data) => ({ 
            alt: data.alt, 
            src: `${getServerUrl()}/${getImageSrc(data)}`, 
            thumbnail: `${getServerUrl()}/${getImageSrc(data, IMAGE_SIZE.M)}`
        })))
    }, [imageData])

    // useHotkeys('escape', () => setCurrImg([null, null]));
    // useHotkeys('arrowLeft', () => navigate(-1));
    // useHotkeys('arrowRight', () => navigate(1));

    return (
        <PageContainer>
            <InformationalBreadcrumbs textColor={palette.secondary.dark} />
            <Carousel className={classes.carousel} canAutoPlay={false} images={images} />
        </PageContainer>
    );
}