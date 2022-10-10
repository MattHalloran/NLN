import React from 'react';
import { memo } from 'react'
import { getImageSrc } from 'utils';

makeStyles({
    slide: props => ({
        height: '100%',
        width: `${props.width}px`,
        objectFit: 'cover',
        overflow: 'hidden',
    }),
});

export const Slide = memo(({ image, width }) => {
    const classes = useStyles({ width });
    return (
        <img className={classes.slide} src={image ? `${getServerUrl()}/${getImageSrc(image, width)}` : ''} alt={image?.alt ?? ''} />
    )
})