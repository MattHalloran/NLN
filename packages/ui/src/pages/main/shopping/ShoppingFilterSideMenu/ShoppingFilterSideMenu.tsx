import { Box, Button, Grid, IconButton, SwipeableDrawer, useTheme } from "@mui/material";
import { SearchBar, Selector } from "components";
import { CloseIcon, DeleteIcon } from "icons";
import { useCallback, useEffect } from "react";
import { PubSub, SORT_OPTIONS, noop, useSideMenu, useWindowSize } from "utils";

export const shoppingFilterSideMenuDisplayData = {
    persistentOnDesktop: true,
    sideForRightHanded: "left",
} as const;

const id = "shopping-filter-side-menu";

const traitList: [string, string][] = [
    // ['size', 'Sizes'], TODO this is a sku field, and must be treated as such
    ["Attracts Pollinators & Wildlife", "attractsPollinatorsAndWildlife"],
    ["Bloom Colors", "bloomColors"],
    ["Bloom Times", "bloomTimes"],
    ["Drought Tolerance", "droughtTolerance"],
    ["Grown Height", "grownHeight"],
    ["Grown Spread", "grownSpread"],
    ["Growth Rate", "growthRate"],
    ["Hardiness Zones", "zone"],
    ["Light Ranges", "lightRanges"],
    ["Optimal Light", "optimalLight"],
    ["Salt Tolerance", "saltTolerance"],
    ["Soil Moistures", "soilMoistures"],
    ["Soil PHs", "soilPhs"],
    ["Soil Types", "soilTypes"],
];

export const ShoppingFilterSideMenu = ({
    filters,
    handleFiltersChange,
    handleSearchChange,
    handleSortByChange,
    searchString,
    sortBy,
    traitOptions,
}: {
    filters: Record<string, string>,
    handleFiltersChange: (updatedFilters: Record<string, string>) => void,
    handleSearchChange: (updatedSearchString: string) => void,
    handleSortByChange: (updatedSortBy: { label: string, value: string }) => void,
    searchString: string,
    sortBy: { label: string, value: string },
    traitOptions: Record<string, string[]>,
}) => {
    const { breakpoints, palette, spacing } = useTheme();
    const isMobile = useWindowSize(({ width }) => width <= breakpoints.values.md);

    const { isOpen, close } = useSideMenu(id, isMobile);
    // When moving between mobile/desktop, publish current state
    useEffect(() => {
        PubSub.get().publishSideMenu({ id, isOpen });
    }, [breakpoints, isOpen]);
    // Close when leaving page
    useEffect(() => {
        return () => {
            PubSub.get().publishSideMenu({ id, isOpen: false });
        };
    }, []);

    const onFiltersChange = useCallback((name: string, value: string) => {
        const modified_filters = { ...filters };
        modified_filters[name] = value;
        handleFiltersChange(modified_filters);
    }, [filters, handleFiltersChange]);

    const traitOptionsToSelector = useCallback((title: string, field: string) => {
        if (!traitOptions) return;
        const options = traitOptions[field];
        if (!options || !Array.isArray(options) || options.length <= 0) return null;
        const selected: string = filters ? filters[field] : "";
        return (
            <Selector
                color={undefined}
                fullWidth
                options={options}
                selected={selected}
                getOptionLabel={(option) => option}
                handleChange={(c) => onFiltersChange(field, c)}
                inputAriaLabel={`${field}-selector-label`}
                label={title}
                sx={{ marginBottom: spacing(2) }}
            />
        );
    }, [traitOptions, filters, spacing, onFiltersChange]);

    const resetSearchConstraints = () => {
        handleSortByChange(SORT_OPTIONS[0]);
        handleSearchChange("");
        handleFiltersChange({});
    };

    const optionsContainer = (
        <Grid mb={2} container spacing={2}>
            <Grid item xs={12} sm={6}>
                <Button
                    fullWidth
                    color="secondary"
                    startIcon={<DeleteIcon />}
                    onClick={resetSearchConstraints}
                    variant="contained"
                >Reset</Button>
            </Grid>
            <Grid item xs={12} sm={6}>
                <Button
                    fullWidth
                    color="secondary"
                    startIcon={<CloseIcon />}
                    onClick={() => PubSub.get().publishSideMenu({ id, isOpen: false })}
                    variant="contained"
                >Close</Button>
            </Grid>
        </Grid>
    );

    return (
        <SwipeableDrawer
            anchor="left"
            open={isOpen}
            onOpen={noop}
            onClose={close}
            PaperProps={{ id }}
            variant={isMobile ? "temporary" : "persistent"}
            sx={{
                "& .MuiDrawer-paper": {
                    background: palette.background.default,
                    color: palette.background.textPrimary,
                },
            }}
        >
            <IconButton
                onClick={close}
                sx={{
                    background: palette.primary.dark,
                    borderRadius: 0,
                    borderBottom: `1px solid ${palette.divider}`,
                    justifyContent: "end",
                    direction: "rtl",
                    height: "64px",
                }}
            >
                <CloseIcon fill={palette.primary.contrastText} />
            </IconButton>
            {optionsContainer}
            <Box p={2}>
                <Selector
                    fullWidth
                    options={SORT_OPTIONS}
                    selected={sortBy}
                    getOptionLabel={(option) => option.label}
                    handleChange={(c) => handleSortByChange(c)}
                    inputAriaLabel='sort-selector-label'
                    label="Sort" />
                <h2>Search</h2>
                <SearchBar sx={{ marginBottom: spacing(2) }} fullWidth debounce={300} value={searchString} onChange={handleSearchChange} />
                <h2>Filters</h2>
                {traitList.map(d => traitOptionsToSelector(...d))}
                {/* {filters_to_checkbox(['Yes', 'No'], 'Jersey Native')}
                    {filters_to_checkbox(['Yes', 'No'], 'Discountable')} */}
            </Box>
            {optionsContainer}
        </SwipeableDrawer>
    );
};
