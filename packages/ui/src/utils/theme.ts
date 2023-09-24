import { createTheme, lighten } from "@mui/material";

// Define custom theme properties
declare module "@mui/material/styles/createPalette" {
    interface TypeBackground {
        textPrimary: string;
        textSecondary: string;
    }
}

const commonTheme = createTheme({
    components: {
        // Style sheet name ⚛️
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
    background: {
        default: "#e9f1e9",
        paper: "#ffffff",
        textPrimary: "#000000",
        textSecondary: "#6f6f6f",
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
    background: {
        default: "#181818",
        paper: "#2e2e2e",
        textPrimary: "#ffffff",
        textSecondary: "#c3c3c3",
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
