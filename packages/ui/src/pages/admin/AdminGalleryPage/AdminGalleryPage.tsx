import { APP_LINKS } from "@local/shared";
import { Box } from "@mui/material";
import { useImagesByLabel, useAddImages, useUpdateImages } from "api/rest/hooks";
import { BackButton, Dropzone, PageContainer, SnackSeverity, WrappedImageList } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useCallback, useMemo } from "react";
import { pagePaddingBottom } from "styles";
import { PubSub } from "utils";
import { ImageInfo } from "types";

const helpText = "This page allows you to manage the images displayed on the gallery page";

export const AdminGalleryPage = () => {
    const { data: currImages, refetch: refetchImages } = useImagesByLabel("gallery");
    const { mutate: addImages } = useAddImages();
    const { mutate: updateImages } = useUpdateImages();

    // Derive imageData from currImages using useMemo instead of useEffect + useState
    // Convert Image[] to ImageInfo[] format expected by WrappedImageList
    const imageData: ImageInfo[] = useMemo(() => {
        if (!currImages) return [];
        return currImages.map((image, index) => ({
            index,
            image,
        }));
    }, [currImages]);

    const uploadImages = useCallback(async (acceptedFiles: File[]) => {
        try {
            await addImages({ label: "gallery", files: acceptedFiles });
            PubSub.get().publishSnack({
                message: `Successfully uploaded ${acceptedFiles.length} image(s).`,
                severity: SnackSeverity.Success,
            });
            refetchImages();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to upload images";
            PubSub.get().publishSnack({
                message: errorMessage,
                severity: SnackSeverity.Error,
            });
        }
    }, [addImages, refetchImages]);

    const applyChanges = useCallback(async (changed: ImageInfo[]) => {
        try {
            // Prepare data for request - map changed items to the format expected by REST API
            const images = changed.map((d) => ({
                hash: d.image.hash,
                alt: d.image.alt ?? undefined,
                description: d.image.description ?? undefined,
                label: "gallery",
            }));
            await updateImages({ images });
            PubSub.get().publishSnack({
                message: "Successfully updated image(s).",
                severity: SnackSeverity.Success,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to update images";
            PubSub.get().publishSnack({
                message: errorMessage,
                severity: SnackSeverity.Error,
            });
        }
    }, [updateImages]);

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                help={helpText}
                title="Gallery"
                startComponent={<BackButton to={APP_LINKS.Admin} ariaLabel="Back to Admin Dashboard" />}
            />
            <Box p={2}>
                <Dropzone
                    dropzoneText={"Drag 'n' drop new images here or click"}
                    onUpload={uploadImages}
                    uploadText='Upload Images'
                    sxs={{ root: { maxWidth: "min(100%, 700px)", margin: "auto" } }}
                />
                <h2 style={{ marginTop: "64px", marginBottom: "0px" }}>Reorder and delete images</h2>
                <WrappedImageList data={imageData} onApply={applyChanges} sxs={{ imageList: { paddingBottom: pagePaddingBottom } }} />
            </Box>
        </PageContainer>
    );
};
