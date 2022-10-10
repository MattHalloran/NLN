import React from 'react';
import { Modal, IconButton, useTheme, Box } from '@mui/material';
import { CloseIcon } from '@shared/icons';

makeStyles((theme) => ({
    root: {

    },
    content: {
        outline: 0,
        display: 'flex',
    },
    bodyChildren: {
        borderRadius: '10px',
        backgroundColor: palette.primary.light,
        color: palette.primary.contrastText,
        border: `3px solid ${palette.primary.contrastText}`,
    },
    xButton: {
        height: 50,
        width: 50,
        left: -25,
        top: -25,
        borderRadius: '100%',
        background: '#A3333D',
        cursor: 'pointer',
        zIndex: 2,
        '&:hover': {
            background: '#A8333D',
        }
    },
    scrollable: {
        overflowY: 'scroll',
    },
}));

// const ESCAPE_KEY = 27;

export const StyledModal = ({
    open = true,
    scrollable = false,
    onClose,
    children,
}) => {
    const { palette } = useTheme();

    return (
        <Modal
            className={classes.root}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            open={open}
            onClose={onClose}>
            <Box style={{margin: 'auto', maxWidth: 'calc(100vw - 100px)', maxHeight: 'calc(100vh - 50px)'}} className={classes.content}>
                <Box className={`${classes.bodyChildren} ${scrollable ? classes.scrollable : ''}`}>
                    {children}
                </Box>
                <IconButton
                    className={classes.xButton}
                    aria-label="close modal"
                    onClick={onClose}>
                    <CloseIcon fill={palette.primary.contrastText} />
                </IconButton>
            </Box>
        </Modal>
    );
}