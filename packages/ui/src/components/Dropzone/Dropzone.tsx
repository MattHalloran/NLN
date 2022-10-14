import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { PubSub } from 'utils';
import { Box, Button, Grid, useTheme } from '@mui/material';
import { SnackSeverity } from 'components/dialogs';

export const Dropzone = ({
    acceptedFileTypes = ['image/*', '.heic', '.heif'],
    dropzoneText = 'Drag \'n\' drop files here or click',
    onUpload,
    showThumbs = true,
    maxFiles = 100,
    uploadText = 'Upload file(s)',
    cancelText = 'Cancel upload',
    disabled = false
}) => {
    const { spacing } = useTheme();

    const [files, setFiles] = useState<any[]>([]);
    const { getRootProps, getInputProps } = useDropzone({
        accept: acceptedFileTypes,
        maxFiles: maxFiles,
        onDrop: acceptedFiles => {
            if (acceptedFiles.length <= 0) {
                PubSub.get().publishSnack({ message: 'Files not accepted', severity: SnackSeverity.Error });
                return;
            }
            setFiles(acceptedFiles.map(file => Object.assign(file, {
                preview: URL.createObjectURL(file)
            })));
        }
    });

    const upload = (e) => {
        e.stopPropagation();
        if (files.length === 0) {
            PubSub.get().publishSnack({ message: 'No files selected', severity: SnackSeverity.Error });
            return;
        }
        onUpload(files);
        setFiles([]);
    }

    const cancel = (e) => {
        e.stopPropagation();
        setFiles([]);
    }

    const thumbs = files.map(file => (
        <Box key={file.name} sx={{
            display: 'inline-flex',
            borderRadius: 2,
            border: '1px solid #eaeaea',
            marginBottom: 8,
            marginRight: 8,
            width: 100,
            height: 100,
            padding: 4,
            boxSizing: 'border-box'
        }}>
            <Box sx={{
                display: 'flex',
                minWidth: 0,
                overflow: 'hidden'
            }}>
                <Box
                    component="img"
                    src={file.preview}
                    alt="Dropzone preview"
                    sx={{
                        display: 'block',
                        width: 'auto',
                        height: '100%'
                    }} />
            </Box>
        </Box>
    ));

    useEffect(() => () => {
        // Make sure to revoke the data uris to avoid memory leaks
        files.forEach(file => URL.revokeObjectURL(file.preview));
    }, [files]);

    return (
        <Box component="section" sx={{
            background: 'white',
            color: 'black',
            border: '3px dashed gray',
            borderRadius: '5px'
        }}>
            <Box sx={{ textAlign: 'center' }} {...getRootProps({ className: 'dropzone' })}>
                <input {...getInputProps()} />
                <p>{dropzoneText}</p>
                {showThumbs &&
                    <Box component="aside" sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        marginTop: 16
                    }}>
                        {thumbs}
                    </Box>}
                <Grid container spacing={2} sx={{
                    paddingLeft: spacing(1),
                    paddingRight: spacing(1),
                }}>
                    <Grid item xs={12} sm={6}>
                        <Button
                            disabled={disabled || files.length === 0}
                            fullWidth
                            onClick={upload}
                            sx={{
                                marginTop: spacing(1),
                                marginBottom: spacing(1),
                            }}
                        >{uploadText}</Button>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Button
                            disabled={disabled || files.length === 0}
                            fullWidth
                            onClick={cancel}
                            sx={{
                                marginTop: spacing(1),
                                marginBottom: spacing(1),
                            }}
                        >{cancelText}</Button>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
}