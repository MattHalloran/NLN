import { Button, Dialog, DialogActions, DialogContent, TextField, useTheme } from "@mui/material";
import { CancelIcon, SaveIcon } from "icons";
import { useEffect, useRef, useState } from "react";
import { ImageInfo } from "types";
import { DialogTitle } from "../DialogTitle/DialogTitle";

export const EditImageDialog = ({
    open,
    data,
    onClose,
    onSave,
}: {
    open: boolean;
    data: ImageInfo | null;
    onClose: () => unknown;
    onSave: (data: ImageInfo) => unknown;
}) => {
    const { palette: _palette } = useTheme();

    const [alt, setAlt] = useState("");
    const [description, setDescription] = useState("");
    const prevDataRef = useRef<ImageInfo | null>(null);

    useEffect(() => {
        // Only update state if data actually changed
        if (data !== prevDataRef.current) {
            setAlt(data?.image?.alt ?? "");
            setDescription(data?.image?.description ?? "");
            prevDataRef.current = data;
        }
    }, [data]);

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle id="edit-image-title" title="Edit Image Data" onClose={onClose} />
            <DialogContent>
                <TextField
                    fullWidth
                    variant="filled"
                    label="Alt"
                    value={alt}
                    onChange={e => setAlt(e.target.value)}
                    sx={{ marginBottom: 2 }}
                />
                <TextField
                    fullWidth
                    variant="filled"
                    label="Description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => data && onSave({ ...data, image: { ...data.image, alt, description } })}
                    startIcon={<SaveIcon />}
                    variant="contained"
                >
                    Save
                </Button>
                <Button
                    onClick={onClose}
                    startIcon={<CancelIcon />}
                    variant="outlined"
                >
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
};
