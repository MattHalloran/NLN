import React from 'react';
import clsx from 'clsx';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

const useStyles = makeStyles((theme) => ({
    root: {
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(1),
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
    },
    highlight: {
        backgroundColor: theme.palette.primary.dark,
        color: theme.palette.primary.contrastText,
    },
    title: {
        flex: '1 1 100%',
    },
    icon: {
        fill: theme.palette.primary.contrastText,
    },
}));

export const EnhancedTableToolbar = ({
    title,
    numSelected = 0,
    onDelete,
}) => {
    const { palette } = useTheme();

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