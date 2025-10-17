import { Badge, BottomNavigation, BottomNavigationAction, useTheme } from "@mui/material";
import { SessionContext } from "contexts/SessionContext";
import { useKeyboardOpen } from "hooks/useKeyboardOpen";
import { isObject } from "lodash-es";
import { useContext } from "react";
import { useLocation } from "route";
import { pagePaddingBottom } from "styles";
import { getUserActions } from "utils";

export const BottomNav = ({
    ...props
}) => {
    const [, setLocation] = useLocation();
    const { palette } = useTheme();
    const session = useContext(SessionContext);

    const actions = getUserActions(session);

    // Hide the nav if the keyboard is open. This is because fixed bottom navs
    // will appear above the keyboard on Android for some reason.
    const invisible = useKeyboardOpen();

    // Hide the nav when not logged in (only admin needs access now)
    const isLoggedIn = isObject(session) && session && Object.keys(session).length > 0;

    if (invisible || !isLoggedIn) return null;
    return (
        <BottomNavigation
            showLabels
            sx={{
                background: palette.primary.dark,
                position: "fixed",
                zIndex: 5,
                bottom: 0,
                paddingBottom: "env(safe-area-inset-bottom)",
                paddingLeft: "calc(4px + env(safe-area-inset-left))",
                paddingRight: "calc(4px + env(safe-area-inset-right))",
                height: pagePaddingBottom,
                width: "100%",
                display: { xs: "flex", md: "none" },
            }}
            {...props}
        >
            {actions.map(([label, value, link, onClick, Icon, badgeNum], index) => (
                <BottomNavigationAction
                    key={index}
                    label={label}
                    value={value}
                    href={link}
                    onClick={(e) => { 
                        e.preventDefault(); 
                        // Redirect to external URLs for availability and cart
                        if (value === "availability") {
                            window.location.href = "https://newlife.online-orders.sbiteam.com/";
                        } else if (value === "cart") {
                            window.location.href = "https://newlife.online-orders.sbiteam.com/orders";
                        } else {
                            setLocation(link); 
                            if (onClick) onClick();
                        }
                    }}
                    icon={Icon ? <Badge badgeContent={badgeNum} color="error"><Icon /></Badge> : null}
                    sx={{ color: palette.primary.contrastText }}
                />
            ))}
        </BottomNavigation>
    );
};
