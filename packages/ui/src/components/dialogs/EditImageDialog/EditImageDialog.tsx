import React from 'react';
import { useEffect, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField
} from '@mui/material';

const useStyles = makeStyles((theme) => ({
    title: {
        background: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
    },
    button: {
        color: theme.palette.primary.main,
    }
}));

export const EditImageDialog = ({
    open,
    data,
    onClose,
    onSave,
}) => {
    const classes = useStyles();
    const [alt, setAlt] = useState('')
    const [description, setDescription] = useState('')

    useEffect(() => {
        setAlt(data?.alt ?? '');
        setDescription(data?.description ?? '');
    }, [data])

    return (
        <Dialog open={open} onClose={onClose} aria-labelledby="form-dialog-title">
            <DialogTitle className={classes.title} id="form-dialog-title">Edit Image Data</DialogTitle>
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
                <Button className={classes.button} onClick={onClose} variant="text">
                    Cancel
                </Button>
                <Button className={classes.button} onClick={() => onSave({ alt: alt, description: description })} variant="text">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}