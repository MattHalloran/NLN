import {
    Dialog,
    List,
    ListItem,
    ListItemText,
    useTheme,
} from "@mui/material";
import { DialogTitle } from "../DialogTitle/DialogTitle";

export const ListDialog = ({
    open = true,
    onClose,
    title = "Select Item",
    data,
    ...props
}) => {
    const { palette } = useTheme();

    return (
        <Dialog
            onClose={() => onClose()}
            aria-labelledby="simple-dialog-title"
            open={open}
            {...props}
            sx={{
                "& .MuiDialogContent-root": {
                    background: palette.background.paper,
                },
            }}
        >
            <DialogTitle ariaLabel="simple-dialog-title" title={title} onClose={onClose} />
            <List>
                {data?.map(([label, value], index) => (
                    <ListItem button onClick={() => onClose(value)} key={index}>
                        <ListItemText primary={label} />
                    </ListItem>
                ))}
            </List>
        </Dialog>
    );
};
