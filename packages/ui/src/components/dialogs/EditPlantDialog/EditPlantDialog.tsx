import { useMutation } from "@apollo/client";
import { Box, Button, Chip, Dialog, Grid, IconButton, TextField, useTheme } from "@mui/material";
import { addImagesMutation, deletePlantsMutation, updatePlantMutation } from "api/mutation";
import { Dropzone, ImageList, Transition } from "components";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PubSub, addToArray, deleteArrayIndex, getPlantTrait, makeID, setPlantSkuField, setPlantTrait } from "utils";
// import { DropzoneAreaBase } from 'material-ui-dropzone';
import { addImagesVariables, addImages_addImages } from "api/generated/addImages";
import { deletePlantsVariables, deletePlants_deletePlants } from "api/generated/deletePlants";
import { PlantInput, SkuStatus } from "api/generated/globalTypes";
import { plants_plants, plants_plants_skus } from "api/generated/plants";
import { updatePlantVariables, updatePlant_updatePlant } from "api/generated/updatePlant";
import { mutationWrapper } from "api/utils";
import { ContentCollapse } from "components/ContentCollapse/ContentCollapse";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { AddIcon, CancelIcon, DeleteIcon, SaveIcon } from "icons";
import _ from "lodash";
import { PlantImageInfo } from "types";

// Common plant traits, and their corresponding field names
const PLANT_TRAITS = {
    "Attracts Pollinators & Wildlife": "attractsPollinatorsAndWildlife",
    "Bloom Colors": "bloomColors",
    "Bloom Times": "bloomTimes",
    "Drought Tolerance": "droughtTolerance",
    "Grown Height": "grownHeight",
    "Grown Spread": "grownSpread",
    "Growth Rate": "growthRate",
    "Hardiness Zones": "zone",
    "Light Ranges": "lightRanges",
    "Optimal Light": "optimalLight",
    "Salt Tolerance": "saltTolerance",
    "Soil Moistures": "soilMoistures",
    "Soil PHs": "soilPhs",
    "Soil Types": "soilTypes",
};

export const EditPlantDialog = ({
    plant,
    selectedSku,
    open,
    onClose,
}: {
    plant: plants_plants | null | undefined,
    selectedSku: plants_plants_skus | null | undefined,
    open: boolean,
    onClose: () => unknown,
}) => {
    const { palette, spacing } = useTheme();

    const [changedPlant, setChangedPlant] = useState(plant);
    const [updatePlant] = useMutation(updatePlantMutation);
    const [deletePlant] = useMutation(deletePlantsMutation);

    const [imageData, setImageData] = useState<PlantImageInfo[] | null>([]);
    const [imagesChanged, setImagesChanged] = useState(false);
    const [addImages] = useMutation(addImagesMutation);

    const [currSkuIndex, setCurrSkuIndex] = useState(-1);
    useEffect(() => {
        setCurrSkuIndex((selectedSku && plant?.skus) ? plant.skus.findIndex(s => s.sku === selectedSku.sku) : 0);
    }, [plant, selectedSku]);

    const addSku = () => {
        if (!changedPlant) return;
        const newSku = {
            sku: makeID(10),
            size: "",
            price: "",
            availability: 0,
        };
        const updatedList = addToArray(changedPlant?.skus ?? [], newSku);
        setChangedPlant({ ...changedPlant, skus: updatedList });
        setCurrSkuIndex(updatedList.length - 1);
    };

    const removeSku = () => {
        if (currSkuIndex < 0 || !changedPlant) return;
        PubSub.get().publishAlertDialog({
            message: `Are you sure you want to delete SKU ${changedPlant.skus?.[currSkuIndex]?.sku}?`,
            buttons: [{
                text: "Yes",
                onClick: () => {
                    setCurrSkuIndex((changedPlant.skus?.length ?? 0) - 2);
                    setChangedPlant({ ...changedPlant, skus: deleteArrayIndex(changedPlant.skus, currSkuIndex) });
                },
            }, {
                text: "No",
            }],
        });
    };

    const skuChips = useMemo(() => changedPlant?.skus?.map((s, index) => (
        <Chip
            key={s.sku}
            label={s.sku}
            onClick={(e) => setCurrSkuIndex(index)}
            sx={{
                margin: 0.5,
                boxShadow: 0,
                borderRadius: 2,
                background: currSkuIndex === index ? "transparent" : palette.primary.light,
                border: currSkuIndex === index ? `2px solid ${palette.primary.light}` : "none",
                color: currSkuIndex === index ? palette.background.textPrimary : palette.primary.contrastText,
                fontSize: "0.75rem",
            } as any}
        />
    )) ?? [], [changedPlant, currSkuIndex, palette]);

    const uploadImages = useCallback((acceptedFiles: File[]) => {
        mutationWrapper<addImages_addImages[], addImagesVariables>({
            mutation: addImages,
            input: { files: acceptedFiles },
            successMessage: () => `Successfully uploaded ${acceptedFiles.length} image(s)`,
            onSuccess: (data) => {
                setImageData([...(imageData ?? []), ...data.filter(d => d.success).map((d, index) => {
                    return {
                        __typename: "PlantImage" as const,
                        index: (imageData?.length ?? 0) + index,
                        isDisplay: false,
                        image: {
                            __typename: "Image" as const,
                            alt: "",
                            description: "",
                            hash: d.hash ?? "",
                            files: [{
                                __typename: "ImageFile" as const,
                                src: d.src ?? '',
                                width: d.width ?? -1,
                                height: d.height ?? -1
                            }],
                        }
                    };
                })]);
                setImagesChanged(true);
            },
        });
    }, [addImages, imageData]);

    const findImageData = useCallback(() => {
        setImagesChanged(false);
        if (plant && Array.isArray(plant?.images)) {
            setImageData([...plant.images].sort((a, b) => a.index - b.index).map((d, index) => ({
                ...d,
                index,
                image: {
                    ...d.image,
                    alt: d.image.alt ?? "",
                    description: d.image.description ?? "",
                    hash: d.image.hash ?? "",
                    files: d.image.files ?? [],
                }
            })));
        } else {
            setImageData(null);
        }
    }, [plant]);

    useEffect(() => {
        if (!plant) return;
        setChangedPlant({ ...plant });
        findImageData();
    }, [findImageData, plant, setImagesChanged]);

    const revertPlant = () => {
        setChangedPlant(plant);
        findImageData();
    };

    const savePlant = useCallback(async () => {
        if (!changedPlant) return;
        const plant_data: PlantInput = {
            id: changedPlant.id,
            latinName: changedPlant.latinName,
            traits: changedPlant.traits?.map(t => ({ name: t.name, value: t.value })) ?? [],
            skus: changedPlant.skus?.map(s => ({
                id: s.id,
                availability: parseInt(s.availability + ""),
                isDiscountable: s.isDiscountable ?? false,
                sku: s.sku,
                size: s.size,
                note: s.note,
                price: s.price,
                status: s.status as SkuStatus,
                // discountIds: s.discounts?.map(d => d.discount.id) ?? [],
            })) ?? [],
            images: imageData?.map(d => {
                return { hash: d.image.hash, isDisplay: d.isDisplay ?? false };
            }) ?? [],
        };
        console.log('plant dataaaaa', plant_data)
        mutationWrapper<updatePlant_updatePlant, updatePlantVariables>({
            mutation: updatePlant,
            input: plant_data,
            successMessage: () => "Plant updated.",
            onSuccess: () => setImagesChanged(false),
            errorMessage: () => "Failed to update plant.",
        });
    }, [changedPlant, imageData, updatePlant, setImagesChanged]);

    const removePlant = useCallback(() => {
        if (!changedPlant) return;
        PubSub.get().publishAlertDialog({
            message: `Are you sure you want to delete ${changedPlant.latinName}?`,
            buttons: [{
                text: "Yes",
                onClick: () => {
                    mutationWrapper<deletePlants_deletePlants, deletePlantsVariables>({
                        mutation: deletePlant,
                        input: { ids: [changedPlant.id] },
                        successMessage: () => "Plant deleted.",
                        onSuccess: () => onClose(),
                        errorMessage: () => "Failed to delete plant.",
                    });
                },
            }, {
                text: "No",
            }],
        });
    }, [changedPlant, deletePlant, onClose]);

    const updateTrait = useCallback((traitName, value, createIfNotExists) => {
        if (!changedPlant) return;
        const updatedPlant = setPlantTrait(traitName, value, changedPlant, createIfNotExists);
        if (updatedPlant) setChangedPlant(updatedPlant);
    }, [changedPlant]);

    const getSkuField = useCallback((fieldName) => {
        if (!changedPlant?.skus) return "";
        if (!Array.isArray(changedPlant?.skus) || currSkuIndex < 0 || currSkuIndex >= changedPlant.skus.length) return "";
        return changedPlant.skus[currSkuIndex][fieldName];
    }, [changedPlant, currSkuIndex]);

    const updateSkuField = useCallback((fieldName, value) => {
        const updatedPlant = setPlantSkuField(fieldName, currSkuIndex, value, changedPlant);
        if (updatedPlant) setChangedPlant(updatedPlant);
    }, [changedPlant, currSkuIndex]);

    const changes_made = !_.isEqual(plant, changedPlant) || imagesChanged;

    return (
        <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
            <TopBar
                display="dialog"
                title="Edit Plant"
                onClose={onClose}
                options={[{
                    Icon: DeleteIcon,
                    label: "Delete",
                    onClick: removePlant,
                }]}
            />
            <Box sx={{
                background: palette.background.default,
                flex: "auto",
            }}>
                <Box display="flex" flexDirection="column" sx={{
                    height: "100%",
                    maxWidth: "800px",
                    margin: "auto",
                    padding: spacing(1),
                    paddingBottom: "80px",
                }}>
                    <ContentCollapse isOpen={true} titleComponent="h3" titleVariant="h5" title="Edit plant info">
                        <Grid container spacing={2} sx={{ marginTop: 0.5, marginBottom: 8 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Latin Name"
                                    value={changedPlant?.latinName}
                                    onChange={e => plant && setChangedPlant({ ...plant, latinName: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Common Name"
                                    value={getPlantTrait("commonName", changedPlant)}
                                    onChange={e => updateTrait("commonName", e.target.value, true)}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={4}
                                    maxRows={10}
                                    size="small"
                                    label="Description"
                                    value={getPlantTrait("description", changedPlant)}
                                    onChange={e => updateTrait("description", e.target.value, true)}
                                />
                            </Grid>
                            {Object.entries(PLANT_TRAITS).map(([label, field]) => (
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={label}
                                        value={getPlantTrait(field, changedPlant) ?? ""}
                                        onChange={e => updateTrait(field, e.target.value, true)}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </ContentCollapse>
                    <ContentCollapse isOpen={true} titleComponent="h3" titleVariant="h5" title="Edit images">
                        <Box display="flex" flexDirection="column" sx={{ gap: 2, marginTop: 1, marginBottom: 8 }}>
                            {/* Upload new images */}
                            <Dropzone
                                autoUpload
                                dropzoneText={"Drag 'n' drop new images here or click"}
                                onUpload={uploadImages}
                                uploadText='Confirm'
                                cancelText='Cancel'
                            />
                            {/* And edit existing images */}
                            <ImageList
                                data={imageData ?? []}
                                onUpdate={(d) => {
                                    setImageData(d as PlantImageInfo[]);
                                    setImagesChanged(true);
                                }}
                            />
                        </Box>
                    </ContentCollapse>
                    <ContentCollapse isOpen={true} titleComponent="h3" titleVariant="h5" title="Edit SKU info">
                        <Box sx={{ marginBottom: 2, marginTop: 1 }}>
                            {skuChips}
                            <IconButton
                                onClick={addSku}
                            >
                                <AddIcon fill={palette.background.textPrimary} />
                            </IconButton>
                        </Box>
                        <Grid container spacing={2} sx={{ paddingBottom: "3vh" }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Plant Code"
                                    value={getSkuField("sku")}
                                    onChange={e => updateSkuField("sku", e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="SKU Size"
                                    type="number"
                                    value={getSkuField("size")}
                                    onChange={e => updateSkuField("size", e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Price ($)"
                                    type="number"
                                    value={getSkuField("price")}
                                    onChange={e => updateSkuField("price", e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Availability"
                                    type="number"
                                    value={getSkuField("availability")}
                                    onChange={e => updateSkuField("availability", e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Button
                                    fullWidth
                                    startIcon={<DeleteIcon />}
                                    onClick={removeSku}
                                    variant="outlined"
                                >Delete</Button>
                            </Grid>
                        </Grid>
                    </ContentCollapse>
                </Box>
                <Box sx={{
                    position: "fixed",
                    bottom: "0",
                    width: "-webkit-fill-available",
                    zIndex: 1,
                }}>
                    <Grid
                        container
                        spacing={2}
                        sx={{
                            padding: spacing(2),
                            background: palette.primary.main,
                        }}
                    >
                        <Grid item xs={6}>
                            <Button
                                fullWidth
                                disabled={!changes_made}
                                startIcon={<SaveIcon />}
                                onClick={savePlant}
                                variant="contained"
                            >Update</Button>
                        </Grid>
                        <Grid item xs={6}>
                            <Button
                                fullWidth
                                disabled={!changes_made}
                                startIcon={<CancelIcon />}
                                onClick={revertPlant}
                                variant="outlined"
                            >Cancel</Button>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Dialog >
    );
};
