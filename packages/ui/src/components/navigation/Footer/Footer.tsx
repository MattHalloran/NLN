import { APP_LINKS } from "@local/shared";
import { Box, ButtonBase, Container, Grid, IconButton, Link, Stack, Typography, useTheme } from "@mui/material";
import AmericanHort from "assets/img/american-hort.png";
import NJNLA from "assets/img/njnla_logo.jpg";
import ProvenWinners from "assets/img/proven-winners.png";
import { CopyrightBreadcrumbs } from "components";
import { BusinessContext } from "contexts/BusinessContext";
import { SessionContext } from "contexts/SessionContext";
import {
    MapPin,
    Phone,
    Printer,
    Mail,
    Info,
    FileText,
    Camera,
    ExternalLink,
    LogIn
} from "lucide-react";
import { isObject } from "lodash-es";
import { useContext } from "react";
import { useLocation } from "route";
import { getServerUrl, printAvailability } from "utils";

export const Footer = () => {
    const [, setLocation] = useLocation();
    const { palette } = useTheme();
    const session = useContext(SessionContext);
    const business = useContext(BusinessContext);

    const contactLinks = [
        {
            icon: <MapPin size={18} />,
            label: business?.ADDRESS?.Label || "Address",
            href: business?.ADDRESS?.Link,
            tooltip: "View in Google Maps"
        },
        {
            icon: <Phone size={18} />,
            label: business?.PHONE?.Label || "Phone",
            href: business?.PHONE?.Link,
            tooltip: "Call Us"
        },
        {
            icon: <Printer size={18} />,
            label: business?.FAX?.Label || "Fax",
            href: business?.FAX?.Link,
            tooltip: "Fax Us"
        },
        {
            icon: <Mail size={18} />,
            label: business?.EMAIL?.Label || "Email",
            href: business?.EMAIL?.Link,
            tooltip: "Email Us"
        }
    ];

    const partnerLogos = [
        {
            href: "https://www.provenwinners.com/",
            alt: "We Sell Proven Winners - The #1 Plant Brand",
            src: ProvenWinners
        },
        {
            href: "https://www.americanhort.org/",
            alt: "Proud member of the AmericanHort",
            src: AmericanHort
        },
        {
            href: "https://www.njnla.org/",
            alt: "Proud member of the New Jersey Nursery and Landscape Association",
            src: NJNLA
        }
    ];

    return (
        <Box
            component="footer"
            sx={{
                background: `linear-gradient(135deg, ${palette.mode === "light" ? "#1a4d3a" : "#0f2920"} 0%, ${palette.mode === "light" ? "#2d5a47" : "#1a3d33"} 100%)`,
                color: palette.primary.contrastText,
                py: { xs: 4, md: 6 },
                pb: { xs: 12, md: 6 }, // Extra bottom padding on mobile for BottomNav
                mt: "auto",
            }}
        >
            <Container maxWidth="lg">
                {/* Main Footer Content */}
                <Grid container spacing={{ xs: 3, md: 4 }}>
                    {/* Resources Section */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 600,
                                mb: 2,
                                fontSize: { xs: "1rem", md: "1.1rem" },
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                            }}
                        >
                            Resources
                        </Typography>
                        <Stack spacing={1.5}>
                            <Link
                                component="button"
                                onClick={() => setLocation(APP_LINKS.About)}
                                sx={{
                                    color: "inherit",
                                    textDecoration: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    fontSize: "0.9rem",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        color: palette.secondary.main,
                                        transform: "translateX(4px)",
                                    },
                                }}
                            >
                                <Info size={16} />
                                About Us
                            </Link>
                            <Link
                                href={`${getServerUrl()}/Credit_App-2010.doc`}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={`Commercial Credit Application - ${business?.BUSINESS_NAME?.Short}`}
                                sx={{
                                    color: "inherit",
                                    textDecoration: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    fontSize: "0.9rem",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        color: palette.secondary.main,
                                        transform: "translateX(4px)",
                                    },
                                }}
                            >
                                <FileText size={16} />
                                Credit App
                                <ExternalLink size={12} />
                            </Link>
                            <Link
                                component="button"
                                onClick={() => printAvailability(session, business?.BUSINESS_NAME?.Long, business?.PHONE?.Label, business?.EMAIL?.Label)}
                                sx={{
                                    color: "inherit",
                                    textDecoration: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    fontSize: "0.9rem",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        color: palette.secondary.main,
                                        transform: "translateX(4px)",
                                    },
                                }}
                            >
                                <Printer size={16} />
                                Print Availability
                            </Link>
                            <Link
                                component="button"
                                onClick={() => setLocation(APP_LINKS.Gallery)}
                                sx={{
                                    color: "inherit",
                                    textDecoration: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    fontSize: "0.9rem",
                                    transition: "all 0.3s ease",
                                    "&:hover": {
                                        color: palette.secondary.main,
                                        transform: "translateX(4px)",
                                    },
                                }}
                            >
                                <Camera size={16} />
                                Gallery
                            </Link>
                            {/* Show login only when not logged in */}
                            {(!isObject(session) || !session || Object.keys(session).length === 0) && (
                                <Link
                                    component="button"
                                    onClick={() => setLocation(APP_LINKS.LogIn)}
                                    sx={{
                                        color: "inherit",
                                        textDecoration: "none",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                        fontSize: "0.9rem",
                                        transition: "all 0.3s ease",
                                        "&:hover": {
                                            color: palette.secondary.main,
                                            transform: "translateX(4px)",
                                        },
                                    }}
                                >
                                    <LogIn size={16} />
                                    Admin Login
                                </Link>
                            )}
                        </Stack>
                    </Grid>

                    {/* Contact Section */}
                    <Grid item xs={12} sm={6} md={5}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 600,
                                mb: 2,
                                fontSize: { xs: "1rem", md: "1.1rem" },
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                            }}
                        >
                            Contact
                        </Typography>
                        <Grid container spacing={1.5}>
                            {contactLinks.map((contact, index) => (
                                contact.href && contact.label ? (
                                    <Grid item xs={12} sm={12} md={6} key={index}>
                                        <Link
                                            href={contact.href}
                                            target={contact.href.startsWith("http") ? "_blank" : undefined}
                                            rel={contact.href.startsWith("http") ? "noopener noreferrer" : undefined}
                                            sx={{
                                                color: "inherit",
                                                textDecoration: "none",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                                p: 1,
                                                borderRadius: 1,
                                                fontSize: "0.85rem",
                                                transition: "all 0.3s ease",
                                                "&:hover": {
                                                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                                                    transform: "translateY(-2px)",
                                                },
                                            }}
                                            title={contact.tooltip}
                                        >
                                            <Box sx={{ color: "#ffffff" }}>
                                                {contact.icon}
                                            </Box>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontSize: "0.85rem",
                                                    wordBreak: "break-word",
                                                    overflowWrap: "break-word"
                                                }}
                                            >
                                                {contact.label}
                                            </Typography>
                                        </Link>
                                    </Grid>
                                ) : null
                            ))}
                        </Grid>
                    </Grid>

                    {/* Partner Logos */}
                    <Grid item xs={12} md={4}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 600,
                                mb: 2,
                                fontSize: { xs: "1rem", md: "1.1rem" },
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                            }}
                        >
                            Partners
                        </Typography>
                        <Grid container spacing={2}>
                            {partnerLogos.map((logo, index) => (
                                <Grid item xs={4} md={12} key={index}>
                                    <Link
                                        href={logo.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{
                                            display: "block",
                                            p: { xs: 1.5, md: 2 },
                                            borderRadius: 2,
                                            backgroundColor: "rgba(255, 255, 255, 0.95)",
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                backgroundColor: "rgba(255, 255, 255, 1)",
                                                transform: "translateY(-4px)",
                                                boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
                                            },
                                        }}
                                        title={logo.alt}
                                    >
                                        <Box
                                            component="img"
                                            src={logo.src}
                                            alt={logo.alt}
                                            sx={{
                                                width: "100%",
                                                height: { xs: 80, md: 90 },
                                                objectFit: "contain",
                                            }}
                                        />
                                    </Link>
                                </Grid>
                            ))}
                        </Grid>
                    </Grid>
                </Grid>

                {/* Copyright Section */}
                <Box
                    sx={{
                        borderTop: `1px solid rgba(255, 255, 255, 0.2)`,
                        mt: 4,
                        pt: 3,
                        textAlign: "center",
                    }}
                >
                    <CopyrightBreadcrumbs
                        textColor={palette.primary.contrastText}
                        sx={{
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: "0.8rem",
                        }}
                    />
                </Box>
            </Container>
        </Box>
    );
};