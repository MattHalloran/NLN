import { APP_LINKS } from "@local/shared";
import { Badge, Box, Button, IconButton, List, ListItem, ListItemIcon, ListItemText, Palette, useTheme } from "@mui/material";
import { useLogout } from "api/rest/hooks";
import { PopupMenu } from "components";
import { SessionContext } from "contexts/SessionContext";
import { useSideMenu } from "hooks/useSideMenu";
import { useWindowSize } from "hooks/useWindowSize";
import { Menu as MenuIcon, ShoppingCart, Store, Info, Camera } from "lucide-react";
import { isObject } from "lodash-es";
import { useCallback, useContext } from "react";
import { useLocation } from "route";
import { PubSub, UserActions, getUserActions, updateArray as _updateArray } from "utils";

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

    const { mutate: logout } = useLogout();
    const logoutCustomer = () => {
        logout().then(() => {
            PubSub.get().publishSession({});
            setLocation(APP_LINKS.Home);
        }).catch((error) => {
            console.error("Caught error logging out", error);
        });
    };

    // Create simple navigation options - no login/signup in topbar anymore
    const nav_options: UserActions = [
        ["Availability", "availability", "", () => window.open("https://newlife.online-orders.sbiteam.com/", "_blank"), null, 0],
    ];

    let cart_button;
    // If someone is logged in, show additional options and cart
    if (isObject(session) && Object.keys(session).length > 0) {
        const userActions = getUserActions(session);
        // Filter out Login (shouldn't be there for logged-in users anyway) and Availability (we handle it above)
        const filteredActions = userActions.filter(([label]) => label !== "Log In" && label !== "Availability");

        // Add logout option
        nav_options.push(...filteredActions);
        nav_options.push(["Log Out", "logout", APP_LINKS.Home, logoutCustomer, null, 0]);

        // Cart option for logged-in users
        const cartData = session?.cart?.items?.length ?? 0;
        cart_button = (
            <IconButton
                edge="start"
                color="inherit"
                aria-label="cart"
                onClick={() => window.open("https://newlife.online-orders.sbiteam.com/orders", "_blank")}
                sx={{ margin: 0 }}
            >
                <Badge badgeContent={cartData} color="error">
                    <ShoppingCart size={24} />
                </Badge>
            </IconButton>
        );
    }

    const about_options: UserActions = [
        ["About Us", "about", APP_LINKS.About, null, null, 0],
        ["Gallery", "gallery", APP_LINKS.Gallery, null, null, 0],
    ];

    const isMobile = useWindowSize(({ width }) => width <= breakpoints.values.md);
    const { isOpen: isSideMenuOpen } = useSideMenu("side-menu", isMobile);
    const openSideMenu = useCallback(() => { PubSub.get().publishSideMenu({ id: "side-menu", isOpen: true }); }, []);

    const optionsToList = (options: UserActions): JSX.Element[] => {
        return options.map(([label, _value, link, onClick, _Icon, _badgeNum], index) => {
            // Map labels to lucide icons
            const getIcon = (label: string) => {
                switch (label) {
                    case "About Us":
                        return <Info size={20} color={palette.primary.contrastText} />;
                    case "Gallery":
                        return <Camera size={20} color={palette.primary.contrastText} />;
                    case "Availability":
                        return <Store size={20} color={palette.primary.contrastText} />;
                    default:
                        return null;
                }
            };

            return (
                <ListItem
                    button
                    key={index}
                    onClick={() => {
                        if (onClick) {
                            onClick();
                        } else if (link) {
                            setLocation(link);
                        }
                    }}
                    sx={{ color: palette.primary.contrastText }}
                >
                    <ListItemIcon>
                        {getIcon(label)}
                    </ListItemIcon>
                    <ListItemText primary={label} />
                </ListItem>
            );
        });
    };

    const optionsToMenu = (options: UserActions): JSX.Element[] => {
        return options.map(([label, _value, link, onClick, _Icon, _badgeNum], index) => (
            <Button
                key={index}
                variant="text"
                size="large"
                onClick={() => {
                    if (onClick) {
                        onClick();
                    } else if (link) {
                        setLocation(link);
                    }
                }}
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
            {!isMobile && !isSideMenuOpen && <Button
                variant="text"
                size="large"
                onClick={() => setLocation("/about#contact")}
                sx={navItemStyle(palette)}
            >
                Contact
            </Button>}
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
            {isMobile && <IconButton
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={openSideMenu}
                sx={{
                    transition: "all 0.3s ease",
                    "&:hover": {
                        transform: "scale(1.1)",
                    },
                }}
            >
                <MenuIcon size={28} />
            </IconButton>}
        </Box>
    );
};
