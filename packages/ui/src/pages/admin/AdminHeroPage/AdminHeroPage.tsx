import { useCallback, useEffect, useState } from 'react';
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
import { useTheme } from '@mui/material';
import { mutationWrapper } from 'graphql/utils';
import { addImagesVariables, addImages_addImages } from 'graphql/generated/addImages';
import { updateImagesVariables } from 'graphql/generated/updateImages';

const helpText = `This page allows you to manage the images displayed in the Hero banner (what you see when you first visit the site).`

export const AdminHeroPage = () => {
    const { palette } = useTheme();

    const [imageData, setImageData] = useState<any[]>([]);
    const { data: currImages, refetch: refetchImages } = useQuery(imagesByLabelQuery, { variables: { input: { label: 'hero' } } });
    const [addImages] = useMutation(addImagesMutation);
    const [updateImages] = useMutation(updateImagesMutation);

    const uploadImages = (acceptedFiles) => {
        mutationWrapper<addImages_addImages, addImagesVariables>({
            mutation: addImages,
            input: { files: acceptedFiles, labels: ['hero'] },
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
            input: { data, deleting, label: 'hero' },
            successMessage: () => 'Successfully updated image(s).',
        })
    }, [imageData, updateImages])

    return (
        <PageContainer>
            <AdminBreadcrumbs textColor={palette.secondary.dark} />
            <PageTitle title="Manage Hero" helpText={helpText} />
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