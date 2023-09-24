import { useMutation } from "@apollo/client";
import { APP_LINKS } from "@local/shared";
import { Badge, Collapse, Divider, IconButton, List, ListItem, ListItemIcon, ListItemText, Palette, SwipeableDrawer, useTheme } from "@mui/material";
import { logoutMutation } from "api";
import { ContactInfo, CopyrightBreadcrumbs } from "components";
import { BusinessContext } from "contexts/BusinessContext";
import { SessionContext } from "contexts/SessionContext";
import { useSideMenu } from "hooks/useSideMenu";
import { useWindowSize } from "hooks/useWindowSize";
import { CloseIcon, ContactSupportIcon, ExpandLessIcon, ExpandMoreIcon, FacebookIcon, HomeIcon, InfoIcon, InstagramIcon, LogOutIcon, PhotoLibraryIcon, ShareIcon } from "icons";
import _ from "lodash";
import { useContext, useState } from "react";
import { useLocation } from "route";
import { PubSub, getUserActions, noop } from "utils";

const menuItemStyle = (palette: Palette) => ({
    color: palette.background.textPrimary,
    borderBottom: `1px solid ${palette.background.textPrimary}`,
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

    const [logout] = useMutation(logoutMutation);
    const logoutCustomer = () => {
        logout().then(() => {
            PubSub.get().publishSession({});
            setLocation(APP_LINKS.Home);
        }).catch((error) => {
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

    const newTab = (link) => {
        window.open(link, "_blank");
    };

    const optionsToList = (options) => {
        return options.map(([label, _value, link, onClick, Icon, badgeNum], index) => (
            <ListItem
                key={index}
                button
                sx={menuItemStyle(palette)}
                onClick={() => {
                    if (onClick) onClick();
                    close();
                    setLocation(link);
                }}>
                {Icon ?
                    (<ListItemIcon>
                        <Badge badgeContent={badgeNum ?? 0} color="error">
                            <Icon fill={palette.background.textPrimary} />
                        </Badge>
                    </ListItemIcon>) : null}
                <ListItemText primary={label} />
            </ListItem>
        ));
    };

    const nav_options = [
        ["Home", "home", APP_LINKS.Home, null, HomeIcon],
        ["About Us", "about", APP_LINKS.About, null, InfoIcon],
        ["Gallery", "gallery", APP_LINKS.Gallery, null, PhotoLibraryIcon],
    ];

    const customer_actions = getUserActions(session);
    if (_.isObject(session) && Object.entries(session).length > 0) {
        customer_actions.push(["Log Out", "logout", APP_LINKS.Home, logoutCustomer, LogOutIcon, 0]);
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
                    background: palette.background.default,
                    color: palette.background.textPrimary,
                },
            }}
        >
            <IconButton
                onClick={close}
                sx={{
                    background: palette.primary.dark,
                    borderRadius: 0,
                    borderBottom: `1px solid ${palette.divider}`,
                    justifyContent: "end",
                    direction: "rtl",
                    height: "64px",
                }}
            >
                <CloseIcon fill={palette.primary.contrastText} />
            </IconButton>
            <List>
                {/* Collapsible contact information */}
                <ListItem button onClick={handleContactClick} sx={menuItemStyle(palette)}>
                    <ListItemIcon><ContactSupportIcon fill={palette.background.textPrimary} /></ListItemIcon>
                    <ListItemText primary="Contact Us" />
                    {contactOpen ? <ExpandLessIcon fill={palette.background.textPrimary} /> : <ExpandMoreIcon fill={palette.background.textPrimary} />}
                </ListItem>
                <Collapse in={contactOpen} timeout="auto" unmountOnExit sx={menuItemStyle(palette)}>
                    <ContactInfo />
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
                sx={{
                    color: palette.background.textPrimary,
                    padding: 5,
                    display: "block",
                    marginLeft: "auto",
                    marginRight: "auto",
                }}
            />
        </SwipeableDrawer>
    );
};
