import React, { useState, useEffect, useCallback } from 'react';
import {
    PageContainer,
    SearchBar,
    Selector
} from 'components';
import { ShoppingList } from '../ShoppingList/ShoppingList';
import { SORT_OPTIONS, PubSub } from 'utils';
import { traitOptionsQuery } from 'graphql/query';
import { useQuery } from '@apollo/client';
import { Switch, Grid, Button, SwipeableDrawer, FormControlLabel, Box, useTheme } from '@mui/material';
import { printAvailability } from 'utils';
import { CloseIcon } from '@shared/icons';

makeStyles((theme) => ({
    drawerPaper: {
        background: palette.primary.light,
        color: palette.primary.contrastText,
        borderRight: `2px solid ${palette.text.primary}`,
        padding: spacing(1),
    },
    formControl: {
        display: 'flex',
        justifyContent: 'center',
        '& > *': {
            margin: spacing(1),
        },
    },
    padBottom: {
        marginBottom: spacing(2),
    },
}));

export const ShoppingPage = ({
    session,
    onSessionUpdate,
    business,
    cart,
}) => {
    const { palette, spacing } = useTheme();

    const [open, setOpen] = useState(false);
    const { data: traitOptionsData } = useQuery(traitOptionsQuery);
    const [traitOptions, setTraitOptions] = useState({});
    const [filters, setFilters] = useState(null);
    const [sortBy, setSortBy] = useState(SORT_OPTIONS[0].value);
    const [searchString, setSearchString] = useState('');
    const [hideOutOfStock, setHideOutOfStock] = useState(false);

    useEffect(() => {
        let openSub = PubSub.get().subscribeArrowMenuOpen((data) => {
            setOpen(open => data === 'toggle' ? !open : data);
        });
        return (() => {
            PubSub.get().unsubscribe(openSub);
        })
    }, [])

    useEffect(() => {
        let traitOptions = {};
        for (const option of traitOptionsData?.traitOptions ?? []) {
            traitOptions[option.name] = option.values;
        }
        setTraitOptions(traitOptions);
    }, [traitOptionsData])

    const handleFiltersChange = useCallback((name, value) => {
        let modified_filters = { ...filters };
        modified_filters[name] = value;
        setFilters(modified_filters)
    }, [filters])

    const handleHideChange = useCallback((event) => {
        setHideOutOfStock(event.target.checked);
    }, [])

    const traitOptionsToSelector = useCallback((title, field) => {
        if (!traitOptions) return;
        let options = traitOptions[field];
        if (!options || !Array.isArray(options) || options.length <= 0) return null;
        let selected = filters ? filters[field] : '';
        return (
            <Selector
                className={`${classes.padBottom} ${classes.selector}`}
                fullWidth
                options={options}
                selected={selected || ''}
                handleChange={(e) => handleFiltersChange(field, e.target.value)}
                inputAriaLabel={`${field}-selector-label`}
                label={title} />
        )
    }, [classes.padBottom, classes.selector, traitOptions, filters, handleFiltersChange])

    const resetSearchConstraints = () => {
        setSortBy(SORT_OPTIONS[0].value)
        setSearchString('')
        setFilters({});
    }

    let optionsContainer = (
        <Grid className={classes.padBottom} container spacing={2}>
            <Grid item xs={12} sm={6}>
                <Button
                    fullWidth
                    color="secondary"
                    startIcon={<RestoreIcon />}
                    onClick={resetSearchConstraints}
                >Reset</Button>
            </Grid>
            <Grid item xs={12} sm={6}>
                <Button
                    fullWidth
                    color="secondary"
                    startIcon={<CloseIcon />}
                    onClick={() => PubSub.get().publishArrowMenuOpen(false)}
                >Close</Button>
            </Grid>
        </Grid>
    );

    let traitList = [
        // ['size', 'Sizes'], TODO this is a sku field, and must be treated as such
        ['Attracts Pollinators & Wildlife', 'attractsPollinatorsAndWildlife'],
        ['Bloom Colors', 'bloomColors'],
        ['Bloom Times', 'bloomTimes'],
        ['Drought Tolerance', 'droughtTolerance'],
        ['Grown Height', 'grownHeight'],
        ['Grown Spread', 'grownSpread'],
        ['Growth Rate', 'growthRate'],
        ['Hardiness Zones', 'zone'],
        ['Light Ranges', 'lightRanges'],
        ['Optimal Light', 'optimalLight'],
        ['Salt Tolerance', 'saltTolerance'],
        ['Soil Moistures', 'soilMoistures'],
        ['Soil PHs', 'soilPhs'],
        ['Soil Types', 'soilTypes'],
    ]

    return (
        <PageContainer>
            <SwipeableDrawer classes={{ paper: classes.drawerPaper }} anchor="left" open={open} onOpen={()=>{}} onClose={() => PubSub.get().publishArrowMenuOpen(false)}>
                {optionsContainer}
                <Box>
                    <Selector
                        fullWidth
                        options={SORT_OPTIONS}
                        selected={sortBy}
                        handleChange={(e) => setSortBy(e.target.value)}
                        inputAriaLabel='sort-selector-label'
                        label="Sort" />
                    <h2>Search</h2>
                    <SearchBar className={classes.padBottom} fullWidth debounce={300} onChange={(e) => setSearchString(e.target.value)} />
                    <h2>Filters</h2>
                    {traitList.map(d => traitOptionsToSelector(...d))}
                    {/* {filters_to_checkbox(['Yes', 'No'], 'Jersey Native')}
                    {filters_to_checkbox(['Yes', 'No'], 'Discountable')} */}
                </Box>
                {optionsContainer}
            </SwipeableDrawer>
            <Box className={classes.formControl}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={hideOutOfStock}
                            onChange={handleHideChange}
                            color="secondary"
                        />
                    }
                    label="Hide out of stock"
                />
                <Button
                    color="secondary"
                    startIcon={<FilterListIcon />}
                    onClick={() => PubSub.get().publishArrowMenuOpen('toggle')}
                >Filter</Button>
                <Button
                    color="secondary"
                    startIcon={<PrintIcon />}
                    onClick={() => printAvailability(session, business?.BUSINESS_NAME?.Long)}
                >Print</Button>
            </Box>
            <ShoppingList
                session={session}
                onSessionUpdate={onSessionUpdate}
                cart={cart}
                sort={sortBy}
                filters={filters}
                searchString={searchString}
                hideOutOfStock={hideOutOfStock}
            />
        </PageContainer>
    );
}