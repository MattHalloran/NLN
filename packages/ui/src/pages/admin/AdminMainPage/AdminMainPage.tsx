import React from 'react';
import { useHistory } from 'react-router-dom';
import { Box, Typography, Card, CardContent, CardActions, Tooltip, IconButton, useTheme } from '@mui/material';
import { OpenInNewIcon } from '@shared/icons';
import { APP_LINKS } from '@shared/consts';
import { PageContainer, PageTitle } from 'components';

makeStyles((theme) => ({
    header: {
        textAlign: 'center',
    },
    card: {
        background: palette.primary.main,
        color: palette.primary.contrastText,
        cursor: 'pointer',
    },
    flexed: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gridGap: '20px',
        alignItems: 'stretch',
    },
    icon: {
        color: palette.secondary.light,
    },
}));

export const AdminMainPage = () => {
    let history = useHistory();
    const { palette } = useTheme();

    const card_data: [string, string, string][] = [
        ['Orders', "Approve, create, and edit customer's orders", APP_LINKS.AdminOrders],
        ['Customers', "Approve new customers, edit customer information", APP_LINKS.AdminCustomers],
        ['Inventory', "Add, remove, and update inventory", APP_LINKS.AdminInventory],
        ['Hero', "Add, remove, and rearrange hero (home page) images", APP_LINKS.AdminHero],
        ['Gallery', "Add, remove, and rearrange gallery images", APP_LINKS.AdminGallery],
        ['Contact Info', "Edit business hours and other contact information", APP_LINKS.AdminContactInfo],
    ]

    return (
        <PageContainer>
            <PageTitle>Manage Site</PageTitle>
            <Box className={classes.flexed}>
                {card_data.map(([title, description, link]) => (
                    <Card className={classes.card} onClick={() => history.push(link)}>
                        <CardContent>
                            <Typography variant="h5" component="h2">
                                {title}
                            </Typography>
                            <Typography variant="body2" component="p">
                                {description}
                            </Typography>
                        </CardContent>
                        <CardActions>
                            <Tooltip title="Open" placement="bottom">
                                <IconButton onClick={() => history.push(link)}>
                                    <OpenInNewIcon className={classes.icon} />
                                </IconButton>
                            </Tooltip>
                        </CardActions>
                    </Card>
                ))}
            </Box>
        </PageContainer>
    );
}