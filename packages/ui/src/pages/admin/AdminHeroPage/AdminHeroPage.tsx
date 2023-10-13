import { useMutation, useQuery } from "@apollo/client";
import { Box } from "@mui/material";
import { addImagesVariables, addImages_addImages } from "api/generated/addImages";
import { updateImagesVariables } from "api/generated/updateImages";
import { addImagesMutation, updateImagesMutation } from "api/mutation";
import { imagesByLabelQuery } from "api/query";
import { mutationWrapper } from "api/utils";
import { AdminTabOption, AdminTabs, Dropzone, WrappedImageList } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useCallback, useEffect, useState } from "react";

const helpText = "This page allows you to manage the images displayed in the Hero banner (what you see when you first visit the site).";

export const AdminHeroPage = () => {
    const [imageData, setImageData] = useState<any[]>([]);
    const { data: currImages, refetch: refetchImages } = useQuery(imagesByLabelQuery, { variables: { input: { label: "hero" } } });
    const [addImages] = useMutation(addImagesMutation);
    const [updateImages] = useMutation(updateImagesMutation);

    const uploadImages = useCallback((acceptedFiles: File[]) => {
        mutationWrapper<addImages_addImages, addImagesVariables>({
            mutation: addImages,
            input: { files: acceptedFiles, labels: ["hero"] },
            successMessage: () => `Successfully uploaded ${acceptedFiles.length} image(s).`,
            onSuccess: () => refetchImages(),
        });
    }, [addImages, refetchImages]);

    useEffect(() => {
        // Table data must be extensible, and needs position
        setImageData(currImages?.imagesByLabel?.map((d, index) => ({
            ...d,
            pos: index,
        })));
    }, [currImages]);

    const applyChanges = useCallback((changed) => {
        // Prepare data for request
        const data = changed.map(d => ({
            hash: d.hash,
            alt: d.alt,
            description: d.description,
        }));
        // Determine which files to mark as deleting
        const originals = imageData.map(d => d.hash);
        const finals = changed.map(d => d.hash);
        const deleting = originals.filter(s => !finals.includes(s));
        // Perform update
        mutationWrapper<any, updateImagesVariables>({
            mutation: updateImages,
            input: { data, deleting, label: "hero" },
            successMessage: () => "Successfully updated image(s).",
        });
    }, [imageData, updateImages]);

    return (
        <>
            <TopBar
                display="page"
                help={helpText}
                title="Hero"
                below={<AdminTabs defaultTab={AdminTabOption.Hero} />}
            />
            <Box p={2}>
                <Dropzone
                    dropzoneText={"Drag 'n' drop new images here or click"}
                    onUpload={uploadImages}
                    uploadText='Upload Images'
                />
                <h2 style={{ marginTop: "64px", marginBottom: "0px" }}>Reorder and delete images</h2>
                <WrappedImageList data={imageData} onApply={applyChanges} />
            </Box>
        </>
    );
};
