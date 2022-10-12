import { Box, useTheme } from '@mui/material';

export const Dots = ({
    quantity = 0,
    activeIndex
}) => {
    const { palette } = useTheme();

    let slides: JSX.Element[] = [];
    for (let i = 0; i < quantity; i++) {
        slides.push(<Box
            key={'dot-' + i}
            sx={{
                padding: '10px',
                marginRight: '5px',
                cursor: 'pointer',
                borderRadius: '50%',
                border: '1px solid black',
                background: activeIndex === i ? palette.primary.main : 'white',
                opacity: activeIndex === i ? '0.9' : '80%',
            }}
        />)
    }

    return (
        <Box sx={{
            position: 'absolute',
            bottom: '25px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
        }}>
            {slides}
        </Box>
    )
}