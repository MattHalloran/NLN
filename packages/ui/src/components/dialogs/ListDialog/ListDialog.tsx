import React from 'react';
import {
    Dialog,
    DialogTitle,
    List,
    ListItem,
    ListItemText,
    useTheme
} from '@mui/material';

 makeStyles((theme) => ({
    root: {
        background: palette.background.paper,
    },
    title: {
        background: palette.primary.dark,
        color: palette.primary.contrastText,
    },
}));

export const ListDialog = ({
    open = true,
    onClose,
    title = 'Select Item',
    data,
    ...props
}) => {
    const { palette } = useTheme();

    return (
        <Dialog
            PaperProps={{
                className: classes.root,
            }}
            onClose={() => onClose()}
            aria-labelledby="simple-dialog-title"
            open={open}
            {...props}>
            <DialogTitle className={classes.title} id="simple-dialog-title">{title}</DialogTitle>
            <List>
                {data?.map(([label, value], index) => (
                    <ListItem button onClick={() => onClose(value)} key={index}>
                        <ListItemText primary={label} />
                    </ListItem>
                ))}
            </List>
        </Dialog>
    );
}