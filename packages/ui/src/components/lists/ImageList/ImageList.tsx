import { Box } from "@mui/material";
import { EditImageDialog, ImageCard } from "components";
import { useCallback, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ImageInfo, SxType } from "types";
import { reorderImageInfo } from "./imageListOrder";

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

    const moveCard = useCallback(
        (dragIndex: number, hoverIndex: number) => {
            onUpdate(reorderImageInfo(data, dragIndex, hoverIndex));
        },
        [data, onUpdate],
    );

    const saveImageData = useCallback(
        (d: ImageInfo) => {
            const updated = [...data];
            updated[selected] = {
                ...updated[selected],
                ...d,
            };
            onUpdate(updated);
            setSelected(-1);
        },
        [selected, data, onUpdate],
    );

    const deleteImage = useCallback(
        (index: number) => {
            if (onDelete) {
                // If onDelete prop is provided, call it with the image info
                onDelete(data[index]);
            } else {
                // Otherwise, remove from local array
                const updated = [...data];
                updated.splice(index, 1);
                onUpdate(updated);
            }
        },
        [data, onDelete, onUpdate],
    );

    return (
        <DndProvider backend={HTML5Backend}>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    alignItems: "stretch",
                    ...sx,
                }}
            >
                <EditImageDialog
                    open={selected >= 0}
                    data={selected >= 0 ? data[selected] : null}
                    onClose={() => setSelected(-1)}
                    onSave={saveImageData}
                />
                {data?.map((item, index) => (
                    <ImageCard
                        key={item.image.hash}
                        index={index}
                        data={item}
                        onDelete={() => deleteImage(index)}
                        onEdit={() => setSelected(index)}
                        moveCard={moveCard}
                    />
                ))}
            </Box>
        </DndProvider>
    );
};
