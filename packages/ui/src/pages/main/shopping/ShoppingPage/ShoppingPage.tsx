import { useMutation, useQuery } from "@apollo/client";
import { APP_LINKS } from "@local/shared";
import { Box, Button, IconButton, Stack, useTheme } from "@mui/material";
import { mutationWrapper, upsertOrderItemMutation } from "api";
import { plants_plants, plants_plants_skus } from "api/generated/plants";
import { traitOptions } from "api/generated/traitOptions";
import { upsertOrderItemVariables, upsertOrderItem_upsertOrderItem } from "api/generated/upsertOrderItem";
import { plantsQuery, traitOptionsQuery } from "api/query";
import { CardGrid, PlantCard, PlantDialog, SnackSeverity } from "components";
import { SideActionsButtons } from "components/buttons/SideActionsButtons/SideActionsButtons";
import { BusinessContext } from "contexts/BusinessContext";
import { SessionContext } from "contexts/SessionContext";
import { useDimensions } from "hooks/useDimensions";
import { FilterIcon, PrintIcon } from "icons";
import { useContext, useEffect, useState } from "react";
import { parseSearchParams, useLocation } from "route";
import { pagePaddingBottom } from "styles";
import { PubSub, SORT_OPTIONS, getPlantTrait, printAvailability } from "utils";
import { ShoppingFilterSideMenu } from "../ShoppingFilterSideMenu/ShoppingFilterSideMenu";

export const ShoppingPage = () => {
    const session = useContext(SessionContext);
    const business = useContext(BusinessContext);
    const [, setLocation] = useLocation();
    const { breakpoints, palette } = useTheme();

    const { dimensions, ref: dimRef } = useDimensions();

    const { data: traitOptionsData } = useQuery<traitOptions>(traitOptionsQuery);
    const [traitOptions, setTraitOptions] = useState<{ [key: string]: string[] }>({});
    const [filters, setFilters] = useState<{ [x: string]: string }>({});
    const [hideOutOfStock, setHideOutOfStock] = useState(false);
    const [searchString, setSearchString] = useState("");
    const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);

    useEffect(() => {
        const traitOptions: { [key: string]: string[] } = {};
        for (const option of traitOptionsData?.traitOptions ?? []) {
            traitOptions[option.name] = option.values;
        }
        setTraitOptions(traitOptions);
    }, [traitOptionsData]);

    // Plant data for all visible plants (i.e. not filtered)
    const [plants, setPlants] = useState<plants_plants[]>([]);
    const [sku, setSku] = useState<string | undefined>(undefined);
    useEffect(() => {
        const searchParams = parseSearchParams();
        if (typeof searchParams.sku === "string") {
            setSku(searchParams.sku);
        }
    }, [setLocation]);
    // Find current plant and current sku
    const currPlant = Array.isArray(plants) ? plants.find((p: any) => p.skus.some(s => s.sku === sku)) : undefined;
    const currSku = currPlant?.skus ? currPlant.skus.find(s => s.sku === sku) : undefined;
    const { data: plantData } = useQuery(plantsQuery, { variables: { input: { sortBy: sortBy.value, searchString, active: true, onlyInStock: hideOutOfStock } } });
    const [upsertOrderItem] = useMutation(upsertOrderItemMutation);

    // Determine which skus will be visible to the customer (i.e. not filtered out)
    useEffect(() => {
        if (!filters || Object.values(filters).length === 0) {
            setPlants(plantData?.plants);
            return;
        }
        const filtered_plants: any[] = [];
        for (const plant of (plantData?.plants ?? [])) {
            let found = false;
            for (const [key, value] of Object.entries(filters)) {
                if (found) break;
                const traitValue = getPlantTrait(key, plant);
                if (traitValue && traitValue.toLowerCase() === (value + "").toLowerCase()) {
                    found = true;
                    break;
                }
                if (!Array.isArray(plant.skus)) continue;
                for (let i = 0; i < plant.skus.length; i++) {
                    const skuValue = plant.skus[i][key];
                    if (skuValue && skuValue.toLowerCase() === (value + "").toLowerCase()) {
                        found = true;
                        break;
                    }
                }
            }
            if (found) filtered_plants.push(plant);
        }
        setPlants(filtered_plants);
    }, [plantData, filters, searchString, hideOutOfStock]);

    const expandSku = (sku) => {
        setLocation(APP_LINKS.Shopping + "/" + sku);
        setSku(sku);
    };

    const closeSku = () => {
        setLocation(APP_LINKS.Shopping);
        setSku(undefined);
    };

    const toCart = () => {
        setLocation(APP_LINKS.Cart);
    };

    const addToCart = (sku: plants_plants_skus, quantity: number) => {
        if (!session?.id) return;
        const max_quantity = sku.availability;
        if (Number.isInteger(max_quantity) && quantity > max_quantity) {
            alert(`Error: Cannot add more than ${max_quantity}!`);
            return;
        }
        mutationWrapper<upsertOrderItem_upsertOrderItem, upsertOrderItemVariables>({
            mutation: upsertOrderItem,
            input: { quantity, orderId: session?.cart?.id, skuId: sku.id },
            successCondition: (data) => data !== null,
            onSuccess: (cart) => {
                PubSub.get().publishSession({ cart });
                PubSub.get().publishSnack({ message: "Item added to cart", buttonText: "View", buttonClicked: toCart, severity: SnackSeverity.Success });
            },
        });
    };

    return (
        <Box ref={dimRef}>
            <ShoppingFilterSideMenu
                hideOutOfStock={hideOutOfStock}
                filters={filters}
                handleHideOutOfStockChange={setHideOutOfStock}
                handleFiltersChange={setFilters}
                handleSearchChange={setSearchString}
                handleSortByChange={setSortBy}
                searchString={searchString}
                sortBy={sortBy}
                traitOptions={traitOptions}
            />
            {dimensions.width >= breakpoints.values.sm && <Stack direction="row" spacing={2} pt={2} justifyContent="center" alignItems="center" mb={2}>
                <Button
                    color="secondary"
                    startIcon={<FilterIcon />}
                    onClick={() => PubSub.get().publishSideMenu({ id: "shopping-filter-side-menu", isOpen: true })}
                    variant="contained"
                >Filter</Button>
                <Button
                    color="secondary"
                    startIcon={<PrintIcon />}
                    onClick={() => printAvailability(session, business?.BUSINESS_NAME?.Long, business?.PHONE?.Label, business?.EMAIL?.Label)}
                    variant="contained"
                >Print</Button>
            </Stack>}
            <CardGrid minWidth={300} showMobileView={dimensions.width < breakpoints.values.sm}>
                {(currPlant) ? <PlantDialog
                    isAdminPage={false}
                    plant={currPlant}
                    selectedSku={currSku}
                    onAddToCart={addToCart}
                    open={currPlant !== null}
                    // navigate back on close
                    onClose={closeSku} /> : null}
                {plants?.map((item, index) =>
                    <PlantCard key={index}
                        isAdminPage={false}
                        isMobile={dimensions.width < breakpoints.values.sm}
                        onClick={(data) => expandSku(data.selectedSku?.sku)}
                        plant={item} />)}
            </CardGrid>
            {dimensions.width < breakpoints.values.sm && <SideActionsButtons
                display="page"
                sx={{
                    position: "fixed",
                    marginBottom: { xs: pagePaddingBottom, md: 0 },
                    bottom: "8px",
                }}
            >
                <IconButton
                    aria-label="Filter"
                    onClick={() => PubSub.get().publishSideMenu({ id: "shopping-filter-side-menu", isOpen: true })}
                    sx={{
                        background: palette.secondary.main,
                        padding: 0,
                        width: "54px",
                        height: "54px",
                    }}
                >
                    <FilterIcon fill={palette.secondary.contrastText} width='36px' height='36px' />
                </IconButton>
                <IconButton
                    aria-label="Print"
                    onClick={() => printAvailability(session, business?.BUSINESS_NAME?.Long, business?.PHONE?.Label, business?.EMAIL?.Label)}
                    sx={{
                        background: palette.secondary.main,
                        padding: 0,
                        width: "54px",
                        height: "54px",
                    }}
                >
                    <PrintIcon fill={palette.secondary.contrastText} width='36px' height='36px' />
                </IconButton>
            </SideActionsButtons>}
        </Box>
    );
};
