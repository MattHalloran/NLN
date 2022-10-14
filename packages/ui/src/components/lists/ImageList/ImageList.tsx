import { useCallback, useState } from 'react';
import update from 'immutability-helper';
import { ImageCard } from 'components';
import { EditImageDialog } from 'components';
import { Box } from '@mui/material';

export const ImageList = ({
    data,
    onUpdate
}) => {
    const [selected, setSelected] = useState(-1);

    const moveCard = useCallback((dragIndex, hoverIndex) => {
        const dragCard = data[dragIndex];
        onUpdate(update(data, {
            $splice: [
                [dragIndex, 1],
                [hoverIndex, 0, dragCard],
            ],
        }));
    }, [data, onUpdate]);

    const saveImageData = useCallback((d) => {
        let updated = [...data];
        updated[selected] = {
            ...updated[selected],
            ...d
        };
        onUpdate(updated);
        setSelected(-1);
    }, [selected, data, onUpdate])

    const deleteImage = (index) => {
        let updated = [...data];
        updated.splice(index, 1);
        onUpdate(updated);
    }

    return (
        <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            alignItems: 'stretch',
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
}