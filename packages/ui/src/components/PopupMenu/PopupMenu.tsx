import { Button, Popover, useTheme } from "@mui/material";
import { useState } from "react";

export function PopupMenu({
    text = "Menu",
    children,
    ...props
}) {
    const { palette } = useTheme();

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const id = open ? "simple-popover" : undefined;
    return (
        <>
            <Button
                aria-describedby={id}
                {...props}
                onClick={handleClick}
                variant="contained"
            >
                {text}
            </Button>
            <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                disableScrollLock={true}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "center",
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "center",
                }}
                sx={{
                    "& .MuiPopover-paper": {
                        background: palette.primary.light,
                        borderRadius: 2,
                    },
                }}
            >
                {children}
            </Popover>
        </>
    );
}
