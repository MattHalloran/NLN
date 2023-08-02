import { useMutation, useQuery } from "@apollo/client";
import { useTheme } from "@mui/material";
import {
    AdminBreadcrumbs,
    Dropzone,
    PageContainer,
    PageTitle,
    WrappedImageList,
} from "components";
import { addImagesVariables, addImages_addImages } from "graphql/generated/addImages";
import { updateImagesVariables } from "graphql/generated/updateImages";
import { addImagesMutation, updateImagesMutation } from "graphql/mutation";
import { imagesByLabelQuery } from "graphql/query";
import { mutationWrapper } from "graphql/utils";
import { useCallback, useEffect, useState } from "react";

const helpText = "This page allows you to manage the images displayed on the gallery page";

export const AdminGalleryPage = () => {
    const { palette } = useTheme();

    const [imageData, setImageData] = useState<any[]>([]);
    const { data: currImages, refetch: refetchImages } = useQuery(imagesByLabelQuery, { variables: { input: { label: "gallery" } } });
    const [addImages] = useMutation(addImagesMutation);
    const [updateImages] = useMutation(updateImagesMutation);

    const uploadImages = (acceptedFiles) => {
        mutationWrapper<addImages_addImages[], addImagesVariables>({
            mutation: addImages,
            input: { files: acceptedFiles, labels: ["gallery"] },
            successMessage: () => `Successfully uploaded ${acceptedFiles.length} image(s).`,
            onSuccess: () => refetchImages(),
        });
    };

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
            input: { data, deleting, label: "gallery" },
            successMessage: () => "Successfully updated image(s).",
        });
    }, [imageData, updateImages]);

    return (
        <PageContainer>
            <AdminBreadcrumbs textColor={palette.secondary.dark} helpText={helpText} />
            <PageTitle title="Manage Gallery" helpText={helpText} />
            <Dropzone
                dropzoneText={"Drag 'n' drop new images here or click"}
                onUpload={uploadImages}
                uploadText='Upload Images'
            />
            <h2>Reorder and delete images</h2>
            <WrappedImageList data={imageData} onApply={applyChanges} />
        </PageContainer>
    );
};
