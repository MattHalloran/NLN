import { Box, useTheme } from "@mui/material";

interface DotsProps {
    quantity?: number;
    activeIndex: number;
    onDotClick?: (index: number) => void;
}

export const Dots = ({ quantity = 0, activeIndex, onDotClick }: DotsProps) => {
    const { palette } = useTheme();

    const slides: JSX.Element[] = [];
    for (let i = 0; i < quantity; i++) {
        slides.push(
            <Box
                key={"dot-" + i}
                onClick={() => onDotClick?.(i)}
                sx={{
                    padding: "10px",
                    marginRight: "5px",
                    cursor: "pointer",
                    borderRadius: "50%",
                    background: activeIndex === i ? palette.primary.main : "white",
                    transition: "background 0.2s ease-in-out",
                    opacity: activeIndex === i ? "0.9" : "80%",
                    pointerEvents: "auto",
                }}
            />,
        );
    }

    return (
        <Box
            sx={{
                position: "absolute",
                bottom: "25px",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
            }}
        >
            {slides}
        </Box>
    );
};
