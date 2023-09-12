import { useMutation } from "@apollo/client";
import { APP_LINKS } from "@local/shared";
import { Badge, Box, Button, IconButton, List, ListItem, ListItemIcon, ListItemText, Palette, useTheme } from "@mui/material";
import { logoutMutation } from "api";
import { ContactInfo, PopupMenu } from "components";
import { SessionContext } from "components/contexts/SessionContext";
import { CreateAccountIcon, InfoIcon, MenuIcon, PhotoLibraryIcon, ShoppingCartIcon } from "icons";
import _ from "lodash";
import { useCallback, useContext } from "react";
import { useLocation } from "route";
import { PubSub, UserActions, getUserActions, updateArray, useSideMenu, useWindowSize } from "utils";

const navItemStyle = (palette: Palette) => ({
    background: "transparent",
    color: palette.primary.contrastText,
    textTransform: "none",
    boxShadow: "none",
    padding: 1,
});

export const NavList = () => {
    const { breakpoints, palette } = useTheme();
    const [, setLocation] = useLocation();
    const session = useContext(SessionContext);

    const [logout] = useMutation(logoutMutation);
    const logoutCustomer = () => {
        logout().then(() => {
            PubSub.get().publishSession({});
            setLocation(APP_LINKS.Home);
        }).catch((error) => {
            console.error("Caught error logging out", error);
        });
    };

    let nav_options = getUserActions(session);

    let cart_button;
    // If someone is not logged in, display sign up/log in APP_LINKS
    if (!_.isObject(session) || Object.keys(session).length === 0) {
        nav_options.push(["Sign Up", "signup", APP_LINKS.Register, null, CreateAccountIcon, 0]);
    } else {
        // Cart option is rendered differently, so we must take it out of the array
        const cart_index = nav_options.length - 1;
        const cart_option = nav_options[cart_index];
        // Replace cart option with log out option
        nav_options = updateArray(nav_options, cart_index, ["Log Out", "logout", APP_LINKS.Home, logoutCustomer]);
        cart_button = (
            <IconButton
                edge="start"
                color="inherit"
                aria-label={cart_option[1]}
                onClick={() => setLocation(APP_LINKS.Cart)}
                sx={{ margin: 0 }}
            >
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

    const isMobile = useWindowSize(({ width }) => width <= breakpoints.values.md);
    const { isOpen: isSideMenuOpen } = useSideMenu("side-menu", isMobile);
    const openSideMenu = useCallback(() => { PubSub.get().publishSideMenu({ id: "side-menu", isOpen: true }); }, []);

    const optionsToList = (options) => {
        return options.map(([label, value, link, onClick, Icon], index) => (
            <ListItem
                button
                key={index}
                onClick={() => { if (onClick) onClick(); setLocation(link); }}
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
                onClick={() => { if (onClick) onClick(); setLocation(link); }}
                sx={navItemStyle(palette)}
            >
                {label}
            </Button>
        ));
    };

    return (
        <Box sx={{
            display: "flex",
            marginTop: "0px",
            marginBottom: "0px",
            right: "0px",
            padding: "0px",
        }}>
            {!isMobile && !isSideMenuOpen && <PopupMenu
                text="Contact"
                variant="text"
                size="large"
                sx={navItemStyle(palette)}
            >
                <ContactInfo sx={{ width: "calc(min(100vw, 500px))" }} />
            </PopupMenu>}
            {!isMobile && !isSideMenuOpen && <PopupMenu
                text="About"
                variant="text"
                size="large"
                sx={navItemStyle(palette)}
            >
                <List>
                    {optionsToList(about_options)}
                </List>
            </PopupMenu>}
            {!isMobile && !isSideMenuOpen && optionsToMenu(nav_options)}
            {!isMobile && !isSideMenuOpen && cart_button}
            {isMobile && <IconButton edge="start" color="inherit" aria-label="menu" onClick={openSideMenu}>
                <MenuIcon />
            </IconButton>}
        </Box>
    );
};
