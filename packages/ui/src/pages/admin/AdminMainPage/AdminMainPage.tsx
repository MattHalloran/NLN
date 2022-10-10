import React from 'react';
import { useHistory } from 'react-router-dom';
import { LINKS } from 'utils';
import { Typography, Card, CardContent, CardActions, Tooltip, IconButton } from '@mui/material';
import { OpenInNewIcon } from '@shared/icons';

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

function AdminMainPage() {
    let history = useHistory();
    const { palette } = useTheme();

    const card_data = [
        ['Orders', "Approve, create, and edit customer's orders", LINKS.AdminOrders],
        ['Customers', "Approve new customers, edit customer information", LINKS.AdminCustomers],
        ['Inventory', "Add, remove, and update inventory", LINKS.AdminInventory],
        ['Hero', "Add, remove, and rearrange hero (home page) images", LINKS.AdminHero],
        ['Gallery', "Add, remove, and rearrange gallery images", LINKS.AdminGallery],
        ['Contact Info', "Edit business hours and other contact information", LINKS.AdminContactInfo],
    ]

    return (
        <PageContainer>
            <Box className={classes.header}>
                <Typography variant="h3" component="h1">Manage Site</Typography>
            </Box>
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

AdminMainPage.propTypes = {
}

export { AdminMainPage };