import { Box } from "@mui/material";
import { memo } from "react";
import { getImageSrc, getServerUrl } from "utils";

export const Slide = memo<any>(({ image, width }) => {
    if (!image) return null;
    return (
        // Make sure image fills full height of slider
        <Box sx={{
            width: `${width}px`,
            height: "100%",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundImage: `url(${getServerUrl()}/${getImageSrc(image, width)})`,
        }} />
    );
});
