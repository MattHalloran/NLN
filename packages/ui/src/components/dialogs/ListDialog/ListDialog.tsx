import {
    Dialog,
    List,
    ListItem,
    ListItemText,
    useTheme
} from '@mui/material';
import { DialogTitle } from '../DialogTitle/DialogTitle';

 makeStyles((theme) => ({
    root: {
        background: palette.background.paper,
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
            <DialogTitle id="simple-dialog-title" title={title} />
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