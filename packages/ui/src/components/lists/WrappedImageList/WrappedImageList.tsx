import { Box, Button, Grid } from "@mui/material";
import { BottomActionsGrid } from "components/buttons/BottomActionsGrid/BottomActionsGrid";
import { CancelIcon, SaveIcon } from "icons";
import { useEffect, useState } from "react";
import { ImageInfo, SxType } from "types";
import { ImageList } from "../ImageList/ImageList";

export const WrappedImageList = ({
    data,
    onApply,
    sxs,
}: {
    data: ImageInfo[],
    onApply: (data: ImageInfo[]) => unknown,
    sxs?: {
        imageList?: SxType,
    },
}) => {

    const [changed, setChanged] = useState<ImageInfo[]>(data);
    useEffect(() => { setChanged(data); }, [data]);

    return (
        <Box>
            <ImageList data={changed} onUpdate={(d) => setChanged(d)} sx={{ ...sxs?.imageList }} />
            <BottomActionsGrid display="page">
                <Grid item xs={6} p={1} sx={{ paddingTop: 0 }}>
                    <Button
                        fullWidth
                        onClick={() => onApply(changed)}
                        startIcon={<SaveIcon />}
                        variant="contained"
                    >Apply</Button>
                </Grid>
                <Grid item xs={6} p={1} sx={{ paddingTop: 0 }}>
                    <Button
                        fullWidth
                        onClick={() => setChanged(data)}
                        startIcon={<CancelIcon />}
                        variant="outlined"
                    >Revert</Button>
                </Grid>
            </BottomActionsGrid>
        </Box>
    );
};
