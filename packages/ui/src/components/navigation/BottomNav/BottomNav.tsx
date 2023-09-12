import { Badge, BottomNavigation, BottomNavigationAction, useTheme } from "@mui/material";
import { SessionContext } from "components/contexts/SessionContext";
import { useContext } from "react";
import { useLocation } from "route";
import { getUserActions } from "utils";

export const BottomNav = ({
    ...props
}) => {
    const [, setLocation] = useLocation();
    const { palette } = useTheme();
    const session = useContext(SessionContext);

    const actions = getUserActions(session);

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
                height: "calc(56px + env(safe-area-inset-bottom))",
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
                    onClick={(e) => { e.preventDefault(); setLocation(link); if (onClick) onClick(); }}
                    icon={<Badge badgeContent={badgeNum} color="error"><Icon /></Badge>}
                    sx={{ color: palette.primary.contrastText }}
                />
            ))}
        </BottomNavigation>
    );
};
