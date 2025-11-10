import { Box } from "@mui/material";
import { Image } from "types";
import { getImageSrc, getServerUrl } from "utils";

interface SlideProps {
    image: Image;
    width: number;
    fadeTransition?: boolean;
    isActive?: boolean;
    transitionDuration?: number;
}

export const Slide = ({
    image,
    width,
    fadeTransition,
    isActive,
    transitionDuration = 1000,
}: SlideProps) => {
    if (!image) return null;

    // For fade transitions, use absolute positioning with opacity control
    if (fadeTransition) {
        return (
            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundImage: `url(${getServerUrl()}${getImageSrc(image, width)})`,
                    // Active slide is always at opacity 1, inactive at 0
                    opacity: isActive ? 1 : 0,
                    // All slides have transition, but active slides use 0ms to appear instantly
                    transition: `opacity ${isActive ? 0 : transitionDuration}ms ease-out`,
                    // Inactive slides on top (fading out), active slide underneath (already visible)
                    zIndex: isActive ? 0 : 1,
                }}
            />
        );
    }

    // For slide transitions, use regular inline positioning
    return (
        <Box
            sx={{
                width: `${width}px`,
                height: "100%",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundImage: `url(${getServerUrl()}${getImageSrc(image, width)})`,
            }}
        />
    );
};
