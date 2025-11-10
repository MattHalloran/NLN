import { Box } from "@mui/material";
import { ReactNode } from "react";

interface SliderContentProps {
    translate: number;
    transition: number;
    width: number;
    children: ReactNode;
    fadeTransition?: boolean;
}

export const SliderContent = ({
    translate,
    transition,
    width,
    children,
    fadeTransition,
}: SliderContentProps) => {
    // For fade transitions, use relative positioning so slides can stack
    if (fadeTransition) {
        return (
            <Box
                sx={{
                    position: "relative",
                    height: "100%",
                    width: "100%",
                }}
            >
                {children}
            </Box>
        );
    }

    // For slide transitions, use translateX for horizontal movement
    return (
        <Box
            sx={{
                transform: `translateX(-${translate}px)`,
                transition: `transform ease-out ${transition}ms`,
                height: "100%",
                width: `${width}px`,
                display: "flex",
            }}
        >
            {children}
        </Box>
    );
};
