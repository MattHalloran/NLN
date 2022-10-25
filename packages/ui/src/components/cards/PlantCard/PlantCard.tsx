import {
    Box,
    Card,
    CardActionArea,
    CardContent,
    CardMedia,
    Chip,
    SxProps,
    Theme,
    Typography,
    useTheme
} from '@mui/material';
import { showPrice, getImageSrc, getPlantTrait, getServerUrl } from 'utils';
import { IMAGE_USE, SKU_STATUS } from '@shared/consts';
import { NoImageIcon } from '@shared/icons';

const deleted: SxProps<Theme> = {
    background: '2px solid red',
} as const

const inactive: SxProps<Theme> = {
    background: '2px solid grey',
} as const

const active: SxProps<Theme> = {
    background: (t) => t.palette.secondary.main,
} as const

const chip: SxProps<Theme> = {
    margin: 2,
    boxShadow: 1,
} as const


export const PlantCard = ({
    onClick,
    plant,
}) => {
    const { palette } = useTheme();

    const SkuStatus = {
        [SKU_STATUS.Deleted]: deleted,
        [SKU_STATUS.Inactive]: inactive,
        [SKU_STATUS.Active]: active,
    }

    const openWithSku = (e, sku) => {
        e.stopPropagation();
        onClick({ plant, selectedSku: sku })
    }

    let sizes = plant.skus?.map(s => (
        <Chip
            key={s.sku}
            label={`#${s.size} | ${showPrice(s.price)} | Avail: ${s.availability}`}
            color="secondary"
            onClick={(e) => openWithSku(e, s)}
            sx={{ ...chip, ...(SkuStatus[s.status + ''] ?? deleted) } as any}
        />
    ));

    let display;
    let display_data = plant.images.find(image => image.usedFor === IMAGE_USE.PlantDisplay)?.image;
    if (!display_data && plant.images.length > 0) display_data = plant.images[0].image;
    if (display_data) {
        display = <CardMedia
            component="img"
            src={`${getServerUrl()}/${getImageSrc(display_data)}`}
            alt={display_data.alt}
            title={plant.latinName}
            sx={{
                minHeight: 200,
                maxHeight: 200,
            }}
        />
    } else {
        display = <NoImageIcon style={{
            width: '100%',
            height: '100%',
        }} />
    }

    return (
        <Card
            onClick={() => onClick({ plant, selectedSku: plant.skus[0] })}
            sx={{
                background: (t) => t.palette.primary.main,
                color: (t) => t.palette.primary.contrastText,
                borderRadius: 2,
                margin: 3,
                cursor: 'pointer',
            }}
        >
            <CardActionArea>
                {display}
                <CardContent sx={{
                    padding: 1,
                    position: 'inherit',
                }}>
                    <Typography gutterBottom variant="h6" component="h3">
                        {plant.latinName ?? getPlantTrait('commonName', plant)}
                    </Typography>
                    <Box>
                        {sizes}
                    </Box>
                </CardContent>
            </CardActionArea>
        </Card>
    );
}