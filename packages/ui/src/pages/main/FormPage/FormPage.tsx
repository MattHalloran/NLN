import React from 'react';
import { Box, Container, Typography, useTheme } from '@mui/material';
import { PageContainer, PageTitle } from 'components';

export const FormPage = ({
    title,
    autocomplete = 'on',
    children,
    maxWidth = '90%',
}) => {
    const { palette } = useTheme();

    return (
        <PageContainer>
            <Box sx={{
                backgroundColor: palette.background.paper,
                display: 'grid',
                position: 'relative',
                boxShadow: '0px 2px 4px -1px rgb(0 0 0 / 20%), 0px 4px 5px 0px rgb(0 0 0 / 14%), 0px 1px 10px 0px rgb(0 0 0 / 12%)',
                minWidth: '300px',
                maxWidth: 'min(100%, 700px)',
                borderRadius: '10px',
                overflow: 'hidden',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '20px'
                maxWidth,
            }}>
                <PageTitle>{title}</PageTitle>
                <Container>
                    {children}
                </Container>
            </Box>
        </PageContainer>
    );
}