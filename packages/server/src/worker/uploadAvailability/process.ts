import { SKU_STATUS } from "@local/shared";
import pkg, { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime";
import Bull from "bull";
import { SkuStatus } from "../../schema/types.js";
import { PrismaType } from "../../types.js";
import { UploadAvailabilityPayload } from "./queue.js";

const { PrismaClient } = pkg;

const prisma = new PrismaClient();

type ColumnIndexMap = {
    [x: string]: number;
}

type CommonNameTrait = {
    plantId: string;
    value: string;
}

type NameAndSize = {
    latinName: string | null;
    size: number | null;
};

type PlantData = {
    id: string;
    latinName: string;
    traits: { id: number, name: string, value: string }[] | null | undefined;
}

type SkuData = {
    isNew: boolean,
    skuId: string,
    size: Decimal | null,
    availability: number,
    status: SkuStatus
};
type SkuDataMap = { [plantId: string]: SkuData[] };

/** Helper function to normalize a string for comparison */
export const normalizeString = (input: string): string => {
    // Remove emojis, punctuations, quotes and convert to lowercase
    return input.replace(/['"“”‘’]/g, "").replace(/[^\w\s]/g, "").toLowerCase();
}

/** 
 * Helper function to find sizes at the end of latin names, since 
 * sometimes they are not specified in their own column
 */
export const extractSizeFromName = (name: string): { name: string, size: number | null } => {
    if (typeof name !== "string") return { name, size: null };
    // Find all text after the " #"
    const matches = name.match(/ #(.*)/);
    // If there are no matches, return the original name
    if (!matches) return { name, size: null };
    // Try trimming the text after the " #" and parsing it as a number
    const size = parseFloat(matches[1].trim());
    // If the size is not a number, return the original name
    if (isNaN(size)) return { name, size: null };
    // Return the name without the size, and the size
    return { name: name.replace(matches[0], ""), size };
}

/** Helper function to find the index of a column based on potential names */
export const findColumnIndex = (header: unknown[], potentialNames: string[]): number => {
    for (const potentialName of potentialNames) {
        const index = header.findIndex(h => typeof h === "string" && h.trim().toLowerCase() === potentialName.toLowerCase());
        if (index !== -1) return index;
    }
    return -1;
}

/**
 * Filters out irrelevant rows from the data.
 * 
 * This function performs two primary filters on the input rows:
 * 1. Removes rows where each cell is either empty, only whitespace, or starts with "Column".
 * 2. Removes rows that have less than 3 non-empty cells.
 * 
 * @param The array of rows to be filtered. Each row is an array of cell values.
 * @returns The filtered array of rows.
 */
export const filterContentRows = (rows: unknown[][]) => {
    return rows.filter(row => row.some(cell => typeof cell === "string" && cell.trim() !== "" && !cell.startsWith("Column")))
        .filter(row => row.length > 2);
};

/**
 * Extracts the indices of specified columns from a header row.
 * 
 * This function iterates over a list of potential names for each column and
 * returns the index of the first matching name in the header row. It's designed
 * to handle cases where the column name in the header row may vary.
 *
 * @param header - The header row of a table, containing column names.
 * @returns An object where each key is a column identifier and the value is the index of that column in the header row. If a column is not found, its value is set to -1.
 */
export const extractColumnIndices = (header: unknown[]): ColumnIndexMap => {
    return {
        latinName: findColumnIndex(header, ["Botanical Name", "Botanical", "Latin Name", "Latin", "Description", "Name"]),
        commonName: findColumnIndex(header, ["Common Name", "Common"]),
        size: -1, //findColumnIndex(header, ["Size"]), The current size column means something else, so skip it
        note: findColumnIndex(header, ["Notes", "Note", "Comments", "Comment"]),
        price: findColumnIndex(header, ["Price 10+", "Price", "Cost"]),
        sku: findColumnIndex(header, ["Plant Code", "Code", "SKU", "Item"]),
        availability: findColumnIndex(header, ["Quantity", "Availability", "Available", "Avail", "Amount"]),
    };
};

/**
 * Extracts plant and SKU data from a row.
 * 
 * @param row - The row data to be processed.
 * @param columnIndexMap - Map of column indices.
 * @param existingCommonNames - Array of existing common names.
 * @returns An object containing extracted latin name, size, and common name.
 */
export const extractLatinNameAndSize = (
    row: unknown[],
    columnIndexMap: ColumnIndexMap,
    existingCommonNames: CommonNameTrait[]
): NameAndSize => {
    let latinName: string | null = columnIndexMap.latinName !== -1 && typeof row[columnIndexMap.latinName] === 'string'
        ? row[columnIndexMap.latinName] as string
        : null;
    let size: number | null = null;

    // Check if size column exists and is not empty
    const sizeData = row[columnIndexMap.size];
    if (columnIndexMap.size !== -1 && sizeData !== null && sizeData !== '') {
        // Handle both string and numeric size values
        if (typeof sizeData === "string") {
            size = parseFloat(sizeData.replace(/\D/g, ""));
        } else if (typeof sizeData === "number") {
            size = sizeData;
        }

        if (size === null || isNaN(size)) size = null;
    }

    // If size is still null and there's a latin name, try extracting size from the latin name
    if (size === null && latinName) {
        const extracted = extractSizeFromName(latinName);
        latinName = extracted.name;
        size = extracted.size;
    }

    // Try to find latin name from common name if latin name is not found
    const commonName: string | null = columnIndexMap.commonName !== -1 && typeof row[columnIndexMap.commonName] === 'string'
        ? row[columnIndexMap.commonName] as string
        : null;
    if (!latinName && commonName) {
        const existingCommonName = existingCommonNames.find(c => normalizeString(c.value) === normalizeString(commonName));
        if (existingCommonName) latinName = existingCommonName.plantId;
    }

    // Ensure latinName is null if it's an empty string
    if (latinName === '') {
        latinName = null;
    }

    return { latinName, size };
}

/**
 * Inserts or updates plant data in the database based on the latin name.
 * 
 * @param {string} latinName - The latin name of the plant.
 * @param {PrismaClient} prisma - The Prisma client for database operations.
 * @returns {Promise<Plant>} The upserted plant data.
 */
export const upsertPlantData = async (
    latinName: string,
    prisma: PrismaType
): Promise<PlantData> => {
    const select = {
        id: true,
        latinName: true,
        traits: { select: { id: true, name: true, value: true } },
    };

    const plants = await prisma.plant.findMany({
        where: { latinName: { equals: latinName, mode: 'insensitive' } },
        select,
    });

    let plant;
    if (plants.length === 0) {
        console.info(`Creating new plant: ${latinName}`);
        plant = await prisma.plant.create({
            data: { latinName },
            select,
        });
    } else {
        // Assuming the first match is the desired one since latinName is expected to be unique
        plant = plants[0];
    }

    return plant;
}

/**
 * Inserts or updates plant traits.
 * 
 * @param plant - The plant data.
 * @param row - The row data from the availability file.
 * @param columnIndexMap - Map of column indices.
 * @param prisma - The Prisma client for database operations.
 */
export const upsertPlantTraits = async (
    plant: PlantData,
    row: unknown[],
    columnIndexMap: ColumnIndexMap,
    prisma: PrismaType
): Promise<void> => {
    // Assuming 'Plant' type has an 'id' property and 'traits' array
    const plantId = plant.id;

    // Loop through the traits you want to upsert
    for (const key of ["latinName", "commonName"]) {
        if (columnIndexMap[key] === -1) continue;

        const traitValue = row[columnIndexMap[key]];
        if (typeof traitValue !== "string" || !traitValue.trim()) continue;

        try {
            // Construct the unique identifier for the trait
            const where = { plant_trait_plantid_name_unique: { plantId, name: key } };

            // Construct the data for creating or updating the trait
            const data = { plantId, name: key, value: traitValue };

            // Upsert the trait
            await prisma.plant_trait.upsert({
                where,
                update: data,
                create: data,
            });
        } catch (error) {
            console.error(`Error upserting plant trait for ${key}:`, error);
        }
    }
}

/**
 * Inserts or updates SKU data and adds it to the processed SKUs list.
 * 
 * @param skuData - The SKU data to be upserted.
 * @param isSkuNew - Flag indicating if the SKU is new.
 * @param plantId - The ID of the plant.
 * @param processedSkus - Map of SKUs processed in the current job.
 * @param prisma - The Prisma client for database operations.
 */
export const upsertSkuData = async (
    skuData: Prisma.skuUpsertArgs["create"],
    isSkuNew: boolean,
    plantId: string,
    processedSkus: SkuDataMap,
    prisma: PrismaType
): Promise<void> => {
    if (isSkuNew) {
        if (!processedSkus[plantId]) {
            processedSkus[plantId] = [];
        }
        processedSkus[plantId].push({
            isNew: true,
            skuId: skuData.sku,
            size: skuData.size as Decimal,
            availability: skuData.availability ?? 0,
            status: skuData.status as SkuStatus,
        });
    }

    try {
        await prisma.sku.upsert({
            where: { sku: skuData.sku },
            update: skuData,
            create: skuData,
        });
    } catch (error) {
        console.error("Error upserting SKU data:", error);
    }
}

/** Helper function to generate a SKU from a plant's latin name and size */
export const generateSKU = (latinName: string, size: number | null): string => {
    // Helper function to remove accents
    const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Helper function to keep only A-Z characters
    const keepValidChars = (str: string) => str.replace(/[^A-Za-z]/g, '');

    // Process the Latin name
    let prefix = keepValidChars(removeAccents(latinName)).slice(0, 2).toUpperCase();
    // Pad with 'Z's if the prefix is shorter than 2 characters
    prefix = prefix.padEnd(2, 'Z');

    const randomChars = [...Array(4)].map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join(''); // Generates 4 random uppercase letters
    const sizeStr = size ? (size < 10 ? '0' + size : String(size)) : '00';
    return `${prefix}${randomChars}${sizeStr}`;
}

/**
 * Processes SKU data from a row and upserts it.
 * 
 * @param row - The row data to be processed.
 * @param latinName - The latin name of the plant, already processed from the row.
 * @param size - The size of the SKU, already processed from the row.
 * @param columnIndexMap - Map of column indices.
 * @param existingSkus - Map of existing SKUs.
 * @param plantId - The ID of the plant.
 * @param prisma - The Prisma client for database operations.
 * @param processedSkus - Map of SKUs processed in the current job.
 * @returns A promise representing the completion of the processing.
 */
export const processSkuData = async (
    row: unknown[],
    latinName: string,
    size: number | null,
    columnIndexMap: ColumnIndexMap,
    existingSkus: SkuDataMap,
    plantId: string,
    prisma: PrismaType,
    processedSkus: SkuDataMap
): Promise<void> => {
    // Extract row data
    const note = columnIndexMap.note !== -1 && typeof row[columnIndexMap.note] === 'string'
        ? row[columnIndexMap.note] as string
        : null;
    let sku = columnIndexMap.sku !== -1 && typeof row[columnIndexMap.sku] === 'string'
        ? row[columnIndexMap.sku] as string
        : null;
    // Create upsert data
    const sku_data: Prisma.skuUpsertArgs["create"] = {
        sku: "", // Placeholder
        size,
        note,
        plantId: plantId,
        status: SKU_STATUS.Active,
    };
    // If Sku was not in row, try to find existing SKU for this plant and size
    let isSkuNew = true;
    if (typeof sku !== "string" || !sku.trim() && size !== null) {
        const existingSku = existingSkus[plantId]?.find(s => (s.size ? s.size.toString() : null) === size?.toString());
        if (existingSku) {
            isSkuNew = false;
            sku = existingSku.skuId;
        }
    }
    // Otherwise, generate a new SKU
    if (typeof sku !== "string" || !sku.trim()) {
        sku = generateSKU(latinName, size);
    }
    sku_data.sku = sku;
    // Handle price
    let price = columnIndexMap.price === -1 ? null : parseFloat((row[columnIndexMap.price] + "").replace(/[^\d.-]/g, ""));
    if (price !== null && isNaN(price)) price = null;
    sku_data.price = price;
    // Handle availability
    let availability = columnIndexMap.availability === -1 ? 0 : parseInt(row[columnIndexMap.availability] + "");
    if (isNaN(availability)) availability = 0;
    sku_data.availability = availability;
    if (!sku_data.sku) {
        console.error("⛔️ Did not find SKU data in row:", JSON.stringify(row));
        return;
    }
    await upsertSkuData(sku_data, isSkuNew, plantId, processedSkus, prisma);
}

/**
 * Processes a single row of the availability file.
 * It handles the extraction and processing of plant and SKU data.
 * 
 * @param row - The row data to be processed.
 * @param columnIndexMap - Map of column indices.
 * @param existingCommonNames - Array of existing common names.
 * @param existingSkus - Map of existing SKUs.
 * @param processedSkus - Map of SKUs processed in the current job.
 * @param prisma - The Prisma client for database operations.
 * @returns A promise representing the completion of the processing.
 */
async function processRow(
    row: unknown[],
    columnIndexMap: ColumnIndexMap,
    existingCommonNames: CommonNameTrait[],
    existingSkus: SkuDataMap,
    processedSkus: SkuDataMap,
    prisma: PrismaType
): Promise<void> {
    const { latinName, size } = extractLatinNameAndSize(row, columnIndexMap, existingCommonNames);

    // If latin name not found, skip row
    if (!latinName) {
        console.error("⛔️ Cannot update rows without a plant name. Row:", JSON.stringify(row));
        return;
    }

    const plant = await upsertPlantData(latinName, prisma);
    await upsertPlantTraits(plant, row, columnIndexMap, prisma);
    await processSkuData(row, latinName, size, columnIndexMap, existingSkus, plant.id, prisma, processedSkus);
}

/**
 * Merges processed SKUs into the existing SKUs map.
 * For each plant, it combines the SKUs from both sources, preferring the processed SKUs.
 *
 * @param processedSkus - The map of SKUs processed from the current file.
 * @param existingSkus - The map of existing SKUs from the database.
 * @returns The merged map of SKUs.
 */
export const mergeProcessedSkus = (processedSkus: SkuDataMap, existingSkus: SkuDataMap): SkuDataMap => {
    // Iterate over the processed SKUs and merge them into the existing SKUs
    for (const plantId in processedSkus) {
        if (!existingSkus[plantId]) {
            existingSkus[plantId] = [];
        }
        // Assuming that processedSkus for a plant should replace existing ones
        // If this assumption is incorrect, you might need to merge them more carefully
        existingSkus[plantId].push(...processedSkus[plantId]);
    }
    return existingSkus;
}

/**
 * Identifies and prepares duplicate SKUs for deletion.
 * 
 * In this context, a duplicate SKU is defined as an SKU that belongs to the same plant and has the same size as another SKU, 
 * but is less preferable based on certain criteria (e.g., status and availability). This situation can arise due to data entry errors,
 * changes in inventory tracking, or other operational reasons. Having duplicate SKUs for the same item can lead to confusion in inventory management,
 * inaccuracies in availability reporting, and potential issues in order fulfillment.
 *
 * The function groups SKUs by plant and size, and within each group, it sorts them by preferring active SKUs over inactive ones,
 * and within the same status, preferring SKUs with higher availability. The "best" SKU in each group (active and with the highest availability)
 * is retained, while the rest are marked for deletion to streamline the inventory and avoid the aforementioned issues.
 * 
 * @param existingSkus - An object where each key is a plantId and each value is an array of SKUs for that plant.
 * @returns An array of SKU IDs that are identified as duplicates and should be deleted.
 */
export const findDuplicateSkus = (existingSkus: SkuDataMap) => {
    const duplicateSKUsToDelete: Set<string> = new Set(); // Use a Set to avoid duplicate entries

    for (const plantId in existingSkus) {
        const skusForPlant = existingSkus[plantId];
        const skusGroupedBySize = {};

        // Group the SKUs by size
        for (const sku of skusForPlant) {
            // Handle null size by assigning a unique identifier, e.g., 'N/A'
            const sizeStr = sku.size !== null ? sku.size.toString() : 'N/A';
            skusGroupedBySize[sizeStr] = skusGroupedBySize[sizeStr] || [];
            skusGroupedBySize[sizeStr].push(sku);
        }

        // Identify the duplicate SKUs to delete for each size group
        for (const sizeStr in skusGroupedBySize) {
            const skusForSize = skusGroupedBySize[sizeStr];

            // Sort the SKUs such that the "best" SKU is the first one in the sorted array
            skusForSize.sort((a, b) => {
                // Prefer new SKUs over existing ones
                if (a.isNew && !b.isNew) return -1;
                if (!a.isNew && b.isNew) return 1;
                // Then prefer active SKUs
                if (a.status === 'Active' && b.status !== 'Active') return -1;
                if (a.status !== 'Active' && b.status === 'Active') return 1;
                // If both are the same status, prefer higher availability
                return b.availability - a.availability;
            });

            // The first SKU in the sorted array is the "best" one, all others are duplicates to be deleted
            const skusToDelete = skusForSize.slice(1);
            for (const sku of skusToDelete) {
                duplicateSKUsToDelete.add(sku.skuId);
            }
        }
    }

    return Array.from(duplicateSKUsToDelete);
};


// Reads an .xls availability file into the database.
// SKUs of plants not in the availability file will be hidden
export async function uploadAvailabilityProcess(job: Bull.Job<UploadAvailabilityPayload>) {
    console.info("📊 Updating availability...");
    const rows = filterContentRows(job.data.rows);
    if (rows.length === 0) {
        console.warn("⚠️ No rows found in file!");
        return;
    }
    const [header, ...content] = rows;
    // Determine which columns data is in
    const columnIndexMap = extractColumnIndices(header);
    // Hide all existing SKUs (inventory items, zero or more per plant), so only the SKUs in this file can be set to visible
    await prisma.sku.updateMany({ data: { status: SKU_STATUS.Inactive, availability: 0 } });
    // Find existing common names, for when latin name is not present
    const existingCommonNames = await prisma.plant_trait.findMany({
        where: { name: "commonName" },
        select: { value: true, plantId: true }
    });
    // Find existing SKUs, for when SKU is not present
    const existingSkuData = await prisma.sku.findMany({ select: { sku: true, size: true, plantId: true, availability: true, status: true } });
    const existingSkus: SkuDataMap = {};
    for (const sku of existingSkuData) {
        if (!sku.size) continue;
        if (!existingSkus[sku.plantId]) existingSkus[sku.plantId] = [];
        existingSkus[sku.plantId].push({
            isNew: false,
            skuId: sku.sku,
            size: sku.size,
            availability: sku.availability,
            status: sku.status as SkuStatus
        });
    }
    // Process SKUs (and any plant info we find)
    const processedSkus: SkuDataMap = {};
    for (const row of content) {
        await processRow(row, columnIndexMap, existingCommonNames, existingSkus, processedSkus, prisma);
    }
    // Cleanup duplicate SKUs
    const duplicateSKUsToDelete = findDuplicateSkus(mergeProcessedSkus(processedSkus, existingSkus));
    if (duplicateSKUsToDelete.length > 0) {
        console.info(`Deleting ${duplicateSKUsToDelete.length} duplicate SKUs...`);
        await prisma.sku.deleteMany({ where: { sku: { in: duplicateSKUsToDelete } } });
    }
    console.info("✅ Availability updated!");
}
