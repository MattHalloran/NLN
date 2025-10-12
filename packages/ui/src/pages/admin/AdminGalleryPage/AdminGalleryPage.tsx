import { Box } from "@mui/material";
import { useImagesByLabel, useAddImages, useUpdateImages } from "api/rest/hooks";
import { AdminTabOption, AdminTabs, Dropzone, PageContainer, SnackSeverity, WrappedImageList } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useCallback, useEffect, useState } from "react";
import { pagePaddingBottom } from "styles";
import { PubSub } from "utils";

const helpText = "This page allows you to manage the images displayed on the gallery page";

export const AdminGalleryPage = () => {
    const [imageData, setImageData] = useState<any[]>([]);
    const { data: currImages, refetch: refetchImages } = useImagesByLabel("gallery");
    const { mutate: addImages } = useAddImages();
    const { mutate: updateImages } = useUpdateImages();

    const uploadImages = useCallback(async (acceptedFiles: File[]) => {
        try {
            await addImages({ label: "gallery", files: acceptedFiles });
            PubSub.get().publishSnack({
                message: `Successfully uploaded ${acceptedFiles.length} image(s).`,
                severity: SnackSeverity.Success
            });
            refetchImages();
        } catch (error: any) {
            PubSub.get().publishSnack({
                message: error?.message || "Failed to upload images",
                severity: SnackSeverity.Error
            });
        }
    }, [addImages, refetchImages]);

    useEffect(() => {
        // Table data must be extensible, and needs position
        setImageData(currImages?.map((d: any, index: number) => ({
            ...d,
            pos: index,
        })) || []);
    }, [currImages]);

    const applyChanges = useCallback(async (changed: any[]) => {
        try {
            // Prepare data for request - map changed items to the format expected by REST API
            const images = changed.map((d: any) => ({
                hash: d.hash,
                alt: d.alt,
                description: d.description,
                label: "gallery"
            }));
            await updateImages({ images });
            PubSub.get().publishSnack({
                message: "Successfully updated image(s).",
                severity: SnackSeverity.Success
            });
        } catch (error: any) {
            PubSub.get().publishSnack({
                message: error?.message || "Failed to update images",
                severity: SnackSeverity.Error
            });
        }
    }, [updateImages]);

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                help={helpText}
                title="Gallery"
                below={<AdminTabs defaultTab={AdminTabOption.Gallery} />}
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
