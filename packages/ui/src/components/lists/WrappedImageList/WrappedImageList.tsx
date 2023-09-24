import { Box, Button, Grid } from "@mui/material";
import { useEffect, useState } from "react";
import { ImageList } from "../ImageList/ImageList";

export const WrappedImageList = ({
    data,
    onApply,
}) => {

    const [changed, setChanged] = useState(null);

    useEffect(() => {
        setChanged(data);
    }, [data]);

    const options = (
        <Grid mb={2} mt={2} container spacing={2}>
            <Grid display="flex" justifyContent="center" item xs={12} sm={6}>
                <Button
                    fullWidth
                    onClick={() => onApply(changed)}
                    variant="contained"
                >Apply Changes</Button>
            </Grid>
            <Grid display="flex" justifyContent="center" item xs={12} sm={6}>
                <Button
                    fullWidth
                    onClick={() => setChanged(data)}
                    variant="contained"
                >Revert Changes</Button>
            </Grid>
        </Grid>
    );

    return (
        <Box>
            {options}
            <ImageList data={changed} onUpdate={(d) => setChanged(d)} />
            {options}
        </Box>
    );
};
