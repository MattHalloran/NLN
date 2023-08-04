import { Box, Button, Grid, useTheme } from "@mui/material";
import { SnackSeverity } from "components/dialogs";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { PubSub } from "utils";

interface DropzoneProps {
    acceptedFileTypes?: string[];
    dropzoneText?: string;
    onUpload: (files: File[]) => unknown;
    showThumbs?: boolean;
    maxFiles?: number;
    uploadText?: string;
    cancelText?: string;
    disabled?: boolean;
}

interface PreviewableFile extends File {
    preview: string;
}

export const Dropzone = ({
    acceptedFileTypes = ["image/*", ".heic", ".heif"],
    dropzoneText = "Drag 'n' drop files here or click",
    onUpload,
    showThumbs = true,
    maxFiles = 100,
    uploadText = "Upload file(s)",
    cancelText = "Cancel upload",
    disabled = false,
}: DropzoneProps) => {
    const { spacing } = useTheme();

    const [files, setFiles] = useState<PreviewableFile[]>([]);
    const { getRootProps, getInputProps } = useDropzone({
        accept: acceptedFileTypes,
        maxFiles,
        onDrop: acceptedFiles => {
            if (acceptedFiles.length <= 0) {
                PubSub.get().publishSnack({ message: "Files not accepted", severity: SnackSeverity.Error });
                return;
            }
            // Type annotate file as File
            setFiles(acceptedFiles.map((file: File) =>
                Object.assign(file, {
                    preview: URL.createObjectURL(file),
                }),
            ));
        },
    });

    const upload = (e) => {
        e.stopPropagation();
        if (files.length === 0) {
            PubSub.get().publishSnack({ message: "No files selected", severity: SnackSeverity.Error });
            return;
        }
        onUpload(files);
        setFiles([]);
    };

    const cancel = (e) => {
        e.stopPropagation();
        setFiles([]);
    };

    const thumbs = files.map(file => (
        <Box key={file.name} sx={{
            display: "inline-flex",
            marginBottom: 1,
            marginLeft: 1,
            width: 100,
            height: 100,
            boxSizing: "border-box",
        }}>
            <Box sx={{
                display: "flex",
                minWidth: 0,
                overflow: "hidden",
            }}>
                <Box
                    component="img"
                    src={file.preview}
                    alt="Dropzone preview"
                    sx={{
                        display: "block",
                        width: "auto",
                        height: "100%",
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
            background: "white",
            color: "black",
            border: "3px dashed gray",
            borderRadius: "5px",
        }}>
            <Box sx={{ textAlign: "center" }} {...getRootProps({ className: "dropzone" })}>
                <input {...getInputProps()} />
                <p>{dropzoneText}</p>
                {showThumbs &&
                    <Box component="aside" sx={{
                        display: "flex",
                        flexDirection: "row",
                        flexWrap: "wrap",
                        marginTop: files.length === 0 ? spacing(8) : 0,
                    }}>
                        {thumbs}
                    </Box>}
                <Grid container spacing={1} sx={{
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
};
