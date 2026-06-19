import { CssBaseline, StyledEngineProvider, ThemeProvider } from "@mui/material";
import { render } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { themes } from "utils/theme";

type ProvidersProps = {
    children: ReactNode;
};

const TestProviders = ({ children }: ProvidersProps) => (
    <StyledEngineProvider injectFirst>
        <ThemeProvider theme={themes.light}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    </StyledEngineProvider>
);

export const renderWithProviders = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
    render(ui, { wrapper: TestProviders, ...options });

export * from "@testing-library/react";
