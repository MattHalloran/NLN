import { Box, IconButton, Modal, useTheme } from "@mui/material";
import { CloseIcon } from "icons";

// const ESCAPE_KEY = 27;

interface StyledModalProps {
    open?: boolean;
    scrollable?: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const StyledModal = ({
    open = true,
    scrollable = false,
    onClose,
    children,
}: StyledModalProps) => {
    const { palette } = useTheme();

    return (
        <Modal
            sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            open={open}
            onClose={onClose}>
            <Box sx={{
                margin: "auto",
                maxWidth: "calc(100vw - 100px)",
                maxHeight: "calc(100vh - 50px)",
                outline: 0,
                display: "flex",
            }}>
                <Box sx={{
                    borderRadius: "10px",
                    backgroundColor: palette.primary.light,
                    color: palette.primary.contrastText,
                    border: `3px solid ${palette.primary.contrastText}`,
                    ...(scrollable ? {
                        overflowY: "scroll",
                    } : {}),
                }}>
                    {children}
                </Box>
                <IconButton
                    aria-label="close modal"
                    onClick={onClose}
                    sx={{
                        height: 50,
                        width: 50,
                        left: -25,
                        top: -25,
                        borderRadius: "100%",
                        background: "#A3333D",
                        cursor: "pointer",
                        zIndex: 2,
                        "&:hover": {
                            background: "#A8333D",
                        },
                    }}
                >
                    <CloseIcon fill={palette.primary.contrastText} />
                </IconButton>
            </Box>
        </Modal>
    );
};
