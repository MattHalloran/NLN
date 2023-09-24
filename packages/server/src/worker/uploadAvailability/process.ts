import { SKU_STATUS } from "@local/shared";
import pkg, { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime";
import { SkuStatus } from "../../schema/types";

const { PrismaClient } = pkg;

const prisma = new PrismaClient();

/** Helper function to normalize a string for comparison */
const normalizeString = (input: string): string => {
    // Remove emojis, punctuations, quotes and convert to lowercase
    return input.replace(/['"“”‘’]/g, "").replace(/[^\w\s]/g, "").toLowerCase();
}

/** 
 * Helper function to find sizes at the end of latin names, since 
 * sometimes they are not specified in their own column
 */
const extractSizeFromName = (name: string): { name: string, size: number | null } => {
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

/** Helper function to generate a SKU from a plant's latin name and size */
const generateSKU = (latinName: string, size: number | null): string => {
    const prefix = latinName.slice(0, 2).toUpperCase();
    const randomChars = [...Array(4)].map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join(''); // Generates 4 random uppercase letters
    const sizeStr = size ? (size < 10 ? '0' + size : String(size)) : '00';
    return `${prefix}${randomChars}${sizeStr}`;
}

/** Helper function to find the index of a column based on potential names */
const findColumnIndex = (header: string[], potentialNames: string[]): number => {
    for (const potentialName of potentialNames) {
        const index = header.findIndex(h => typeof h === "string" && h.trim().toLowerCase() === potentialName.toLowerCase());
        if (index !== -1) return index;
    }
    return -1;
}

// Reads an .xls availability file into the database.
// SKUs of plants not in the availability file will be hidden
export async function uploadAvailabilityProcess(job: any) {
    console.info("📊 Updating availability...");
    const rows: any[] = job.data.rows;
    const header = rows[0];
    let content = rows.slice(1, rows.length);
    // Filter out blank rows, and rows where each cell is "Column1", "Column2", etc.
    // (The latter happens in LibreOffice sometimes for some reason)
    content = content.filter(row => row.some((cell: any) => typeof cell === "string" && cell.trim() !== "" && !cell.startsWith("Column")));
    // Determine which columns data is in
    const columnIndex: { [x: string]: number } = {
        latinName: findColumnIndex(header, ["Botanical Name", "Botanical", "Latin Name", "Latin", "Description", "Name"]),
        commonName: findColumnIndex(header, ["Common Name", "Common"]),
        size: -1, //findColumnIndex(header, ["Size"]), The current size column means something else, so skip it
        note: findColumnIndex(header, ["Notes", "Note", "Comments", "Comment"]),
        price: findColumnIndex(header, ["Price 10+", "Price", "Cost"]),
        sku: findColumnIndex(header, ["Plant Code", "Code", "SKU"]),
        availability: findColumnIndex(header, ["Quantity", "Availability", "Available", "Avail", "Amount"]),
    };
    // Hide all existing SKUs (inventory items, zero or more per plant), so only the SKUs in this file can be set to visible
    await prisma.sku.updateMany({ data: { status: SKU_STATUS.Inactive, availability: 0 } });
    // Find existing common names, for when latin name is not present
    const existingCommonNames = await prisma.plant_trait.findMany({
        where: { name: "commonName" },
        select: { value: true, plantId: true }
    });
    // Find existing SKUs, for when SKU is not present
    const existingSkuData = await prisma.sku.findMany({ select: { sku: true, size: true, plantId: true, availability: true, status: true } });
    const existingSkus: { [plantId: string]: { skuId: string, size: Decimal, availability: number, status: SkuStatus }[] } = {};
    for (const sku of existingSkuData) {
        if (!sku.size) continue;
        if (!existingSkus[sku.plantId]) existingSkus[sku.plantId] = [];
        existingSkus[sku.plantId].push({ skuId: sku.sku, size: sku.size, availability: sku.availability, status: sku.status as SkuStatus });
    }
    // Loop through rows, and update/unhide SKUs. Also update any plant data that is present
    for (const row of content) {
        // Try using latin name first (this is the unique column for SKUs), or fallback to common name. 
        // Also, latin name may contain the size, so extract it if it does
        let latinName = columnIndex.latinName !== -1 ? row[columnIndex.latinName] : null;
        let size: number | null = null;
        if (columnIndex.size === -1 && latinName) {
            const extracted = extractSizeFromName(latinName);
            latinName = extracted.name;
            size = extracted.size;
        } else if (columnIndex.size !== -1 && typeof row[columnIndex.size] === "string") {
            size = parseFloat(row[columnIndex.size].replace(/\D/g, ""));
            if (isNaN(size)) size = null;
        }
        const commonName = columnIndex.commonName !== -1 ? row[columnIndex.commonName] : null;
        // If neither latin name nor common name found, skip row
        if (!latinName && !commonName) {
            console.error("⛔️ Cannot update rows without a latin name or common name. Row:", JSON.stringify(row));
            continue;
        }
        // If latin name not found but common name is, try to find latin name from common name
        if (!latinName && commonName) {
            const existingCommonName = existingCommonNames.find(c => normalizeString(c.value) === normalizeString(commonName));
            if (existingCommonName) latinName = existingCommonName.plantId;
        }
        // If latin name still not found, skip row
        if (!latinName) {
            console.error("⛔️ Could not find latin name for row:", JSON.stringify(row));
            continue;
        }

        // Insert or update plant data from row
        let plant = await prisma.plant.findUnique({
            where: { latinName }, select: {
                id: true,
                traits: { select: { id: true, name: true, value: true } },
            },
        });
        if (!plant) {
            console.info(`Creating new plant: ${latinName}`);
            const newPlant = await prisma.plant.create({ data: { latinName } });
            plant = { id: newPlant.id, traits: [] };
        }
        // If traits don't exist, replace with empty array
        if (!Array.isArray(plant.traits)) plant.traits = [];
        // Upsert traits, even if they already existed. This will make sure that casing, quotes, and other formatting matches the uploaded file
        for (const key of ["latinName", "commonName"]) {
            if (columnIndex[key] === -1) continue;
            const updatedValue = row[columnIndex[key]];
            if (typeof updatedValue !== "string" || !updatedValue.trim()) continue;
            try {
                const updateData = { plantId: plant.id, name: key, value: row[columnIndex[key]] };
                await prisma.plant_trait.upsert({
                    where: { plant_trait_plantid_name_unique: { plantId: plant.id, name: key } },
                    update: updateData,
                    create: updateData,
                });
            } catch (error) { console.error(error); }
        }
        // Insert or update SKU data from row
        const sku_data: Prisma.skuUpsertArgs["create"] = {
            sku: "", // Placeholder
            size: size,
            note: columnIndex.note === -1 ? null : row[columnIndex.note],
            plantId: plant.id,
            status: SKU_STATUS.Active,
        };
        // Handle SKU
        let sku: string | null = null;
        if (columnIndex.sku >= 0) {
            sku = row[columnIndex.sku];
        }
        // If not in file, try to find existing SKU for this plant and size
        if (typeof sku !== "string" || !sku.trim() && size !== null) {
            const existingSku = existingSkus[plant.id]?.find(s => (s.size ? s.size.toString() : null) === size?.toString());
            if (existingSku) sku = existingSku.skuId;
        }
        // Otherwise, generate a new SKU
        if (typeof sku !== "string" || !sku.trim()) {
            sku = generateSKU(latinName, size);
        }
        sku_data.sku = sku;
        // Handle price
        let price = columnIndex.price === -1 ? null : parseFloat((row[columnIndex.price] + "").replace(/[^\d.-]/g, ""));
        if (price !== null && isNaN(price)) price = null;
        sku_data.price = price;
        // Handle availability
        let availability = columnIndex.availability === -1 ? 0 : parseInt(row[columnIndex.availability] + "");
        if (isNaN(availability)) availability = 0;
        sku_data.availability = availability;
        if (!sku_data.sku) {
            console.error("⛔️ Did not find SKU data in row:", JSON.stringify(row));
            continue;
        }
        try {
            await prisma.sku.upsert({
                where: { sku: sku_data.sku },
                update: sku_data,
                create: sku_data,
            });
        } catch (error) { console.error(error); }
    }
    // Now that we've processed the file, let's perform some additional cleanup
    // Find any SKUs with the same size and plant, and delete all but one. 
    // Prefer active SKUs over inactive ones, and prefer SKUs with higher availability
    const duplicateSKUsToDelete: string[] = [];
    for (const plantId in existingSkus) {
        const skusForPlant = existingSkus[plantId];
        const skusGroupedBySize: { [size: string]: typeof skusForPlant } = {};

        // Group the SKUs by size
        for (const sku of skusForPlant) {
            const sizeStr = sku.size.toString();
            if (!skusGroupedBySize[sizeStr]) {
                skusGroupedBySize[sizeStr] = [];
            }
            skusGroupedBySize[sizeStr].push(sku);
        }

        // Identify the duplicate SKUs to delete for each size group
        for (const sizeStr in skusGroupedBySize) {
            const skusForSize = skusGroupedBySize[sizeStr];

            // Sort the SKUs such that the "best" SKU is the first one in the sorted array
            skusForSize.sort((a, b) => {
                // Prefer active SKUs
                if (a.status === 'Active' && b.status !== 'Active') return -1;
                if (a.status !== 'Active' && b.status === 'Active') return 1;
                // If both are the same status, prefer higher availability
                return b.availability - a.availability;
            });

            // The first SKU in the sorted array is the "best" one, all others are duplicates to be deleted
            const skusToDelete = skusForSize.slice(1);
            for (const sku of skusToDelete) {
                duplicateSKUsToDelete.push(sku.skuId);
            }
        }
    }
    // Delete the duplicate SKUs
    if (duplicateSKUsToDelete.length > 0) {
        console.info(`Deleting ${duplicateSKUsToDelete.length} duplicate SKUs...`);
        await prisma.sku.deleteMany({ where: { sku: { in: duplicateSKUsToDelete } } });
    }
    console.info("✅ Availability updated!");
}
