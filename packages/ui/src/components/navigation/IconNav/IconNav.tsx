import { useHistory } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Badge, useTheme } from '@mui/material';
import { getUserActions } from 'utils';

export const IconNav = ({
    session,
    userRoles,
    cart,
    ...props
}) => {
    let history = useHistory();
    const { palette } = useTheme();

    let actions = getUserActions(session, userRoles, cart);

    return (
        <BottomNavigation
            showLabels
            sx={{
                    background: palette.primary.dark,
                    position: 'fixed',
                    zIndex: 5,
                    bottom: 0,
                    paddingBottom: 'env(safe-area-inset-bottom)',
                    // safe-area-inset-bottom is the iOS navigation bar
                    height: 'calc(56px + env(safe-area-inset-bottom))',
                    width: '100%',
                    display: { xs: 'flex', md: 'none' },
            }}
            {...props}
        >
            {actions.map(([label, value, link, onClick, Icon, badgeNum], index) => (
                <BottomNavigationAction
                    key={index}
                    label={label}
                    value={value}
                    onClick={() => { history.push(link); if (onClick) onClick() }}
                    icon={<Badge badgeContent={badgeNum} color="error"><Icon /></Badge>} />
            ))}
        </BottomNavigation>
    );
}