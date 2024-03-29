import { Box } from "@mui/material";

export const SliderContent = ({
    translate,
    transition,
    width,
    children,
}) => {
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
