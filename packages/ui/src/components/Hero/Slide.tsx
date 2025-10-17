import { Box } from "@mui/material";
import { memo } from "react";
import { Image } from "types";
import { getImageSrc, getServerUrl } from "utils";

interface SlideProps {
    image: Image;
    width: number;
}

export const Slide = memo<SlideProps>(({ image, width }) => {
    if (!image) return null;
    return (
        // Make sure image fills full height of slider
        <Box sx={{
            width: `${width}px`,
            height: "100%",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundImage: `url(${getServerUrl()}${getImageSrc(image, width)})`,
        }} />
    );
});
