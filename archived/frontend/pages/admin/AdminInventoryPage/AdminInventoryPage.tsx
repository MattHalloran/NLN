// This page gives the admin the ability to:
// 1) Delete existing SKUs
// 2) Edit existing SKU data, including general plant info, availability, etc.
// 3) Create a new SKU, either from scratch or by using plant species info

import { useMutation, useQuery } from "@apollo/client";
import { Box, FormControlLabel, Grid, Switch, useTheme, Card, CardContent, Typography, Chip, Paper, IconButton } from "@mui/material";
import { CloudUpload, FilterList, Inventory, Refresh, LocalFlorist, CheckCircle, Cancel } from "@mui/icons-material";
import { uploadAvailabilityMutation } from "api/mutation";
import { plantsQuery, traitOptionsQuery } from "api/query";
import { graphqlWrapperHelper } from "api/utils";
import { AdminTabOption, AdminTabs, CardGrid, Dropzone, EditPlantDialog, PageContainer, PlantCard, SearchBar, Selector } from "components";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { useWindowSize } from "hooks/useWindowSize";
import { useCallback, useState } from "react";
import { PubSub, SORT_OPTIONS, designTokens } from "utils";

const helpText = `This page has the following features:  

 - Upload availability from a spreadsheet  

 - Edit/Delete an existing plant  

 - Add/Edit/Delete SKUs`;

export const AdminInventoryPage = () => {
    const { breakpoints, palette } = useTheme();
    const [showActive, setShowActive] = useState(true);
    const [searchString, setSearchString] = useState("");
    // Selected plant data. Used for popup. { plant, selectedSku }
    const [selected, setSelected] = useState<any | null>(null);
    const isMobile = useWindowSize(({ width }) => width <= breakpoints.values.sm);

    const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
    const { data: traitOptions } = useQuery(traitOptionsQuery);
    const { data: plantData, refetch } = useQuery(plantsQuery, { variables: { input: { sortBy: sortBy.value, searchString, active: showActive } }, pollInterval: 30000 });
    const [uploadAvailability, { loading }] = useMutation(uploadAvailabilityMutation);

    const availabilityUpload = useCallback((acceptedFiles: File[]) => {
        graphqlWrapperHelper({
            call: () => uploadAvailability({ variables: { file: acceptedFiles[0] } }),
            successCondition: (success: any) => success === true,
            onSuccess: () => PubSub.get().publishAlertDialog({
                message: "Availability uploaded. This process can take up to 30 seconds. The page will update automatically. Please be patient.",
                buttons: [{
                    text: "OK",
                }],
            }),
        });
    }, [uploadAvailability]);

    // Calculate inventory statistics
    const totalPlants = plantData?.plants?.length || 0;
    const activePlants = plantData?.plants?.filter((p: any) => p.isActive)?.length || 0;
    const inactivePlants = totalPlants - activePlants;
    const plantsWithStock = plantData?.plants?.filter((p: any) => p.skus?.some((sku: any) => sku.quantity > 0))?.length || 0;

    return (
        <PageContainer sx={{ paddingLeft: "0!important", paddingRight: "0!important" }}>
            <EditPlantDialog
                plant={selected?.plant}
                selectedSku={selected?.selectedSku}
                open={selected !== null}
                onClose={() => setSelected(null)} />
            <TopBar
                display="page"
                help={helpText}
                title="Inventory Management"
                below={<AdminTabs defaultTab={AdminTabOption.Inventory} />}
            />
            
            {/* Summary Statistics Cards */}
            <Box px={3} py={2}>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ 
                            bgcolor: palette.background.paper,
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 1,
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h4" fontWeight="600" color="text.primary">
                                            {totalPlants.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Total Plants
                                        </Typography>
                                    </Box>
                                    <LocalFlorist sx={{ fontSize: 32, color: palette.primary.main, opacity: 0.7 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ 
                            bgcolor: palette.background.paper,
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 1,
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h4" fontWeight="600" color="text.primary">
                                            {activePlants.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Active Plants
                                        </Typography>
                                    </Box>
                                    <CheckCircle sx={{ fontSize: 32, color: "#2e7d32", opacity: 0.7 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ 
                            bgcolor: palette.background.paper,
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 1,
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h4" fontWeight="600" color="text.primary">
                                            {inactivePlants.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Inactive Plants
                                        </Typography>
                                    </Box>
                                    <Cancel sx={{ fontSize: 32, color: "#ed6c02", opacity: 0.7 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ 
                            bgcolor: palette.background.paper,
                            border: `1px solid ${palette.divider}`,
                            borderRadius: 1,
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h4" fontWeight="600" color="text.primary">
                                            {plantsWithStock.toLocaleString()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            In Stock
                                        </Typography>
                                    </Box>
                                    <Inventory sx={{ fontSize: 32, color: palette.primary.main, opacity: 0.7 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Upload Section */}
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 3, 
                        mb: 3, 
                        borderRadius: 1,
                        bgcolor: palette.background.paper,
                        border: `1px solid ${palette.divider}`,
                    }}
                >
                    <Box display="flex" alignItems="center" mb={2}>
                        <CloudUpload sx={{ mr: 1, color: palette.text.secondary }} />
                        <Typography variant="h6" fontWeight="600" color="text.primary">
                            Upload Inventory Data
                        </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" mb={3}>
                        Import plant availability and pricing data from spreadsheet files (.csv, .xls, .xlsx)
                    </Typography>
                    <Dropzone
                        dropzoneText={"Drag 'n' drop availability file here or click to browse"}
                        maxFiles={1}
                        acceptedFileTypes={[".csv", ".xls", ".xlsx", "text/csv", "application/vnd.ms-excel", "application/csv", "text/x-csv", "application/x-csv", "text/comma-separated-values", "text/x-comma-separated-values"]}
                        onUpload={availabilityUpload}
                        uploadText='Upload File'
                        disabled={loading}
                        sxs={{ 
                            root: { 
                                maxWidth: "100%", 
                                bgcolor: palette.action.hover,
                                border: `2px dashed ${palette.divider}`,
                                color: palette.text.secondary,
                                "&:hover": {
                                    bgcolor: palette.action.selected,
                                    borderColor: palette.primary.main,
                                },
                            }, 
                        }}
                    />
                </Paper>

                {/* Filters Section */}
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 3, 
                        mb: 3, 
                        borderRadius: 1,
                        bgcolor: palette.background.paper,
                        border: `1px solid ${palette.divider}`,
                    }}
                >
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                        <Box display="flex" alignItems="center">
                            <FilterList sx={{ mr: 1, color: palette.text.secondary }} />
                            <Typography variant="h6" fontWeight="600" color="text.primary">
                                Filters & Search
                            </Typography>
                        </Box>
                        <IconButton 
                            onClick={() => refetch()} 
                            size="small"
                            sx={{ 
                                color: palette.text.secondary,
                                "&:hover": { 
                                    color: palette.primary.main,
                                    bgcolor: palette.action.hover, 
                                },
                            }}
                        >
                            <Refresh />
                        </IconButton>
                    </Box>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <Selector
                                color={undefined}
                                fullWidth
                                options={SORT_OPTIONS}
                                getOptionLabel={(o) => o.label}
                                selected={sortBy}
                                handleChange={(c) => setSortBy(c)}
                                inputAriaLabel='sort-plants-selector-label'
                                label="Sort Order"
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Box display="flex" alignItems="center" height="100%">
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={showActive}
                                            onChange={(_, value) => setShowActive(value)}
                                            color="primary"
                                        />
                                    }
                                    label={
                                        <Box display="flex" alignItems="center">
                                            {showActive ? "Active plants" : "Inactive plants"}
                                            <Chip 
                                                label={showActive ? "ACTIVE" : "INACTIVE"}
                                                size="small"
                                                sx={{ 
                                                    ml: 1, 
                                                    bgcolor: showActive ? "#2e7d32" : "#ed6c02",
                                                    color: "white",
                                                    fontSize: "0.7rem",
                                                    height: 20,
                                                }}
                                            />
                                        </Box>
                                    }
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <SearchBar 
                                fullWidth 
                                value={searchString} 
                                onChange={setSearchString}
                                placeholder="Search plants by name, species..."
                            />
                        </Grid>
                    </Grid>
                </Paper>
            </Box>

            {/* Plant Cards Grid */}
            <Box px={3} pb={3}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                    <Typography variant="h6" fontWeight="600">
                        {showActive ? "Active" : "Inactive"} Plants ({showActive ? activePlants : inactivePlants})
                    </Typography>
                    {searchString && (
                        <Typography variant="body2" color="text.secondary">
                            Filtered results for: "{searchString}"
                        </Typography>
                    )}
                </Box>
                <CardGrid minWidth={300}>
                    {plantData?.plants?.map((plant: any, index: number) => (
                        <PlantCard 
                            key={index}
                            isAdminPage={true}
                            isMobile={isMobile}
                            plant={plant}
                            onClick={setSelected}
                        />
                    ))}
                </CardGrid>
                {plantData?.plants?.length === 0 && (
                    <Box 
                        display="flex" 
                        flexDirection="column" 
                        alignItems="center" 
                        py={8}
                        sx={{ opacity: 0.6 }}
                    >
                        <LocalFlorist sx={{ fontSize: 80, mb: 2, color: palette.text.secondary }} />
                        <Typography variant="h6" color="text.secondary" mb={1}>
                            {searchString ? "No plants found" : showActive ? "No active plants" : "No inactive plants"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {searchString ? "Try adjusting your search terms" : "Upload inventory data to get started"}
                        </Typography>
                    </Box>
                )}
            </Box>
        </PageContainer>
    );
};
