import { Button, Dialog, DialogActions, DialogContent, TextField, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { DialogTitle } from "../DialogTitle/DialogTitle";

const titleAria = "edit-image-dialog-title";

export const EditImageDialog = ({
    open,
    data,
    onClose,
    onSave,
}) => {
    const { palette } = useTheme();

    const [alt, setAlt] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        setAlt(data?.alt ?? "");
        setDescription(data?.description ?? "");
    }, [data]);

    return (
        <Dialog open={open} onClose={onClose} aria-labelledby={titleAria}>
            <DialogTitle ariaLabel={titleAria} title="Edit Image Data" onClose={onClose} />
            <DialogContent>
                <TextField
                    fullWidth
                    variant="filled"
                    label="Alt"
                    value={alt}
                    onChange={e => setAlt(e.target.value)}
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
                    onClick={onClose}
                    variant="text"
                    sx={{ color: palette.primary.main }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => onSave({ alt, description })}
                    variant="text"
                    sx={{ color: palette.primary.main }}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};
