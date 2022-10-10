import React from 'react';
import clsx from 'clsx';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material';
import { DeleteIcon } from '@shared/icons';

makeStyles((theme) => ({
    root: {
        paddingLeft: spacing(2),
        paddingRight: spacing(1),
        backgroundColor: palette.primary.main,
        color: palette.primary.contrastText,
    },
    highlight: {
        backgroundColor: palette.primary.dark,
        color: palette.primary.contrastText,
    },
    title: {
        flex: '1 1 100%',
    },
    icon: {
        fill: palette.primary.contrastText,
    },
}));

export const EnhancedTableToolbar = ({
    title,
    numSelected = 0,
    onDelete,
}) => {
    const { palette, spacing } = useTheme();

    return (
        <Toolbar
            className={clsx(classes.root, {
                [classes.highlight]: numSelected > 0,
            })}
        >
            {numSelected > 0 ? (
                <Typography className={classes.title} color="inherit" variant="subtitle1" component="div">
                    {numSelected} selected
                </Typography>
            ) : (
                <Typography className={classes.title} variant="h6" id="tableTitle" component="div">
                    {title}
                </Typography>
            )}

            {numSelected > 0 && (
                <Tooltip title="Delete">
                    <IconButton onClick={onDelete} aria-label="delete">
                        <DeleteIcon className={classes.icon} />
                    </IconButton>
                </Tooltip>
            )}
        </Toolbar>
    );
};