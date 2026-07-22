import { APP_LINKS, IMAGE_LABELS } from "@local/shared";
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
} from "@mui/material";
import {
    useImagesByLabel,
    useAddImages,
    useUpdateImages,
    useRemoveImageLabel,
} from "api/rest/hooks";
import { BackButton, Dropzone, PageContainer, SnackSeverity, WrappedImageList } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useCallback, useMemo, useState } from "react";
import { pagePaddingBottom } from "styles";
import { PubSub } from "utils";
import { ImageInfo } from "types";

const helpText = "This page allows you to manage the images displayed on the gallery page";

export const AdminGalleryPage = () => {
    const { data: currImages, refetch: refetchImages } = useImagesByLabel(IMAGE_LABELS.Gallery);
    const { mutate: addImages } = useAddImages();
    const { mutate: updateImages } = useUpdateImages();
    const { mutate: removeImageLabel } = useRemoveImageLabel();
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        imageHash?: string;
        imageAlt?: string;
    }>({ open: false });

    // Derive imageData from currImages using useMemo instead of useEffect + useState
    // Convert Image[] to ImageInfo[] format expected by WrappedImageList
    const imageData: ImageInfo[] = useMemo(() => {
        if (!currImages) return [];
        return currImages.map((image, index) => ({
            index,
            image,
        }));
    }, [currImages]);

    const uploadImages = useCallback(
        async (acceptedFiles: File[]) => {
            try {
                await addImages({ label: IMAGE_LABELS.Gallery, files: acceptedFiles });
                PubSub.get().publishSnack({
                    message: `Successfully uploaded ${acceptedFiles.length} image(s).`,
                    severity: SnackSeverity.Success,
                });
                void refetchImages();
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Failed to upload images";
                PubSub.get().publishSnack({
                    message: errorMessage,
                    severity: SnackSeverity.Error,
                });
            }
        },
        [addImages, refetchImages],
    );

    const applyChanges = useCallback(
        async (changed: ImageInfo[]) => {
            try {
                // Prepare data for request - map changed items to the format expected by REST API
                const images = changed.map((d) => ({
                    hash: d.image.hash,
                    alt: d.image.alt ?? undefined,
                    description: d.image.description ?? undefined,
                    label: IMAGE_LABELS.Gallery,
                }));
                await updateImages({ images });
                PubSub.get().publishSnack({
                    message: "Successfully updated image(s).",
                    severity: SnackSeverity.Success,
                });
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Failed to update images";
                PubSub.get().publishSnack({
                    message: errorMessage,
                    severity: SnackSeverity.Error,
                });
            }
        },
        [updateImages],
    );

    const handleDeleteRequest = useCallback((imageHash: string, imageAlt?: string) => {
        setDeleteDialog({
            open: true,
            imageHash,
            imageAlt: imageAlt || "this image",
        });
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteDialog.imageHash) return;

        try {
            const result = await removeImageLabel({
                hash: deleteDialog.imageHash,
                label: IMAGE_LABELS.Gallery,
            });

            if (result.success) {
                PubSub.get().publishSnack({
                    message: result.message || "Removed image from gallery",
                    severity: SnackSeverity.Success,
                });
                void refetchImages();
            } else {
                PubSub.get().publishSnack({
                    message: "Failed to remove image from gallery",
                    severity: SnackSeverity.Error,
                });
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Failed to remove image from gallery";
            PubSub.get().publishSnack({
                message: errorMessage,
                severity: SnackSeverity.Error,
            });
        } finally {
            setDeleteDialog({ open: false });
        }
    }, [deleteDialog.imageHash, removeImageLabel, refetchImages]);

    const handleDeleteCancel = useCallback(() => {
        setDeleteDialog({ open: false });
    }, []);

    return (
        <PageContainer sx={{ minHeight: "100vh", paddingBottom: 0 }}>
            <TopBar
                display="page"
                help={helpText}
                title="Gallery"
                startComponent={
                    <BackButton to={APP_LINKS.Admin} ariaLabel="Back to Admin Dashboard" />
                }
            />
            <Box p={2}>
                <Dropzone
                    dropzoneText={"Drag 'n' drop new images here or click"}
                    onUpload={uploadImages}
                    uploadText="Upload Images"
                    sxs={{ root: { maxWidth: "min(100%, 700px)", margin: "auto" } }}
                />
                <h2 style={{ marginTop: "64px", marginBottom: "0px" }}>
                    Reorder and delete images
                </h2>
                <WrappedImageList
                    data={imageData}
                    onApply={applyChanges}
                    onDelete={(imageInfo) =>
                        handleDeleteRequest(imageInfo.image.hash, imageInfo.image.alt || undefined)
                    }
                    sxs={{ imageList: { paddingBottom: pagePaddingBottom } }}
                />
            </Box>

            {/* Remove From Gallery Confirmation Dialog */}
            <Dialog open={deleteDialog.open} onClose={handleDeleteCancel}>
                <DialogTitle>Remove From Gallery?</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        Are you sure you want to remove "{deleteDialog.imageAlt}" from the gallery?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        The image asset will remain available anywhere else it is used.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteCancel}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        Remove
                    </Button>
                </DialogActions>
            </Dialog>
        </PageContainer>
    );
};
