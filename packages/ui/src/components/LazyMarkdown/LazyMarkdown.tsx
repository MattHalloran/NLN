import { Box, CircularProgress } from "@mui/material";
import { lazy, Suspense } from "react";
import type { MarkdownToJSX } from "markdown-to-jsx";

// Lazy load the markdown component
const MarkdownToJsx = lazy(() => import("markdown-to-jsx"));

interface LazyMarkdownProps {
    children: string;
    options?: MarkdownToJSX.Options;
    className?: string;
}

export const LazyMarkdown = ({ children, options, ...props }: LazyMarkdownProps) => {
    return (
        <Suspense
            fallback={
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: 2,
                    }}
                >
                    <CircularProgress size={24} />
                </Box>
            }
        >
            <MarkdownToJsx options={options} {...props}>
                {children}
            </MarkdownToJsx>
        </Suspense>
    );
};
