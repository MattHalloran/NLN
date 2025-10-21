import { alpha, Box, CircularProgress, CssBaseline, GlobalStyles, StyledEngineProvider, ThemeProvider } from "@mui/material";
import { Routes } from "Routes";
// Using REST API for landing page content and authentication
import { useLandingPageContent, useLogin } from "api/rest/hooks";
import { AlertDialog, BottomNav, Footer, PullToRefresh, SnackStack } from "components";
import { SideMenu, sideMenuDisplayData } from "components/navigation/Navbar/SideMenu";
import { BusinessContext } from "contexts/BusinessContext";
import { SessionContext } from "contexts/SessionContext";
import { ZIndexProvider } from "contexts/ZIndexContext";
import { useWindowSize } from "hooks/useWindowSize";
import { useCallback, useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useLocation } from "route";
import { BusinessData, Session } from "types";
import { PubSub, SideMenuPub, themes, createDynamicTheme } from "utils";

const menusDisplayData: { [key in SideMenuPub["id"]]: { persistentOnDesktop: boolean, sideForRightHanded: "left" | "right" } } = {
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
    
    // Using REST API for landing page content
    const { data: landingPageData } = useLandingPageContent(true);

    const { mutate: login } = useLogin();
    const [,] = useLocation();

    useEffect(() => () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (landingPageData?.contactInfo) {
            const { business, hours } = landingPageData.contactInfo;
            const data = {
                ...business,
                hours,
            };
            setBusiness(data);
        }
    }, [landingPageData]);

    useEffect(() => {
        // Determine theme mode
        const themeMode = session?.theme && (session.theme === "light" || session.theme === "dark")
            ? session.theme
            : "light";

        // Apply custom brand colors from settings if available
        const customColors = landingPageData?.settings?.colors;
        const dynamicTheme = createDynamicTheme(themeMode, customColors);

        setTheme(dynamicTheme);
    }, [session, landingPageData?.settings?.colors]);

    const checkLogin = useCallback((session?: Session) => {
        if (session) {
            setSession(session);
            return;
        }
        login({ email: "", password: "" }).then((response) => {
            setSession(response as any);
        }).catch(() => {
            // Silent fail - expected 401 when no valid session cookie exists
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
        const businessSub = PubSub.get().subscribeBusiness((data) => setBusiness(data as BusinessData));
        const themeSub = PubSub.get().subscribeTheme((theme) => {
            if (theme && (theme === "light" || theme === "dark")) {
                setTheme(themes[theme]);
            } else {
                setTheme(themes.light);
            }
        });
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
                                backgroundColor: alpha(theme.palette.primary.main, 0.52),
                            },
                        },
                        body: {
                            overflowX: "hidden",
                            overflowY: "auto",
                            // Scrollbar should always be visible for the body
                            "&::-webkit-scrollbar-thumb": {
                                backgroundColor: alpha(theme.palette.primary.main, 0.52),
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
                        <ZIndexProvider>
                            <BusinessContext.Provider value={business}>
                                <Box id="App" sx={{
                                    background: theme.palette.background.default,
                                    color: theme.palette.background.textPrimary,
                                    // Style visited, active, and hovered links
                                    "& span, p": {
                                        "& a": {
                                            color: theme.palette.primary.dark,
                                            "&:visited": {
                                                color: theme.palette.primary.dark,
                                            },
                                            "&:active": {
                                                color: theme.palette.primary.dark,
                                            },
                                            "&:hover": {
                                                color: alpha(theme.palette.primary.light, 0.8),
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
                        </ZIndexProvider>
                    </SessionContext.Provider>
                </DndProvider>
            </ThemeProvider>
        </StyledEngineProvider>
    );
}
