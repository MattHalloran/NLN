import { Box } from "@mui/material";
import { EditImageDialog, ImageCard } from "components";
import update from "immutability-helper";
import { useCallback, useState } from "react";
import { ImageInfo, SxType } from "types";

export const ImageList = ({
    data,
    onUpdate,
    onDelete,
    sx,
}: {
    data: ImageInfo[];
    onUpdate: (data: ImageInfo[]) => unknown;
    onDelete?: (imageInfo: ImageInfo) => unknown;
    sx?: SxType;
}) => {
    const [selected, setSelected] = useState(-1);

    const moveCard = useCallback((dragIndex: number, hoverIndex: number) => {
        const dragCard = data[dragIndex];
        onUpdate(update(data, {
            $splice: [
                [dragIndex, 1],
                [hoverIndex, 0, dragCard],
            ],
        }));
    }, [data, onUpdate]);

    const saveImageData = useCallback((d: any) => {
        const updated = [...data];
        updated[selected] = {
            ...updated[selected],
            ...d,
        };
        onUpdate(updated);
        setSelected(-1);
    }, [selected, data, onUpdate]);

    const deleteImage = useCallback((index: number) => {
        if (onDelete) {
            // If onDelete prop is provided, call it with the image info
            onDelete(data[index]);
        } else {
            // Otherwise, remove from local array
            const updated = [...data];
            updated.splice(index, 1);
            onUpdate(updated);
        }
    }, [data, onDelete, onUpdate]);

    return (
        <Box sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            alignItems: "stretch",
            ...sx,
        }}>
            <EditImageDialog
                open={selected >= 0}
                data={selected >= 0 ? data[selected] : null}
                onClose={() => setSelected(-1)}
                onSave={saveImageData}
            />
            {data?.map((item, index) => (
                <ImageCard
                    key={index}
                    index={index}
                    data={item}
                    onDelete={() => deleteImage(index)}
                    onEdit={() => setSelected(index)}
                    moveCard={moveCard}
                />
            ))}
        </Box>
    );
};
