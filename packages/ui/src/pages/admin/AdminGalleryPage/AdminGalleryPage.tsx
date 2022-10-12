import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@mui/material';
import { imagesByLabelQuery } from 'graphql/query';
import { addImagesMutation, updateImagesMutation } from 'graphql/mutation';
import { useQuery, useMutation } from '@apollo/client';
import {
    AdminBreadcrumbs,
    Dropzone,
    PageContainer,
    PageTitle,
    WrappedImageList
} from 'components';
import { mutationWrapper } from 'graphql/utils';
import { addImagesVariables, addImages_addImages } from 'graphql/generated/addImages';

export const AdminGalleryPage = () => {
    const { palette } = useTheme();

    const [imageData, setImageData] = useState([]);
    const { data: currImages, refetch: refetchImages } = useQuery(imagesByLabelQuery, { variables: { label: 'gallery' } });
    const [addImages] = useMutation(addImagesMutation);
    const [updateImages] = useMutation(updateImagesMutation);

    const uploadImages = (acceptedFiles) => {
        mutationWrapper<addImages_addImages[], addImagesVariables>({
            mutation: addImages,
            input: { files: acceptedFiles, labels: ['gallery'] },
            successMessage: () => `Successfully uploaded ${acceptedFiles.length} image(s).`,
            onSuccess: () => refetchImages(),
        })
    }

    useEffect(() => {
        // Table data must be extensible, and needs position
        setImageData(currImages?.imagesByLabel?.map((d, index) => ({
            ...d,
            pos: index
        })));
    }, [currImages])

    const applyChanges = useCallback((changed) => {
        // Prepare data for request
        const data = changed.map(d => ({
            hash: d.hash,
            alt: d.alt,
            description: d.description
        }));
        // Determine which files to mark as deleting
        const originals = imageData.map(d => d.hash);
        const finals = changed.map(d => d.hash);
        const deleting = originals.filter(s => !finals.includes(s));
        // Perform update
        mutationWrapper<any, updateImagesVariables>({
            mutation: updateImages,
            input: { data, deleting, label: 'gallery' },
            successMessage: () => 'Successfully updated image(s).',
        })
    }, [imageData, updateImages])

    return (
        <PageContainer>
            <AdminBreadcrumbs textColor={palette.secondary.dark} />
            <PageTitle title="Manage Gallery" />
            <Dropzone
                dropzoneText={'Drag \'n\' drop new images here or click'}
                onUpload={uploadImages}
                uploadText='Upload Images'
            />
            <h2>Reorder and delete images</h2>
            <WrappedImageList data={imageData} onApply={applyChanges} />
        </PageContainer>
    );
}