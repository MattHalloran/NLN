import { createTheme } from '@mui/material';

// Define custom theme properties
declare module '@mui/material/styles/createPalette' {
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
                variant: 'contained',
                color: 'secondary',
            },
        },
        MuiTextField: {
            defaultProps: {
                variant: 'outlined'
            },
        },
    },
});

const lightTheme = createTheme({
    ...commonTheme,
    palette: {
        mode: 'light',
        primary: {
            light: '#4c8c4a',
            main: '#1b5e20',
            dark: '#003300',
        },
        secondary: {
            light: '#63a4ff',
            main: '#1976d2',
            dark: '#004ba0',
        },
        background: {
            default: '#dae7da',
            paper: '#ffffff',
            textPrimary: '#000000',
            textSecondary: '#6f6f6f',
        },
    }
})

const darkTheme = createTheme({
    ...commonTheme,
    palette: {
        mode: 'dark',
        primary: {
            light: '#5f6a89',
            main: '#515774',
            dark: '#242930',
        },
        secondary: {
            light: '#5b99da',
            main: '#4372a3',
            dark: '#344eb5',
        },
        background: {
            default: '#181818',
            paper: '#2e2e2e',
            textPrimary: '#ffffff',
            textSecondary: '#c3c3c3',
        },
    },
})

export const themes = {
    'light': lightTheme,
    'dark': darkTheme
}