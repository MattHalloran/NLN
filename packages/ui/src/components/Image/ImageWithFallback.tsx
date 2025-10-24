import { Box, CardMedia } from "@mui/material";
import { NoImageIcon } from "icons";
import { useState, SyntheticEvent } from "react";

interface ImageWithFallbackProps {
    src: string;
    alt: string;
    fallbackSrc?: string;
    showFallbackIcon?: boolean;
    sx?: any;
    style?: React.CSSProperties;
    onLoad?: () => void;
    onError?: () => void;
    onClick?: () => void;
    className?: string;
    component?: "img" | "div";
    loading?: "lazy" | "eager";
}

/**
 * Converts an image path to its WebP equivalent
 * Example: /images/foo-L.jpg -> /images/foo-L.webp
 */
function toWebP(src: string): string {
    return src.replace(/\.(jpg|jpeg|png|gif|bmp)$/i, ".webp");
}

/**
 * Image component with built-in fallback handling.
 * Shows NoImageIcon or a fallback image when the primary image fails to load.
 */
export const ImageWithFallback = ({
    src,
    alt,
    fallbackSrc,
    showFallbackIcon = true,
    sx = {},
    style = {},
    onLoad,
    onError,
    onClick,
    className,
    component = "img",
    loading = "lazy",
}: ImageWithFallbackProps) => {
    const [hasError, setHasError] = useState(false);
    const [fallbackError, setFallbackError] = useState(false);

    const handleError = (_e: SyntheticEvent<HTMLImageElement>) => {
        if (!hasError && fallbackSrc) {
            // Try fallback image first
            setHasError(true);
        } else {
            // If no fallback or fallback also failed, show icon
            setFallbackError(true);
        }
        onError?.();
    };

    const handleLoad = () => {
        onLoad?.();
    };

    // Show fallback icon if both primary and fallback images failed
    if ((hasError && !fallbackSrc) || fallbackError) {
        if (!showFallbackIcon) return null;

        return (
            <Box
                className={className}
                onClick={onClick}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "grey.100",
                    width: "100%",
                    height: "100%",
                    ...sx,
                }}
                style={style}
            >
                <NoImageIcon
                    style={{
                        width: "50%",
                        height: "50%",
                        maxWidth: "200px",
                        maxHeight: "200px",
                        opacity: 0.3,
                        fill: "#9e9e9e",
                    }}
                />
            </Box>
        );
    }

    const imageSrc = hasError && fallbackSrc ? fallbackSrc : src;
    const webpSrc = toWebP(imageSrc);

    if (component === "div") {
        return (
            <picture>
                <source srcSet={webpSrc} type="image/webp" />
                <CardMedia
                    component="img"
                    image={imageSrc}
                    alt={alt}
                    className={className}
                    onClick={onClick}
                    onError={handleError}
                    onLoad={handleLoad}
                    sx={sx}
                    style={style}
                    loading={loading}
                />
            </picture>
        );
    }

    return (
        <picture onClick={onClick} className={className}>
            <source srcSet={webpSrc} type="image/webp" />
            <img
                src={imageSrc}
                alt={alt}
                onError={handleError}
                onLoad={handleLoad}
                loading={loading}
                style={{
                    width: "100%",
                    height: "auto",
                    objectFit: "cover",
                    ...style,
                }}
            />
        </picture>
    );
};
