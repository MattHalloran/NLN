import update from "immutability-helper";
import { ImageInfo } from "types";

export const reorderImageInfo = (
    data: ImageInfo[],
    dragIndex: number,
    hoverIndex: number,
): ImageInfo[] => {
    const dragCard = data[dragIndex];
    if (!dragCard || dragIndex === hoverIndex) {
        return data;
    }

    return update(data, {
        $splice: [
            [dragIndex, 1],
            [hoverIndex, 0, dragCard],
        ],
    });
};
