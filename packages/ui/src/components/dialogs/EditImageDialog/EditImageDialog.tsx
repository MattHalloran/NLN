import { useEffect, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    TextField,
    useTheme
} from '@mui/material';
import { DialogTitle } from '../DialogTitle/DialogTitle';

export const EditImageDialog = ({
    open,
    data,
    onClose,
    onSave,
}) => {
    const { palette } = useTheme();

    const [alt, setAlt] = useState('')
    const [description, setDescription] = useState('')

    useEffect(() => {
        setAlt(data?.alt ?? '');
        setDescription(data?.description ?? '');
    }, [data])

    return (
        <Dialog open={open} onClose={onClose} aria-labelledby="form-dialog-title">
            <DialogTitle id="form-dialog-title" title="Edit Image Data" />
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
                <Button onClick={onClose} variant="text" sx={{ color: palette.primary.main }}>
                    Cancel
                </Button>
                <Button onClick={() => onSave({ alt: alt, description: description })} variant="text" sx={{ color: palette.primary.main }}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}