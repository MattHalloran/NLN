import { Box, Collapse, IconButton, Stack, Typography, useTheme } from "@mui/material";
import { HelpButton } from "components/buttons/HelpButton/HelpButton";
import { ExpandLessIcon, ExpandMoreIcon } from "icons";
import { useCallback, useEffect, useState } from "react";
import { ContentCollapseProps } from "../types";

export function ContentCollapse({
    children,
    helpText,
    id,
    isOpen = true,
    onOpenChange,
    sxs,
    title,
    titleComponent,
    titleVariant,
}: ContentCollapseProps) {
    const { palette } = useTheme();

    const [internalIsOpen, setInternalIsOpen] = useState(isOpen);
    useEffect(() => {
        setInternalIsOpen(isOpen);
    }, [isOpen]);

    const toggleOpen = useCallback(() => {
        setInternalIsOpen(!internalIsOpen);
        if (onOpenChange) {
            onOpenChange(!internalIsOpen);
        }
    }, [internalIsOpen, onOpenChange]);

    // Calculate fill color
    const fillColor = sxs?.root?.color ?? (children ? palette.background.textPrimary : palette.background.textSecondary);

    return (
        <Box id={id} sx={{
            color: children ? palette.background.textPrimary : palette.background.textSecondary,
            ...(sxs?.root ?? {}),
        }}>
            {/* Title with help button and collapse */}
            <Stack direction="row" alignItems="center" sx={sxs?.titleContainer ?? {}}>
                <Typography component={titleComponent ?? "h6"} variant={titleVariant ?? "h6"}>{title}</Typography>
                {helpText && <HelpButton
                    markdown={helpText}
                    sx={sxs?.helpButton ?? {}}
                />}
                <IconButton
                    id={`toggle-expand-icon-button-${title}`}
                    aria-label={internalIsOpen ? "Collapse" : "Expand"}
                    onClick={toggleOpen}
                >
                    {internalIsOpen ?
                        <ExpandMoreIcon
                            id={`toggle-expand-icon-${title}`}
                            fill={fillColor}
                        /> :
                        <ExpandLessIcon
                            id={`toggle-expand-icon-${title}`}
                            fill={fillColor}
                        />}
                </IconButton>
            </Stack>
            {/* Text */}
            <Collapse in={internalIsOpen}>
                {children}
            </Collapse>
        </Box>
    );
}
