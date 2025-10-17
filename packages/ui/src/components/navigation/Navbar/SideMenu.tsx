import { APP_LINKS } from "@local/shared";
import {
    Badge,
    Box,
    Collapse,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Palette,
    SwipeableDrawer,
    Typography,
    useTheme,
} from "@mui/material";
import { useLogout } from "api/rest/hooks";
import { ContactInfo, CopyrightBreadcrumbs } from "components";
import { BusinessContext } from "contexts/BusinessContext";
import { SessionContext } from "contexts/SessionContext";
import { useSideMenu } from "hooks/useSideMenu";
import { useWindowSize } from "hooks/useWindowSize";
import {
    X,
    Phone,
    ChevronUp,
    ChevronDown,
    Facebook,
    Home,
    Info,
    Instagram,
    LogOut,
    Camera,
    Share2,
    ShoppingCart,
    UserPlus,
    User,
    Store,
} from "lucide-react";
import { isObject } from "lodash-es";
import React, { useContext, useState } from "react";
import { useLocation } from "route";
import { PubSub, getUserActions, noop, UserActions } from "utils";

const menuItemStyle = (palette: Palette) => ({
    color: palette.background.textPrimary,
    transition: "all 0.3s ease",
    borderRadius: "8px",
    marginX: 1,
    marginY: 0.5,
    "&:hover": {
        backgroundColor:
            palette.mode === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)",
        transform: "translateX(4px)",
    },
    "& .MuiListItemIcon-root": {
        minWidth: 42,
    },
});

export const sideMenuDisplayData = {
    persistentOnDesktop: true,
    sideForRightHanded: "right",
} as const;

const id = "side-menu";

export const SideMenu = () => {
    const { breakpoints, palette } = useTheme();
    const session = useContext(SessionContext);
    const business = useContext(BusinessContext);
    const [, setLocation] = useLocation();
    const isMobile = useWindowSize(({ width }) => width <= breakpoints.values.md);

    const [contactOpen, setContactOpen] = useState(true);
    const [socialOpen, setSocialOpen] = useState(false);

    const { mutate: logout } = useLogout();
    const logoutCustomer = () => {
        logout()
            .then(() => {
                PubSub.get().publishSession({});
                setLocation(APP_LINKS.Home);
            })
            .catch((error) => {
                console.error("Caught error logging out", error);
            });
    };

    const { isOpen, close } = useSideMenu(id, isMobile);

    const handleContactClick = () => {
        setContactOpen(!contactOpen);
    };

    const handleSocialClick = () => {
        setSocialOpen(!socialOpen);
    };

    const newTab = (link: string): void => {
        window.open(link, "_blank");
    };

    const nav_options: UserActions = [
        ["Home", "home", APP_LINKS.Home, null, null, 0],
        [
            "Availability",
            "availability",
            "",
            () => window.open("https://newlife.online-orders.sbiteam.com/", "_blank"),
            null,
            0,
        ],
        ["About Us", "about", APP_LINKS.About, null, null, 0],
        ["Gallery", "gallery", APP_LINKS.Gallery, null, null, 0],
    ];

    // Filter out the availability option from customer actions since we moved it to nav_options
    const customer_actions = getUserActions(session).filter(([label]) => label !== "Availability");
    if (isObject(session) && Object.entries(session).length > 0) {
        customer_actions.push(["Log Out", "logout", APP_LINKS.Home, logoutCustomer, null, 0]);
    }

    return (
        <SwipeableDrawer
            anchor="right"
            open={isOpen}
            onOpen={noop}
            onClose={close}
            PaperProps={{ id }}
            variant={isMobile ? "temporary" : "persistent"}
            sx={{
                "& .MuiDrawer-paper": {
                    background:
                        palette.mode === "light"
                            ? "linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)"
                            : "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
                    color: palette.background.textPrimary,
                    boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.1)",
                    width: isMobile ? "85vw" : "320px",
                    maxWidth: "400px",
                },
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    background: `linear-gradient(135deg, ${palette.primary.dark} 0%, ${palette.primary.main} 100%)`,
                    padding: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minHeight: "80px",
                    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        color: palette.primary.contrastText,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                    }}
                >
                    Menu
                </Typography>
                <IconButton
                    onClick={close}
                    sx={{
                        color: palette.primary.contrastText,
                        padding: 1,
                        "&:hover": {
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                            transform: "rotate(90deg)",
                        },
                        transition: "all 0.3s ease",
                    }}
                >
                    <X size={24} />
                </IconButton>
            </Box>
            <List sx={{ padding: 1, flex: 1, overflowY: "auto" }}>
                {/* Main Navigation Section */}
                <Box sx={{ marginBottom: 1 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            color: palette.text.secondary,
                            paddingX: 2,
                            paddingY: 1,
                            display: "block",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                        }}
                    >
                        Navigation
                    </Typography>
                    {nav_options.map(([label, , link, onClick], index) => {
                        const iconMap: { [key: string]: React.JSX.Element } = {
                            Home: <Home size={20} />,
                            Availability: <Store size={20} />,
                            "About Us": <Info size={20} />,
                            Gallery: <Camera size={20} />,
                        };
                        return (
                            <ListItem
                                key={index}
                                button
                                sx={menuItemStyle(palette)}
                                onClick={() => {
                                    if (onClick) onClick();
                                    close();
                                    setLocation(link);
                                }}
                            >
                                <ListItemIcon sx={{ color: palette.primary.main }}>
                                    {iconMap[label] || <Home size={20} />}
                                </ListItemIcon>
                                <ListItemText
                                    primary={label}
                                    primaryTypographyProps={{
                                        fontSize: "0.95rem",
                                        fontWeight: 500,
                                    }}
                                />
                            </ListItem>
                        );
                    })}
                </Box>

                <Divider sx={{ marginY: 2, marginX: 1 }} />

                {/* Contact Section */}
                <Box sx={{ marginBottom: 1 }}>
                    <ListItem
                        button
                        onClick={handleContactClick}
                        sx={{
                            ...menuItemStyle(palette),
                            backgroundColor: contactOpen
                                ? palette.mode === "light"
                                    ? "rgba(0, 0, 0, 0.03)"
                                    : "rgba(255, 255, 255, 0.03)"
                                : "transparent",
                        }}
                    >
                        <ListItemIcon sx={{ color: palette.primary.main }}>
                            <Phone size={20} />
                        </ListItemIcon>
                        <ListItemText
                            primary="Contact Us"
                            primaryTypographyProps={{
                                fontSize: "0.95rem",
                                fontWeight: 500,
                            }}
                        />
                        {contactOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </ListItem>
                    <Collapse in={contactOpen} timeout="auto" unmountOnExit>
                        <Box sx={{ paddingX: 2, paddingY: 1 }}>
                            <ContactInfo />
                        </Box>
                    </Collapse>
                </Box>

                {/* Social Media Section */}
                <Box sx={{ marginBottom: 1 }}>
                    <ListItem
                        button
                        onClick={handleSocialClick}
                        sx={{
                            ...menuItemStyle(palette),
                            backgroundColor: socialOpen
                                ? palette.mode === "light"
                                    ? "rgba(0, 0, 0, 0.03)"
                                    : "rgba(255, 255, 255, 0.03)"
                                : "transparent",
                        }}
                    >
                        <ListItemIcon sx={{ color: palette.primary.main }}>
                            <Share2 size={20} />
                        </ListItemIcon>
                        <ListItemText
                            primary="Follow Us"
                            primaryTypographyProps={{
                                fontSize: "0.95rem",
                                fontWeight: 500,
                            }}
                        />
                        {socialOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </ListItem>
                    <Collapse in={socialOpen} timeout="auto" unmountOnExit>
                        <Box sx={{ paddingLeft: 1 }}>
                            <ListItem
                                button
                                onClick={() => newTab(business?.SOCIAL?.Facebook || "")}
                                sx={menuItemStyle(palette)}
                            >
                                <ListItemIcon sx={{ color: "#1877F2" }}>
                                    <Facebook size={20} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Facebook"
                                    primaryTypographyProps={{
                                        fontSize: "0.9rem",
                                    }}
                                />
                            </ListItem>
                            <ListItem
                                button
                                onClick={() => newTab(business?.SOCIAL?.Instagram || "")}
                                sx={menuItemStyle(palette)}
                            >
                                <ListItemIcon sx={{ color: "#E4405F" }}>
                                    <Instagram size={20} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Instagram"
                                    primaryTypographyProps={{
                                        fontSize: "0.9rem",
                                    }}
                                />
                            </ListItem>
                        </Box>
                    </Collapse>
                </Box>

                {customer_actions.length > 0 && (
                    <>
                        <Divider sx={{ marginY: 2, marginX: 1 }} />
                        <Box>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: palette.text.secondary,
                                    paddingX: 2,
                                    paddingY: 1,
                                    display: "block",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                }}
                            >
                                Account
                            </Typography>
                            {customer_actions.map(
                                ([label, value, link, onClick, , badgeNum], index) => {
                                    const iconMap: { [key: string]: React.JSX.Element } = {
                                        Cart: <ShoppingCart size={20} />,
                                        "Log Out": <LogOut size={20} />,
                                        "Sign Up": <UserPlus size={20} />,
                                        Manage: <User size={20} />,
                                        Availability: <ShoppingCart size={20} />,
                                    };
                                    return (
                                        <ListItem
                                            key={index}
                                            button
                                            sx={menuItemStyle(palette)}
                                            onClick={() => {
                                                // Redirect to external URLs for availability and cart
                                                if (value === "availability") {
                                                    window.open(
                                                        "https://newlife.online-orders.sbiteam.com/",
                                                        "_blank",
                                                    );
                                                    close();
                                                } else if (value === "cart") {
                                                    window.open(
                                                        "https://newlife.online-orders.sbiteam.com/orders",
                                                        "_blank",
                                                    );
                                                    close();
                                                } else {
                                                    if (onClick) onClick();
                                                    close();
                                                    setLocation(link);
                                                }
                                            }}
                                        >
                                            <ListItemIcon sx={{ color: palette.primary.main }}>
                                                <Badge badgeContent={badgeNum ?? 0} color="error">
                                                    {iconMap[label] || <User size={20} />}
                                                </Badge>
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={label}
                                                primaryTypographyProps={{
                                                    fontSize: "0.95rem",
                                                    fontWeight: 500,
                                                }}
                                            />
                                        </ListItem>
                                    );
                                },
                            )}
                        </Box>
                    </>
                )}
            </List>
            {/* Footer */}
            <Box
                sx={{
                    borderTop: `1px solid ${palette.divider}`,
                    padding: 2,
                    backgroundColor:
                        palette.mode === "light"
                            ? "rgba(0, 0, 0, 0.02)"
                            : "rgba(255, 255, 255, 0.02)",
                }}
            >
                <CopyrightBreadcrumbs
                    sx={{
                        color: palette.text.secondary,
                        fontSize: "0.8rem",
                        display: "block",
                        textAlign: "center",
                    }}
                />
            </Box>
        </SwipeableDrawer>
    );
};
