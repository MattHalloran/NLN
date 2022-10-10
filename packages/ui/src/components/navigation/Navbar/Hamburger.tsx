import React, { useEffect, useState } from 'react';
import {
    ContactInfo,
} from 'components';
import { getUserActions, PubSub } from 'utils';
import { IconButton, SwipeableDrawer, List, ListItem, ListItemIcon, Badge, Collapse, Divider, ListItemText, useTheme } from '@mui/material';
import { CopyrightBreadcrumbs } from 'components';
import _ from 'lodash';
import { CloseIcon, ExpandLessIcon, ExpandMoreIcon, FacebookIcon, HomeIcon, InfoIcon, InstagramIcon, ShareIcon } from '@shared/icons';

makeStyles((theme) => ({
    drawerPaper: {
        background: palette.primary.light,
        borderLeft: `1px solid ${palette.text.primary}`,
    },
    menuItem: {
        color: palette.primary.contrastText,
        borderBottom: `1px solid ${palette.primary.dark}`,
    },
    close: {
        color: palette.primary.contrastText,
        borderRadius: 0,
        borderBottom: `1px solid ${palette.primary.dark}`,
        justifyContent: 'end',
        direction: 'rtl',
    },
}));

export const Hamburger = ({
    session,
    business,
    logout,
    roles,
    cart,
    onRedirect
}) => {
    const { palette } = useTheme();

    const [contactOpen, setContactOpen] = useState(true);
    const [socialOpen, setSocialOpen] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        let openSub = PubSub.get().subscribeBurgerMenu((data) => {
            setOpen(open => data === 'toggle' ? !open : data);
        });
        return (() => {
            PubSub.get().unsubscribe(openSub);
        })
    }, [])

    const closeMenu = () => PubSub.get().publishBurgerMenu(false)
    const toggleOpen = () => PubSub.get().publishBurgerMenu('toggle')

    const handleContactClick = () => {
        setContactOpen(!contactOpen);
    };

    const handleSocialClick = () => {
        setSocialOpen(!socialOpen);
    }

    const newTab = (link) => {
        window.open(link, "_blank");
    }

    const optionsToList = (options) => {
        return options.map(([label, value, link, onClick, Icon, badgeNum], index) => (
            <ListItem
                key={index}
                className={classes.menuItem}
                button
                onClick={() => {
                    onRedirect(link);
                    if (onClick) onClick();
                    closeMenu();
                }}>
                {Icon ?
                    (<ListItemIcon>
                        <Badge badgeContent={badgeNum ?? 0} color="error">
                            <Icon className={classes.menuIcon} />
                        </Badge>
                    </ListItemIcon>) : null}
                <ListItemText primary={label} />
            </ListItem>
        ))
    }

    let nav_options = [
        ['Home', 'home', LINKS.Home, null, HomeIcon],
        ['About Us', 'about', LINKS.About, null, InfoIcon],
        ['Gallery', 'gallery', LINKS.Gallery, null, PhotoLibraryIcon]
    ]

    let customer_actions = getUserActions(session, roles, cart);
    if (_.isObject(session) && Object.entries(session).length > 0) {
        customer_actions.push(['Log Out', 'logout', LINKS.Home, logout, ExitToAppIcon]);
    }

    return (
        <React.Fragment>
            <IconButton edge="start" color="inherit" aria-label="menu" onClick={toggleOpen}>
                <MenuIcon />
            </IconButton>
            <SwipeableDrawer classes={{ paper: classes.drawerPaper }} anchor="right" open={open} onOpen={() => { }} onClose={closeMenu}>
                <IconButton className={classes.close} onClick={closeMenu}>
                    <CloseIcon fontSize="large" />
                </IconButton>
                <List>
                    {/* Collapsible contact information */}
                    <ListItem className={classes.menuItem} button onClick={handleContactClick}>
                        <ListItemIcon><ContactSupportIcon fill={palette.primary.contrastText} /></ListItemIcon>
                        <ListItemText primary="Contact Us" />
                        {contactOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </ListItem>
                    <Collapse className={classes.menuItem} in={contactOpen} timeout="auto" unmountOnExit>
                        <ContactInfo business={business} />
                    </Collapse>
                    {/* Collapsible social media links */}
                    <ListItem className={classes.menuItem} button onClick={handleSocialClick}>
                        <ListItemIcon><ShareIcon className={classes.menuIcon} /></ListItemIcon>
                        <ListItemText primary="Socials" />
                        {socialOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </ListItem>
                    <Collapse in={socialOpen} timeout="auto" unmountOnExit>
                        <ListItem className={classes.menuItem} button onClick={() => newTab(business?.SOCIAL?.Facebook)}>
                            <ListItemIcon>
                                <FacebookIcon fill={'#ffffff'} />
                            </ListItemIcon>
                            <ListItemText primary="Facebook" />
                        </ListItem>
                        <ListItem className={classes.menuItem} button onClick={() => newTab(business?.SOCIAL?.Instagram)}>
                            <ListItemIcon>
                                <InstagramIcon fill={'#ffffff'} />
                            </ListItemIcon>
                            <ListItemText primary="Instagram" />
                        </ListItem>
                    </Collapse>
                    {optionsToList(nav_options)}
                    <Divider />
                    {optionsToList(customer_actions)}
                </List>
                <CopyrightBreadcrumbs
                    business={business}
                    sx={{
                        color: palette.primary.contrastText,
                        padding: 5,
                        display: 'block',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                    }}
                />
            </SwipeableDrawer>
        </React.Fragment>
    );
}