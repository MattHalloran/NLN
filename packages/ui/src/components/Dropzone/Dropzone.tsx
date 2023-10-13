import { Box, Button, Grid, SxProps, Typography, useTheme } from "@mui/material";
import SpreadsheetFallback from "assets/img/spreadsheet-fallback.png";
import { SnackSeverity } from "components/dialogs";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { PubSub } from "utils";

interface DropzoneProps {
    acceptedFileTypes?: string[];
    autoUpload?: boolean;
    dropzoneText?: string;
    onUpload: (files: File[]) => unknown;
    showThumbs?: boolean;
    maxFiles?: number;
    uploadText?: string;
    cancelText?: string;
    disabled?: boolean;
    sx?: SxProps;
}

interface PreviewableFile extends File {
    preview: string;
}

export const Dropzone = ({
    acceptedFileTypes = ["image/*", ".heic", ".heif"],
    autoUpload = false,
    dropzoneText = "Drag 'n' drop files here or click",
    onUpload,
    showThumbs = true,
    maxFiles = 100,
    uploadText = "Upload file(s)",
    cancelText = "Cancel",
    disabled = false,
    sx,
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
            setFiles(acceptedFiles.map((file: File) => {
                // Set custom image preview for spreadsheet files
                const isSpreadsheet = [".xlsx", ".xls", ".ods"].some(ext => file.name.endsWith(ext));
                const preview = isSpreadsheet ? SpreadsheetFallback : URL.createObjectURL(file);
                // Otherwise, use default preview
                return Object.assign(file, { preview });
            }));
            // If autoUpload is true, automatically upload the files
            if (autoUpload) {
                onUpload(acceptedFiles);
                setFiles([]);
            }
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

    const thumbs = files.map(file => {
        const isSpreadsheet = [".xlsx", ".xls", ".ods"].some(ext => file.name.endsWith(ext));
        return (
            <Box key={file.name} sx={{
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: 1,
                marginLeft: 1,
                width: 100,
                height: 100,
                boxSizing: "border-box",
                ...sx,
            }}>
                <Box sx={{
                    display: "flex",
                    minWidth: 0,
                    overflow: "hidden",
                }}>
                    <Box
                        component="img"
                        src={file.preview}
                        alt={file.name}
                        sx={{
                            display: "block",
                            width: "auto",
                            height: "100%",
                        }} />
                </Box>
                {isSpreadsheet && (
                    <Typography variant="body2" sx={{
                        marginTop: 1,
                        overflowWrap: "anywhere",
                    }}>{file.name}</Typography>
                )}
            </Box>
        );
    });

    useEffect(() => () => {
        // Make sure to revoke the data uris to avoid memory leaks, except for the spreadsheet preview
        files.forEach(file => {
            if (!file.preview.endsWith("spreadsheet-fallback.png")) {
                URL.revokeObjectURL(file.preview);
            }
        });
    }, [files]);

    return (
        <Box component="section" sx={{
            background: "white",
            color: "black",
            border: "3px dashed gray",
            borderRadius: "5px",
        }}>
            <Box sx={{ textAlign: "center", cursor: "pointer" }} {...getRootProps({ className: "dropzone" })}>
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
                {!autoUpload && <Grid container spacing={1} sx={{
                    paddingLeft: spacing(1),
                    paddingRight: spacing(1),
                }}>
                    <Grid item xs={6}>
                        <Button
                            disabled={disabled || files.length === 0}
                            fullWidth
                            onClick={upload}
                            sx={{
                                marginTop: spacing(1),
                                marginBottom: spacing(1),
                            }}
                            variant="contained"
                        >{uploadText}</Button>
                    </Grid>
                    <Grid item xs={6}>
                        <Button
                            disabled={disabled || files.length === 0}
                            fullWidth
                            onClick={cancel}
                            sx={{
                                marginTop: spacing(1),
                                marginBottom: spacing(1),
                            }}
                            variant="contained"
                        >{cancelText}</Button>
                    </Grid>
                </Grid>}
            </Box>
        </Box>
    );
};
