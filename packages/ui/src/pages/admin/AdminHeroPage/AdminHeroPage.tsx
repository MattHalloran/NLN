import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { imagesByLabelQuery } from 'graphql/query';
import { addImagesMutation, updateImagesMutation } from 'graphql/mutation';
import { useQuery, useMutation } from '@apollo/client';
import {
    AdminBreadcrumbs,
    Dropzone,
    WrappedImageList
} from 'components';

export const AdminHeroPage = () => {
    const { palette } = useTheme();

    const [imageData, setImageData] = useState([]);
    const { data: currImages, refetch: refetchImages } = useQuery(imagesByLabelQuery, { variables: { label: 'hero' } });
    const [addImages] = useMutation(addImagesMutation);
    const [updateImages] = useMutation(updateImagesMutation);

    const uploadImages = (acceptedFiles) => {
        mutationWrapper({
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
        mutationWrapper({
            mutation: updateImages,
            data: { variables: { data, deleting, label: 'hero' } },
            successMessage: () => 'Successfully updated image(s).',
        })
    }, [imageData, updateImages])

    return (
        <PageContainer>
            <AdminBreadcrumbs textColor={palette.secondary.dark} />
            <Box className={classes.header}>
                <Typography variant="h3" component="h1">Manage Hero</Typography>
            </Box>
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