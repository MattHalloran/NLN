import { APP_LINKS } from "@local/shared";
import { alpha, AppBar, Box, Stack, Typography, useTheme } from "@mui/material";
import Logo from "assets/img/nln-logo-colorized.png";
import { Title } from "components/text";
import { NavbarProps } from "components/types";
import { BusinessContext } from "contexts/BusinessContext";
import { useDimensions } from "hooks/useDimensions";
import { useWindowSize } from "hooks/useWindowSize";
import { forwardRef, useCallback, useContext, useEffect, useMemo } from "react";
import { useLocation } from "route";
import { noSelect } from "styles";
import { hexToRGB } from "utils";
import { HideOnScroll } from "../HideOnScroll/HideOnScroll";
import { NavList } from "./NavList";

const zIndex = 300;

const LogoComponent = ({
    isLeftHanded,
    onClick,
    state,
}: {
    isLeftHanded: boolean;
    onClick: () => void;
    state: "full" | "icon" | "none";
}) => {
    const business = useContext(BusinessContext);
    const { palette } = useTheme();

    // Logo isn't always shown
    if (state === "none") return null;
    return (
        <Box
            onClick={onClick}
            sx={{
                padding: 0,
                display: "flex",
                alignItems: "center",
                marginRight: isLeftHanded ? 1 : "auto",
                marginLeft: isLeftHanded ? "auto" : 1,
            }}
        >
            <Box
                onClick={onClick}
                sx={{
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                }}
            >
                {/* Logo */}
                <Box sx={{
                    display: "flex",
                    padding: 0,
                    cursor: "pointer",
                    marginTop: { xs: "4px", md: "8px" },
                    marginBottom: { xs: "4px", md: "8px" },
                    marginRight: "auto",
                    background: palette.mode === "light" ? alpha(palette.background.paper, 0.26) : "radial-gradient(circle at center, #757565 0, #757565, white 100%)",
                    borderRadius: "100%",
                    height: "48px",
                    width: "48px",
                }}>
                    {/* icon */}
                    <Box
                        component="img"
                        src={Logo}
                        alt={`${business?.BUSINESS_NAME?.Short ?? "Business"} logo`}
                        sx={{
                            "-webkit-filter": `drop-shadow(0.5px 0.5px 0 ${hexToRGB(palette.primary.dark, 0.9)})
                        drop-shadow(-0.5px -0.5px 0 ${hexToRGB(palette.primary.dark, 0.9)})`,
                            filter: `drop-shadow(0.5px 0.5px 0 ${hexToRGB(palette.primary.dark, 0.9)}) 
                drop-shadow(-0.5px -0.5px 0 ${hexToRGB(palette.primary.dark, 0.9)})`,
                            verticalAlign: "middle",
                            fill: "black",
                            height: "48px",
                            transform: "rotate(20deg)",
                        }} />
                </Box>
                {/* Business name */}
                {state === "full" && <Typography
                    variant="h6"
                    noWrap
                    sx={{
                        position: "relative",
                        cursor: "pointer",
                        marginLeft: "8px",
                        fontSize: { xs: "1.2em", md: "1.5em" },
                        fontFamily: "'Kite One', sans-serif",
                        color: palette.primary.contrastText,
                    }}
                >{business?.BUSINESS_NAME?.Short ?? "New Life Nursery Inc."}</Typography>}
            </Box>
        </Box>
    );
};

const TitleDisplay = ({ isMobile, title, titleComponent, help, options, shouldHideTitle, showOnMobile }: {
    isMobile: boolean;
    title?: string;
    titleComponent?: JSX.Element;
    help?: string;
    options?: any;
    shouldHideTitle?: boolean;
    showOnMobile?: boolean;
}) => {
    // Check if title should be displayed here, based on screen size
    if ((isMobile && !showOnMobile) || (!isMobile && showOnMobile)) return null;
    // Desktop title can be hidden
    if (!isMobile && shouldHideTitle) return null;
    // If no custom title component, use Title component
    if (title && !titleComponent) return <Title
        help={help}
        options={options}
        title={title}
        variant="header"
    />;
    // Otherwise, use custom title component
    if (titleComponent) return titleComponent;
    return null;
};

const NavListComponent = ({ isLeftHanded }: { isLeftHanded: boolean }) => {
    return <Box sx={{
        marginLeft: isLeftHanded ? 0 : "auto",
        marginRight: isLeftHanded ? "auto" : 0,
        maxHeight: "100%",
    }}>
        <NavList />
    </Box>;
};

/**
 * Navbar displayed at the top of the page. Has a few different 
 * looks depending on data passed to it.
 * 
 * If the screen is large, the navbar is always displayed the same. In 
 * this case, the title and other content are displayed below the navbar.
 * 
 * Otherwise, the default look is logo & business name on the left, and 
 * account menu profile icon on the right.
 * 
 * If title data is passed in, the business name is hidden. The 
 * title is displayed in the middle, with a help icon if specified.
 * 
 * Content to display below the title (but still in the navbar) can also 
 * be passed in. This is useful for displaying a search bar, page tabs, etc. This 
 * content is inside the navbar on small screens, and below the navbar on large screens.
 */
export const Navbar = forwardRef(({
    below,
    help,
    options,
    shouldHideTitle = false,
    startComponent,
    tabTitle,
    title,
    titleComponent,
}: NavbarProps, ref) => {
    const business = useContext(BusinessContext);
    const { breakpoints, palette } = useTheme();
    const [, setLocation] = useLocation();
    const { dimensions, ref: dimRef } = useDimensions();

    // Determine display texts and states
    const isMobile = useWindowSize(({ width }) => width <= breakpoints.values.md);
    const logoState = useMemo(() => {
        if (isMobile && startComponent) return "none";
        if (isMobile && (title || titleComponent)) return "icon";
        return "full";
    }, [isMobile, startComponent, title, titleComponent]);
    const isLeftHanded = false;//useIsLeftHanded();


    const toHome = useCallback(() => setLocation(APP_LINKS.Home), [setLocation]);
    const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: "smooth" }), []);

    // Set tab to title
    useEffect(() => {
        const businessName = business?.BUSINESS_NAME?.Short ?? "New Life Nursery Inc.";
        document.title = tabTitle || title ? `${tabTitle ?? title} | ${businessName}` : businessName;
    }, [business?.BUSINESS_NAME?.Short, tabTitle, title]);

    return (
        <Box
            id='navbar'
            ref={ref}
            sx={{
                paddingTop: `${Math.max(dimensions.height, 64)}px`,
                "@media print": {
                    display: "none",
                },
            }}>
            <HideOnScroll forceVisible={!isMobile}>
                <AppBar
                    onClick={scrollToTop}
                    ref={dimRef}
                    sx={{
                        ...noSelect,
                        background: palette.primary.dark,
                        minHeight: "64px!important",
                        position: "fixed", // Allows items to be displayed below the navbar
                        justifyContent: "center",
                        zIndex,
                    }}>
                    <Stack direction="row" spacing={0} alignItems="center" sx={{
                        paddingLeft: 1,
                        paddingRight: 1,
                        // TODO Reverse order on left-handed mobile
                        flexDirection: isLeftHanded ? "row-reverse" : "row",
                    }}>
                        {startComponent ? <Box sx={isMobile ? {
                            marginRight: isLeftHanded ? 1 : "auto",
                            marginLeft: isLeftHanded ? "auto" : 1,
                        } : {}}>{startComponent}</Box> : null}
                        {/* Logo */}
                        <LogoComponent {...{ isLeftHanded, isMobile, state: logoState, onClick: toHome }} />
                        {/* Title displayed here on mobile */}
                        <TitleDisplay {...{ isMobile, title, titleComponent, help, options, shouldHideTitle, showOnMobile: true }} />
                        <NavListComponent {...{ isLeftHanded }} />
                    </Stack>
                    {/* "below" displayed inside AppBar on mobile */}
                    {isMobile && below}
                </AppBar>
            </HideOnScroll>
            {/* Title displayed here on desktop */}
            <TitleDisplay {...{ isMobile, title, titleComponent, help, options, shouldHideTitle, showOnMobile: false }} />
            {/* "below" and title displayered here on desktop */}
            {!isMobile && below}
        </Box>
    );
});
