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
import { BusinessContext } from "components/contexts/BusinessContext";
import { SessionContext } from "components/contexts/SessionContext";
import { SideMenu, sideMenuDisplayData } from "components/navigation/Navbar/SideMenu";
import { shoppingFilterSideMenuDisplayData } from "pages/main/shopping/ShoppingFilterSideMenu/ShoppingFilterSideMenu";
import { useCallback, useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useLocation } from "route";
import { BusinessData, Session } from "types";
import { PubSub, SideMenuPub, themes, useWindowSize } from "utils";

const menusDisplayData: { [key in SideMenuPub["id"]]: { persistentOnDesktop: boolean, sideForRightHanded: "left" | "right" } } = {
    "shopping-filter-side-menu": shoppingFilterSideMenuDisplayData,
    "side-menu": sideMenuDisplayData,
};

export function App() {
    // Session cookie should automatically expire in time determined by server,
    // so no need to validate session on first load
    const [session, setSession] = useState<Session | undefined>(undefined);
    const [theme, setTheme] = useState(themes.light);
    const isLeftHanded = false; // useIsLeftHanded();
    const [loading, setLoading] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [business, setBusiness] = useState<BusinessData | undefined>(undefined);
    const [contentMargins, setContentMargins] = useState<{ paddingLeft?: string, paddingRight?: string }>({}); // Adds margins to content when a persistent drawer is open
    const isMobile = useWindowSize(({ width }) => width <= theme.breakpoints.values.md);
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
    }, [session]);

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
        // Handle session updates
        const sessionSub = PubSub.get().subscribeSession((session) => {
            // If undefined or empty, set session to published data
            if (session === undefined || Object.keys(session).length === 0) {
                setSession(session);
            }
            // Otherwise, combine existing session data with published data
            else {
                setSession(s => ({ ...s, ...session }));
            }
        });
        // Handle content margins when drawer(s) open/close
        const sideMenuPub = PubSub.get().subscribeSideMenu((data) => {
            const { persistentOnDesktop, sideForRightHanded } = menusDisplayData[data.id];
            // Ignore if dialog is not persistent on desktop
            if (!persistentOnDesktop) return;
            // Flip side when in left-handed mode
            const side = isLeftHanded ? (sideForRightHanded === "left" ? "right" : "left") : sideForRightHanded;
            const menuElement = document.getElementById(data.id);
            const padding = data.isOpen && !isMobile ? `${menuElement?.clientWidth ?? 0}px` : "0px";
            // Only set on desktop
            if (side === "left") {
                setContentMargins(existing => ({ ...existing, paddingLeft: padding }));
            } else if (side === "right") {
                setContentMargins(existing => ({ ...existing, paddingRight: padding }));
            }
        });
        return (() => {
            PubSub.get().unsubscribe(loadingSub);
            PubSub.get().unsubscribe(businessSub);
            PubSub.get().unsubscribe(themeSub);
            PubSub.get().unsubscribe(sessionSub);
            PubSub.get().unsubscribe(sideMenuPub);
        });
    }, [checkLogin, isLeftHanded, isMobile]);

    return (
        <StyledEngineProvider injectFirst>
            <CssBaseline />
            <ThemeProvider theme={theme}>
                <GlobalStyles
                    styles={() => ({
                        // Custom scrollbar
                        "*": {
                            "&::-webkit-scrollbar": {
                                width: 10,
                            },
                            "&::-webkit-scrollbar-track": {
                                backgroundColor: "transparent",
                            },
                            "&::-webkit-scrollbar-thumb": {
                                borderRadius: "100px",
                                backgroundColor: "transparent", // Set initial color as transparent
                            },
                            "&:hover::-webkit-scrollbar-thumb": {
                                backgroundColor: "#1b5e2085",  // Change color on hover
                            },
                        },
                        body: {
                            overflowX: "hidden",
                            overflowY: "auto",
                            // Scrollbar should always be visible for the body
                            "&::-webkit-scrollbar-thumb": {
                                backgroundColor: "#1b5e2085",
                            },
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
                    <SessionContext.Provider value={session}>
                        <BusinessContext.Provider value={business}>
                            <Box id="App" sx={{
                                background: theme.palette.background.default,
                                color: theme.palette.background.textPrimary,
                                // Style visited, active, and hovered links
                                "& span, p": {
                                    "& a": {
                                        color: theme.palette.mode === "light" ? "#001cd3" : "#dd86db",
                                        "&:visited": {
                                            color: theme.palette.mode === "light" ? "#001cd3" : "#f551ef",
                                        },
                                        "&:active": {
                                            color: theme.palette.mode === "light" ? "#001cd3" : "#f551ef",
                                        },
                                        "&:hover": {
                                            color: theme.palette.mode === "light" ? "#5a6ff6" : "#f3d4f2",
                                        },
                                        // Remove underline on links
                                        textDecoration: "none",
                                    },
                                },
                            }}>
                                <main
                                    id="page-container"
                                    style={{
                                        background: theme.palette.background.default,
                                        color: theme.palette.background.textPrimary,
                                    }}
                                >
                                    {/* Pull-to-refresh for PWAs */}
                                    <PullToRefresh />
                                    <Box id="content-wrap" sx={{
                                        minHeight: "100vh",
                                        ...(contentMargins),
                                        transition: "margin 0.225s cubic-bezier(0, 0, 0.2, 1) 0s",
                                    }}>
                                        <Navbar />
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
                                        <SideMenu />
                                        <SnackStack />
                                        <Routes />
                                    </Box>
                                    <BottomNav />
                                    <Footer />
                                </main>
                            </Box>
                        </BusinessContext.Provider>
                    </SessionContext.Provider>
                </DndProvider>
            </ThemeProvider>
        </StyledEngineProvider>
    );
}
