import PropTypes from 'prop-types';
import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getImageSrc, getServerUrl } from 'utils';
import { IMAGE_SIZE } from '@shared/consts';
import { Card, CardActions, CardContent, CardMedia, IconButton } from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';

function ImageCard({
    onDelete,
    onEdit,
    data,
    index,
    moveCard
}) {
    const ref = useRef(null);

    const [, drop] = useDrop({
        accept: 'card',
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
        type: 'card',
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
                borderRadius: 15,
                margin: 3,
                cursor: 'pointer',
                '.MuiMenu-paper': {
                    transitionDuration: '0s !important',
                }
            }}
        >
            <CardContent
                sx={{
                    padding: 0,
                    position: 'inherit',
                }}
            >
                <CardMedia
                    image={`${getServerUrl()}/${getImageSrc(data, IMAGE_SIZE.ML)}`}
                    sx={{
                        height: 0,
                        paddingTop: '56.25%',
                    }}
                />
            </CardContent>
            <CardActions disableSpacing>
                <IconButton aria-label="edit image data" onClick={onEdit}>
                    <EditIcon sx={{ color: (t) => t.palette.secondary.light }} />
                </IconButton>
                <IconButton aria-label="delete image" onClick={onDelete}>
                    <DeleteIcon sx={{ color: (t) => t.palette.secondary.light }} />
                </IconButton>
            </CardActions>
        </Card>
    );
}

ImageCard.propTypes = {
    onDelete: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    data: PropTypes.object.isRequired,
    index: PropTypes.number.isRequired,
    moveCard: PropTypes.func.isRequired,
}

export { ImageCard };