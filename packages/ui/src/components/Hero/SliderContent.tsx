import { Box } from "@mui/material";
import { ReactNode } from "react";

interface SliderContentProps {
    translate: number;
    transition: number;
    width: number;
    children: ReactNode;
}

export const SliderContent = ({
    translate,
    transition,
    width,
    children,
}: SliderContentProps) => {
    return (
        <Box sx={{
            transform: `translateX(-${translate}px)`,
            transition: `transform ease-out ${transition}ms`,
            height: "100%",
            width: `${width}px`,
            display: "flex",
        }}>
            {children}
        </Box>
    );
};
