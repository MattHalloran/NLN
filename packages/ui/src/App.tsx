import { useState, useEffect, useCallback, useRef } from 'react';
import {
    AlertDialog,
    Footer,
    IconNav,
    Navbar,
    SnackStack,
} from 'components';
import { PubSub, themes } from 'utils';
import { GlobalHotKeys } from "react-hotkeys";
import { Routes } from 'Routes';
import { useHistory } from 'react-router';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import { useMutation, useQuery } from '@apollo/client';
import { readAssetsQuery } from 'graphql/query/readAssets';
import { loginMutation } from 'graphql/mutation';
import { Box, CircularProgress, CssBaseline, StyledEngineProvider, ThemeProvider } from '@mui/material';
import { Session } from 'types';

const useStyles = makeStyles(() => ({
    "@global": {
        body: {
            backgroundColor: 'black',
        },
        '#page': {
            minWidth: '100%',
            minHeight: '100%',
            padding: '1em',
            paddingTop: 'calc(14vh + 20px)'
        },
        '@media (min-width:500px)': {
            '#page': {
                paddingLeft: 'max(1em, calc(15% - 75px))',
                paddingRight: 'max(1em, calc(15% - 75px))',
            }
        },
    },
}));

const keyMap = {
    OPEN_MENU: "left",
    TOGGLE_MENU: "m",
    CLOSE_MENU: "right",
    CLOSE_MENU_OR_POPUP: ["escape", "backspace"]
};

export function App() {
    useStyles();
    // Session cookie should automatically expire in time determined by server,
    // so no need to validate session on first load
    const [session, setSession] = useState<Session | undefined>(undefined);
    const [theme, setTheme] = useState(themes.light);
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [business, setBusiness] = useState(null)
    const { data: businessData } = useQuery(readAssetsQuery, { variables: { files: ['hours.md', 'business.json'] } });
    const [login] = useMutation(loginMutation);
    let history = useHistory();

    useEffect(() => () => {
        if(timeoutRef.current) clearTimeout(timeoutRef.current);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (businessData === undefined) return;
        let data = businessData.readAssets[1] ? JSON.parse(businessData.readAssets[1]) : {};
        let hoursRaw = businessData.readAssets[0];
        data.hours = hoursRaw;
        setBusiness(data);
    }, [businessData])

    useEffect(() => {
        // Determine theme
        if (session?.theme) setTheme(themes[session?.theme])
        else if (session && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme(themes.dark);
        else setTheme(themes.light);
        setCart(session?.cart ?? null);
    }, [session])

    const handlers = {
        OPEN_MENU: () => PubSub.get().publishBurgerMenu(true),
        TOGGLE_MENU: () => PubSub.get().publishBurgerMenu('toggle'),
        CLOSE_MENU: () => PubSub.get().publishBurgerMenu(false),
        CLOSE_MENU_OR_POPUP: () => {
            handlers.CLOSE_MENU();
        },
    };

    const checkLogin = useCallback((session?: Session) => {
        if (session) {
            setSession(session);
            return;
        }
        login().then((response) => {
            setSession(response.data.login);
        }).catch((response) => {
            if (process.env.NODE_ENV === 'development') console.error('Error: cannot login', response);
            setSession({})
        })
    }, [login])

    useEffect(() => {
        checkLogin();
        // Handle loading spinner, which can have a delay
        let loadingSub = PubSub.get().subscribeLoading((delay) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (Number.isInteger(delay)) {
                timeoutRef.current = setTimeout(() => setLoading(true), Math.abs(delay as number));
            } else {
                setLoading(Boolean(delay));
            }
        });
        let businessSub = PubSub.get().subscribeBusiness((data) => setBusiness(data));
        let themeSub = PubSub.get().subscribeTheme((theme) => setTheme(themes[theme as any] ?? themes.light));
        return (() => {
            PubSub.get().unsubscribe(loadingSub);
            PubSub.get().unsubscribe(businessSub);
            PubSub.get().unsubscribe(themeSub);
        })
    }, [checkLogin])

    const redirect = (link) => history.push(link);

    return (
        <StyledEngineProvider injectFirst>
            <CssBaseline />
            <ThemeProvider theme={theme}>
                <DndProvider backend={HTML5Backend}>
                    <div id="App">
                        <GlobalHotKeys keyMap={keyMap} handlers={handlers} />
                        <main
                            id="page-container"
                            style={{
                                background: theme.palette.background.default,
                                color: theme.palette.background.textPrimary,
                            }}
                        >
                            <Box id="content-wrap" sx={{ minHeight: '100vh', }}>
                                <Navbar
                                    session={session}
                                    business={business}
                                    onSessionUpdate={checkLogin}
                                    roles={session?.roles}
                                    cart={cart}
                                    onRedirect={redirect}
                                />
                                {
                                    loading && <Box sx={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: 100000,
                                    }}>
                                        <CircularProgress size={100} />
                                    </Box>
                                }
                                <AlertDialog />
                                <SnackStack />
                                <Routes
                                    session={session}
                                    onSessionUpdate={checkLogin}
                                    business={business}
                                    userRoles={session?.roles}
                                    cart={cart}
                                    onRedirect={redirect}
                                />
                            </Box>
                            <IconNav session={session} userRoles={session?.roles} cart={cart} />
                            <Footer session={session} business={business} />
                        </main>
                    </div>
                </DndProvider>
            </ThemeProvider>
        </StyledEngineProvider>
    );
}
