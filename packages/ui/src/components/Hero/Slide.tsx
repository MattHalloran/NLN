import { Box } from "@mui/material";
import { Image } from "types";
import { getImageFiles, getImageSrc } from "utils/imageTools";
import { getServerUrl } from "utils/serverUrl";

interface SlideProps {
    image: Image;
    width: number;
    isPriority?: boolean;
    fadeTransition?: boolean;
    isActive?: boolean;
    offsetPercent?: number;
    transitionDuration?: number;
}

export const Slide = ({
    image,
    width,
    isPriority,
    fadeTransition,
    isActive,
    offsetPercent,
    transitionDuration = 1000,
}: SlideProps) => {
    if (!image) return null;

    const serverUrl = getServerUrl();
    const imageSrc = getImageSrc(image, width);
    if (!imageSrc) return null;

    const toImageUrl = (src: string) => `${serverUrl}/${src.replace(/^\/+/, "")}`;
    const files = getImageFiles(image);
    const sortedFiles = files
        .filter((file) => file.src && file.width)
        .sort((a, b) => a.width - b.width);
    const webpSrcSet = sortedFiles
        .filter((file) => file.src.toLowerCase().endsWith(".webp"))
        .map((file) => `${toImageUrl(file.src)} ${file.width}w`)
        .join(", ");
    const fallbackSrcSet = sortedFiles
        .filter((file) => !file.src.toLowerCase().endsWith(".webp"))
        .map((file) => `${toImageUrl(file.src)} ${file.width}w`)
        .join(", ");
    const fallbackFile = files.find((file) => file.src === imageSrc) ?? files[0];
    const loading = isPriority ? "eager" : "lazy";
    const fetchPriority = isPriority ? "high" : "auto";
    const imageElement = (
        <Box
            component="picture"
            sx={{
                display: "block",
                width: "100%",
                height: "100%",
            }}
        >
            {webpSrcSet && <source srcSet={webpSrcSet} sizes="100vw" type="image/webp" />}
            <Box
                component="img"
                src={toImageUrl(imageSrc)}
                srcSet={fallbackSrcSet || undefined}
                sizes="100vw"
                alt={image.alt || ""}
                loading={loading}
                ref={(element: HTMLImageElement | null) => {
                    element?.setAttribute("fetchpriority", fetchPriority);
                }}
                decoding={isPriority ? "sync" : "async"}
                width={fallbackFile?.width || undefined}
                height={fallbackFile?.height || undefined}
                sx={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                }}
            />
        </Box>
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
    if (offsetPercent !== undefined) {
        return (
            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    transform: `translateX(${offsetPercent}%)`,
                    transition: `transform ${transitionDuration}ms ease-out`,
                }}
            >
                {imageElement}
            </Box>
        );
    }

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
