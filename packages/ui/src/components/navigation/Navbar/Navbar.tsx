import { useEffect, useState } from 'react';
import Logo from 'assets/img/nln-logo-colorized.png';
import { hexToRGB } from 'utils';
import { AppBar, Toolbar, Typography, Slide, useScrollTrigger, useTheme, Box } from '@mui/material';
import { Hamburger } from './Hamburger';
import { NavList } from './NavList';
import { logoutMutation } from 'graphql/mutation';
import { useMutation } from '@apollo/client';
import { APP_LINKS } from '@shared/consts';

const SHOW_HAMBURGER_AT = 1000;

export const HideOnScroll = ({
    children,
}) => {
    const trigger = useScrollTrigger();

    return (
        <Slide appear={false} direction="down" in={!trigger}>
            {children}
        </Slide>
    );
}

export const Navbar = ({
    session,
    business,
    onSessionUpdate,
    roles,
    cart,
    onRedirect
}) => {
    const { palette } = useTheme();

    const [show_hamburger, setShowHamburger] = useState(false);
    const [logout] = useMutation(logoutMutation);

    const logoutCustomer = () => {
        logout().then(() => {
            onSessionUpdate();
            onRedirect(APP_LINKS.Home);
        }).catch(() => { })
    }

    let child_props = {
        session: session,
        business: business,
        onSessionUpdate: onSessionUpdate,
        logout: logoutCustomer,
        roles: roles,
        cart: cart,
        onRedirect: onRedirect
    }

    useEffect(() => {
        updateWindowDimensions();
        window.addEventListener("resize", updateWindowDimensions);

        return () => window.removeEventListener("resize", updateWindowDimensions);
    }, []);

    const updateWindowDimensions = () => setShowHamburger(window.innerWidth <= SHOW_HAMBURGER_AT);

    return (
        <HideOnScroll>
            <AppBar>
                <Toolbar sx={{ background: palette.primary.main, }}>
                    <Box onClick={() => onRedirect(APP_LINKS.Home)} sx={{
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                    }}>
                        <Box
                            component="img"
                            src={Logo}
                            alt={`${business?.BUSINESS_NAME?.Short ?? 'Business'} logo`}
                            sx={{
                                '-webkit-filter': `drop-shadow(0.5px 0.5px 0 ${hexToRGB(palette.primary.dark, 0.9)})
                        drop-shadow(-0.5px -0.5px 0 ${hexToRGB(palette.primary.dark, 0.9)})`,
                                filter: `drop-shadow(0.5px 0.5px 0 ${hexToRGB(palette.primary.dark, 0.9)}) 
                drop-shadow(-0.5px -0.5px 0 ${hexToRGB(palette.primary.dark, 0.9)})`,
                                verticalAlign: 'middle',
                                fill: 'black',
                                marginTop: '0.5vh',
                                marginLeft: 'max(-5px, -5vw)',
                                minHeight: '50px',
                                height: "12vh",
                                transform: 'rotate(20deg)',
                            }} />
                        <Typography
                            variant="h6"
                            noWrap
                            sx={{
                                position: 'relative',
                                cursor: 'pointer',
                                fontSize: { xs: '0', sm: '1.5em', md: '2em' },
                                marginLeft: '-15px',
                                fontFamily: `'Kite One', sans-serif`,
                                color: palette.primary.contrastText,
                            }}
                        >{business?.BUSINESS_NAME?.Short}</Typography>
                    </Box>
                    <Box sx={{ marginLeft: 'auto' }}>
                        {show_hamburger ? <Hamburger {...child_props} /> : <NavList {...child_props} />}
                    </Box>
                </Toolbar>
            </AppBar>
        </HideOnScroll>
    );
}