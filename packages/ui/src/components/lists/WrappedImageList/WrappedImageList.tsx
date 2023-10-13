import { Box, Button, Grid } from "@mui/material";
import { CancelIcon, SaveIcon } from "icons";
import { useEffect, useState } from "react";
import { ImageInfo } from "types";
import { ImageList } from "../ImageList/ImageList";

export const WrappedImageList = ({
    data,
    onApply,
}: {
    data: ImageInfo[],
    onApply: (data: ImageInfo[]) => unknown,
}) => {

    const [changed, setChanged] = useState<ImageInfo[]>(data);
    useEffect(() => { setChanged(data); }, [data]);

    const options = (
        <Grid mb={2} mt={2} container spacing={2}>
            <Grid display="flex" justifyContent="center" item xs={12} sm={6}>
                <Button
                    fullWidth
                    onClick={() => onApply(changed)}
                    startIcon={<SaveIcon />}
                    variant="contained"
                >Apply Changes</Button>
            </Grid>
            <Grid display="flex" justifyContent="center" item xs={12} sm={6}>
                <Button
                    fullWidth
                    onClick={() => setChanged(data)}
                    startIcon={<CancelIcon />}
                    variant="outlined"
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
