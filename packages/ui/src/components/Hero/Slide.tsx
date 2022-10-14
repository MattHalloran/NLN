import { Box } from '@mui/material';
import { memo } from 'react'
import { getImageSrc, getServerUrl } from 'utils';

export const Slide = memo<any>(({ image, width }) => {
    return (
        <Box sx={{
            height: '100%',
            width: `${width}px`,
            objectFit: 'cover',
            overflow: 'hidden',
        }}>
            <img src={image ? `${getServerUrl()}/${getImageSrc(image, width)}` : ''} alt={image?.alt ?? ''} />
        </Box>
    )
})