import { createTheme, lighten, alpha } from "@mui/material";

// Define custom theme properties
declare module "@mui/material/styles/createPalette" {
    interface TypeBackground {
        textPrimary: string;
        textSecondary: string;
    }
    interface Palette {
        admin: PaletteAdmin;
        accent: PaletteColor;
    }
    interface PaletteOptions {
        admin: PaletteAdmin;
        accent?: PaletteColorOptions;
    }
}

// Admin-specific design tokens
interface PaletteAdmin {
    surface: string;
    surfaceVariant: string;
    outline: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    cardHover: string;
    iconBackground: string;
    gradientPrimary: string;
    gradientSecondary: string;
}

// Design tokens for consistent spacing and elevation
export const designTokens = {
    spacing: {
        xs: 0.5,  // 4px
        sm: 1,    // 8px
        md: 2,    // 16px
        lg: 3,    // 24px
        xl: 4,    // 32px
        xxl: 6,   // 48px
    },
    elevation: {
        card: 1,
        dialog: 8,
        drawer: 16,
        tooltip: 24,
    },
    borderRadius: {
        sm: 1,    // 8px
        md: 1.5,  // 12px
        lg: 2,    // 16px
        xl: 2.5,  // 20px
    },
} as const;

// Define common theme options (button appearance, etc.)
const commonTheme = createTheme({
    components: {
        MuiButton: {
            defaultProps: {
                variant: "contained",
                color: "secondary",
            },
        },
        MuiTextField: {
            defaultProps: {
                variant: "outlined",
            },
        },
    },
});

const lightPalette = {
    mode: "light",
    primary: {
        light: "#4c8c4a",
        main: "#1b5e20",
        dark: "#003300",
        contrastText: "#ffffff",
    },
    secondary: {
        light: "#63a4ff",
        main: "#1976d2",
        dark: "#004ba0",
        contrastText: "#ffffff",
    },
    accent: {
        light: "#80e27e",
        main: "#4caf50",
        dark: "#087f23",
        contrastText: "#ffffff",
    },
    background: {
        default: "#e9f1e9",
        paper: "#ffffff",
        textPrimary: "#000000",
        textSecondary: "#6f6f6f",
    },
    admin: {
        surface: "#f8f9fa",
        surfaceVariant: "#f1f3f4",
        outline: "#dadce0",
        success: "#137333",
        warning: "#ea8600",
        error: "#d93025",
        info: "#1a73e8",
        cardHover: alpha("#1b5e20", 0.04),
        iconBackground: alpha("#1b5e20", 0.1),
        gradientPrimary: "linear-gradient(135deg, #4c8c4a 0%, #1b5e20 100%)",
        gradientSecondary: "linear-gradient(135deg, #63a4ff 0%, #1976d2 100%)",
    },
} as const;
const lightTheme = createTheme({
    ...commonTheme,
    palette: lightPalette,
    components: {
        MuiButton: {
            variants: [
                {
                    props: { variant: "text" },
                    style: {
                        color: lightPalette.secondary.main,
                    },
                },
                {
                    props: { variant: "outlined" },
                    style: {
                        color: lightPalette.secondary.main,
                        borderColor: lightPalette.secondary.main,
                    },
                },
                {
                    props: { variant: "contained" },
                    style: {
                        backgroundColor: lightPalette.secondary.main,
                        color: lightPalette.secondary.contrastText,
                        "&:hover": {
                            backgroundColor: lighten(lightPalette.secondary.main, 0.1),
                        },
                    },
                },
            ],
        },
        MuiIconButton: {
            defaultProps: {
                disableRipple: true, // GlobalStyles overrides highlighting behavior
            },
        },
    },
});

const darkPalette = {
    mode: "dark",
    primary: {
        light: "#5f6a89",
        main: "#515774",
        dark: "#242930",
        contrastText: "#ffffff",
    },
    secondary: {
        light: "#5b99da",
        main: "#4372a3",
        dark: "#344eb5",
        contrastText: "#ffffff",
    },
    accent: {
        light: "#81c784",
        main: "#66bb6a",
        dark: "#388e3c",
        contrastText: "#ffffff",
    },
    background: {
        default: "#181818",
        paper: "#2e2e2e",
        textPrimary: "#ffffff",
        textSecondary: "#c3c3c3",
    },
    admin: {
        surface: "#2a2a2a",
        surfaceVariant: "#3c3c3c",
        outline: "#5f5f5f",
        success: "#34a853",
        warning: "#fbbc04",
        error: "#ea4335",
        info: "#4285f4",
        cardHover: alpha("#515774", 0.08),
        iconBackground: alpha("#515774", 0.15),
        gradientPrimary: "linear-gradient(135deg, #5f6a89 0%, #515774 100%)",
        gradientSecondary: "linear-gradient(135deg, #5b99da 0%, #4372a3 100%)",
    },
} as const;
const darkTheme = createTheme({
    ...commonTheme,
    palette: darkPalette,
    components: {
        MuiButton: {
            variants: [
                {
                    props: { variant: "text" },
                    style: {
                        color: darkPalette.secondary.main,
                    },
                },
                {
                    props: { variant: "outlined" },
                    style: {
                        color: darkPalette.secondary.main,
                        border: `1px solid ${darkPalette.secondary.main}`,
                    },
                },
                {
                    props: { variant: "contained" },
                    style: {
                        backgroundColor: darkPalette.secondary.main,
                        color: darkPalette.secondary.contrastText,
                        "&:hover": {
                            backgroundColor: lighten(darkPalette.secondary.main, 0.1),
                        },
                    },
                },
            ],
        },
        MuiIconButton: {
            defaultProps: {
                disableRipple: true, // GlobalStyles overrides highlighting behavior
            },
        },
    },
});

export const themes = {
    "light": lightTheme,
    "dark": darkTheme,
};

// Create a dynamic theme with custom colors from settings
export const createDynamicTheme = (mode: "light" | "dark", customColors?: { primary?: string; secondary?: string; accent?: string }) => {
    const baseTheme = mode === "light" ? lightPalette : darkPalette;

    if (!customColors) {
        return mode === "light" ? lightTheme : darkTheme;
    }

    const dynamicPalette = {
        ...baseTheme,
        primary: customColors.primary ? {
            light: lighten(customColors.primary, 0.3),
            main: customColors.primary,
            dark: lighten(customColors.primary, -0.3),
            contrastText: "#ffffff",
        } : baseTheme.primary,
        secondary: customColors.secondary ? {
            light: lighten(customColors.secondary, 0.3),
            main: customColors.secondary,
            dark: lighten(customColors.secondary, -0.3),
            contrastText: "#ffffff",
        } : baseTheme.secondary,
        accent: customColors.accent ? {
            light: lighten(customColors.accent, 0.3),
            main: customColors.accent,
            dark: lighten(customColors.accent, -0.3),
            contrastText: "#ffffff",
        } : baseTheme.accent,
    };

    return createTheme({
        ...commonTheme,
        palette: dynamicPalette,
        components: {
            MuiButton: {
                variants: [
                    {
                        props: { variant: "text" },
                        style: {
                            color: dynamicPalette.secondary.main,
                        },
                    },
                    {
                        props: { variant: "outlined" },
                        style: {
                            color: dynamicPalette.secondary.main,
                            borderColor: dynamicPalette.secondary.main,
                        },
                    },
                    {
                        props: { variant: "contained" },
                        style: {
                            backgroundColor: dynamicPalette.secondary.main,
                            color: dynamicPalette.secondary.contrastText,
                            "&:hover": {
                                backgroundColor: lighten(dynamicPalette.secondary.main, 0.1),
                            },
                        },
                    },
                ],
            },
            MuiIconButton: {
                defaultProps: {
                    disableRipple: true,
                },
            },
        },
    });
};
