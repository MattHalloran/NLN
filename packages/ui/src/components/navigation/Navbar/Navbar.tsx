import { useEffect, useState } from 'react';
import Logo from 'assets/img/nln-logo-colorized.png';
import { hexToRGB } from 'utils';
import { AppBar, Toolbar, Typography, Slide, useScrollTrigger, useTheme, Box } from '@mui/material';
import { Hamburger } from './Hamburger';
import { NavList } from './NavList';
import { logoutMutation } from 'graphql/mutation';
import { useMutation } from '@apollo/client';
import { APP_LINKS } from '@shared/consts';
import { noSelect } from 'styles';

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
    console.log('navbar', business);

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
            <AppBar sx={{
                ...noSelect,
                background: palette.primary.dark,
                height: { xs: '64px', md: '80px' },
                zIndex: 100,
            }}>
                <Toolbar>
                    {/* Logo/title container */}
                    <Box onClick={() => onRedirect(APP_LINKS.Home)} sx={{
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                    }}>
                        {/* Background circle */}
                        <Box sx={{
                            display: 'flex',
                            padding: 0,
                            cursor: 'pointer',
                            marginTop: { xs: '4px', md: '8px' },
                            marginBottom: { xs: '4px', md: '8px' },
                            marginRight: 'auto',
                            background: palette.mode === 'light' ? '#ffffff42' : 'radial-gradient(circle at center, #757565 0, #757565, white 100%)',
                            borderRadius: '100%',
                            height: { xs: '56px', md: '64px' },
                            width: { xs: '56px', md: '64px' },
                        }}>
                            {/* icon */}
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
                                    height: { xs: '60px', md: '72px' },
                                    transform: 'rotate(20deg)',
                                }} />
                        </Box>
                        {/* Title */}
                        <Typography
                            variant="h6"
                            noWrap
                            sx={{
                                position: 'relative',
                                cursor: 'pointer',
                                fontSize: { xs: '1.2em', sm: '1.5em', md: '2em' },
                                marginLeft: '4px',
                                fontFamily: `'Kite One', sans-serif`,
                                color: palette.primary.contrastText,
                            }}
                        >{business?.BUSINESS_NAME?.Short ?? 'New Life Nursery Inc.'}</Typography>
                    </Box>
                    <Box sx={{ marginLeft: 'auto' }}>
                        {show_hamburger ? <Hamburger {...child_props} /> : <NavList {...child_props} />}
                    </Box>
                </Toolbar>
            </AppBar>
        </HideOnScroll>
    );
}