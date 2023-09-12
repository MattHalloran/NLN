import { APP_LINKS } from "@local/shared";
import { Badge, Button, Container, IconButton, List, ListItem, ListItemIcon, ListItemText, Palette, useTheme } from "@mui/material";
import {
    ContactInfo,
    PopupMenu,
} from "components";
import { CreateAccountIcon, InfoIcon, PhotoLibraryIcon, ShoppingCartIcon } from "icons";
import _ from "lodash";
import { UserActions, getUserActions, updateArray } from "utils";

const navItemStyle = (palette: Palette) => ({
    background: "transparent",
    color: palette.primary.contrastText,
    textTransform: "none",
    boxShadow: "none",
});

export const NavList = ({
    session,
    business,
    logout,
    roles,
    cart,
    onRedirect,
}) => {
    const { palette } = useTheme();

    let nav_options = getUserActions(session, roles, cart);

    let cart_button;
    // If someone is not logged in, display sign up/log in APP_LINKS
    if (!_.isObject(session) || Object.keys(session).length === 0) {
        nav_options.push(["Sign Up", "signup", APP_LINKS.Register, null, CreateAccountIcon, 0]);
    } else {
        // Cart option is rendered differently, so we must take it out of the array
        const cart_index = nav_options.length - 1;
        const cart_option = nav_options[cart_index];
        // Replace cart option with log out option
        nav_options = updateArray(nav_options, cart_index, ["Log Out", "logout", APP_LINKS.Home, logout]);
        cart_button = (
            <IconButton edge="start" color="inherit" aria-label={cart_option[1]} onClick={() => onRedirect(APP_LINKS.Cart)}>
                <Badge badgeContent={cart_option[5]} color="error">
                    <ShoppingCartIcon />
                </Badge>
            </IconButton>
        );
    }

    const about_options: UserActions = [
        ["About Us", "about", APP_LINKS.About, null, InfoIcon, 0],
        ["Gallery", "gallery", APP_LINKS.Gallery, null, PhotoLibraryIcon, 0],
    ];

    const optionsToList = (options) => {
        return options.map(([label, value, link, onClick, Icon], index) => (
            <ListItem
                button
                key={index}
                onClick={() => { onRedirect(link); if (onClick) onClick(); }}
                sx={{ color: palette.primary.contrastText }}
            >
                {Icon ?
                    (<ListItemIcon>
                        <Icon fill={palette.primary.contrastText} />
                    </ListItemIcon>) : null}
                <ListItemText primary={label} />
            </ListItem>
        ));
    };

    const optionsToMenu = (options) => {
        return options.map(([label, value, link, onClick], index) => (
            <Button
                key={index}
                variant="text"
                size="large"
                onClick={() => { onRedirect(link); if (onClick) onClick(); }}
                sx={navItemStyle(palette)}
            >
                {label}
            </Button>
        ));
    };

    return (
        <Container sx={{
            display: "flex",
            marginTop: "0px",
            marginBottom: "0px",
            right: "0px",
            padding: "0px",
        }}>
            <PopupMenu
                text="Contact"
                variant="text"
                size="large"
                sx={navItemStyle(palette)}
            >
                <ContactInfo business={business} sx={{ width: "calc(min(100vw, 500px))" }} />
            </PopupMenu>
            <PopupMenu
                text="About"
                variant="text"
                size="large"
                sx={navItemStyle(palette)}
            >
                <List>
                    {optionsToList(about_options)}
                </List>
            </PopupMenu>
            {optionsToMenu(nav_options)}
            {cart_button}
        </Container>
    );
};
