import { Box } from "@mui/material";
import { Image } from "types";
import { getImageFiles, getImageSrc, getServerUrl } from "utils";

interface SlideProps {
    image: Image;
    width: number;
    isPriority?: boolean;
    fadeTransition?: boolean;
    isActive?: boolean;
    transitionDuration?: number;
}

export const Slide = ({
    image,
    width,
    isPriority,
    fadeTransition,
    isActive,
    transitionDuration = 1000,
}: SlideProps) => {
    if (!image) return null;

    const serverUrl = getServerUrl();
    const imageSrc = getImageSrc(image, width);
    if (!imageSrc) return null;

    const files = getImageFiles(image);
    const srcSet = files
        .filter((file) => file.src && file.width)
        .sort((a, b) => a.width - b.width)
        .map((file) => `${serverUrl}${file.src} ${file.width}w`)
        .join(", ");
    const fallbackFile = files.find((file) => file.src === imageSrc) ?? files[0];
    const loading = isPriority ? "eager" : "lazy";
    const fetchPriority = isPriority ? "high" : "auto";
    const imageElement = (
        <Box
            component="img"
            src={`${serverUrl}${imageSrc}`}
            srcSet={srcSet || undefined}
            sizes="100vw"
            alt={image.alt || ""}
            loading={loading}
            fetchPriority={fetchPriority}
            decoding={isPriority ? "sync" : "async"}
            width={fallbackFile?.width}
            height={fallbackFile?.height}
            sx={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
            }}
        />
    );

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
                    // Active slide is always at opacity 1, inactive at 0
                    opacity: isActive ? 1 : 0,
                    // All slides have transition, but active slides use 0ms to appear instantly
                    transition: `opacity ${isActive ? 0 : transitionDuration}ms ease-out`,
                    // Inactive slides on top (fading out), active slide underneath (already visible)
                    zIndex: isActive ? 0 : 1,
                }}
            >
                {imageElement}
            </Box>
        );
    }

    // For slide transitions, use regular inline positioning
    return (
        <Box
            sx={{
                width: `${width}px`,
                height: "100%",
            }}
        >
            {imageElement}
        </Box>
    );
};
