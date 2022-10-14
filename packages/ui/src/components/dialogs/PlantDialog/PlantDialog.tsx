import React, { useState, useEffect } from 'react';
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Collapse,
    Dialog,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    useTheme
} from '@mui/material';
import { showPrice, getImageSrc, getPlantTrait, getServerUrl } from 'utils';
import {
    QuantityBox,
    Selector,
    Transition
} from 'components';
import { IMAGE_SIZE } from '@shared/consts';
import _ from 'lodash';
import Carousel from 'react-gallery-carousel';
import 'react-gallery-carousel/dist/index.css';
import { BeeIcon, CloseIcon, DroughtIcon, ExpandLessIcon, ExpandMoreIcon, InfoIcon, LampIcon, LightModeIcon, MapIcon, MoveLeftRightIcon, MoveUpDownIcon, PaletteIcon, ScheduleIcon, ShoppingCartAddIcon, SoilTypeIcon, SpeedIcon, SvgComponent } from '@shared/icons';
import { MoistureIcon } from 'assets/img';

makeStyles((theme) => ({
    displayImage: {
        maxHeight: '75vh',
    },
}));

export const PlantDialog = ({
    plant,
    selectedSku,
    onSessionUpdate,
    onAddToCart,
    open = true,
    onClose,
}) => {
    plant = {
        ...plant,
        latinName: plant?.latinName,
        skus: plant?.skus ?? [],
    }

    const { palette, spacing } = useTheme();

    const [quantity, setQuantity] = useState(1);
    const [orderOptions, setOrderOptions] = useState<any[]>([]);
    const [detailsOpen, setDetailsOpen] = useState(true);
    // Stores the id of the selected sku
    const [currSku, setCurrSku] = useState(selectedSku);

    useEffect(() => {
        setCurrSku(selectedSku);
    }, [selectedSku])

    useEffect(() => {
        let options = plant.skus?.map(s => {
            return {
                label: `#${s.size} : ${showPrice(s.price)}`,
                value: s,
            }
        })
        // If options is unchanged, do not set
        let curr_values = orderOptions.map(o => o.value);
        let new_values = options.map(o => o.value);
        if (_.isEqual(curr_values, new_values)) return;
        setOrderOptions(options);
    }, [plant, orderOptions])

    const images = Array.isArray(plant.images) ? plant.images.map(d => ({
        alt: d.image.alt,
        src: `${getServerUrl()}/${getImageSrc(d.image)}`,
        thumbnail: `${getServerUrl()}/${getImageSrc(d.image, IMAGE_SIZE.M)}`
    })) : [];

    const traitIconList = (traitName: string, Icon: SvgComponent, title: string, alt?: string) => {
        if (!alt) alt = title;
        const traitValue = getPlantTrait(traitName, plant);
        if (!traitValue) return null;
        return (
            <div>
                <ListItem>
                    <ListItemAvatar>
                        <Avatar sx={{
                            background: 'transparent',
                            borderRadius: 0,
                        }}>
                            <Icon fill={palette.mode === 'light' ? 'black' : 'white'} />
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={title} secondary={traitValue} />
                </ListItem>
            </div>
        )
    }

    const handleDetailsClick = () => {
        setDetailsOpen(!detailsOpen);
    };

    let options = (
        <Grid container spacing={2} sx={{
            padding: spacing(2),
        }}>
            <Grid item xs={6} sm={4}>
                <Selector
                    fullWidth
                    options={orderOptions}
                    selected={currSku}
                    handleChange={(e) => setCurrSku(e.target.value)}
                    inputAriaLabel='size-selector-label'
                    label="Size"
                    color={palette.primary.contrastText}
                />
            </Grid>
            <Grid item xs={6} sm={4}>
                <QuantityBox
                    id="plant-quantity"
                    min={0}
                    max={Math.max.apply(Math, plant.skus.map(s => s.availability))}
                    initial={1}
                    value={quantity}
                    handleChange={setQuantity}
                    sx={{ height: '100%' }}
                />
            </Grid>
            <Grid item xs={12} sm={4}>
                <Button
                    disabled={!currSku}
                    fullWidth
                    style={{ height: '100%' }}
                    color="secondary"
                    startIcon={<ShoppingCartAddIcon />}
                    onClick={() => onAddToCart(getPlantTrait('commonName', plant) ?? plant.latinName, currSku, quantity)}
                >Order</Button>
            </Grid>
        </Grid>
    );

    const displayedTraitData: JSX.Element[] = [
        ['zone', MapIcon, 'Hardiness zones'],
        ['physiographicRegions', MapIcon, 'Physiographic Region'],
        ['attractsPollinatorsAndWildlife', BeeIcon, 'Attracted Pollinators and Wildlife'],
        ['droughtTolerance', DroughtIcon, 'Drought Tolerance'],
        ['saltTolerance', SaltIcon, 'Salt Tolerance'],
        ['grownHeight', MoveUpDownIcon, 'Grown Height'],
        ['grojwnSpread', MoveLeftRightIcon, 'Grown Spread'],
        ['growthRate', SpeedIcon, 'Growth Rate'],
        ['bloomColors', PaletteIcon, 'Bloom Colors'],
        ['bloomTimes', ScheduleIcon, 'Bloom Times'],
        ['lightRanges', LampIcon, 'Light Range'],
        ['optimalLight', LightModeIcon, 'Optimal Light'],
        ['soilMoistures', MoistureIcon, 'Soil Moisture'],
        ['soilPhs', PHIcon, 'Soil PH'],
        ['soilTypes', SoilTypeIcon, 'Soil Type']
    ].map(d => traitIconList(...d)).filter(d => d !== null) as JSX.Element[];

    return (
        <Dialog aria-describedby="modal-title" fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
            <AppBar sx={{ position: 'relative' }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
                        <CloseIcon />
                    </IconButton>
                    <Grid container spacing={0}>
                        <Grid item xs={12} sx={{ textAlign: 'center' }}>
                            <Typography id="modal-title" variant="h5">
                                {plant.latinName}
                            </Typography>
                            <Typography variant="h6">
                                {getPlantTrait('commonName', plant)}
                            </Typography>
                        </Grid>
                    </Grid>
                </Toolbar>
            </AppBar>
            <Box sx={{
                background: palette.background.default,
                flex: 'auto',
                paddingBottom: '15vh',
            }}>
                <Grid container spacing={0}>
                    <Grid item lg={6} xs={12}>
                        {
                            images.length > 0 ?
                                <Carousel className={classes.displayImage} canAutoPlay={false} images={images} /> :
                                <NoImageWithTextIcon className={classes.displayImage} />
                        }
                    </Grid>
                    <Grid item lg={6} xs={12}>
                        {displayedTraitData.length > 0 ? (
                            <React.Fragment>
                                <ListItem button onClick={handleDetailsClick}>
                                    <ListItemIcon><InfoIcon /></ListItemIcon>
                                    <ListItemText primary="Details" />
                                    {detailsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </ListItem>
                                <Collapse in={detailsOpen} timeout='auto' unmountOnExit>
                                    {getPlantTrait('description', plant) ? <p style={{ padding: spacing(2) }}>{getPlantTrait('description', plant)}</p> : null}
                                    <List>{displayedTraitData}</List>
                                </Collapse>
                            </React.Fragment>
                        ) : null}
                    </Grid>
                </Grid>
                <Box sx={{
                    background: palette.primary.main,
                    position: 'fixed',
                    bottom: '0',
                    width: '-webkit-fill-available',
                }}>
                    {options}
                </Box>
            </Box>
        </Dialog>
    );
}