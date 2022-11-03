import { useEffect, useState } from 'react';
import { Box, Button, Grid } from '@mui/material';
import { ImageList } from '../ImageList/ImageList';

export const WrappedImageList = ({
    data,
    onApply
}) => {

    const [changed, setChanged] = useState(null);

    useEffect(() => {
        setChanged(data);
    }, [data])

    let options = (
        <Grid mb={2} mt={2} container spacing={2}>
            <Grid display="flex" justifyContent="center" item xs={12} sm={6}>
                <Button fullWidth onClick={() => onApply(changed)}>Apply Changes</Button>
            </Grid>
            <Grid display="flex" justifyContent="center" item xs={12} sm={6}>
                <Button fullWidth onClick={() => setChanged(data)}>Revert Changes</Button>
            </Grid>
        </Grid>
    )

    return (
        <Box>
            {options}
            <ImageList data={changed} onUpdate={(d) => setChanged(d)} />
            {options}
        </Box>
    );
}