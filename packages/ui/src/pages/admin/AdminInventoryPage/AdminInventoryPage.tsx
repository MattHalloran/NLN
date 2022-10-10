// This page gives the admin the ability to:
// 1) Delete existing SKUs
// 2) Edit existing SKU data, including general plant info, availability, etc.
// 3) Create a new SKU, either from scratch or by using plant species info

import React, { useState } from 'react';
import { uploadAvailabilityMutation } from 'graphql/mutation';
import { plantsQuery, traitOptionsQuery } from 'graphql/query';
import { useQuery, useMutation } from '@apollo/client';
import { PubSub, SORT_OPTIONS } from 'utils';
import {
    AdminBreadcrumbs,
    EditPlantDialog,
    Dropzone,
    PlantCard,
    Selector,
    SearchBar
} from 'components';
import {
    Box,
    FormControlLabel,
    Grid,
    Switch,
    Typography
} from '@mui/material';

makeStyles((theme) => ({
    header: {
        textAlign: 'center',
    },
    cardFlex: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        alignItems: 'stretch',
    },
    plantSelector: {
        marginBottom: '1em',
    },
}));

export const AdminInventoryPage = () => {
    const { palette } = useTheme();

    const [showActive, setShowActive] = useState(true);
    const [searchString, setSearchString] = useState('');
    // Selected plant data. Used for popup. { plant, selectedSku }
    const [selected, setSelected] = useState(null);

    const [sortBy, setSortBy] = useState(SORT_OPTIONS[0].value);
    const { data: traitOptions } = useQuery(traitOptionsQuery);
    const { data: plantData } = useQuery(plantsQuery, { variables: { sortBy, searchString, active: showActive }, pollInterval: 5000 });
    const [uploadAvailability, { loading }] = useMutation(uploadAvailabilityMutation);

    const availabilityUpload = (acceptedFiles) => {
        mutationWrapper({
            mutation: uploadAvailability,
            input: { file: acceptedFiles[0] },
            onSuccess: () => PubSub.get().publishAlertDialog({
                message: 'Availability uploaded. This process can take up to 30 seconds. The page will update automatically. Please be patient💚',
                buttons: [{
                    text: 'OK',
                }]
            }),
        })
    }

    return (
        <Box id="page">
            <EditPlantDialog
                plant={selected?.plant}
                selectedSku={selected?.selectedSku}
                trait_options={traitOptions?.traitOptions}
                open={selected !== null}
                onClose={() => setSelected(null)} />
            <AdminBreadcrumbs textColor={palette.secondary.dark} />
            <Box className={classes.header}>
                <Typography variant="h3" component="h1">Manage Inventory</Typography>
            </Box>
            <h3>This page has the following features:</h3>
            <p>👉 Upload availability from a spreadsheet</p>
            <p>👉 Edit/Delete an existing plant</p>
            <p>👉 Add/Edit/Delete SKUs</p>
            <Box>
                {/* <Button onClick={() => editSku({})}>Create new plant</Button> */}
            </Box>
            <Dropzone
                dropzoneText={'Drag \'n\' drop availability file here or click'}
                maxFiles={1}
                acceptedFileTypes={['.csv', '.xls', '.xlsx', 'text/csv', 'application/vnd.ms-excel', 'application/csv', 'text/x-csv', 'application/x-csv', 'text/comma-separated-values', 'text/x-comma-separated-values']}
                onUpload={availabilityUpload}
                uploadText='Upload Availability'
                disabled={loading}
            />
            <h2>Filter</h2>
            <Grid className={classes.padBottom} container spacing={2}>
                <Grid item xs={12} sm={4}>
                    <Selector
                        className={classes.plantSelector}
                        fullWidth
                        options={SORT_OPTIONS}
                        selected={sortBy}
                        handleChange={(e) => setSortBy(e.target.value)}
                        inputAriaLabel='sort-plants-selector-label'
                        label="Sort" />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={showActive}
                                onChange={(_, value) => setShowActive(value)}
                                color="secondary"
                            />
                        }
                        label={showActive ? "Active plants" : "Inactive plants"}
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <SearchBar fullWidth onChange={(e) => setSearchString(e.target.value)} />
                </Grid>
            </Grid>
            <Box className={classes.cardFlex}>
                {plantData?.plants?.map((plant, index) => <PlantCard key={index}
                    plant={plant}
                    onClick={setSelected} />)}
            </Box>
        </Box >
    );
}