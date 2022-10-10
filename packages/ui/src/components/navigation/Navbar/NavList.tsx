import React from 'react';
import {
    ContactInfo,
    PopupMenu
} from 'components';
import { getUserActions, updateArray } from 'utils';
import { Container, Button, IconButton, Badge, List, ListItem, ListItemIcon, ListItemText, useTheme, useTheme } from '@mui/material';
import _ from 'lodash';
import { APP_LINKS } from '@shared/consts';

makeStyles((theme) => ({
    navItem: {
        background: 'transparent',
        color: palette.primary.contrastText,
        textTransform: 'none',
    },
    menuItem: {
        color: palette.primary.contrastText,
    },
    menuIcon: {
        fill: palette.primary.contrastText,
    },
    contact: {
        width: 'calc(min(100vw, 400px))',
        height: '300px',
    },
}));

export const NavList = ({
    session,
    business,
    logout,
    roles,
    cart,
    onRedirect
}) => {
    const { palette } = useTheme();

    let nav_options = getUserActions(session, roles, cart);

    let cart_button;
    // If someone is not logged in, display sign up/log in APP_LINKS
    if (!_.isObject(session) || Object.keys(session).length === 0) {
        nav_options.push(['Sign Up', 'signup', APP_LINKS.Register]);
    } else {
        // Cart option is rendered differently, so we must take it out of the array
        let cart_index = nav_options.length - 1;
        let cart_option = nav_options[cart_index];
        // Replace cart option with log out option
        nav_options = updateArray(nav_options, cart_index, ['Log Out', 'logout', APP_LINKS.Home, logout]);
        cart_button = (
            <IconButton edge="start" color="inherit" aria-label={cart_option[1]} onClick={() => onRedirect(APP_LINKS.Cart)}>
                <Badge badgeContent={cart_option[5]} color="error">
                    <ShoppingCartIcon />
                </Badge>
            </IconButton>
        );
    }

    let about_options = [
        ['About Us', 'about', APP_LINKS.About, null, InfoIcon],
        ['Gallery', 'gallery', APP_LINKS.Gallery, null, PhotoLibraryIcon]
    ]

    const optionsToList = (options) => {
        return options.map(([label, value, link, onClick, Icon], index) => (
            <ListItem className={classes.menuItem} button key={index} onClick={() => { onRedirect(link); if (onClick) onClick() }}>
                {Icon ?
                    (<ListItemIcon>
                        <Icon className={classes.menuIcon} />
                    </ListItemIcon>) : null}
                <ListItemText primary={label} />
            </ListItem>
        ))
    }

    const optionsToMenu = (options) => {
        return options.map(([label, value, link, onClick], index) => (
            <Button
                key={index}
                variant="text"
                size="large"
                className={classes.navItem}
                onClick={() => { onRedirect(link); if (onClick) onClick() }}
            >
                {label}
            </Button>
        ));
    }

    return (
        <Container sx={{
            display: 'flex',
            marginTop: '0px',
            marginBottom: '0px',
            right: '0px',
            padding: '0px',
        }}>
            <PopupMenu
                text="Contact"
                variant="text"
                size="large"
                className={classes.navItem}
            >
                <ContactInfo className={classes.contact} business={business} />
            </PopupMenu>
            <PopupMenu
                text="About"
                variant="text"
                size="large"
                className={classes.navItem}
            >
                <List>
                    {optionsToList(about_options)}
                </List>
            </PopupMenu>
            {optionsToMenu(nav_options)}
            {cart_button}
        </Container>
    );
}