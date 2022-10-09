import React from 'react';
import { useHistory } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Badge } from '@mui/material';
import { getUserActions } from 'utils';

const useStyles = makeStyles((theme) => ({
    root: {
        background: theme.palette.primary.dark,
        position: 'fixed',
        zIndex: 5,
        bottom: '0',
        width: '100%',
    },
    icon: {
        color: theme.palette.primary.contrastText,
    },
    [theme.breakpoints.up(960)]: {
        root: {
            display: 'none',
        }
    },
}));

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
            className={classes.root} 
            showLabels
            {...props}
        >
            {actions.map(([label, value, link, onClick, Icon, badgeNum], index) => (
                        <BottomNavigationAction 
                            key={index} 
                            className={classes.icon} 
                            label={label} 
                            value={value} 
                            onClick={() => {history.push(link); if(onClick) onClick()}}
                            icon={<Badge badgeContent={badgeNum} color="error"><Icon /></Badge>} />
                    ))}
        </BottomNavigation>
    );
}