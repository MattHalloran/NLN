import { useState, useEffect } from "react";
import { plantsQuery } from 'graphql/query';
import { upsertOrderItemMutation } from 'graphql/mutation';
import { useQuery, useMutation } from '@apollo/client';
import { getPlantTrait, parseSearchParams, PubSub, SORT_OPTIONS } from "utils";
import {
    PlantCard,
    PlantDialog,
    SnackSeverity
} from 'components';
import { Box } from "@mui/material";
import { APP_LINKS } from "@shared/consts";
import { mutationWrapper } from "graphql/utils";
import { upsertOrderItemVariables, upsertOrderItem_upsertOrderItem } from "graphql/generated/upsertOrderItem";
import { useLocation } from "@shared/route";
import { plants_plants, plants_plants_skus } from "graphql/generated/plants";

export const ShoppingList = ({
    session,
    onSessionUpdate,
    cart,
    sortBy = SORT_OPTIONS[0].value,
    filters,
    hideOutOfStock,
    searchString = '',
}) => {

    // Plant data for all visible plants (i.e. not filtered)
    const [plants, setPlants] = useState<plants_plants[]>([]);
    const track_scrolling_id = 'scroll-tracked';
    const [, setLocation] = useLocation();
    const [sku, setSku] = useState<string | undefined>(undefined);
    useEffect(() => {
        const searchParams = parseSearchParams();
        if (typeof searchParams.sku === 'string') {
            setSku(searchParams.sku);
        }
    }, [setLocation])
    // Find current plant and current sku
    const currPlant = Array.isArray(plants) ? plants.find((p: any) => p.skus.some(s => s.sku === sku)) : undefined;
    const currSku = currPlant?.skus ? currPlant.skus.find(s => s.sku === sku) : undefined;
    const { data: plantData } = useQuery(plantsQuery, { variables: { input: { sortBy, searchString, active: true, onlyInStock: hideOutOfStock } } });
    const [upsertOrderItem] = useMutation(upsertOrderItemMutation);

    // useHotkeys('Escape', () => setCurrSku([null, null, null]));

    // Determine which skus will be visible to the customer (i.e. not filtered out)
    useEffect(() => {
        if (!filters || Object.values(filters).length === 0) {
            setPlants(plantData?.plants);
            return;
        }
        let filtered_plants: any[] = [];
        for (const plant of plantData?.plants) {
            let found = false;
            for (const [key, value] of Object.entries(filters)) {
                if (found) break;
                const traitValue = getPlantTrait(key, plant);
                if (traitValue && traitValue.toLowerCase() === (value + '').toLowerCase()) {
                    found = true;
                    break;
                }
                if (!Array.isArray(plant.skus)) continue;
                for (let i = 0; i < plant.skus.length; i++) {
                    const skuValue = plant.skus[i][key];
                    if (skuValue && skuValue.toLowerCase() === (value + '').toLowerCase()) {
                        found = true;
                        break;
                    }
                }
            }
            if (found) filtered_plants.push(plant);
        }
        setPlants(filtered_plants);
    }, [plantData, filters, searchString, hideOutOfStock])

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
    }

    const addToCart = (sku: plants_plants_skus, quantity: number) => {
        if (!session?.id) return;
        let max_quantity = sku.availability;
        if (Number.isInteger(max_quantity) && quantity > max_quantity) {
            alert(`Error: Cannot add more than ${max_quantity}!`);
            return;
        }
        mutationWrapper<upsertOrderItem_upsertOrderItem, upsertOrderItemVariables>({
            mutation: upsertOrderItem,
            input: { quantity, orderId: cart?.id, skuId: sku.id },
            successCondition: (data) => data !== null,
            onSuccess: () => {
                onSessionUpdate();
                PubSub.get().publishSnack({ message: 'Item added to cart', buttonText: 'View', buttonClicked: toCart, severity: SnackSeverity.Success });
            }
        })
    }

    return (
        <Box
            id={track_scrolling_id}
            sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                alignItems: 'stretch',
            }}
        >
            {(currPlant) ? <PlantDialog
                plant={currPlant}
                selectedSku={currSku}
                onAddToCart={addToCart}
                open={currPlant !== null}
                // navigate back on close
                onClose={closeSku} /> : null}
            {plants?.map((item, index) =>
                <PlantCard key={index}
                    onClick={(data) => expandSku(data.selectedSku?.sku)}
                    plant={item} />)}
        </Box>
    );
}