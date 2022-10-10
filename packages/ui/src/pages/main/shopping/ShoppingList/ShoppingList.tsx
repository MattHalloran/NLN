import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import { plantsQuery } from 'graphql/query';
import { upsertOrderItemMutation } from 'graphql/mutation';
import { useQuery, useMutation } from '@apollo/client';
import { getPlantTrait, SORT_OPTIONS } from "utils";
import {
    PlantCard,
    PlantDialog
} from 'components';
import { Box, useTheme } from "@mui/material";

 makeStyles(() => ({
    root: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        alignItems: 'stretch',
    },
}));

export const ShoppingList = ({
    session,
    onSessionUpdate,
    cart,
    sortBy = SORT_OPTIONS[0].value,
    filters,
    hideOutOfStock,
    searchString = '',
}) => {
    const { palette } = useTheme();

    // Plant data for all visible plants (i.e. not filtered)
    const [plants, setPlants] = useState([]);
    const track_scrolling_id = 'scroll-tracked';
    let history = useHistory();
    const urlParams = useParams();
    // Find current plant and current sku
    const currPlant = Array.isArray(plants) ? plants.find(p => p.skus.some(s => s.sku === urlParams.sku)) : null;
    const currSku = currPlant?.skus ? currPlant.skus.find(s => s.sku === urlParams.sku) : null;
    const { data: plantData } = useQuery(plantsQuery,  { variables: { input: { sortBy, searchString, active: true, hideOutOfStock } } });
    const [upsertOrderItem] = useMutation(upsertOrderItemMutation);

    // useHotkeys('Escape', () => setCurrSku([null, null, null]));

    // Determine which skus will be visible to the customer (i.e. not filtered out)
    useEffect(() => {
        if (!filters || Object.values(filters).length === 0) {
            setPlants(plantData?.plants);
            return;
        }
        let filtered_plants = [];
        for (const plant of plantData?.plants) {
            let found = false;
            for (const [key, value] of Object.entries(filters)) {
                if (found) break;
                const traitValue = getPlantTrait(key, plant);
                if (traitValue && traitValue.toLowerCase() === (value+'').toLowerCase()) {
                    found = true;
                    break;
                }
                if (!Array.isArray(plant.skus)) continue;
                for (let i = 0; i < plant.skus.length; i++) {
                    const skuValue = plant.skus[i][key];
                    if (skuValue && skuValue.toLowerCase() === (value+'').toLowerCase()) {
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
        history.push(LINKS.Shopping + "/" + sku);
    };

    const toCart = () => {
        history.push(LINKS.Cart);
    }

    const addToCart = (name, sku, quantity) => {
        if (!session?.id) return;
        let max_quantity = parseInt(sku.availability);
        if (Number.isInteger(max_quantity) && quantity > max_quantity) {
            alert(`Error: Cannot add more than ${max_quantity}!`);
            return;
        }
        mutationWrapper({
            mutation: upsertOrderItem,
            input: { quantity, orderId: cart?.id, skuId: sku.id },
            successCondition: (response) => response.data.upsertOrderItem,
            onSuccess: () => onSessionUpdate(),
            successMessage: () => `${quantity} ${name}(s) added to cart.`,
            successData: { buttonText: 'View Cart', buttonClicked: toCart },
        })
    }

    return (
        <Box className={classes.root} id={track_scrolling_id}>
            {(currPlant) ? <PlantDialog
                onSessionUpdate
                plant={currPlant}
                selectedSku={currSku}
                onAddToCart={addToCart}
                open={currPlant !== null}
                onClose={() => history.goBack()} /> : null}
            
            {plants?.map((item, index) =>
                <PlantCard key={index}
                    onClick={(data) => expandSku(data.selectedSku?.sku)}
                    plant={item} />)}
        </Box>
    );
}