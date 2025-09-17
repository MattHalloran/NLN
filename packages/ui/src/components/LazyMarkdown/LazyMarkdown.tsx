import { Box, CircularProgress } from "@mui/material";
import { lazy, Suspense } from "react";

// Lazy load the markdown component
const MarkdownToJsx = lazy(() => import("markdown-to-jsx"));

interface LazyMarkdownProps {
    children: string;
    options?: any;
    [key: string]: any;
}

export const LazyMarkdown = ({ children, options, ...props }: LazyMarkdownProps) => {
    return (
        <Suspense fallback={
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                padding: 2 
            }}>
                <CircularProgress size={24} />
            </Box>
        }>
            <MarkdownToJsx options={options} {...props}>
                {children}
            </MarkdownToJsx>
        </Suspense>
    );
};