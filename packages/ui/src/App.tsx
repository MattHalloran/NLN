import { useMutation, useQuery } from "@apollo/client";
import { Box, CircularProgress, CssBaseline, GlobalStyles, StyledEngineProvider, ThemeProvider } from "@mui/material";
import { Routes } from "Routes";
import { loginMutation } from "api/mutation";
import { readAssetsQuery } from "api/query/readAssets";
import {
    AlertDialog,
    BottomNav,
    Footer,
    Navbar,
    PullToRefresh,
    SnackStack,
} from "components";
import { useCallback, useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { GlobalHotKeys } from "react-hotkeys";
import { useLocation } from "route";
import { Session } from "types";
import { PubSub, themes } from "utils";

const keyMap = {
    OPEN_MENU: "left",
    TOGGLE_MENU: "m",
    CLOSE_MENU: "right",
    CLOSE_MENU_OR_POPUP: ["escape", "backspace"],
};

export function App() {
    // Session cookie should automatically expire in time determined by server,
    // so no need to validate session on first load
    const [session, setSession] = useState<Session | undefined>(undefined);
    const [theme, setTheme] = useState(themes.light);
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [business, setBusiness] = useState(null);
    const { data: businessData } = useQuery(readAssetsQuery, { variables: { input: { files: ["hours.md", "business.json"] } } });
    const [login] = useMutation(loginMutation);
    const [, setLocation] = useLocation();

    useEffect(() => () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (businessData === undefined) return;
        const data = businessData.readAssets[1] ? JSON.parse(businessData.readAssets[1]) : {};
        const hoursRaw = businessData.readAssets[0];
        data.hours = hoursRaw;
        setBusiness(data);
    }, [businessData]);

    useEffect(() => {
        // Determine theme
        if (session?.theme) setTheme(themes[session?.theme]);
        //else if (session && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme(themes.dark);
        else setTheme(themes.light);
        setCart(session?.cart ?? null);
    }, [session]);

    const handlers = {
        OPEN_MENU: () => PubSub.get().publishBurgerMenu(true),
        TOGGLE_MENU: () => PubSub.get().publishBurgerMenu("toggle"),
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
        login({ variables: { input: {} } }).then((response) => {
            setSession(response.data.login);
        }).catch((response) => {
            if (import.meta.env.DEV) console.error("Error: cannot login", response);
            setSession({});
        });
    }, [login]);

    useEffect(() => {
        checkLogin();
        // Handle loading spinner, which can have a delay
        const loadingSub = PubSub.get().subscribeLoading((delay) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (Number.isInteger(delay)) {
                timeoutRef.current = setTimeout(() => setLoading(true), Math.abs(delay as number));
            } else {
                setLoading(Boolean(delay));
            }
        });
        const businessSub = PubSub.get().subscribeBusiness((data) => setBusiness(data));
        const themeSub = PubSub.get().subscribeTheme((theme) => setTheme(themes[theme as any] ?? themes.light));
        return (() => {
            PubSub.get().unsubscribe(loadingSub);
            PubSub.get().unsubscribe(businessSub);
            PubSub.get().unsubscribe(themeSub);
        });
    }, [checkLogin]);

    const redirect = (link) => setLocation(link);

    return (
        <StyledEngineProvider injectFirst>
            <CssBaseline />
            <ThemeProvider theme={theme}>
                <GlobalStyles
                    styles={() => ({
                        body: {
                            backgroundColor: "black",
                        },
                        "#page": {
                            minWidth: "100%",
                            minHeight: "100%",
                            padding: "1em",
                            paddingTop: "calc(14vh + 20px)",
                        },
                        "@media (min-width:500px)": {
                            "#page": {
                                paddingLeft: "max(1em, calc(15% - 75px))",
                                paddingRight: "max(1em, calc(15% - 75px))",
                            },
                        },
                        // Custom IconButton hover highlighting, which doesn't hide background color
                        ".MuiIconButton-root": {
                            "&:hover": {
                                filter: "brightness(1.3)",
                            },
                            "&.Mui-disabled": {
                                pointerEvents: "none",
                                filter: "grayscale(1) opacity(0.5)",
                            },
                            transition: "filter 0.2s ease-in-out",
                        },
                    })}
                />
                <DndProvider backend={HTML5Backend}>
                    <Box id="App">
                        <GlobalHotKeys keyMap={keyMap} handlers={handlers} />
                        <main
                            id="page-container"
                            style={{
                                background: theme.palette.background.default,
                                color: theme.palette.background.textPrimary,
                            }}
                        >
                            {/* Pull-to-refresh for PWAs */}
                            <PullToRefresh />
                            <Box id="content-wrap" sx={{ minHeight: "100vh" }}>
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
                                        position: "absolute",
                                        top: "50%",
                                        left: "50%",
                                        transform: "translate(-50%, -50%)",
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
                            <BottomNav session={session} userRoles={session?.roles} cart={cart} />
                            <Footer session={session} business={business} />
                        </main>
                    </Box>
                </DndProvider>
            </ThemeProvider>
        </StyledEngineProvider>
    );
}
