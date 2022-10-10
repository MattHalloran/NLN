import React, { useEffect, useState } from 'react';
import { Button, Grid, useTheme } from '@mui/material';
import { ImageList } from '../ImageList/ImageList';

makeStyles((theme) => ({
    pad: {
        marginBottom: spacing(2),
        marginTop: spacing(2)
    },
    gridItem: {
        display: 'flex',
    },
}));

export const WrappedImageList = ({
    data,
    onApply
}) => {
    const { palette, spacing } = useTheme();

    const [changed, setChanged] = useState(null);

    useEffect(() => {
        setChanged(data);
    }, [data])

    let options = (
        <Grid classes={{ container: classes.pad }} container spacing={2}>
            <Grid className={classes.gridItem} justify="center" item xs={12} sm={6}>
                <Button fullWidth onClick={() => onApply(changed)}>Apply Changes</Button>
            </Grid>
            <Grid className={classes.gridItem} justify="center" item xs={12} sm={6}>
                <Button fullWidth onClick={() => setChanged(data)}>Revert Changes</Button>
            </Grid>
        </Grid>
    )

    return (
        <div>
            { options}
                <ImageList data={changed} onUpdate={(d) => setChanged(d)}/>
            { options}
        </div>
    );
}