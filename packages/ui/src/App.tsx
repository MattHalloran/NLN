import { alpha, Box, CircularProgress, CssBaseline, GlobalStyles, StyledEngineProvider, ThemeProvider } from "@mui/material";
import { Routes } from "Routes";
// Using REST API for landing page content and authentication
import { useLogin } from "api/rest/hooks";
import { AlertDialog, BottomNav, Footer, PullToRefresh, SnackStack } from "components";
import { SideMenu, sideMenuDisplayData } from "components/navigation/Navbar/SideMenu";
import { BusinessContext } from "contexts/BusinessContext";
import { SessionContext } from "contexts/SessionContext";
import { ZIndexProvider } from "contexts/ZIndexContext";
import { useWindowSize } from "hooks/useWindowSize";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useLocation } from "route";
import { useLandingPageStore } from "stores/landingPageStore";
import { BusinessData, Session } from "types";
import { PubSub, SideMenuPub, createDynamicTheme } from "utils";

const menusDisplayData: { [key in SideMenuPub["id"]]: { persistentOnDesktop: boolean, sideForRightHanded: "left" | "right" } } = {
    "side-menu": sideMenuDisplayData,
};

export function App() {
    // Session cookie should automatically expire in time determined by server,
    // so no need to validate session on first load
    const [session, setSession] = useState<Session | undefined>(undefined);
    const isLeftHanded = false; // useIsLeftHanded();
    const [loading, setLoading] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [contentMargins, setContentMargins] = useState<{ paddingLeft?: string, paddingRight?: string }>({}); // Adds margins to content when a persistent drawer is open

    // Using Zustand store for landing page content (single source of truth)
    const landingPageData = useLandingPageStore((state) => state.data);
    const fetchLandingPage = useLandingPageStore((state) => state.fetchLandingPage);
    const refetchLandingPage = useLandingPageStore((state) => state.refetch);

    const { mutate: login } = useLogin();
    const [,] = useLocation();

    // Derive business data from landing page data
    const business = useMemo<BusinessData | undefined>(() => {
        if (!landingPageData?.contact) return undefined;

        return {
            BUSINESS_NAME: {
                Short: landingPageData.contact.name,
                Long: landingPageData.contact.name, // Same as short for now
            },
            ADDRESS: {
                Label: landingPageData.contact.address?.full || "",
                Link: landingPageData.contact.address?.googleMapsUrl || "",
            },
            PHONE: {
                Label: landingPageData.contact.phone?.display || "",
                Link: landingPageData.contact.phone?.link || "",
            },
            EMAIL: {
                Label: landingPageData.contact.email?.display || "",
                Link: landingPageData.contact.email?.link || "",
            },
            hours: landingPageData.contact.hours,
        };
    }, [landingPageData]);

    // Derive theme from session and landing page data
    const theme = useMemo(() => {
        // Determine theme mode
        const themeMode = session?.theme && (session.theme === "light" || session.theme === "dark")
            ? session.theme
            : "light";

        // Apply custom brand colors from theme if available
        const themeColors = landingPageData?.theme?.colors;
        // Extract colors for the current theme mode (new format supports light/dark separately)
        const customColors = themeColors?.[themeMode] as {
            primary?: string;
            secondary?: string;
            accent?: string;
            background?: string;
            paper?: string;
        } | undefined;

        return createDynamicTheme(themeMode, customColors);
    }, [session, landingPageData?.theme?.colors]);

    const isMobile = useWindowSize(({ width }) => width <= theme.breakpoints.values.md);

    useEffect(() => () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setLoading(false);
    }, []);

    const checkLogin = useCallback((session?: Session) => {
        if (session) {
            setSession(session);
            return;
        }
        login({ email: "", password: "" }).then((response) => {
            setSession(response as Session);
        }).catch(() => {
            // Silent fail - expected 401 when no valid session cookie exists
            setSession({});
        });
    }, [login]);

    // Initial data fetch - only runs once on mount
    useEffect(() => {
        checkLogin();
        fetchLandingPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle subscriptions and UI updates
    useEffect(() => {
        // Handle loading spinner, which can have a delay
        const loadingSub = PubSub.get().subscribeLoading((delay) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (Number.isInteger(delay)) {
                timeoutRef.current = setTimeout(() => setLoading(true), Math.abs(delay as number));
            } else {
                setLoading(Boolean(delay));
            }
        });
        // Handle landing page content updates (e.g., when branding settings change)
        const landingPageSub = PubSub.get().subscribeLandingPageUpdated(() => {
            refetchLandingPage();
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
            PubSub.get().unsubscribe(landingPageSub);
            PubSub.get().unsubscribe(sessionSub);
            PubSub.get().unsubscribe(sideMenuPub);
        });
    }, [isLeftHanded, isMobile, refetchLandingPage]);

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
                                    color: theme.palette.text.primary,
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
                                            color: theme.palette.text.primary,
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
