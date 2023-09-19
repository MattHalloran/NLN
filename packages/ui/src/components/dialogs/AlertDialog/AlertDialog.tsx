import { Button, Dialog, DialogActions, DialogContent, DialogContentText } from "@mui/material";
import { DialogTitle } from "components";
import { useCallback, useEffect, useState } from "react";
import { PubSub, firstString } from "utils";

interface StateButton {
    text: string;
    onClick?: (() => void);
}

export interface AlertDialogState {
    title?: string;
    message?: string;
    buttons: StateButton[];
}

const default_state: AlertDialogState = {
    buttons: [{ text: "Ok" }],
};

const descriptionAria = "alert-dialog-description";

export const AlertDialog = () => {
    const [state, setState] = useState<AlertDialogState>(default_state);
    const open = Boolean(state.title) || Boolean(state.message);

    useEffect(() => {
        const dialogSub = PubSub.get().subscribeAlertDialog((o) => setState({ ...default_state, ...o }));
        return () => { PubSub.get().unsubscribe(dialogSub); };
    }, []);

    const handleClick = useCallback((event: any, action: ((e?: any) => void) | null | undefined) => {
        if (action) action(event);
        setState(default_state);
    }, []);

    const resetState = useCallback(() => setState(default_state), []);

    return (
        <Dialog
            open={open}
            disableScrollLock={true}
            onClose={resetState}
            aria-describedby={descriptionAria}
        >
            <DialogTitle
                id="alert-dialog-title"
                title={firstString(state.title)}
                onClose={resetState}
            />
            <DialogContent>
                <DialogContentText id={descriptionAria} sx={{
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    paddingTop: 2,
                }}>
                    {state.message}
                </DialogContentText>
            </DialogContent>
            {/* Actions */}
            <DialogActions>
                {state?.buttons && state.buttons.length > 0 ? (
                    state.buttons.map((b: StateButton, index) => (
                        <Button
                            key={`alert-button-${index}`}
                            onClick={(e) => handleClick(e, b.onClick)}
                            color="secondary"
                            variant="text"
                        >
                            {b.text}
                        </Button>
                    ))
                ) : null}
            </DialogActions>
        </Dialog >
    );
};
