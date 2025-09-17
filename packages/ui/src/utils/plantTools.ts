// Functions for easy manipulation of plant data

import { plants_plants, plants_plants_traits } from "api/generated/plants";
import { addToArray, updateArray } from "./arrayTools";

export const getPlantTrait = (traitName: string, plantData: plants_plants | any): string | null => {
    if (!(typeof traitName === "string")) return null;
    const lowered = traitName.toLowerCase();
    return plantData?.traits ? plantData.traits.find((t: plants_plants_traits) => t.name.toLowerCase() === lowered)?.value : null;
};

export const setPlantTrait = (name: string, value: string, plantData: plants_plants | any, createIfNotExists = false): plants_plants | null => {
    if (!plantData?.traits) return null;
    if (!(typeof name === "string")) return null;
    const lowered = name.toLowerCase();
    const traitIndex = plantData.traits.findIndex((t: plants_plants_traits) => t?.name?.toLowerCase() === lowered);
    if (traitIndex < 0 && !createIfNotExists) return null;
    const updatedTraits = traitIndex < 0 ?
        addToArray(plantData.traits, { name, value }) :
        updateArray(plantData.traits, traitIndex, { name, value });
    return { ...plantData, traits: updatedTraits };
};

export const setPlantSkuField = (fieldName: string, index: number, value: any, plantData: plants_plants | any): plants_plants | null => {
    if (!Array.isArray(plantData?.skus)) return null;
    if (index < 0 || index >= plantData.skus.length) return null;
    const updatedSku = { ...plantData.skus[index], [fieldName]: value };
    const updatedSkus = updateArray(plantData.skus, index, updatedSku);
    return { ...plantData, skus: updatedSkus };
};
