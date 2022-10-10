import React from 'react';
import { useHistory } from 'react-router-dom';
import { BottomNavigation, BottomNavigationAction, Badge, useTheme } from '@mui/material';
import { getUserActions } from 'utils';

makeStyles((theme) => ({
    root: {
        background: palette.primary.dark,
        position: 'fixed',
        zIndex: 5,
        bottom: '0',
        width: '100%',
    },
    icon: {
        color: palette.primary.contrastText,
    },
    [breakpoints.up(960)]: {
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