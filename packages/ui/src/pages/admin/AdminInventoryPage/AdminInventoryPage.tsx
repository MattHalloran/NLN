// This page gives the admin the ability to:
// 1) Delete existing SKUs
// 2) Edit existing SKU data, including general plant info, availability, etc.
// 3) Create a new SKU, either from scratch or by using plant species info

import { useMutation, useQuery } from "@apollo/client";
import { Box, FormControlLabel, Grid, Switch, useTheme } from "@mui/material";
import { uploadAvailabilityMutation } from "api/mutation";
import { plantsQuery, traitOptionsQuery } from "api/query";
import { graphqlWrapperHelper } from "api/utils";
import { AdminTabOption, AdminTabs, CardGrid, Dropzone, EditPlantDialog, PageContainer, PlantCard, SearchBar, Selector } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useWindowSize } from "hooks/useWindowSize";
import { useCallback, useState } from "react";
import { PubSub, SORT_OPTIONS } from "utils";

const helpText = `This page has the following features:  

 - Upload availability from a spreadsheet  

 - Edit/Delete an existing plant  

 - Add/Edit/Delete SKUs`;

export const AdminInventoryPage = () => {
    const { breakpoints } = useTheme();
    const [showActive, setShowActive] = useState(true);
    const [searchString, setSearchString] = useState("");
    // Selected plant data. Used for popup. { plant, selectedSku }
    const [selected, setSelected] = useState<any | null>(null);
    const isMobile = useWindowSize(({ width }) => width <= breakpoints.values.sm);

    const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
    const { data: traitOptions } = useQuery(traitOptionsQuery);
    const { data: plantData } = useQuery(plantsQuery, { variables: { input: { sortBy: sortBy.value, searchString, active: showActive } }, pollInterval: 30000 });
    const [uploadAvailability, { loading }] = useMutation(uploadAvailabilityMutation);

    const availabilityUpload = useCallback((acceptedFiles: File[]) => {
        graphqlWrapperHelper({
            call: () => uploadAvailability({ variables: { file: acceptedFiles[0] } }),
            successCondition: (success: any) => success === true,
            onSuccess: () => PubSub.get().publishAlertDialog({
                message: "Availability uploaded. This process can take up to 30 seconds. The page will update automatically. Please be patient💚",
                buttons: [{
                    text: "OK",
                }],
            }),
        });
    }, [uploadAvailability]);

    return (
        <PageContainer sx={{ paddingLeft: "0!important", paddingRight: "0!important" }}>
            <EditPlantDialog
                plant={selected?.plant}
                selectedSku={selected?.selectedSku}
                trait_options={traitOptions?.traitOptions}
                open={selected !== null}
                onClose={() => setSelected(null)} />
            <TopBar
                display="page"
                help={helpText}
                title="Inventory"
                below={<AdminTabs defaultTab={AdminTabOption.Inventory} />}
            />
            <Box p={2}>
                <Box>
                    {/* <Button variant="contained" onClick={() => editSku({})}>Create new plant</Button> */}
                </Box>
                <Dropzone
                    dropzoneText={"Drag 'n' drop availability file here or click"}
                    maxFiles={1}
                    acceptedFileTypes={[".csv", ".xls", ".xlsx", "text/csv", "application/vnd.ms-excel", "application/csv", "text/x-csv", "application/x-csv", "text/comma-separated-values", "text/x-comma-separated-values"]}
                    onUpload={availabilityUpload}
                    uploadText='Upload'
                    disabled={loading}
                />
                <h2>Filter</h2>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                        <Selector
                            color={undefined}
                            fullWidth
                            options={SORT_OPTIONS}
                            getOptionLabel={(o) => o.label}
                            selected={sortBy}
                            handleChange={(c) => setSortBy(c)}
                            inputAriaLabel='sort-plants-selector-label'
                            label="Sort"
                            sx={{ marginBottom: "1em" }}
                        />
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
                        <SearchBar fullWidth value={searchString} onChange={setSearchString} />
                    </Grid>
                </Grid>
            </Box>
            <CardGrid minWidth={300}>
                {plantData?.plants?.map((plant, index) => <PlantCard key={index}
                    isAdminPage={true}
                    isMobile={isMobile}
                    plant={plant}
                    onClick={setSelected} />)}
            </CardGrid>
        </PageContainer>
    );
};
