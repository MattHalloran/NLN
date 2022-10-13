import React, { useState, useEffect, useCallback } from 'react';
import {
    AppBar,
    Autocomplete,
    Box,
    Button,
    Dialog,
    FormControlLabel,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListSubheader,
    Switch,
    TextField,
    Toolbar,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material';
import { addImagesMutation, deletePlantsMutation, updatePlantMutation } from 'graphql/mutation';
import { useMutation } from '@apollo/client';
import { Dropzone, ImageList, Transition } from 'components';
import {
    addToArray,
    deleteArrayIndex,
    getPlantTrait,
    makeID,
    PubSub,
    setPlantSkuField,
    setPlantTrait
} from 'utils';
// import { DropzoneAreaBase } from 'material-ui-dropzone';
import _ from 'lodash';
import { CancelIcon, CloseIcon, CreateIcon, DeleteIcon, SaveIcon } from '@shared/icons';
import { mutationWrapper } from 'graphql/utils';
import { addImagesVariables, addImages_addImages } from 'graphql/generated/addImages';
import { updatePlantVariables, updatePlant_updatePlant } from 'graphql/generated/updatePlant';
import { deletePlantsVariables, deletePlants_deletePlants } from 'graphql/generated/deletePlants';

// Common plant traits, and their corresponding field names
const PLANT_TRAITS = {
    'Attracts Pollinators & Wildlife': 'attractsPollinatorsAndWildlife',
    'Bloom Colors': 'bloomColors',
    'Bloom Times': 'bloomTimes',
    'Drought Tolerance': 'droughtTolerance',
    'Grown Height': 'grownHeight',
    'Grown Spread': 'grownSpread',
    'Growth Rate': 'growthRate',
    'Hardiness Zones': 'zone',
    'Light Ranges': 'lightRanges',
    'Optimal Light': 'optimalLight',
    'Salt Tolerance': 'saltTolerance',
    'Soil Moistures': 'soilMoistures',
    'Soil PHs': 'soilPhs',
    'Soil Types': 'soilTypes',
}

export const EditPlantDialog = ({
    plant,
    selectedSku,
    trait_options,
    open = true,
    onClose,
}) => {
    const { palette, spacing } = useTheme();

    const [changedPlant, setChangedPlant] = useState(plant);
    const [updatePlant] = useMutation(updatePlantMutation);
    const [deletePlant] = useMutation(deletePlantsMutation);

    const [imageData, setImageData] = useState<any[] | null>([]);
    const [imagesChanged, setImagesChanged] = useState(false);
    const [addImages] = useMutation(addImagesMutation);

    const [compactView, setCompactView] = useState(false);
    const toggleCompactView = () => setCompactView(view => !view);

    const uploadImages = (acceptedFiles) => {
        mutationWrapper<addImages_addImages[], addImagesVariables>({
            mutation: addImages,
            input: { files: acceptedFiles, },
            successMessage: () => `Successfully uploaded ${acceptedFiles.length} image(s)`,
            onSuccess: (data) => {
                setImageData([...(imageData ?? []), ...data.filter(d => d.success).map(d => {
                    return {
                        hash: d.hash,
                        files: [{ src: d.src }]
                    }
                })])
                setImagesChanged(true);
            }
        })
    }

    const [currSkuIndex, setCurrSkuIndex] = useState(-1);
    const [selectedTrait, setSelectedTrait] = useState(PLANT_TRAITS[0]);

    useEffect(() => {
        setCurrSkuIndex((selectedSku && plant?.skus) ? plant.skus.findIndex(s => s.sku === selectedSku.sku) : 0)
    }, [plant, selectedSku])

    const findImageData = useCallback(() => {
        setImagesChanged(false);
        if (Array.isArray(plant?.images)) {
            setImageData(plant.images.map((d, index) => ({
                ...d.image,
                pos: index
            })));
        } else {
            setImageData(null);
        }
    }, [plant])

    useEffect(() => {
        setChangedPlant({ ...plant });
        findImageData();
    }, [findImageData, plant, setImagesChanged])

    function revertPlant() {
        setChangedPlant(plant);
        findImageData();
    }

    const confirmDelete = useCallback(() => {
        PubSub.get().publishAlertDialog({
            message: `Are you sure you want to delete this plant, along with its SKUs? This cannot be undone.`,
            buttons: [{
                text: 'Yes',
                onClick: () => mutationWrapper<deletePlants_deletePlants, deletePlantsVariables>({
                    mutation: deletePlant,
                    input: { ids: [changedPlant.id] },
                    successMessage: () => 'Plant deleted.',
                    onSuccess: () => onClose(),
                    errorMessage: () => 'Failed to delete plant.',
                }),
            }, {
                text: 'No',
            }]
        });
    }, [changedPlant, deletePlant, onClose])

    const savePlant = useCallback(async () => {
        let plant_data = {
            id: changedPlant.id,
            latinName: changedPlant.latinName,
            traits: changedPlant.traits.map(t => {
                return { name: t.name, value: t.value }
            }),
            skus: changedPlant.skus.map(s => {
                return { sku: s.sku, isDiscountable: s.isDiscountable, size: s.size, note: s.note, availability: parseInt(s.availability) || 0, price: s.price, status: s.status }
            }),
            images: imageData?.map(d => {
                return { hash: d.hash, isDisplay: d.isDisplay ?? false }
            }) ?? []
        }
        mutationWrapper<updatePlant_updatePlant, updatePlantVariables>({
            mutation: updatePlant,
            input: { ...plant_data },
            successMessage: () => 'Plant updated.',
            onSuccess: () => setImagesChanged(false),
            errorMessage: () => 'Failed to delete plant.'
        })
    }, [changedPlant, imageData, updatePlant, setImagesChanged])

    const updateTrait = useCallback((traitName, value, createIfNotExists) => {
        const updatedPlant = setPlantTrait(traitName, value, changedPlant, createIfNotExists);
        if (updatedPlant) setChangedPlant(updatedPlant);
    }, [changedPlant])

    const getSkuField = useCallback((fieldName) => {
        if (!Array.isArray(changedPlant?.skus) || currSkuIndex < 0 || currSkuIndex >= changedPlant.skus.length) return '';
        return changedPlant.skus[currSkuIndex][fieldName];
    }, [changedPlant, currSkuIndex])

    const updateSkuField = useCallback((fieldName, value) => {
        const updatedPlant = setPlantSkuField(fieldName, currSkuIndex, value, changedPlant);
        if (updatedPlant) setChangedPlant(updatedPlant)
    }, [changedPlant, currSkuIndex])

    function newSku() {
        setChangedPlant(p => ({
            ...p,
            skus: addToArray(p.skus, { sku: makeID(10) }),
        }));
    }

    function removeSku() {
        if (currSkuIndex < 0) return;
        setChangedPlant(p => ({
            ...p,
            skus: deleteArrayIndex(p.skus, currSkuIndex),
        }));
    }

    let changes_made = !_.isEqual(plant, changedPlant) || imagesChanged;
    let options = (
        <Grid
            container
            spacing={2}
            sx={{
                padding: spacing(2),
                background: palette.primary.main,
            }}
        >
            <Grid item xs={12} sm={4}>
                <Button
                    fullWidth
                    disabled={!changes_made}
                    startIcon={<CancelIcon />}
                    onClick={revertPlant}
                >Revert</Button>
            </Grid>
            <Grid item xs={12} sm={4}>
                <Button
                    fullWidth
                    disabled={!changedPlant?.id}
                    startIcon={<DeleteIcon />}
                    onClick={confirmDelete}
                >Delete</Button>
            </Grid>
            <Grid item xs={12} sm={4}>
                <Button
                    fullWidth
                    disabled={!changes_made}
                    startIcon={<SaveIcon />}
                    onClick={savePlant}
                >Update</Button>
            </Grid>
        </Grid>
    );

    return (
        <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
            <AppBar sx={{ position: 'relative' }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
                        <CloseIcon />
                    </IconButton>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={compactView}
                                onChange={toggleCompactView}
                                color="secondary"
                            />
                        }
                        label="Compact View"
                        sx={{
                            position: 'absolute',
                            right: 0,
                        }}
                    />
                </Toolbar>
            </AppBar>
            <Box sx={{
                background: palette.background.default,
                flex: 'auto',
            }}>
                <Box sx={{
                    width: '25%',
                    height: '100%',
                    float: 'left',
                    borderRight: `2px solid ${palette.text.primary}`,
                }}>
                    <List
                        style={{ paddingTop: '0' }}
                        aria-label="sku select"
                        aria-labelledby="sku-select-subheader">
                        <ListSubheader component="div" id="sku-select-subheader" sx={{
                            background: palette.primary.light,
                            color: palette.primary.contrastText,
                        }}>
                            <Typography variant="h5" component="h3" sx={{ paddingBottom: '1vh' }}>SKUs</Typography>
                        </ListSubheader>
                        {changedPlant?.skus?.map((s, i) => (
                            <ListItem
                                key={s.sku}
                                button
                                onClick={() => setCurrSkuIndex(i)}
                                sx={{
                                    background: i === currSkuIndex ? palette.primary.dark : 'inherit',
                                    color: i === currSkuIndex ? palette.primary.contrastText : 'inherit',
                                }}
                            >
                                <ListItemText primary={s.sku} />
                            </ListItem>
                        ))}
                    </List>
                    <Box>
                        {currSkuIndex >= 0 ?
                            <Tooltip title="Delete SKU">
                                <IconButton onClick={removeSku}>
                                    <DeleteIcon />
                                </IconButton>
                            </Tooltip>
                            : null}
                        <Tooltip title="New SKU">
                            <IconButton onClick={newSku}>
                                <CreateIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
                <Box sx={{
                    width: '75%',
                    height: '100%',
                    float: 'right',
                    padding: spacing(1),
                    paddingBottom: '20vh',
                }}>
                    <Typography variant="h5" component="h3" sx={{ paddingBottom: '1vh' }}>Edit plant info</Typography>
                    <Grid container spacing={2} sx={{ paddingBottom: '3vh' }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Latin Name"
                                value={changedPlant?.latinName}
                                onChange={e => setChangedPlant({ ...plant, latinName: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Common Name"
                                value={getPlantTrait('commonName', changedPlant)}
                                onChange={e => updateTrait('commonName', e.target.value, true)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                maxRows={compactView ? 4 : 10}
                                size="small"
                                label="Description"
                                value={getPlantTrait('description', changedPlant)}
                                onChange={e => updateTrait('description', e.target.value, true)}
                            />
                        </Grid>
                        {
                            compactView ? <React.Fragment>
                                {/* Select which trait you'd like to edit */}
                                < Grid item xs={12} sm={6}>
                                    <Autocomplete
                                        fullWidth
                                        freeSolo
                                        id="setTraitField"
                                        options={Object.keys(PLANT_TRAITS)}
                                        onChange={(_, value) => setSelectedTrait(PLANT_TRAITS[value])}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Select plant trait"
                                                value={PLANT_TRAITS[selectedTrait] ?? ''}
                                            />
                                        )}
                                    />
                                </Grid>
                                {/* Edit selected trait */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Trait value"
                                        value={getPlantTrait(selectedTrait, changedPlant) ?? ''}
                                        onChange={e => updateTrait(selectedTrait, e.target.value, true)}
                                    />
                                </Grid>
                            </React.Fragment> :
                                <React.Fragment>
                                    {Object.entries(PLANT_TRAITS).map(([label, field]) => (
                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label={label}
                                                value={getPlantTrait(field, changedPlant) ?? ''}
                                                onChange={e => updateTrait(field, e.target.value, true)}
                                            />
                                        </Grid>
                                    ))}
                                </React.Fragment>
                        }

                    </Grid>
                    <Typography variant="h5" component="h3" sx={{ paddingBottom: '1vh' }}>Edit images</Typography>
                    <Grid container spacing={2} sx={{ paddingBottom: '3vh' }}>
                        {/* Upload new images */}
                        <Grid item xs={12}>
                            <Dropzone
                                dropzoneText={'Drag \'n\' drop new images here or click'}
                                onUpload={uploadImages}
                                uploadText='Confirm'
                                cancelText='Cancel'
                            />
                        </Grid>
                        {/* And edit existing images */}
                        <Grid item xs={12}>
                            <ImageList data={imageData} onUpdate={(d) => { setImageData(d); setImagesChanged(true) }} />
                        </Grid>
                    </Grid>
                    <Typography variant="h5" component="h3" sx={{ paddingBottom: '1vh' }}>Edit SKU info</Typography>
                    <Grid container spacing={2} sx={{ paddingBottom: '3vh' }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Plant Code"
                                value={getSkuField('sku')}
                                onChange={e => updateSkuField('sku', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                size="small"
                                label="SKU Size"
                                value={getSkuField('size')}
                                onChange={e => updateSkuField('size', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Price"
                                value={getSkuField('price')}
                                onChange={e => updateSkuField('price', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Availability"
                                value={getSkuField('availability')}
                                onChange={e => updateSkuField('availability', e.target.value)}
                            />
                        </Grid>
                    </Grid>
                </Box>
                <Box sx={{
                    position: 'fixed',
                    bottom: '0',
                    width: '-webkit-fill-available',
                    zIndex: 1,
                }}>
                    {options}
                </Box>
            </Box>
        </Dialog >
    );
}