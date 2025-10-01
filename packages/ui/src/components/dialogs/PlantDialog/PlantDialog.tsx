import { IMAGE_SIZE } from "@local/shared";
import { AppBar, Avatar, Box, Button, CircularProgress, Collapse, Dialog, Grid, IconButton, List, ListItem, ListItemAvatar, ListItemIcon, ListItemText, Toolbar, Typography, useTheme } from "@mui/material";
import { plants_plants_skus } from "api/generated/plants";
import { QuantityBox, Selector, SnackSeverity, Transition } from "components";
import { BeeIcon, CloseIcon, DroughtIcon, ExpandLessIcon, ExpandMoreIcon, InfoIcon, LampIcon, LightModeIcon, MapIcon, MoistureIcon, MoveLeftRightIcon, MoveUpDownIcon, PHIcon, PaletteIcon, SaltIcon, ScheduleIcon, ShoppingCartAddIcon, SoilTypeIcon, SpeedIcon } from "icons";
import { SvgComponent } from "icons/types";
import { lazy, Suspense, useEffect, useState } from "react";
import { PubSub, getImageSrc, getPlantTrait, getServerUrl, showPrice } from "utils";
import { PlantDialogProps } from "../types";

// Lazy load the carousel component and its styles
const Carousel = lazy(() => import("react-gallery-carousel").then(module => {
    import("react-gallery-carousel/dist/index.css");

    return module;
}));

export const PlantDialog = ({
    isAdminPage,
    plant,
    selectedSku,
    onAddToCart,
    open = true,
    onClose,
}: PlantDialogProps) => {
    const { palette, spacing } = useTheme();

    const [quantity, setQuantity] = useState(1);
    const [orderOptions, setOrderOptions] = useState<plants_plants_skus[]>([]);
    const [detailsOpen, setDetailsOpen] = useState(true);
    // Stores the id of the selected sku
    const [currSku, setCurrSku] = useState(selectedSku);

    useEffect(() => {
        setCurrSku(selectedSku);
    }, [selectedSku]);

    useEffect(() => {
        setOrderOptions(plant?.skus ?? []);
    }, [plant, orderOptions]);

    const images = (plant && Array.isArray(plant.images)) ? [...plant.images].sort((a, b) => a.index - b.index).map(d => ({
        alt: d.image.alt ?? "",
        src: `${getServerUrl()}/${getImageSrc(d.image)}`,
        thumbnail: `${getServerUrl()}/${getImageSrc(d.image, IMAGE_SIZE.M)}`,
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
                            background: "transparent",
                            borderRadius: 0,
                        }}>
                            <Icon fill={palette.mode === "light" ? "black" : "white"} />
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={title} secondary={traitValue} />
                </ListItem>
            </div>
        );
    };

    const handleDetailsClick = () => {
        setDetailsOpen(!detailsOpen);
    };

    const handleAddToCart = () => {
        if (!currSku) {
            PubSub.get().publishSnack({ message: "Please select a size", severity: SnackSeverity.Error });
            return;
        }
        onAddToCart(currSku, quantity);
    };

    const options = (
        <Grid container spacing={2} sx={{
            padding: spacing(2),
        }}>
            <Grid item xs={6} sm={4}>
                <Selector
                    fullWidth
                    options={orderOptions}
                    selected={currSku}
                    getOptionLabel={(sku) => isAdminPage ? `#${sku.size} : ${showPrice(sku.price)}` : `#${sku.size}`}
                    handleChange={(c, e) => { setCurrSku(c); }}
                    inputAriaLabel='size-selector-label'
                    label="Size"
                    color={palette.primary.contrastText}
                />
            </Grid>
            <Grid item xs={6} sm={4}>
                <QuantityBox
                    id="plant-quantity"
                    min={0}
                    max={Math.max.apply(Math, plant?.skus?.map(s => s.availability) ?? [])}
                    initial={1}
                    value={quantity}
                    handleChange={setQuantity}
                    sx={{ height: "100%" }}
                />
            </Grid>
            <Grid item xs={12} sm={4}>
                <Button
                    disabled={!currSku}
                    fullWidth
                    style={{ height: "100%" }}
                    color="secondary"
                    startIcon={<ShoppingCartAddIcon />}
                    onClick={handleAddToCart}
                    variant="contained"
                >Order</Button>
            </Grid>
        </Grid>
    );

    const displayedTraitData: [string, SvgComponent, string][] = [
        ["zone", MapIcon, "Hardiness zones"],
        ["physiographicRegions", MapIcon, "Physiographic Region"],
        ["attractsPollinatorsAndWildlife", BeeIcon, "Attracted Pollinators and Wildlife"],
        ["droughtTolerance", DroughtIcon, "Drought Tolerance"],
        ["saltTolerance", SaltIcon, "Salt Tolerance"],
        ["grownHeight", MoveUpDownIcon, "Grown Height"],
        ["grojwnSpread", MoveLeftRightIcon, "Grown Spread"],
        ["growthRate", SpeedIcon, "Growth Rate"],
        ["bloomColors", PaletteIcon, "Bloom Colors"],
        ["bloomTimes", ScheduleIcon, "Bloom Times"],
        ["lightRanges", LampIcon, "Light Range"],
        ["optimalLight", LightModeIcon, "Optimal Light"],
        ["soilMoistures", MoistureIcon, "Soil Moisture"],
        ["soilPhs", PHIcon, "Soil PH"],
        ["soilTypes", SoilTypeIcon, "Soil Type"],
    ];
    const displayedTraitList: JSX.Element[] = displayedTraitData.map(([traitName, Icon, title]) => traitIconList(traitName, Icon, title)).filter(e => e !== null) as JSX.Element[];

    return (
        <Dialog
            aria-describedby="modal-title"
            scroll="paper"
            open={open}
            onClose={onClose}
            TransitionComponent={Transition}
            sx={{
                zIndex: 200000,
                "& > .MuiDialog-container": {
                    "& > .MuiPaper-root": {
                        zIndex: 200000,
                        margin: { xs: 0, sm: 2, md: 4 },
                        minWidth: { xs: "100vw", sm: "unset" },
                        maxWidth: { xs: "100vw", sm: "calc(100vw - 64px)" },
                        bottom: { xs: 0, sm: "auto" },
                        paddingBottom: "env(safe-area-inset-bottom)",
                        top: { xs: "auto", sm: undefined },
                        position: { xs: "absolute", sm: "relative" },
                        display: { xs: "block", sm: "inline-block" },
                        borderRadius: { xs: `${spacing(1)} ${spacing(1)} 0 0`, sm: 2 },
                        background: palette.mode === "light" ? "#c2cadd" : palette.background.default,
                        color: palette.background.textPrimary,
                        "& > .MuiDialogContent-root": {
                            position: "relative",
                        },
                    },
                },
            }}
        >
            <AppBar sx={{ position: "relative", background: palette.primary.dark }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
                        <CloseIcon />
                    </IconButton>
                    <Grid container spacing={0}>
                        <Grid item xs={12} sx={{ textAlign: "center" }}>
                            <Typography id="modal-title" variant="h5">
                                {plant?.latinName}
                            </Typography>
                            <Typography variant="h6">
                                {getPlantTrait("commonName", plant)}
                            </Typography>
                        </Grid>
                    </Grid>
                </Toolbar>
            </AppBar>
            <Box sx={{
                background: palette.background.default,
                flex: "auto",
            }}>
                <Grid container spacing={0}>
                    {images.length > 0 && <Grid item lg={6} xs={12}>
                        <Suspense fallback={
                            <Box sx={{ 
                                display: "flex", 
                                justifyContent: "center", 
                                alignItems: "center", 
                                minHeight: "400px", 
                            }}>
                                <CircularProgress />
                            </Box>
                        }>
                            <Carousel canAutoPlay={false} images={images} style={{
                                maxHeight: "75vh",
                                width: "100%",
                            }} />
                        </Suspense>
                    </Grid>}
                    <Grid item lg={6} xs={12}>
                        {(getPlantTrait("description", plant) || displayedTraitList.length > 0) ? (
                            <>
                                <ListItem button onClick={handleDetailsClick}>
                                    <ListItemIcon><InfoIcon fill={palette.background.textPrimary} /></ListItemIcon>
                                    <ListItemText primary="Details" />
                                    {detailsOpen ? <ExpandLessIcon fill={palette.background.textPrimary} /> : <ExpandMoreIcon fill={palette.background.textPrimary} />}
                                </ListItem>
                                <Collapse in={detailsOpen} timeout='auto' unmountOnExit>
                                    {getPlantTrait("description", plant) ? <p style={{ padding: spacing(2) }}>{getPlantTrait("description", plant)}</p> : null}
                                    <List>{displayedTraitList}</List>
                                </Collapse>
                            </>
                        ) : null}
                    </Grid>
                </Grid>
            </Box>
            <Box sx={{
                background: palette.primary.main,
                position: "sticky",
                bottom: "0",
                width: "-webkit-fill-available",
            }}>
                {options}
            </Box>
        </Dialog>
    );
};
