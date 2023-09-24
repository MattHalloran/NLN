import { useQuery } from "@apollo/client";
import { IMAGE_SIZE } from "@local/shared";
import { Box } from "@mui/material";
import { imagesByLabelQuery } from "api/query";
import { CardGrid, SnackSeverity } from "components";
import { InformationalTabOption, InformationalTabs } from "components/breadcrumbs/InformationalTabs/InformationalTabs";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useEffect, useState } from "react";
import { PubSub, getImageSrc, getServerUrl } from "utils";

type ImageData = {
    alt: string;
    src: string;
    thumbnail: string;
}

export const GalleryPage = () => {
    const [images, setImages] = useState<ImageData[]>([]);
    const { data: imageData, error } = useQuery(imagesByLabelQuery, { variables: { input: { label: "gallery" } } });

    if (error) PubSub.get().publishSnack({ message: error.message ?? "Unknown error occurred", severity: SnackSeverity.Error, data: error });

    useEffect(() => {
        if (!Array.isArray(imageData?.imagesByLabel)) {
            setImages([]);
            return;
        }
        setImages(imageData.imagesByLabel.map((data) => ({
            alt: data.alt,
            src: `${getServerUrl()}/${getImageSrc(data)}`,
            thumbnail: `${getServerUrl()}/${getImageSrc(data, IMAGE_SIZE.M)}`,
        })));
    }, [imageData]);

    return (
        <>
            <TopBar
                display="page"
                title="Gallery"
                below={<InformationalTabs defaultTab={InformationalTabOption.Gallery} />}
            />
            {/* Image grid */}
            <CardGrid minWidth={300}>
                {/* Individual images */}
                {images.map((image, index) => (
                    <Box
                        key={index}
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            width: "100%",
                            height: "100%",
                            backgroundColor: "rgba(0, 0, 0, 0.1)",
                        }}
                    >
                        <img
                            src={image.src}
                            alt={image.alt}
                            style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                            }}
                        />
                    </Box>
                ))}
            </CardGrid>
        </>
    );
};
