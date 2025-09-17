import { Dialog, List, ListItem, ListItemText, useTheme } from "@mui/material";
import { DialogTitle } from "../DialogTitle/DialogTitle";
import { ListDialogProps } from "../types";

export const ListDialog = ({
    open = true,
    onClose,
    title = "Select Item",
    data,
    ...props
}: ListDialogProps) => {
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
            <DialogTitle id="simple-dialog-title" title={title} onClose={onClose} />
            <List>
                {data?.map(([label, value]: [string, string], index: number) => (
                    <ListItem button onClick={() => onClose(value)} key={index}>
                        <ListItemText primary={label} />
                    </ListItem>
                ))}
            </List>
        </Dialog>
    );
};
