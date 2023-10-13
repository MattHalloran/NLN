import { IMAGE_SIZE } from "@local/shared";
import { Card, CardActions, CardContent, CardMedia, IconButton, useTheme } from "@mui/material";
import { DeleteIcon, EditIcon } from "icons";
import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { ImageInfo } from "types";
import { getImageSrc, getServerUrl } from "utils";

export const ImageCard = ({
    onDelete,
    onEdit,
    data,
    index,
    moveCard,
}: {
    onDelete: () => unknown;
    onEdit: () => unknown;
    data: ImageInfo;
    index: number;
    moveCard: (dragIndex: number, hoverIndex: number) => unknown;
}) => {
    const { palette } = useTheme();
    console.log('ImageCard data', data);

    const ref = useRef(null);

    const [, drop] = useDrop({
        accept: "card",
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId(),
            };
        },
        hover(item: any) {
            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;
            // Don't replace items with themselves
            if (dragIndex === hoverIndex) {
                return;
            }
            moveCard(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });
    const [{ isDragging }, drag] = useDrag({
        type: "card",
        item: () => {
            return { data, index };
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });
    const opacity = isDragging ? 0 : 1;
    drag(drop(ref));

    return (
        <Card
            style={{ opacity }}
            ref={ref}
            sx={{
                background: (t) => t.palette.primary.main,
                color: (t) => t.palette.primary.contrastText,
                borderRadius: 2,
                margin: 1,
                cursor: "pointer",
                ".MuiMenu-paper": {
                    transitionDuration: "0s !important",
                },
            }}
        >
            <CardContent
                sx={{
                    padding: 0,
                    position: "inherit",
                }}
            >
                <CardMedia
                    image={`${getServerUrl()}/${getImageSrc(data.image, IMAGE_SIZE.ML)}`}
                    sx={{
                        height: 0,
                        paddingTop: "56.25%",
                    }}
                />
            </CardContent>
            <CardActions disableSpacing>
                <IconButton aria-label="edit image data" onClick={onEdit}>
                    <EditIcon fill={palette.secondary.light} />
                </IconButton>
                <IconButton aria-label="delete image" onClick={onDelete} sx={{ marginLeft: "auto" }}>
                    <DeleteIcon fill={palette.secondary.light} />
                </IconButton>
            </CardActions>
        </Card>
    );
};
