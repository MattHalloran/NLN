import { useTheme } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { DeleteIcon } from "icons";

export const EnhancedTableToolbar = ({
    title,
    numSelected = 0,
    onDelete,
}) => {
    const { palette, spacing } = useTheme();

    return (
        <Toolbar
            sx={{
                paddingLeft: spacing(2),
                paddingRight: spacing(1),
                backgroundColor: palette.primary.main,
                color: palette.primary.contrastText,
                ...(numSelected > 0 ? {
                    backgroundColor: palette.primary.dark,
                    color: palette.primary.contrastText,
                } : {}),
            }}
        >
            {numSelected > 0 ? (
                <Typography color="inherit" variant="subtitle1" component="div" sx={{ flex: "1 1 100%" }}>
                    {numSelected} selected
                </Typography>
            ) : (
                <Typography variant="h6" id="tableTitle" component="div" sx={{ flex: "1 1 100%" }}>
                    {title}
                </Typography>
            )}

            {numSelected > 0 && (
                <Tooltip title="Delete">
                    <IconButton onClick={onDelete} aria-label="delete">
                        <DeleteIcon fill={palette.primary.contrastText} />
                    </IconButton>
                </Tooltip>
            )}
        </Toolbar>
    );
};
