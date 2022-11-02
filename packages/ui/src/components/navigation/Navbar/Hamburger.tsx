import { useEffect, useState } from 'react';
import {
    ContactInfo,
} from 'components';
import { getUserActions, PubSub } from 'utils';
import { IconButton, SwipeableDrawer, List, ListItem, ListItemIcon, Badge, Collapse, Divider, ListItemText, useTheme, Palette } from '@mui/material';
import { CopyrightBreadcrumbs } from 'components';
import _ from 'lodash';
import { CloseIcon, ContactSupportIcon, ExpandLessIcon, ExpandMoreIcon, FacebookIcon, HomeIcon, InfoIcon, InstagramIcon, LogOutIcon, MenuIcon, PhotoLibraryIcon, ShareIcon } from '@shared/icons';
import { APP_LINKS } from '@shared/consts';

const menuItemStyle = (palette: Palette) => ({
    color: palette.background.textPrimary,
        borderBottom: `1px solid ${palette.background.textPrimary}`,
})

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
        return options.map(([label, _value, link, onClick, Icon, badgeNum], index) => (
            <ListItem
                key={index}
                button
                sx={menuItemStyle(palette)}
                onClick={() => {
                    onRedirect(link);
                    if (onClick) onClick();
                    closeMenu();
                }}>
                {Icon ?
                    (<ListItemIcon>
                        <Badge badgeContent={badgeNum ?? 0} color="error">
                            <Icon fill={palette.background.textPrimary}/>
                        </Badge>
                    </ListItemIcon>) : null}
                <ListItemText primary={label} />
            </ListItem>
        ))
    }

    let nav_options = [
        ['Home', 'home', APP_LINKS.Home, null, HomeIcon],
        ['About Us', 'about', APP_LINKS.About, null, InfoIcon],
        ['Gallery', 'gallery', APP_LINKS.Gallery, null, PhotoLibraryIcon]
    ]

    let customer_actions = getUserActions(session, roles, cart);
    if (_.isObject(session) && Object.entries(session).length > 0) {
        customer_actions.push(['Log Out', 'logout', APP_LINKS.Home, logout, LogOutIcon, 0]);
    }

    return (
        <>
            <IconButton edge="start" color="inherit" aria-label="menu" onClick={toggleOpen}>
                <MenuIcon />
            </IconButton>
            <SwipeableDrawer
                anchor="right" open={open}
                onOpen={() => { }}
                onClose={closeMenu}
                sx={{
                    '& .MuiDrawer-paper': {
                        background: palette.background.default,
                        color: palette.background.textPrimary,
                    }
                }}
            >
                <IconButton
                    onClick={closeMenu}
                    sx={{
                        color: palette.background.textPrimary,
                        borderRadius: 0,
                        borderBottom: `1px solid ${palette.background.textPrimary}`,
                        justifyContent: 'end',
                        direction: 'rtl',
                        height: { xs: '64px', md: '80px' },
                    }}
                >
                    <CloseIcon fill={palette.background.textPrimary} />
                </IconButton>
                <List>
                    {/* Collapsible contact information */}
                    <ListItem button onClick={handleContactClick} sx={menuItemStyle(palette)}>
                        <ListItemIcon><ContactSupportIcon fill={palette.background.textPrimary} /></ListItemIcon>
                        <ListItemText primary="Contact Us" />
                        {contactOpen ? <ExpandLessIcon fill={palette.background.textPrimary} /> : <ExpandMoreIcon fill={palette.background.textPrimary} />}
                    </ListItem>
                    <Collapse in={contactOpen} timeout="auto" unmountOnExit sx={menuItemStyle(palette)}>
                        <ContactInfo business={business} />
                    </Collapse>
                    {/* Collapsible social media APP_LINKS */}
                    <ListItem button onClick={handleSocialClick} sx={menuItemStyle(palette)}>
                        <ListItemIcon><ShareIcon fill={palette.background.textPrimary} /></ListItemIcon>
                        <ListItemText primary="Socials" />
                        {socialOpen ? <ExpandLessIcon fill={palette.background.textPrimary} /> : <ExpandMoreIcon fill={palette.background.textPrimary} />}
                    </ListItem>
                    <Collapse in={socialOpen} timeout="auto" unmountOnExit>
                        <ListItem button onClick={() => newTab(business?.SOCIAL?.Facebook)} sx={menuItemStyle(palette)}>
                            <ListItemIcon>
                                <FacebookIcon fill={palette.background.textPrimary} />
                            </ListItemIcon>
                            <ListItemText primary="Facebook" />
                        </ListItem>
                        <ListItem button onClick={() => newTab(business?.SOCIAL?.Instagram)} sx={menuItemStyle(palette)}>
                            <ListItemIcon>
                                <InstagramIcon fill={palette.background.textPrimary} />
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
                        color: palette.background.textPrimary,
                        padding: 5,
                        display: 'block',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                    }}
                />
            </SwipeableDrawer>
        </>
    );
}