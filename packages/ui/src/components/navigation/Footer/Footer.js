import ProvenWinners from 'assets/img/proven-winners.png';
import AmericanHort from 'assets/img/american-hort.png';
import NJNLA from 'assets/img/njnla_logo.jpg';
import PropTypes from 'prop-types';
import { API_ADDRESS } from '@local/shared';
import { LINKS, printAvailability } from 'utils';
import { makeStyles } from '@material-ui/styles';
import { List, ListItem, ListItemIcon, ListItemText, Grid, ButtonBase, Tooltip } from '@material-ui/core';
import {
    Business as BusinessIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Print as PrintIcon
} from '@material-ui/icons';
import { Copyright } from 'components';

const useStyles = makeStyles((theme) => ({
    root: {
        overflow: 'hidden',
        backgroundColor: theme.palette.primary.dark,
        color: theme.palette.primary.contrastText,
        borderTop: `2px solid ${theme.palette.text.primary}`,
        position: 'relative',
        paddingBottom: '7vh',
    },
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
        background: theme.palette.primary.contrastText,
    },
    icon: {
        fill: theme.palette.primary.contrastText,
    },
    copyright: {
        color: theme.palette.primary.contrastText,
    },
}));

function Footer({
    session,
    business
}) {
    const classes = useStyles();

    const contactLinks = [
        ['address', 'View in Google Maps', business?.ADDRESS?.Link, business?.ADDRESS?.Label, BusinessIcon],
        ['contact-phone', 'Call Us', business?.PHONE?.Link, business?.PHONE?.Label, PhoneIcon],
        ['contact-fax', 'Fax Us', business?.FAX?.Link, business?.FAX?.Label, PrintIcon],
        ['contact-email', 'Email Us', business?.EMAIL?.Link, business?.EMAI?.Label, EmailIcon],
    ]

    const bottomImages = [
        ["https://www.provenwinners.com/", "We Sell Proven Winners - The #1 Plant Brand", ProvenWinners],
        ["https://www.americanhort.org/", "Proud member of the AmericanHort", AmericanHort],
        ["https://www.njnla.org/", "Proud member of the New Jersey Nursery and Landscape Association", NJNLA],
    ]

    return (
        <div className={classes.root}>
            <Grid container justifyContent='center' spacing={1}>
                <Grid item xs={6}>
                    <List component="nav">
                        <ListItem button component="a" href={LINKS.About} >
                            <ListItemText primary="About Us" />
                        </ListItem>
                        <ListItem button component="a" href={LINKS.Contact} >
                            <ListItemText primary="Contact Us" />
                        </ListItem>
                        <ListItem
                            button
                            component="a"
                            href={`${API_ADDRESS}/Confidential_Commercial_Credit_Application-2010.doc`}
                            target='_blank'
                            rel="noopener noreferrer"
                            download="Confidential_Commercial_Credit_Application"
                        >
                            <ListItemText primary="Credit App" />
                        </ListItem>
                        <ListItem button href={LINKS.About} onClick={() => printAvailability(session, business?.BUSINESS_NAME?.Long)} >
                            <ListItemText primary="Print Availability" />
                        </ListItem>
                        <ListItem button component="a" href={LINKS.Gallery} >
                            <ListItemText primary="Gallery" />
                        </ListItem>
                        {/* <ListItem button component="a" href={LINKS.Featured} >
                            <ListItemText primary="Featured Plants" />
                        </ListItem> */}
                    </List>
                </Grid>
                <Grid item xs={6}>
                    <List component="nav">
                        <ListItem button component="h5" >
                            <ListItemText className={classes.upper} primary={business?.BUSINESS_NAME?.Long} />
                        </ListItem>
                        {contactLinks.map(([label, tooltip, src, text, Icon], key) => (
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
            <Copyright className={classes.copyright} business={business} />
        </div>
    );
}

Footer.propTypes = {
    session: PropTypes.object,
}

export { Footer };
