import React from 'react';
import ProvenWinners from 'assets/img/proven-winners.png';
import AmericanHort from 'assets/img/american-hort.png';
import NJNLA from 'assets/img/njnla_logo.jpg';
import { getServerUrl, printAvailability } from 'utils';
import { List, ListItem, ListItemIcon, ListItemText, Grid, ButtonBase, Tooltip, Box, useTheme } from '@mui/material';
import { CopyrightBreadcrumbs } from 'components';
import { useHistory } from 'react-router';
import { EmailIcon, PhoneIcon, SvgComponent } from '@shared/icons';
import { APP_LINKS } from '@shared/consts';

makeStyles((theme) => ({
    upper: {
        textTransform: 'uppercase',
    },
    imageContainer: {
        maxWidth: '33vw',
        padding: 10,
    },
    image: {
        maxWidth: '100%',
        maxHeight: 200,
        background: palette.primary.contrastText,
    },
    icon: {
        fill: palette.primary.contrastText,
    },
    copyright: {
        ,
    },
}));

export const Footer = ({
    session,
    business
}) => {
    const history = useHistory();
    const { palette } = useTheme();

    const contactAPP_LINKS: [string, string, string | null, string | null, SvgComponent][] = [
        ['address', 'View in Google Maps', business?.ADDRESS?.Link, business?.ADDRESS?.Label, BusinessIcon],
        ['contact-phone', 'Call Us', business?.PHONE?.Link, business?.PHONE?.Label, PhoneIcon],
        ['contact-fax', 'Fax Us', business?.FAX?.Link, business?.FAX?.Label, PrintIcon],
        ['contact-email', 'Email Us', business?.EMAIL?.Link, business?.EMAIL?.Label, EmailIcon],
    ]

    const bottomImages: [string, string, any][] = [
        ["https://www.provenwinners.com/", "We Sell Proven Winners - The #1 Plant Brand", ProvenWinners],
        ["https://www.americanhort.org/", "Proud member of the AmericanHort", AmericanHort],
        ["https://www.njnla.org/", "Proud member of the New Jersey Nursery and Landscape Association", NJNLA],
    ]

    return (
        <Box sx={{
            overflow: 'hidden',
            backgroundColor: palette.primary.dark,
            color: palette.primary.contrastText,
            position: 'relative',
            paddingBottom: '7vh',
        }}>
            <Grid container justifyContent='center' spacing={1}>
                <Grid item xs={12} sm={6}>
                    <List component="nav">
                        <ListItem component="h3" >
                            <ListItemText className={classes.upper} primary="Resources" />
                        </ListItem>
                        <ListItem button component="a" onClick={() => history.push(APP_LINKS.About)} >
                            <ListItemText primary="About Us" />
                        </ListItem>
                        <ListItem
                            button
                            component="a"
                            href={`${getServerUrl()}/Commercial_Credit_Application-2010.doc`}
                            target='_blank'
                            rel="noopener noreferrer"
                            download={`Commercial Credit Application - ${business?.BUSINESS_NAME?.Short}`}
                        >
                            <ListItemText primary="Credit App" />
                        </ListItem>
                        <ListItem button component="a" onClick={() => printAvailability(session, business?.BUSINESS_NAME?.Long)} >
                            <ListItemText primary="Print Availability" />
                        </ListItem>
                        <ListItem button component="a" onClick={() => history.push(APP_LINKS.Gallery)} >
                            <ListItemText primary="Gallery" />
                        </ListItem>
                    </List>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <List component="nav">
                        <ListItem component="h3" >
                            <ListItemText className={classes.upper} primary="Contact" />
                        </ListItem>
                        {contactAPP_LINKS.map(([label, tooltip, src, text, Icon], key) => (
                            <Tooltip key={key} title={tooltip} placement="left">
                                <ListItem button component="a" aria-label={label} href={src}>
                                    <ListItemIcon>
                                        <Icon className={classes.icon} ></Icon>
                                    </ListItemIcon>
                                    <ListItemText primary={text} />
                                </ListItem>
                            </Tooltip>
                        ))}
                    </List>
                </Grid>
                {bottomImages.map(([src, alt, img], key) => (
                    <Grid key={key} item xs={4}>
                        <Tooltip title={alt} placement="bottom">
                            <ButtonBase className={classes.imageContainer}>
                                <a href={src} target="_blank" rel="noopener noreferrer">
                                    <img className={classes.image} alt={alt} src={img} />
                                </a>
                            </ButtonBase>
                        </Tooltip>
                    </Grid>
                ))}
            </Grid>
            <CopyrightBreadcrumbs business={business} textColor={palette.primary.contrastText} sx={{ color: palette.primary.contrastText }} />
        </Box>
    );
}